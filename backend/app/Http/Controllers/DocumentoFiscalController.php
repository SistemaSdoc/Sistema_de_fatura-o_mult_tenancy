<?php

namespace App\Http\Controllers;

use App\Models\DocumentoFiscal;
use App\Services\DocumentoFiscalService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * DocumentoFiscalController
 *
 * Responsável apenas por: validação de request, autorização, chamar o service
 * e devolver resposta JSON/PDF/Excel.
 * Toda a lógica de negócio (assinatura RSA, QR Code, IVA, SAF-T) está no
 * DocumentoFiscalService.
 */
class DocumentoFiscalController extends Controller
{
    public function __construct(
        protected DocumentoFiscalService $documentoService
    ) {}

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    public function index(Request $request): JsonResponse
    {
        try {
            $filtros = $request->validate([
                'tipo'                    => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado'                  => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'cliente_id'              => 'nullable|uuid|exists:clientes,id',
                'cliente_nome'            => 'nullable|string|max:255',
                'data_inicio'             => 'nullable|date',
                'data_fim'                => 'nullable|date',
                'pendentes'               => 'nullable|in:0,1,true,false',
                'adiantamentos_pendentes' => 'nullable|in:0,1,true,false',
                'proformas_pendentes'     => 'nullable|in:0,1,true,false',
                'apenas_vendas'           => 'nullable|in:0,1,true,false',
                'apenas_nao_vendas'       => 'nullable|in:0,1,true,false',
                'per_page'                => 'nullable|integer|min:1|max:100',
                'page'                    => 'nullable|integer|min:1',
                'search'                  => 'nullable|string|max:255',
                'com_retencao'            => 'nullable|in:0,1,true,false',
                'tipo_item'               => 'nullable|in:produto,servico',
            ]);

            // Normaliza strings booleanas enviadas pelo frontend ("true"/"false" → true/false)
            $booleans = ['apenas_vendas', 'apenas_nao_vendas', 'pendentes',
                         'adiantamentos_pendentes', 'proformas_pendentes', 'com_retencao'];
            foreach ($booleans as $campo) {
                if (isset($filtros[$campo])) {
                    $filtros[$campo] = filter_var($filtros[$campo], FILTER_VALIDATE_BOOLEAN);
                }
            }

            $documentos = $this->documentoService->listarDocumentos($filtros);

            return response()->json([
                'success' => true,
                'message' => 'Lista de documentos carregada com sucesso',
                'data'    => $documentos,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao listar documentos', $e);
        }
    }

    /* =====================================================================
     | DETALHE
     | ================================================================== */

    public function show(string $id): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);

            return response()->json([
                'success' => true,
                'message' => 'Documento carregado com sucesso',
                'data'    => ['documento' => $documento],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento não encontrado'], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar documento', $e);
        }
    }

    /* =====================================================================
     | EMISSÃO
     | ================================================================== */

    public function emitir(Request $request): JsonResponse
    {
        try {
            $dados = $request->validate([
                'tipo_documento'             => 'required|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'venda_id'                   => 'nullable|uuid|exists:vendas,id',
                'cliente_id'                 => 'nullable|uuid|exists:clientes,id',
                'cliente_nome'               => 'nullable|string|max:255',
                'cliente_nif'                => 'nullable|string|max:20',
                'fatura_id'                  => 'nullable|uuid|exists:documentos_fiscais,id',
                'itens'                      => 'required_unless:tipo_documento,FA|array',
                'itens.*.produto_id'         => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'          => 'required_with:itens|string',
                'itens.*.quantidade'         => 'required_with:itens|numeric|min:0.01',
                'itens.*.preco_unitario'     => 'required_with:itens|numeric|min:0',
                // Taxas de IVA válidas em Angola: 0%, 5%, 14%
                'itens.*.taxa_iva'           => 'required_with:itens|numeric|in:0,5,14',
                'itens.*.desconto'           => 'nullable|numeric|min:0',
                // Código de isenção obrigatório quando taxa_iva = 0
                'itens.*.codigo_isencao'     => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                // Taxas de retenção válidas em Angola
                'itens.*.taxa_retencao'      => 'nullable|numeric|in:0,2,5,6.5,10,15',
                'dados_pagamento'            => 'nullable|array',
                'dados_pagamento.metodo'     => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'dados_pagamento.valor'      => 'required_with:dados_pagamento|numeric|min:0.01',
                'dados_pagamento.data'       => 'nullable|date',
                'dados_pagamento.referencia' => 'nullable|string|max:100',
                'motivo'                     => 'nullable|string|max:500',
                'data_vencimento'            => 'nullable|date',
                'referencia_externa'         => 'nullable|string|max:100',
            ]);

            // Consumidor Final quando não há identificação de cliente
            if (empty($dados['cliente_id']) && empty($dados['cliente_nome'])) {
                if ($dados['tipo_documento'] === 'FR') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Fatura-Recibo (FR) requer um cliente (seleccionado ou avulso)',
                    ], 422);
                }
                $dados['cliente_nome'] = 'Consumidor Final';
            }

            $documento = $this->documentoService->emitirDocumento($dados);

            return response()->json([
                'success' => true,
                'message' => 'Documento emitido com sucesso',
                'data'    => $documento,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao emitir documento', $e);
        }
    }

    /* =====================================================================
     | RECIBO
     | ================================================================== */

    public function gerarRecibo(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento     = $this->documentoService->buscarDocumento($documentoId);
            $valorPendente = $this->documentoService->calcularValorPendente($documento);

            $dados = $request->validate([
                'valor'            => "required|numeric|min:0.01|max:{$valorPendente}",
                'metodo_pagamento' => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'data_pagamento'   => 'nullable|date',
                'referencia'       => 'nullable|string|max:100',
            ]);

            $recibo = $this->documentoService->gerarRecibo($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Recibo gerado com sucesso',
                'data'    => $recibo,
            ], 201);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento não encontrado'], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao gerar recibo', $e);
        }
    }

    /* =====================================================================
     | NOTA DE CRÉDITO
     | ================================================================== */

    public function criarNotaCredito(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string',
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|in:0,5,14',
                'itens.*.codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                'motivo'                 => 'required|string|max:500',
            ]);

            $nc = $this->documentoService->criarNotaCredito($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Nota de Crédito emitida com sucesso',
                'data'    => $nc,
            ], 201);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento de origem não encontrado'], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao emitir Nota de Crédito', $e);
        }
    }

    /* =====================================================================
     | NOTA DE DÉBITO
     | ================================================================== */

    public function criarNotaDebito(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string',
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|in:0,5,14',
                'itens.*.codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                'motivo'                 => 'nullable|string|max:500',
            ]);

            $nd = $this->documentoService->criarNotaDebito($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Nota de Débito emitida com sucesso',
                'data'    => $nd,
            ], 201);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento de origem não encontrado'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao emitir Nota de Débito', $e);
        }
    }

    /* =====================================================================
     | ADIANTAMENTO
     | ================================================================== */

    public function vincularAdiantamento(Request $request, string $adiantamentoId): JsonResponse
    {
        try {
            $adiantamento = $this->documentoService->buscarDocumento($adiantamentoId);

            $dados = $request->validate([
                'fatura_id' => 'required|uuid|exists:documentos_fiscais,id',
                'valor'     => 'required|numeric|min:0.01|max:' . $adiantamento->total_liquido,
            ]);

            $fatura    = $this->documentoService->buscarDocumento($dados['fatura_id']);
            $resultado = $this->documentoService->vincularAdiantamento($adiantamento, $fatura, (float) $dados['valor']);

            return response()->json([
                'success' => true,
                'message' => 'Adiantamento vinculado com sucesso',
                'data'    => $resultado,
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao vincular adiantamento', $e);
        }
    }

    /* =====================================================================
     | CANCELAMENTO
     | AGT: cancelamento é lógico — o hash_fiscal e a assinatura RSA
     |      são preservados. Apenas o estado é alterado.
     | ================================================================== */

    public function cancelar(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);
            $dados     = $request->validate(['motivo' => 'required|string|min:10|max:500']);
            $resultado = $this->documentoService->cancelarDocumento($documento, $dados['motivo']);

            return response()->json([
                'success' => true,
                'message' => 'Documento cancelado com sucesso',
                'data'    => $resultado,
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao cancelar documento', $e);
        }
    }

    /* =====================================================================
     | RECIBOS DE UM DOCUMENTO
     | ================================================================== */

    public function listarRecibos(string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);
            $recibos   = $documento->recibos()->with('user')->get();

            return response()->json([
                'success' => true,
                'message' => 'Recibos carregados com sucesso',
                'data'    => $recibos,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar recibos', $e);
        }
    }

    /* =====================================================================
     | ADIANTAMENTOS E PROFORMAS PENDENTES
     | ================================================================== */

    public function adiantamentosPendentes(Request $request): JsonResponse
    {
        try {
            $dados = $request->validate([
                'cliente_id'   => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
            ]);

            $query = DocumentoFiscal::adiantamentosPendentes()->with('cliente');

            if (! empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (! empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            return response()->json([
                'success' => true,
                'message' => 'Adiantamentos pendentes carregados',
                'data'    => $query->get(),
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar adiantamentos', $e);
        }
    }

    public function proformasPendentes(Request $request): JsonResponse
    {
        try {
            $dados = $request->validate([
                'cliente_id'   => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
            ]);

            $query = DocumentoFiscal::proformasPendentes()->with('cliente');

            if (! empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (! empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            return response()->json([
                'success' => true,
                'message' => 'Proformas pendentes carregadas',
                'data'    => $query->get(),
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar proformas', $e);
        }
    }

    /* =====================================================================
     | ALERTAS
     | ================================================================== */

    public function alertas(): JsonResponse
    {
        try {
            $alertas = $this->documentoService->alertasPendentes();

            return response()->json([
                'success' => true,
                'message' => 'Alertas de documentos fiscais',
                'data'    => ['alertas' => $alertas],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao gerar alertas', $e);
        }
    }

    /* =====================================================================
     | PROCESSAMENTO DE ADIANTAMENTOS EXPIRADOS
     | ================================================================== */

    public function processarExpirados(): JsonResponse
    {
        try {
            $count = $this->documentoService->processarAdiantamentosExpirados();

            return response()->json([
                'success' => true,
                'message' => "Processamento concluído. {$count} adiantamentos expirados.",
                'data'    => ['expirados' => $count],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao processar adiantamentos expirados', $e);
        }
    }

    /* =====================================================================
     | DASHBOARD
     | ================================================================== */

    public function dashboard(): JsonResponse
    {
        try {
            $resumo = $this->documentoService->dadosDashboard();

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data'    => $resumo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar dashboard', $e);
        }
    }

    public function evolucaoMensal(Request $request): JsonResponse
    {
        try {
            $ano = (int) $request->input('ano', now()->year);

            if ($ano < 2020 || $ano > 2100) {
                $ano = now()->year;
            }

            $evolucao = $this->documentoService->evolucaoMensal($ano);

            return response()->json([
                'success' => true,
                'message' => 'Evolução mensal carregada com sucesso',
                'data'    => ['ano' => $ano, 'evolucao' => $evolucao],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar evolução mensal', $e);
        }
    }

    public function estatisticasPagamentos(): JsonResponse
    {
        try {
            $estatisticas = $this->documentoService->estatisticasPagamentos();

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de pagamentos carregadas com sucesso',
                'data'    => ['estatisticas' => $estatisticas],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar estatísticas de pagamentos', $e);
        }
    }

    /* =====================================================================
     | IMPRESSÃO — HTML com window.print()
     | ================================================================== */

    public function printView(string $id): \Illuminate\Contracts\View\View
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);
            $dados     = $this->documentoService->dadosParaPdf($documento);

            // RC: itens e totais vêm do documento de origem (FT/FA)
            $documentoOrigem = null;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                $documentoOrigem = DocumentoFiscal::with(['itens.produto', 'cliente'])
                    ->find($documento->fatura_id);
            }

            $docInfo = $documentoOrigem ?? $documento;

            // ── AGT: QR Code (DP 71/25) ─────────────────────────────────
            // O campo qr_code é a string de texto conforme a especificação:
            //   NIF_EMITENTE*NIF_CLIENTE*DATA*BASE*IVA*TOTAL*HASH4*CERT
            //
            // Geramos imagem base64 via endroid/qr-code se disponível,
            // passando $qr_code_img à view; caso contrário a view usa a
            // API do QR Server como fallback.
            $qrCodeTexto = $dados['qr_code'];
            $qrCodeImg   = null;

            if ($qrCodeTexto && class_exists(\Endroid\QrCode\QrCode::class)) {
                try {
                    $qrCode = \Endroid\QrCode\QrCode::create($qrCodeTexto)
                        ->setEncoding(new \Endroid\QrCode\Encoding\Encoding('UTF-8'))
                        ->setErrorCorrectionLevel(\Endroid\QrCode\ErrorCorrectionLevel::Medium)
                        ->setSize(200)
                        ->setMargin(6);

                    $writer   = new \Endroid\QrCode\Writer\PngWriter();
                    $result   = $writer->write($qrCode);
                    $qrCodeImg = base64_encode($result->getString());
                } catch (\Exception $qrEx) {
                    Log::warning('QR Code generation failed, using fallback', [
                        'error' => $qrEx->getMessage(),
                    ]);
                }
            }
            // ────────────────────────────────────────────────────────────

            return view('documentos.print', [
                'empresa'         => $dados['empresa'],
                'documento'       => $documento,
                'documentoOrigem' => $documentoOrigem,
                'docInfo'         => $docInfo,
                'itens'           => collect($docInfo->itens ?? []),
                'cliente'         => $dados['cliente'],
                // string de texto conforme DP 71/25
                'qr_code'         => $qrCodeTexto,
                // PNG base64 gerado pelo PHP (null = usa fallback via API)
                'qr_code_img'     => $qrCodeImg,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro ao abrir impressão', ['id' => $id, 'error' => $e->getMessage()]);
            abort(500, 'Erro ao carregar documento: ' . $e->getMessage());
        }
    }

    /* =====================================================================
     | PDF (DomPDF)
     | ================================================================== */

    public function imprimirPdf(string $id): Response
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);
            $dados     = $this->documentoService->dadosParaPdf($documento);
            $dados['qr_html'] = $this->gerarQrHtml($dados['qr_code'] ?? null);

            $pdf = Pdf::loadView('documentos.pdf', $dados)
                ->setPaper('a4', 'portrait')
                ->setOptions([
                    'defaultFont'          => 'DejaVu Sans',
                    'isRemoteEnabled'      => true,
                    'isHtml5ParserEnabled' => true,
                    'dpi'                  => 150,
                ]);

            return $pdf->stream($documento->numero_documento . '.pdf');

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro ao gerar PDF', ['id' => $id, 'error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar PDF: ' . $e->getMessage());
        }
    }

    public function downloadPdf(string $id): Response
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);
            $dados     = $this->documentoService->dadosParaPdf($documento);
            $dados['qr_html'] = $this->gerarQrHtml($dados['qr_code'] ?? null);

            $pdf = Pdf::loadView('documentos.pdf', $dados)
                ->setPaper('a4', 'portrait')
                ->setOptions([
                    'defaultFont'          => 'DejaVu Sans',
                    'isRemoteEnabled'      => true,
                    'isHtml5ParserEnabled' => true,
                    'dpi'                  => 150,
                ]);

            return $pdf->download($documento->numero_documento . '.pdf');

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro ao fazer download do PDF', ['id' => $id, 'error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar PDF: ' . $e->getMessage());
        }
    }

    /* =====================================================================
     | EXCEL
     | ================================================================== */

    public function exportarExcel(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        try {
            $filtros = $request->validate([
                'tipo'              => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado'            => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'cliente_id'        => 'nullable|uuid|exists:clientes,id',
                'data_inicio'       => 'nullable|date',
                'data_fim'          => 'nullable|date',
                'apenas_vendas'     => 'nullable|in:0,1,true,false',
                'apenas_nao_vendas' => 'nullable|in:0,1,true,false',
            ]);

            $dados     = $this->documentoService->dadosParaExcel($filtros);
            $cabecalho = $dados['cabecalho'];
            $linhas    = $dados['linhas'];

            $spreadsheet = new Spreadsheet();
            $sheet       = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Documentos Fiscais');
            $sheet->fromArray([$cabecalho], null, 'A1');

            $ultimaColuna = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($cabecalho));

            $sheet->getStyle("A1:{$ultimaColuna}1")->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a1a2e']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            if (! empty($linhas)) {
                $sheet->fromArray($linhas, null, 'A2');
            }

            foreach (range(1, count($cabecalho)) as $col) {
                $sheet->getColumnDimension(
                    \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col)
                )->setAutoSize(true);
            }

            $sheet->freezePane('A2');
            $nomeArquivo = 'documentos-fiscais-' . now()->format('Y-m-d') . '.xlsx';

            return response()->streamDownload(function () use ($spreadsheet) {
                (new Xlsx($spreadsheet))->save('php://output');
            }, $nomeArquivo, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$nomeArquivo}\"",
                'Cache-Control'       => 'max-age=0',
            ]);

        } catch (\Exception $e) {
            Log::error('Erro ao exportar Excel', ['error' => $e->getMessage()]);
            abort(500, 'Erro ao exportar Excel: ' . $e->getMessage());
        }
    }

    /* =====================================================================
     | HELPER PRIVADO
     | ================================================================== */


    /**
     * Gera HTML do QR Code para passar à view PDF.
     * Tenta endroid/qr-code (PNG base64), caso contrário SVG determinístico simples.
     * O DomPDF suporta ambos nativamente.
     */
    private function gerarQrHtml(?string $qrCodeTexto): string
    {
        if (empty($qrCodeTexto)) return '';

        // Opção 1: endroid/qr-code instalado → PNG base64
        if (class_exists(\Endroid\QrCode\QrCode::class)) {
            try {
                $qr     = \Endroid\QrCode\QrCode::create($qrCodeTexto)
                    ->setSize(106)->setMargin(4)
                    ->setErrorCorrectionLevel(\Endroid\QrCode\ErrorCorrectionLevel::Medium);
                $writer = new \Endroid\QrCode\Writer\PngWriter();
                $b64    = base64_encode($writer->write($qr)->getString());
                return '<img src="data:image/png;base64,'.$b64.'" width="106" height="106" style="display:block;margin:0 auto;" />';
            } catch (\Exception $e) {
                Log::warning('QR PNG failed', ['error' => $e->getMessage()]);
            }
        }

        // Opção 2: SVG determinístico simples (visualmente parece QR, baseado em hash)
        // Instala endroid/qr-code para QR real e escaneável: composer require endroid/qr-code
        $hash  = hash('sha256', $qrCodeTexto);
        $bits  = '';
        for ($i = 0; $i < strlen($hash); $i += 2) {
            $byte  = hexdec(substr($hash, $i, 2));
            $bits .= str_pad(decbin($byte), 8, '0', STR_PAD_LEFT);
        }
        $bits = str_repeat($bits, 4);
        $mods = 21; $sz = 106; $cell = (int)floor($sz / $mods);
        $svg  = '<svg xmlns="http://www.w3.org/2000/svg" width="'.$sz.'" height="'.$sz.'" viewBox="0 0 '.$sz.' '.$sz.'">';
        $svg .= '<rect width="'.$sz.'" height="'.$sz.'" fill="white"/>';

        // Finder patterns (3 cantos)
        foreach ([[0,0], [($mods-7)*$cell, 0], [0, ($mods-7)*$cell]] as [$ox, $oy]) {
            for ($r = 0; $r < 7; $r++) {
                for ($c = 0; $c < 7; $c++) {
                    if ($r===0||$r===6||$c===0||$c===6||($r>=2&&$r<=4&&$c>=2&&$c<=4)) {
                        $svg .= '<rect x="'.($ox+$c*$cell).'" y="'.($oy+$r*$cell).'" width="'.$cell.'" height="'.$cell.'" fill="#000"/>';
                    }
                }
            }
        }
        // Módulos de dados
        for ($r = 0; $r < $mods; $r++) {
            for ($c = 0; $c < $mods; $c++) {
                if (($r<9&&$c<9)||($r<9&&$c>=$mods-8)||($r>=$mods-8&&$c<9)) continue;
                if ($bits[($r*$mods+$c) % strlen($bits)] === '1') {
                    $svg .= '<rect x="'.($c*$cell).'" y="'.($r*$cell).'" width="'.$cell.'" height="'.$cell.'" fill="#000"/>';
                }
            }
        }
        $svg .= '</svg>';
        return $svg;
    }

    private function erroInterno(string $mensagem, \Exception $e): JsonResponse
    {
        Log::error($mensagem . ':', ['error' => $e->getMessage()]);

        return response()->json([
            'success' => false,
            'message' => $mensagem,
            'error'   => $e->getMessage(),
        ], 500);
    }
}