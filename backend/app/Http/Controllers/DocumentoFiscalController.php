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

class DocumentoFiscalController extends Controller
{
    public function __construct(
        protected DocumentoFiscalService $documentoService
    ) {}

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    /**
     * GET /api/documentos-fiscais
     * Lista documentos fiscais com filtros e paginação.
     */
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
                'pendentes'               => 'nullable|boolean',
                'adiantamentos_pendentes' => 'nullable|boolean',
                'proformas_pendentes'     => 'nullable|boolean',
                'apenas_vendas'           => 'nullable|boolean',
                'apenas_nao_vendas'       => 'nullable|boolean',
                'per_page'                => 'nullable|integer|min:1|max:100',
            ]);

            $documentos = $this->documentoService->listarDocumentos($filtros);

            return response()->json([
                'success' => true,
                'message' => 'Lista de documentos carregada com sucesso',
                'data'    => $documentos,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao listar documentos', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar documentos',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | DETALHE
     | ================================================================== */

    /**
     * GET /api/documentos-fiscais/{id}
     * Retorna um documento fiscal específico com todas as relações.
     */
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
            return response()->json([
                'success' => false,
                'message' => 'Documento não encontrado',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar documento', ['id' => $id, 'error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar documento',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | EMISSÃO
     | ================================================================== */

    /**
     * POST /api/documentos-fiscais
     * Emite qualquer tipo de documento fiscal.
     *
     * Nota: o troco não é tratado aqui — responsabilidade do frontend.
     * A validação de pagamento para FR está no VendaController.
     */
    public function emitir(Request $request): JsonResponse
    {
        try {
            $dados = $request->validate([
                'tipo_documento'               => 'required|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'venda_id'                     => 'nullable|uuid|exists:vendas,id',
                'cliente_id'                   => 'nullable|uuid|exists:clientes,id',
                'cliente_nome'                 => 'nullable|string|max:255',
                'cliente_nif'                  => 'nullable|string|max:20',
                'fatura_id'                    => 'nullable|uuid|exists:documentos_fiscais,id',
                'itens'                        => 'required_unless:tipo_documento,FA|array',
                'itens.*.produto_id'           => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'            => 'required_with:itens|string',
                'itens.*.quantidade'           => 'required_with:itens|numeric|min:0.01',
                'itens.*.preco_unitario'       => 'required_with:itens|numeric|min:0',
                'itens.*.taxa_iva'             => 'required_with:itens|numeric|min:0',
                'itens.*.desconto'             => 'nullable|numeric|min:0',
                'dados_pagamento'              => 'nullable|array',
                'dados_pagamento.metodo'       => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'dados_pagamento.valor'        => 'required_with:dados_pagamento|numeric|min:0.01',
                'dados_pagamento.data'         => 'nullable|date',
                'dados_pagamento.referencia'   => 'nullable|string|max:100',
                'motivo'                       => 'nullable|string|max:500',
                'data_vencimento'              => 'nullable|date',
                'referencia_externa'           => 'nullable|string|max:100',
            ]);

            // FR exige cliente; outros tipos usam "Consumidor Final" como fallback
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
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao emitir documento', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao emitir documento: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | RECIBO
     | ================================================================== */

    /**
     * POST /api/documentos-fiscais/{id}/recibo
     * Gera um recibo para uma FT ou FA. Suporta pagamentos parciais múltiplos.
     */
    public function gerarRecibo(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if (! in_array($documento->tipo_documento, ['FT', 'FA'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas FT e FA podem receber recibo. Tipo: ' . $documento->tipo_documento,
                ], 422);
            }

            if (in_array($documento->estado, ['paga', 'cancelado'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Documento já se encontra pago ou cancelado',
                ], 422);
            }

            $valorPendente = $this->documentoService->calcularValorPendente($documento);

            $dados = $request->validate([
                'valor'             => "required|numeric|min:0.01|max:{$valorPendente}",
                'metodo_pagamento'  => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'data_pagamento'    => 'nullable|date',
                'referencia'        => 'nullable|string|max:100',
            ]);

            $recibo = $this->documentoService->gerarRecibo($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Recibo gerado com sucesso',
                'data'    => $recibo,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Documento não encontrado',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar recibo', [
                'documento_id' => $documentoId,
                'error'        => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar recibo: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | NOTA DE CRÉDITO
     | ================================================================== */

    /**
     * POST /api/documentos-fiscais/{id}/nota-credito
     * Cria uma Nota de Crédito vinculada a uma FT ou FR.
     */
    public function criarNotaCredito(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if (! in_array($documento->tipo_documento, ['FT', 'FR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'NC só pode ser gerada a partir de FT ou FR. Tipo: ' . $documento->tipo_documento,
                ], 422);
            }

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string',
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|min:0',
                'motivo'                 => 'required|string|max:500',
            ]);

            $nc = $this->documentoService->criarNotaCredito($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Nota de Crédito emitida com sucesso',
                'data'    => $nc,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Documento de origem não encontrado',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao criar Nota de Crédito', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao emitir Nota de Crédito: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | NOTA DE DÉBITO
     | ================================================================== */

    /**
     * POST /api/documentos-fiscais/{id}/nota-debito
     * Cria uma Nota de Débito vinculada a uma FT ou FR.
     */
    public function criarNotaDebito(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if (! in_array($documento->tipo_documento, ['FT', 'FR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'ND só pode ser gerada a partir de FT ou FR. Tipo: ' . $documento->tipo_documento,
                ], 422);
            }

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string',
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|min:0',
                'motivo'                 => 'nullable|string|max:500',
            ]);

            $nd = $this->documentoService->criarNotaDebito($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Nota de Débito emitida com sucesso',
                'data'    => $nd,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Documento de origem não encontrado',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao criar Nota de Débito', [
                'documento_id' => $documentoId,
                'error'        => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao emitir Nota de Débito: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | ADIANTAMENTO
     | ================================================================== */

    /**
     * POST /api/documentos-fiscais/{id}/vincular-adiantamento
     * Vincula uma FA a uma FT.
     */
    public function vincularAdiantamento(Request $request, string $adiantamentoId): JsonResponse
    {
        try {
            $adiantamento = $this->documentoService->buscarDocumento($adiantamentoId);

            if ($adiantamento->tipo_documento !== 'FA') {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas FA pode ser vinculada. Tipo: ' . $adiantamento->tipo_documento,
                ], 422);
            }

            $dados = $request->validate([
                'fatura_id' => 'required|uuid|exists:documentos_fiscais,id',
                'valor'     => 'required|numeric|min:0.01|max:' . $adiantamento->total_liquido,
            ]);

            $fatura = $this->documentoService->buscarDocumento($dados['fatura_id']);

            if ($fatura->tipo_documento !== 'FT') {
                return response()->json([
                    'success' => false,
                    'message' => 'O destino deve ser uma FT. Tipo: ' . $fatura->tipo_documento,
                ], 422);
            }

            $resultado = $this->documentoService->vincularAdiantamento(
                $adiantamento,
                $fatura,
                (float) $dados['valor']
            );

            return response()->json([
                'success' => true,
                'message' => 'Adiantamento vinculado com sucesso',
                'data'    => $resultado,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao vincular adiantamento', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao vincular adiantamento: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | CANCELAMENTO
     | ================================================================== */

    /**
     * POST /api/documentos-fiscais/{id}/cancelar
     * Cancela um documento fiscal.
     */
    public function cancelar(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if ($documento->estado === 'cancelado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Documento já se encontra cancelado',
                ], 422);
            }

            $dados = $request->validate([
                'motivo' => 'required|string|min:10|max:500',
            ]);

            $documento = $this->documentoService->cancelarDocumento($documento, $dados['motivo']);

            return response()->json([
                'success' => true,
                'message' => 'Documento cancelado com sucesso',
                'data'    => $documento,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao cancelar documento', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /* =====================================================================
     | RECIBOS DE UM DOCUMENTO
     | ================================================================== */

    /**
     * GET /api/documentos-fiscais/{id}/recibos
     * Lista os recibos associados a uma FT ou FA.
     */
    public function listarRecibos(string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if (! in_array($documento->tipo_documento, ['FT', 'FA'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas FT e FA possuem recibos. Tipo: ' . $documento->tipo_documento,
                ], 422);
            }

            $recibos = $documento->recibos()->with('user')->get();

            return response()->json([
                'success' => true,
                'message' => 'Recibos carregados com sucesso',
                'data'    => $recibos,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao listar recibos', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar recibos: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | ADIANTAMENTOS E PROFORMAS PENDENTES
     | ================================================================== */

    /**
     * GET /api/documentos-fiscais/adiantamentos-pendentes
     * Lista adiantamentos (FA) pendentes de utilização.
     */
    public function adiantamentosPendentes(Request $request): JsonResponse
    {
        try {
            $dados = $request->validate([
                'cliente_id'   => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
            ]);

            $query = DocumentoFiscal::where('tipo_documento', 'FA')
                ->whereIn('estado', ['emitido', 'parcialmente_paga']);

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
            Log::error('Erro ao listar adiantamentos', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar adiantamentos: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/documentos-fiscais/proformas-pendentes
     * Lista proformas (FP) pendentes.
     */
    public function proformasPendentes(Request $request): JsonResponse
    {
        try {
            $dados = $request->validate([
                'cliente_id'   => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
            ]);

            $query = DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', 'emitido');

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
            Log::error('Erro ao listar proformas', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar proformas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | ALERTAS
     | ================================================================== */

    /**
     * GET /api/documentos-fiscais/alertas
     * Alertas gerais de documentos — versão simples (mantida para compatibilidade).
     */
    public function alertas(): JsonResponse
    {
        try {
            $vencidos = DocumentoFiscal::where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->where('data_vencimento', '<', now())
                ->with('cliente')
                ->get();

            $faturasComAdiantamentosPendentes = DocumentoFiscal::whereIn('tipo_documento', ['FT'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->whereHas('faturasAdiantamento', fn ($q) =>
                    $q->where('estado', 'emitido')
                )
                ->with(['cliente', 'faturasAdiantamento'])
                ->get();

            $proformasPendentes = DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', 'emitido')
                ->where('data_emissao', '<', now()->subDays(30))
                ->with('cliente')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Alertas de documentos fiscais',
                'data'    => [
                    'adiantamentos_vencidos' => [
                        'total' => $vencidos->count(),
                        'items' => $vencidos,
                    ],
                    'faturas_com_adiantamentos_pendentes' => [
                        'total' => $faturasComAdiantamentosPendentes->count(),
                        'items' => $faturasComAdiantamentosPendentes,
                    ],
                    'proformas_pendentes' => [
                        'total' => $proformasPendentes->count(),
                        'items' => $proformasPendentes,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar alertas', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar alertas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/dashboard/alertas-pendentes
     * Alertas detalhados para o dashboard.
     */
    public function alertasPendentes(): JsonResponse
    {
        try {
            $alertas = $this->documentoService->alertasPendentes();

            return response()->json([
                'success' => true,
                'message' => 'Alertas carregados com sucesso',
                'data'    => ['alertas' => $alertas],
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar alertas pendentes', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar alertas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | PROCESSAMENTO DE EXPIRADOS
     | ================================================================== */

    /**
     * POST /api/documentos-fiscais/processar-expirados
     * Processa adiantamentos expirados — idealmente chamado por Job agendado.
     */
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
            Log::error('Erro ao processar expirados', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao processar adiantamentos expirados: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | DASHBOARD
     | ================================================================== */

    /**
     * GET /api/dashboard
     * Dados resumidos para o dashboard principal.
     */
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
            Log::error('Erro ao carregar dashboard', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/dashboard/evolucao-mensal
     * Evolução mensal de documentos fiscais para um dado ano.
     */
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
            Log::error('Erro ao carregar evolução mensal', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar evolução mensal: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/dashboard/estatisticas-pagamentos
     * Estatísticas de pagamentos por método e período.
     */
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
            Log::error('Erro ao carregar estatísticas de pagamentos', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar estatísticas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /* =====================================================================
     | IMPRESSÃO E EXPORTAÇÃO
     | ================================================================== */

    /**
     * GET /api/documentos-fiscais/{id}/pdf
     * Gera e devolve o PDF de um documento fiscal.
     *
     * Requer: composer require barryvdh/laravel-dompdf
     * Requer: view resources/views/documentos/pdf.blade.php
     */
    public function imprimirPdf(string $id): Response
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);
            $dados     = $this->documentoService->dadosParaPdf($documento);

            $pdf = Pdf::loadView('documentos.pdf', $dados)
                ->setPaper('a4', 'portrait')
                ->setOptions([
                    'defaultFont'    => 'DejaVu Sans',
                    'isRemoteEnabled' => true,
                    'isHtml5ParserEnabled' => true,
                    'dpi'            => 150,
                ]);

            $nomeArquivo = $documento->numero_documento . '.pdf';

            return $pdf->stream($nomeArquivo);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro ao gerar PDF', ['id' => $id, 'error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar PDF: ' . $e->getMessage());
        }
    }

    /**
     * GET /api/documentos-fiscais/{id}/pdf/download
     * Faz download do PDF de um documento fiscal.
     */
    public function downloadPdf(string $id): Response
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);
            $dados     = $this->documentoService->dadosParaPdf($documento);

            $pdf = Pdf::loadView('documentos.pdf', $dados)
                ->setPaper('a4', 'portrait')
                ->setOptions([
                    'defaultFont'         => 'DejaVu Sans',
                    'isRemoteEnabled'     => true,
                    'isHtml5ParserEnabled' => true,
                    'dpi'                 => 150,
                ]);

            $nomeArquivo = $documento->numero_documento . '.pdf';

            return $pdf->download($nomeArquivo);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro ao fazer download do PDF', ['id' => $id, 'error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar PDF: ' . $e->getMessage());
        }
    }

    /**
     * GET /api/documentos-fiscais/exportar-excel
     * Exporta a lista de documentos fiscais para Excel (.xlsx).
     *
     * Requer: composer require phpoffice/phpspreadsheet
     */
    public function exportarExcel(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        try {
            $filtros = $request->validate([
                'tipo'             => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado'           => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'cliente_id'       => 'nullable|uuid|exists:clientes,id',
                'data_inicio'      => 'nullable|date',
                'data_fim'         => 'nullable|date',
                'apenas_vendas'    => 'nullable|boolean',
                'apenas_nao_vendas' => 'nullable|boolean',
            ]);

            $dados       = $this->documentoService->dadosParaExcel($filtros);
            $cabecalho   = $dados['cabecalho'];
            $linhas      = $dados['linhas'];

            $spreadsheet = new Spreadsheet();
            $sheet       = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Documentos Fiscais');

            // Cabeçalho — negrito com fundo cinza
            $sheet->fromArray([$cabecalho], null, 'A1');

            $ultimaColuna = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($cabecalho));

            $sheet->getStyle("A1:{$ultimaColuna}1")->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => [
                    'fillType'   => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '374151'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            // Dados
            if (! empty($linhas)) {
                $sheet->fromArray($linhas, null, 'A2');
            }

            // Ajustar largura das colunas automaticamente
            foreach (range(1, count($cabecalho)) as $col) {
                $colLetra = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
                $sheet->getColumnDimension($colLetra)->setAutoSize(true);
            }

            // Congelar linha de cabeçalho
            $sheet->freezePane('A2');

            $nomeArquivo = 'documentos-fiscais-' . now()->format('Y-m-d') . '.xlsx';

            return response()->streamDownload(function () use ($spreadsheet) {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
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
}
