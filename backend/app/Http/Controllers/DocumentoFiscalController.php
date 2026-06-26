<?php

namespace App\Http\Controllers;

use App\Models\Tenant\DocumentoFiscal;
use App\Services\DocumentoFiscalService;
use App\Services\ImpressoraTermicaService;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Writer\SvgWriter;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * DocumentoFiscalController
 *
 * Responsável apenas por: validação de request, autorização, chamar o service
 * e devolver resposta JSON/PDF/Excel.
 * Toda a lógica de negócio (assinatura RSA, QR Code, IVA, SAF-T) está no
 * DocumentoFiscalService.
 * 
 * ALTERAÇÃO: Proformas (FP) NÃO são consideradas em valores de faturação
 * ou pendências financeiras, pois não representam vendas efetivas.
 */
class DocumentoFiscalController extends Controller
{
    protected DocumentoFiscalService $documentoService;

    public function __construct(DocumentoFiscalService $documentoService)
    {
        $this->documentoService = $documentoService;
    }

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

            $booleans = [
                'apenas_vendas',
                'apenas_nao_vendas',
                'pendentes',
                'adiantamentos_pendentes',
                'proformas_pendentes',
                'com_retencao'
            ];
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
                'cliente_nif'                => 'nullable|string|max:14',
                'fatura_id'                  => 'nullable|uuid|exists:documentos_fiscais,id',
                'itens'                      => 'required_unless:tipo_documento,FA|array',
                'itens.*.produto_id'         => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'          => 'required_with:itens|string',
                'itens.*.quantidade'         => 'required_with:itens|numeric|min:0.01',
                'itens.*.preco_unitario'     => 'required_with:itens|numeric|min:0',
                'itens.*.taxa_iva'           => 'required_with:itens|numeric|in:0,5,14',
                'itens.*.desconto'           => 'nullable|numeric|min:0',
                'itens.*.codigo_isencao'     => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
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
            $documento = $this->documentoService->buscarDocumento($documentoId);

            // ALTERADO: Proformas (FP) NÃO podem mais gerar recibos diretamente
            if ($documento->tipo_documento === 'FP') {
                return response()->json([
                    'success' => false,
                    'message' => 'Proformas (FP) não podem gerar recibos diretamente. Utilize o endpoint /converter-proforma/{id} para converter a Proforma em Fatura-Recibo (FR) ou Fatura (FT).',
                ], 422);
            }

            // Apenas FT e FA podem gerar recibos
            if (!in_array($documento->tipo_documento, ['FT', 'FA'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Apenas Faturas (FT) e Faturas de Adiantamento (FA) podem gerar recibos. Tipo atual: {$documento->tipo_documento}",
                ], 422);
            }

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
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao gerar recibo', $e);
        }
    }

    /* =====================================================================
     | NOTA DE CRÉDITO (CORRIGIDO)
     | ================================================================== */

    public function criarNotaCredito(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            /**
             * VALIDAÇÕES PARA NOTA DE CRÉDITO (Angola)
             * 
             * NOTA DE CRÉDITO = DIMINUI o valor da fatura
             * Usos permitidos:
             * - Devolução total ou parcial de mercadoria
             * - Correção de erro no valor da fatura
             * - Desconto concedido após emissão
             * - Cancelamento de serviços não prestados
             * - Retificação de IVA incorreto
             */
            
            // 1. Verificar se o documento é uma Fatura (FT) ou Fatura-Recibo (FR)
            if (!in_array($documento->tipo_documento, ['FT', 'FR'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Crédito só pode ser emitida a partir de Fatura (FT) ou Fatura-Recibo (FR). Tipo atual: {$documento->tipo_documento}",
                ], 422);
            }

            // 2. Verificar se a fatura não está cancelada ou expirada
            if ($documento->estado === 'cancelado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Crédito para uma fatura cancelada',
                ], 422);
            }

            if ($documento->estado === 'expirado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Crédito para uma fatura expirada',
                ], 422);
            }

            // 3. Verificar se a fatura tem saldo disponível para crédito
            $valorTotalCreditos = $this->documentoService->calcularTotalCreditosEmitidos($documento);
            $valorMaximoCredito = $documento->total_liquido - $valorTotalCreditos;

            if ($valorMaximoCredito <= 0.01) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta fatura já possui créditos emitidos que cobrem todo o seu valor',
                    'data' => [
                        'total_fatura' => $documento->total_liquido,
                        'creditos_emitidos' => $valorTotalCreditos,
                        'saldo_disponivel' => $valorMaximoCredito
                    ]
                ], 422);
            }

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string',
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|in:0,5,14',
                'itens.*.codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                'motivo'                 => 'required|string|min:10|max:500', // Motivo obrigatório
            ]);

            /**
             * 4. Validar se o valor total da nota de crédito não ultrapassa
             *    o valor máximo permitido (saldo da fatura)
             */
            $valorTotalNC = 0;
            foreach ($dados['itens'] as $item) {
                $subtotal = $item['quantidade'] * $item['preco_unitario'];
                $iva = $subtotal * ($item['taxa_iva'] / 100);
                $valorTotalNC += $subtotal + $iva;
            }

            if ($valorTotalNC > $valorMaximoCredito) {
                return response()->json([
                    'success' => false,
                    'message' => "O valor total da Nota de Crédito (" . number_format($valorTotalNC, 2) . " Kz) excede o saldo disponível da fatura (" . number_format($valorMaximoCredito, 2) . " Kz)",
                    'data' => [
                        'total_fatura' => $documento->total_liquido,
                        'creditos_emitidos' => $valorTotalCreditos,
                        'saldo_disponivel' => $valorMaximoCredito,
                        'total_nc' => $valorTotalNC
                    ]
                ], 422);
            }

            /**
             * 5. A nota de crédito deve referenciar a fatura original
             */
            $dados['fatura_id'] = $documento->id;
            $dados['tipo_documento'] = 'NC';

            DB::beginTransaction();

            try {
                $nc = $this->documentoService->emitirDocumento($dados);

                /**
                 * 6. Após emitir, atualizar o estado da fatura original
                 */
                $this->documentoService->atualizarEstadoFaturaAposCredito($documento);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Nota de Crédito emitida com sucesso',
                    'data' => [
                        'nota_credito' => $nc,
                        'fatura_original' => [
                            'id' => $documento->id,
                            'numero' => $documento->numero_documento,
                            'valor_total' => $documento->total_liquido,
                            'creditos_emitidos' => $valorTotalCreditos + $valorTotalNC,
                            'saldo_restante' => $valorMaximoCredito - $valorTotalNC
                        ]
                    ]
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento de origem não encontrado'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao emitir Nota de Crédito', $e);
        }
    }

    /* =====================================================================
     | NOTA DE DÉBITO (CORRIGIDO)
     | ================================================================== */

    public function criarNotaDebito(Request $request, string $documentoId): JsonResponse
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            /**
             * VALIDAÇÕES PARA NOTA DE DÉBITO (Angola)
             * 
             * NOTA DE DÉBITO = AUMENTA o valor da fatura
             * Usos permitidos (de acordo com a lei):
             * 1. Cobrança de serviços adicionais não previstos
             * 2. Juros de mora (até 30 dias após vencimento)
             * 3. Multas contratuais
             * 4. Correção de preço para cima
             * 5. Custos adicionais (frete, taxas, comissões)
             * 6. Serviços complementares solicitados posteriormente
             * 
             * RESTRIÇÕES:
             * - Apenas FT (NÃO FR, FP, FA)
             * - Apenas serviços (NÃO produtos físicos)
             * - Prazo máximo de 30 dias após emissão
             * - Fatura não pode estar cancelada ou expirada
             * - Se fatura já paga, apenas para juros/multas
             */
            
            // 1. Verificar se o documento é uma Fatura (FT)
            if (!in_array($documento->tipo_documento, ['FT'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Débito só pode ser emitida a partir de Fatura (FT). Tipo atual: {$documento->tipo_documento}",
                ], 422);
            }

            // 2. Verificar se a fatura não está cancelada
            if ($documento->estado === 'cancelado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Débito para uma fatura cancelada',
                ], 422);
            }

            if ($documento->estado === 'expirado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Débito para uma fatura expirada',
                ], 422);
            }

            // 3. Validar prazo máximo de 30 dias
            $dataEmissao = new \DateTime($documento->data_emissao);
            $prazoMaximo = (clone $dataEmissao)->modify('+30 days');
            $hoje = new \DateTime();

            if ($hoje > $prazoMaximo) {
                return response()->json([
                    'success' => false,
                    'message' => "O prazo para emitir Nota de Débito é de até 30 dias após a emissão da fatura.\n" .
                                 "Fatura emitida em: {$dataEmissao->format('d/m/Y')}\n" .
                                 "Prazo máximo: {$prazoMaximo->format('d/m/Y')}\n" .
                                 "Hoje: {$hoje->format('d/m/Y')}",
                ], 422);
            }

            // 4. Validar se a fatura já foi paga (neste caso, só permite juros/multas)
            $valorPago = $this->documentoService->calcularValorPago($documento);
            $faturaPaga = $documento->estado === 'paga' || $valorPago >= $documento->total_liquido;

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string|min:5', // Descrição detalhada
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|in:0,5,14',
                'itens.*.codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                'itens.*.eh_servico'     => 'nullable|boolean',
                'motivo'                 => 'nullable|string|max:500',
            ]);

            /**
             * 5. VALIDAÇÃO: Os itens devem ser SERVIÇOS (não produtos físicos)
             * E para fatura paga, devem ser juros ou multas
             */
            $temServico = false;
            $temJurosOuMulta = false;
            $itensInvalidos = [];

            foreach ($dados['itens'] as $item) {
                $isServicoMarcado = filter_var($item['eh_servico'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                $isServicoDescricao = false;

                $descricaoLower = strtolower($item['descricao']);
                $palavrasServico = [
                    'serviço', 'servico', 'consulta', 'consultoria',
                    'manutenção', 'manutencao', 'instalação', 'instalacao',
                    'juro', 'multa', 'penalidade', 'taxa', 'comissão', 'comissao'
                ];
                foreach ($palavrasServico as $palavra) {
                    if (strpos($descricaoLower, $palavra) !== false) {
                        $isServicoDescricao = true;
                        break;
                    }
                }

                $produto = null;
                // Verifica se é serviço pelo produto_id
                if (!empty($item['produto_id'])) {
                    $produto = \App\Models\Tenant\Produto::find($item['produto_id']);
                    if ($produto && $produto->tipo !== 'servico') {
                        $itensInvalidos[] = $item['descricao'];
                    } elseif ($produto && $produto->tipo === 'servico') {
                        $temServico = true;
                    } elseif ($isServicoMarcado === true || $isServicoDescricao) {
                        $temServico = true;
                    }
                } else {
                    // Item avulso - verifica pela descrição
                    if ($isServicoMarcado === true || $isServicoDescricao) {
                        $temServico = true;
                    } else {
                        $itensInvalidos[] = $item['descricao'];
                    }
                }

                // Verifica se é juros ou multa (para fatura paga)
                if (strpos($descricaoLower, 'juro') !== false || 
                    strpos($descricaoLower, 'juros') !== false ||
                    strpos($descricaoLower, 'multa') !== false ||
                    strpos($descricaoLower, 'penalidade') !== false) {
                    $temJurosOuMulta = true;
                }
            }

            // 5.1 Se não tiver serviços válidos
            if (!$temServico) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Débito só pode ser usada para serviços.\n" .
                                 "Os seguintes itens não são serviços: " . implode(', ', $itensInvalidos),
                ], 422);
            }

            // 5.2 Se tiver itens inválidos (produtos)
            if (!empty($itensInvalidos)) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Débito não pode ser usada para produtos físicos.\n" .
                                 "Os seguintes itens são produtos: " . implode(', ', $itensInvalidos) . "\n" .
                                 "Use Nota de Débito apenas para serviços adicionais, juros ou multas.",
                ], 422);
            }

            // 5.3 Se fatura já está paga, exige que seja juros ou multa
            if ($faturaPaga && !$temJurosOuMulta) {
                return response()->json([
                    'success' => false,
                    'message' => "A fatura já está paga.\n" .
                                 "Nota de Débito para fatura paga deve ser exclusivamente para:\n" .
                                 "- Juros de mora\n" .
                                 "- Multas contratuais\n" .
                                 "Inclua 'juros' ou 'multa' na descrição dos itens.",
                ], 422);
            }

            /**
             * 6. Calcular valor total do débito
             */
            $valorTotalND = 0;
            foreach ($dados['itens'] as $item) {
                $subtotal = $item['quantidade'] * $item['preco_unitario'];
                $iva = $subtotal * ($item['taxa_iva'] / 100);
                $valorTotalND += $subtotal + $iva;
            }

            if ($valorTotalND <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'O valor total da Nota de Débito deve ser maior que zero.',
                ], 422);
            }

            /**
             * 7. A nota de débito deve referenciar a fatura original
             */
            $dados['fatura_id'] = $documento->id;
            $dados['tipo_documento'] = 'ND';

            DB::beginTransaction();

            try {
                $nd = $this->documentoService->emitirDocumento($dados);

                /**
                 * 8. Atualizar o estado da fatura original
                 */
                $novoValorTotal = $documento->total_liquido + $valorTotalND;
                
                // Se a fatura estava paga, passa a parcialmente_paga
                if ($documento->estado === 'paga') {
                    $documento->estado = 'parcialmente_paga';
                    $documento->save();
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Nota de Débito emitida com sucesso',
                    'data' => [
                        'nota_debito' => $nd,
                        'fatura_original' => [
                            'id' => $documento->id,
                            'numero' => $documento->numero_documento,
                            'valor_original' => $documento->total_liquido,
                            'valor_debito' => $valorTotalND,
                            'novo_valor_total' => $novoValorTotal,
                            'valor_pago_anterior' => $valorPago,
                            'saldo_pendente_atual' => $novoValorTotal - $valorPago,
                            'fatura_estava_paga' => $faturaPaga
                        ]
                    ]
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

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

    /**
     * Dashboard de documentos fiscais
     * ALTERAÇÃO: Proformas (FP) NÃO são incluídas nos valores de faturação
     * para não distorcer as métricas financeiras.
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

    /**
     * Estatísticas de pagamentos
     * ALTERAÇÃO: Proformas (FP) NÃO são consideradas em valores pendentes/atrasados
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
            return $this->erroInterno('Erro ao carregar estatísticas de pagamentos', $e);
        }
    }

    /* =====================================================================
     | IMPRESSÃO TÉRMICA DIRETA — APENAS USB (70mm)
     | ================================================================== */

    public function imprimirTermica(string $id, ImpressoraTermicaService $impressoraService): JsonResponse
    {
        try {
            $user = Auth::guard('tenant')->user();

            if (!$impressoraService->testarConexao()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impressora USB não encontrada ou sem permissão. Verifique o cabo e as permissões.',
                ], 400);
            }

            $documento = $this->documentoService->buscarDocumento($id);
            $dados     = $this->documentoService->dadosParaPdf($documento);

            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                $docInfo = DocumentoFiscal::with(['itens.produto', 'cliente'])->find($documento->fatura_id);
            } else {
                $docInfo = $documento;
            }

            $dados['itens']   = $docInfo->itens ?? [];
            $dados['docInfo'] = $docInfo;

            Log::info('Iniciando impressão térmica via USB', [
                'id'             => $id,
                'tipo_documento' => $documento->tipo_documento ?? 'unknown',
                'itens_count'    => count($dados['itens']),
            ]);

            $impressoraService->imprimirDocumento($documento, $dados, $user);

            return response()->json([
                'success' => true,
                'id'      => $id,
                'message' => 'Documento impresso com sucesso',
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro na impressão térmica', $e);
        }
    }

    /* =====================================================================
     | IMPRESSÃO A4 (HTML para impressão)
     | ================================================================== */

    /**
     * Abre uma página HTML formatada para impressão em papel A4
     * Rota: GET /api/documentos-fiscais/{id}/print-a4
     */
    public function printA4(Request $request, string $id): \Illuminate\Contracts\View\View
    {
        try {
            Log::info('printA4 called', ['id' => $id]);
            
            $documento = $this->documentoService->buscarDocumento($id);
            $dados = $this->documentoService->dadosParaPdf($documento);
            
            // Buscar dados completos da empresa
            $empresa = \App\Models\Empresa::on('landlord')
                ->where('db_name', config('database.connections.tenant.database'))
                ->first();
            
            if ($empresa) {
                $empresaArray = $empresa->toArray();
                $empresaArray['logo_base64'] = null;
                
                // Tenta carregar o logo em base64
                $logoPath = $empresaArray['logo'] ?? null;
                if (!empty($logoPath)) {
                    try {
                        if (Storage::disk('public')->exists($logoPath)) {
                            $logoConteudo = Storage::disk('public')->get($logoPath);
                            $logoMime = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                            $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                        } elseif (file_exists(public_path($logoPath))) {
                            $logoConteudo = file_get_contents(public_path($logoPath));
                            $logoMime = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                            $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                        }
                    } catch (\Throwable $logoErr) {
                        Log::warning('printA4: erro ao converter logo', ['error' => $logoErr->getMessage()]);
                    }
                }
                
                $dados['empresa'] = $empresaArray;
            } else {
                $dados['empresa'] = $dados['empresa'] ?? [];
            }
            
            // Garantir que o endereço está presente
            if (empty($dados['empresa']['endereco']) && !empty($dados['empresa']['morada'])) {
                $dados['empresa']['endereco'] = $dados['empresa']['morada'];
            }
            
            // Buscar documento de origem para recibos
            $documentoOrigem = null;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                $documentoOrigem = DocumentoFiscal::with(['itens.produto', 'cliente'])->find($documento->fatura_id);
            }
            
            $docInfo = $documentoOrigem ?? $documento;
            
            // Gerar QR Code
            $qrCodeTexto = $dados['qr_code'] ?? null;
            $qrCodeImg = null;
            if ($qrCodeTexto) {
                try {
                    $qr = new QrCode(
                        $qrCodeTexto,
                        new Encoding('UTF-8'),
                        ErrorCorrectionLevel::Medium,
                        220,
                        6
                    );
                    $writer = new SvgWriter();
                    $result = $writer->write($qr, null, null, [
                        SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
                    ]);
                    $qrCodeImg = $result->getDataUri();
                } catch (\Throwable $e) {
                    Log::warning('printA4: erro ao gerar QR Code', ['error' => $e->getMessage()]);
                }
            }
            
            $proofUrl    = $this->montarUrlDeProva(request(), $id);
            $proofQrHtml = $this->gerarQrHtml($proofUrl);

            return view('documentos.print-view', [
                'empresa'         => $dados['empresa'],
                'documento'       => $documento,
                'documentoOrigem' => $documentoOrigem,
                'docInfo'         => $docInfo,
                'itens'           => $docInfo->itens ?? [],
                'cliente'         => $dados['cliente'],
                'qr_code'         => $qrCodeTexto,
                'qr_code_img'     => $qrCodeImg,
                'qr_html'         => $this->gerarQrHtml($qrCodeTexto),
                'proof_url'       => $proofUrl,
                'proof_qr_html'   => $proofQrHtml,
                'descontoGlobal'  => $dados['desconto_global'] ?? 0,
                'troco'           => $dados['troco'] ?? 0,
                'temDesconto'     => ($dados['desconto_global'] ?? 0) > 0,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('printA4: documento não encontrado', ['id' => $id]);
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro no printA4', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            abort(500, 'Erro ao gerar impressão A4: ' . $e->getMessage());
        }
    }

    /* =====================================================================
     | PDF (DomPDF) - DOWNLOAD A4
     | ================================================================== */

    /**
     * Download do PDF do documento fiscal em formato A4
     * 
     * @param string $id
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
     */
    public function downloadPdf(string $id)
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);
            $dados = $this->documentoService->dadosParaPdf($documento);
            $dados['qr_html'] = $this->gerarQrHtml($dados['qr_code'] ?? null);
            $dados['proof_url'] = $this->montarUrlDeProva(request(), $id);
            $dados['proof_qr_html'] = $this->gerarQrHtml($dados['proof_url']);

            // Buscar os dados completos da empresa (igual ao pdfViewer)
            $empresa = \App\Models\Empresa::on('landlord')
                ->where('db_name', config('database.connections.tenant.database'))
                ->first();

            if ($empresa) {
                $empresaArray = $empresa->toArray();
                $empresaArray['logo_base64'] = null;

                // Tenta carregar o logo em base64
                $logoPath = $empresaArray['logo'] ?? null;
                if (!empty($logoPath)) {
                    try {
                        if (Storage::disk('public')->exists($logoPath)) {
                            $logoConteudo = Storage::disk('public')->get($logoPath);
                            $logoMime = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                            $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                        } elseif (file_exists(public_path($logoPath))) {
                            $logoConteudo = file_get_contents(public_path($logoPath));
                            $logoMime = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                            $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                        }
                    } catch (\Throwable $logoErr) {
                        Log::warning('downloadPdf: erro ao converter logo', ['error' => $logoErr->getMessage()]);
                    }
                }

                $dados['empresa'] = $empresaArray;
            } else {
                $dados['empresa'] = $dados['empresa'] ?? [];
            }

            // Garantir que o endereço está presente
            if (empty($dados['empresa']['endereco']) && !empty($dados['empresa']['morada'])) {
                $dados['empresa']['endereco'] = $dados['empresa']['morada'];
            }

            Log::info('[downloadPdf] Dados da empresa preparados', [
                'empresa_nome' => $dados['empresa']['nome'] ?? 'N/A',
                'empresa_endereco' => $dados['empresa']['endereco'] ?? 'N/A',
            ]);

            $pdf = Pdf::loadView('documentos.pdf', $dados)
                ->setPaper('a4', 'portrait')
                ->setOptions([
                    'defaultFont'          => 'DejaVu Sans',
                    'isRemoteEnabled'      => true,
                    'isHtml5ParserEnabled' => true,
                    'dpi'                  => 150,
                ]);

            return $pdf->download($documento->numero_documento . '.pdf');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Documento não encontrado para download PDF', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Documento não encontrado'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Erro ao fazer download do PDF', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /* =====================================================================
     | PDF VIEWER — TALÃO TÉRMICO HTML (70mm)
     | ================================================================== */

    public function pdfViewer(Request $request, string $id): \Illuminate\Contracts\View\View
    {
        try {
            Log::info('pdfViewer called', ['id' => $id]);
            $documento = $this->documentoService->buscarDocumento($id);
            $dados     = $this->documentoService->dadosParaPdf($documento);

            $documentoOrigem = null;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                $documentoOrigem = DocumentoFiscal::with(['itens.produto', 'cliente'])
                    ->find($documento->fatura_id);
            }

            $docInfo = $documentoOrigem ?? $documento;

            $qrCodeTexto = $dados['qr_code'] ?? null;
            $qrCodeImg   = null;

            if ($qrCodeTexto && class_exists(QrCode::class)) {
                try {
                    $qrCode = new QrCode(
                        $qrCodeTexto,
                        new Encoding('UTF-8'),
                        ErrorCorrectionLevel::Medium,
                        220,
                        6
                    );
                    $writer    = new SvgWriter();
                    $result    = $writer->write($qrCode, null, null, [
                        SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
                    ]);
                    $qrCodeImg = $result->getDataUri();
                } catch (\Throwable $e) {
                    Log::warning('QR Code generation failed', ['error' => $e->getMessage()]);
                }
            }

            $empresa = \App\Models\Empresa::on('landlord')
                ->where('db_name', config('database.connections.tenant.database'))
                ->first();

            $empresa = $empresa ? $empresa->toArray() : [];
            $empresa['logo_base64'] = null;

            $logoPath = $empresa['logo'] ?? null;

            if (!empty($logoPath)) {
                try {
                    if (Storage::disk('public')->exists($logoPath)) {
                        $logoConteudo           = Storage::disk('public')->get($logoPath);
                        $logoMime               = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresa['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (Storage::disk('local')->exists($logoPath)) {
                        $logoConteudo           = Storage::disk('local')->get($logoPath);
                        $logoMime               = Storage::disk('local')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresa['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (file_exists(public_path($logoPath))) {
                        $logoConteudo           = file_get_contents(public_path($logoPath));
                        $logoMime               = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                        $empresa['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } else {
                        Log::warning('pdfViewer: logo não encontrado em nenhum disco', ['logo_path' => $logoPath]);
                    }
                } catch (\Throwable $logoErr) {
                    Log::warning('pdfViewer: erro ao converter logo para base64', [
                        'logo_path' => $logoPath,
                        'error'     => $logoErr->getMessage(),
                    ]);
                }
            }

            $proofUrl    = $this->montarUrlDeProva($request, $id);
            $proofQrHtml = $this->gerarQrHtml($proofUrl);

            return view('documentos.pdf-viewer', [
                'empresa'         => $empresa,
                'documento'       => $documento,
                'documentoOrigem' => $documentoOrigem,
                'docInfo'         => $docInfo,
                'itens'           => collect($docInfo->itens ?? []),
                'cliente'         => $dados['cliente'],
                'qr_code'         => $qrCodeTexto,
                'qr_code_img'     => $qrCodeImg,
                'qr_html'         => $this->gerarQrHtml($qrCodeTexto),
                'proof_url'       => $proofUrl,
                'proof_qr_html'   => $proofQrHtml,
                'auto_print'      => filter_var($request->query('auto', false), FILTER_VALIDATE_BOOLEAN),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro no pdfViewer', ['error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar visualização do PDF');
        }
    }

    public function publicProof(Request $request, string $id): \Illuminate\Contracts\View\View
    {
        try {
            $documento = $this->documentoService->buscarDocumento($id);
            $dados = $this->documentoService->dadosParaPdf($documento);

            $documentoOrigem = null;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                $documentoOrigem = DocumentoFiscal::with(['itens.produto', 'cliente'])
                    ->find($documento->fatura_id);
            }

            $docInfo = $documentoOrigem ?? $documento;
            $proofUrl = $this->montarUrlDeProva($request, $id);
            $proofQrHtml = $this->gerarQrHtml($proofUrl);

            $empresa = \App\Models\Empresa::on('landlord')
                ->where('db_name', config('database.connections.tenant.database'))
                ->first();

            $empresa = $empresa ? $empresa->toArray() : [];
            $empresa['logo_base64'] = null;

            $logoPath = $empresa['logo'] ?? null;

            if (!empty($logoPath)) {
                try {
                    if (Storage::disk('public')->exists($logoPath)) {
                        $logoConteudo           = Storage::disk('public')->get($logoPath);
                        $logoMime               = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresa['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (Storage::disk('local')->exists($logoPath)) {
                        $logoConteudo           = Storage::disk('local')->get($logoPath);
                        $logoMime               = Storage::disk('local')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresa['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (file_exists(public_path($logoPath))) {
                        $logoConteudo           = file_get_contents(public_path($logoPath));
                        $logoMime               = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                        $empresa['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    }
                } catch (\Throwable $logoErr) {
                    Log::warning('publicProof: erro ao converter logo para base64', [
                        'logo_path' => $logoPath,
                        'error'     => $logoErr->getMessage(),
                    ]);
                }
            }

            return view('documentos.proof', [
                'empresa'         => $empresa,
                'documento'       => $documento,
                'documentoOrigem' => $documentoOrigem,
                'docInfo'         => $docInfo,
                'itens'           => collect($docInfo->itens ?? []),
                'cliente'         => $dados['cliente'],
                'qr_code'         => $dados['qr_code'],
                'qr_html'         => $this->gerarQrHtml($dados['qr_code'] ?? null),
                'proof_url'       => $proofUrl,
                'proof_qr_html'   => $proofQrHtml,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro no publicProof', ['error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar comprovativo público');
        }
    }

    /* =====================================================================
     | EXPORTAR EXCEL
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
     | CONVERSÃO DE PROFORMA PARA FATURA/RECIBO
     | ================================================================== */

    /**
     * Converte uma Proforma (FP) em Fatura (FT) ou Fatura-Recibo (FR)
     * Este é o método correto para transformar proformas em documentos de venda efetiva
     */
    public function converterProforma(Request $request, string $proformaId): JsonResponse
    {
        try {
            $proforma = $this->documentoService->buscarDocumento($proformaId);

            if ($proforma->tipo_documento !== 'FP') {
                return response()->json([
                    'success' => false,
                    'message' => 'Este documento não é uma Proforma (FP). Tipo atual: ' . $proforma->tipo_documento,
                ], 422);
            }

            $dados = $request->validate([
                'tipo_destino' => 'required|in:FT,FR',
                'dados_pagamento' => 'required_if:tipo_destino,FR|nullable|array',
                'dados_pagamento.metodo' => 'required_if:tipo_destino,FR|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'dados_pagamento.valor' => 'required_if:tipo_destino,FR|numeric|min:0.01|max:' . $proforma->total_liquido,
                'data_vencimento' => 'nullable|date|after_or_equal:today',
            ]);

            $documento = $this->documentoService->converterProforma($proforma, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Proforma convertida com sucesso para ' . ($dados['tipo_destino'] === 'FR' ? 'Fatura-Recibo' : 'Fatura'),
                'data' => $documento,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Proforma não encontrada'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao converter proforma', $e);
        }
    }

    /* =====================================================================
     | HELPERS PRIVADOS
     | ================================================================== */

    private function gerarQrHtml(?string $qrCodeTexto): string
    {
        if (empty($qrCodeTexto)) {
            return '';
        }

        try {
            $qr = new QrCode(
                $qrCodeTexto,
                new Encoding('UTF-8'),
                ErrorCorrectionLevel::Medium,
                220,
                6
            );

            $writer = new PngWriter();
            $result = $writer->write($qr);

            return '<img src="data:image/png;base64,' . base64_encode($result->getString()) . '" alt="QR Code">';
        } catch (\Throwable $e) {
            Log::warning('Falha ao gerar QR Code em PNG, tentando SVG', ['error' => $e->getMessage()]);
            try {
                $qr = new QrCode(
                    $qrCodeTexto,
                    new Encoding('UTF-8'),
                    ErrorCorrectionLevel::Medium,
                    220,
                    6
                );

                $writer = new SvgWriter();
                $result = $writer->write($qr, null, null, [
                    SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
                ]);

                return '<img src="' . $result->getDataUri() . '" alt="QR Code">';
            } catch (\Throwable $e2) {
                Log::warning('Falha ao gerar QR Code em SVG', ['error' => $e2->getMessage()]);
                return '';
            }
        }
    }

    private function montarUrlDeProva(Request $request, string $id): string
    {
        $frontendUrl = env('APP_FRONTEND_URL');
        if (empty($frontendUrl)) {
            $scheme = $request->getScheme();
            $host = preg_replace('/:\d+$/', '', $request->getHost());
            $frontendUrl = sprintf('%s://%s:3000', $scheme, $host);
        }

        $empresaId = null;
        if ($request->attributes->has('current_tenant')) {
            $empresaId = $request->attributes->get('current_tenant')->id ?? null;
        } elseif ($request->attributes->has('current_empresa')) {
            $empresaId = $request->attributes->get('current_empresa')->id ?? null;
        }

        $url = rtrim($frontendUrl, '/') . '/' . ltrim($id, '/');
        if ($empresaId) {
            $url .= '?empresa=' . urlencode($empresaId);
        }

        return $url;
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
