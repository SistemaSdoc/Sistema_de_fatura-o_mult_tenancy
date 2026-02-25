<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Venda;
use App\Models\Cliente;
use App\Models\Produto;
use App\Models\DocumentoFiscal;
use App\Services\VendaService;
use Illuminate\Support\Facades\DB;

class VendaController extends Controller
{
    protected $vendaService;

    public function __construct(VendaService $vendaService)
    {
        $this->vendaService = $vendaService;
        $this->authorizeResource(Venda::class, 'venda');
    }

    /**
     * Dados para criar nova venda
     */
    public function create()
    {
        $clientes = Cliente::where('status', 'ativo')->get();

        // ✅ Separar produtos e serviços para melhor exibição
        $produtos = Produto::where('status', 'ativo')->get();

        return response()->json([
            'clientes' => $clientes,
            'produtos' => $produtos,
            'estatisticas' => [
                'total_produtos' => $produtos->where('tipo', 'produto')->count(),
                'total_servicos' => $produtos->where('tipo', 'servico')->count(),
            ]
        ]);
    }

    /**
     * Listar TODAS as vendas (abertas, faturadas e canceladas)
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Venda::class);

        // Carrega vendas com todos os relacionamentos necessários
        $query = Venda::with([
            'cliente',
            'user',
            'itens.produto',
            'documentoFiscal' => function ($q) {
                $q->with(['recibos', 'notasCredito', 'notasDebito']);
            }
        ]);

        // Filtro opcional por status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filtro opcional para mostrar apenas faturadas
        if ($request->has('faturadas') && $request->input('faturadas') === 'true') {
            $query->where('status', 'faturada');
        }

        // Filtro por estado de pagamento
        if ($request->has('estado_pagamento')) {
            $query->where('estado_pagamento', $request->input('estado_pagamento'));
        }

        // Filtro por tipo de documento fiscal
        if ($request->has('tipo_documento')) {
            $query->whereHas('documentoFiscal', function ($q) use ($request) {
                $q->where('tipo_documento', $request->input('tipo_documento'));
            });
        }

        // ✅ Filtro por tipo de item (produto/serviço)
        if ($request->has('tipo_item')) {
            $query->whereHas('itens.produto', function ($q) use ($request) {
                $q->where('tipo', $request->input('tipo_item'));
            });
        }

        $vendas = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'message' => 'Lista de vendas carregada',
            'vendas' => $vendas->map(function ($venda) {
                // Determinar se é venda válida (FT, FR ou RC)
                $ehVenda = $this->ehVendaValida($venda->documentoFiscal);

                // ✅ Estatísticas de serviços na venda
                $servicos = $venda->itens->filter(function ($item) {
                    return $item->produto && $item->produto->tipo === 'servico';
                });

                $totalRetencaoServicos = $servicos->sum('valor_retencao');

                return [
                    'id' => $venda->id,

                    // Dados do documento fiscal (se existir)
                    'numero' => $venda->documentoFiscal?->numero_documento ?? $venda->numero ?? 'N/A',
                    'serie' => $venda->documentoFiscal?->serie ?? $venda->serie ?? 'A',
                    'tipo_documento' => $venda->documentoFiscal?->tipo_documento ?? 'venda',
                    'tipo_documento_nome' => $venda->documentoFiscal?->tipo_documento_nome ?? 'Venda',

                    // Cliente
                    'cliente_id' => $venda->cliente_id,
                    'cliente' => $venda->cliente ? [
                        'id' => $venda->cliente->id,
                        'nome' => $venda->cliente->nome,
                        'nif' => $venda->cliente->nif,
                        'tipo' => $venda->cliente->tipo,
                        'telefone' => $venda->cliente->telefone,
                        'email' => $venda->cliente->email,
                        'endereco' => $venda->cliente->endereco,
                        'status' => $venda->cliente->status,
                    ] : null,

                    // Usuário
                    'user' => $venda->user ? [
                        'id' => $venda->user->id,
                        'name' => $venda->user->name,
                        'email' => $venda->user->email,
                    ] : null,

                    // Datas
                    'data_venda' => $venda->data_venda,
                    'hora_venda' => $venda->hora_venda,
                    'created_at' => $venda->created_at,

                    // Valores
                    'total' => $venda->total,
                    'base_tributavel' => $venda->base_tributavel,
                    'total_iva' => $venda->total_iva,
                    'total_retencao' => $venda->total_retencao,

                    // ✅ Retenção de serviços
                    'total_retencao_servicos' => $totalRetencaoServicos,
                    'tem_servicos' => $servicos->count() > 0,
                    'quantidade_servicos' => $servicos->count(),

                    // Status da venda
                    'status' => $venda->status,
                    'faturado' => !is_null($venda->documentoFiscal),
                    'eh_venda' => $ehVenda,

                    // Estado de pagamento da venda
                    'estado_pagamento' => $this->determinarEstadoPagamentoVenda($venda),
                    'paga' => $this->determinarEstadoPagamentoVenda($venda) === 'paga',

                    // Dados do documento fiscal completo (se existir)
                    'documento_fiscal' => $venda->documentoFiscal ? [
                        'id' => $venda->documentoFiscal->id,
                        'numero' => $venda->documentoFiscal->numero_documento,
                        'serie' => $venda->documentoFiscal->serie,
                        'tipo_documento' => $venda->documentoFiscal->tipo_documento,
                        'tipo_documento_nome' => $venda->documentoFiscal->tipo_documento_nome,
                        'data_emissao' => $venda->documentoFiscal->data_emissao,
                        'hora_emissao' => $venda->documentoFiscal->hora_emissao,
                        'data_vencimento' => $venda->documentoFiscal->data_vencimento,
                        'estado' => $venda->documentoFiscal->estado,
                        'hash_fiscal' => $venda->documentoFiscal->hash_fiscal,
                        'motivo_cancelamento' => $venda->documentoFiscal->motivo_cancelamento,

                        // Estado de pagamento do documento
                        'estado_pagamento' => $this->determinarEstadoPagamentoDocumento($venda->documentoFiscal),
                        'valor_pendente' => $this->calcularValorPendente($venda->documentoFiscal),

                        // ✅ Retenção total do documento
                        'retencao_total' => $venda->documentoFiscal->total_retencao ?? 0,

                        // Recibos associados
                        'recibos' => $venda->documentoFiscal->recibos->map(function ($recibo) {
                            return [
                                'id' => $recibo->id,
                                'numero' => $recibo->numero_documento,
                                'valor' => $recibo->total_liquido,
                                'metodo_pagamento' => $recibo->metodo_pagamento,
                                'data_emissao' => $recibo->data_emissao,
                                'estado' => 'paga',
                            ];
                        }),

                        // Notas de crédito/débito associadas
                        'notas_credito' => $venda->documentoFiscal->notasCredito->map(function ($nc) {
                            return [
                                'id' => $nc->id,
                                'numero' => $nc->numero_documento,
                                'valor' => $nc->total_liquido,
                                'estado' => $nc->estado,
                            ];
                        }),

                        'notas_debito' => $venda->documentoFiscal->notasDebito->map(function ($nd) {
                            return [
                                'id' => $nd->id,
                                'numero' => $nd->numero_documento,
                                'valor' => $nd->total_liquido,
                                'estado' => $nd->estado,
                            ];
                        }),
                    ] : null,

                    // Itens
                    'itens' => $venda->itens->map(function ($item) {
                        $ehServico = $item->produto && $item->produto->tipo === 'servico';

                        return [
                            'id' => $item->id,
                            'produto_id' => $item->produto_id,
                            'produto' => $item->produto ? [
                                'id' => $item->produto->id,
                                'nome' => $item->produto->nome,
                                'codigo' => $item->produto->codigo,
                                'tipo' => $item->produto->tipo,
                            ] : null,
                            'descricao' => $item->descricao,
                            'quantidade' => $item->quantidade,
                            'preco_venda' => $item->preco_venda,
                            'desconto' => $item->desconto,
                            'base_tributavel' => $item->base_tributavel,
                            'valor_iva' => $item->valor_iva,
                            'valor_retencao' => $item->valor_retencao,
                            'taxa_retencao' => $item->taxa_retencao,
                            'subtotal' => $item->subtotal,
                            'eh_servico' => $ehServico,
                            'subtotal_liquido' => $item->subtotal - ($item->valor_retencao ?? 0),
                        ];
                    }),

                    // ✅ Totais por tipo
                    'totais_por_tipo' => [
                        'produtos' => [
                            'quantidade' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'produto')->count(),
                            'total' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'produto')->sum('subtotal'),
                        ],
                        'servicos' => [
                            'quantidade' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'servico')->count(),
                            'total' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'servico')->sum('subtotal'),
                            'retencao' => $totalRetencaoServicos,
                        ],
                    ],
                ];
            })->filter(function ($venda) {
                // Se solicitado, filtra apenas vendas válidas (FT/FR/RC)
                if (request()->has('apenas_vendas') && request()->input('apenas_vendas') === 'true') {
                    return $venda['eh_venda'];
                }
                return true;
            })->values(),
        ]);
    }

    /**
     * Mostrar venda específica
     */
    public function show(Venda $venda)
    {
        $this->authorize('view', $venda);

        $venda->load(['cliente', 'user', 'itens.produto', 'documentoFiscal.recibos']);

        // Determinar estado de pagamento
        $estadoPagamento = $this->determinarEstadoPagamentoVenda($venda);

        // ✅ Estatísticas de serviços
        $servicos = $venda->itens->filter(function ($item) {
            return $item->produto && $item->produto->tipo === 'servico';
        });

        $totalRetencaoServicos = $servicos->sum('valor_retencao');

        return response()->json([
            'message' => 'Venda carregada',
            'venda' => [
                'id' => $venda->id,

                // Dados do documento fiscal
                'numero' => $venda->documentoFiscal?->numero_documento ?? $venda->numero ?? 'N/A',
                'serie' => $venda->documentoFiscal?->serie ?? $venda->serie ?? 'A',
                'tipo_documento' => $venda->documentoFiscal?->tipo_documento ?? 'venda',
                'tipo_documento_nome' => $venda->documentoFiscal?->tipo_documento_nome ?? 'Venda',

                // Cliente
                'cliente' => $venda->cliente ? [
                    'id' => $venda->cliente->id,
                    'nome' => $venda->cliente->nome,
                    'nif' => $venda->cliente->nif,
                    'tipo' => $venda->cliente->tipo,
                    'telefone' => $venda->cliente->telefone,
                    'email' => $venda->cliente->email,
                    'endereco' => $venda->cliente->endereco,
                    'status' => $venda->cliente->status,
                ] : null,

                // Usuário
                'user' => $venda->user ? [
                    'id' => $venda->user->id,
                    'name' => $venda->user->name,
                    'email' => $venda->user->email,
                ] : null,

                // Datas
                'data_venda' => $venda->data_venda,
                'hora_venda' => $venda->hora_venda,

                // Valores
                'total' => $venda->total,
                'base_tributavel' => $venda->base_tributavel,
                'total_iva' => $venda->total_iva,
                'total_retencao' => $venda->total_retencao,

                // ✅ Retenção de serviços
                'total_retencao_servicos' => $totalRetencaoServicos,
                'tem_servicos' => $servicos->count() > 0,
                'quantidade_servicos' => $servicos->count(),

                // Status
                'status' => $venda->status,
                'faturado' => !is_null($venda->documentoFiscal),
                'eh_venda' => $this->ehVendaValida($venda->documentoFiscal),

                // Estado de pagamento
                'estado_pagamento' => $estadoPagamento,
                'paga' => $estadoPagamento === 'paga',
                'pode_receber_pagamento' => $this->podeReceberPagamento($venda),

                // Documento fiscal completo
                'documento_fiscal' => $venda->documentoFiscal ? [
                    'id' => $venda->documentoFiscal->id,
                    'numero' => $venda->documentoFiscal->numero_documento,
                    'serie' => $venda->documentoFiscal->serie,
                    'tipo_documento' => $venda->documentoFiscal->tipo_documento,
                    'tipo_documento_nome' => $venda->documentoFiscal->tipo_documento_nome,
                    'data_emissao' => $venda->documentoFiscal->data_emissao,
                    'hora_emissao' => $venda->documentoFiscal->hora_emissao,
                    'data_vencimento' => $venda->documentoFiscal->data_vencimento,
                    'estado' => $venda->documentoFiscal->estado,
                    'hash_fiscal' => $venda->documentoFiscal->hash_fiscal,

                    // Pagamento
                    'estado_pagamento' => $this->determinarEstadoPagamentoDocumento($venda->documentoFiscal),
                    'valor_total' => $venda->documentoFiscal->total_liquido,
                    'valor_pago' => $this->calcularValorPago($venda->documentoFiscal),
                    'valor_pendente' => $this->calcularValorPendente($venda->documentoFiscal),

                    // ✅ Retenção
                    'retencao_total' => $venda->documentoFiscal->total_retencao ?? 0,

                    // Recibos
                    'recibos' => $venda->documentoFiscal->recibos->map(function ($recibo) {
                        return [
                            'id' => $recibo->id,
                            'numero_documento' => $recibo->numero_documento,
                            'valor' => $recibo->total_liquido,
                            'metodo_pagamento' => $recibo->metodo_pagamento,
                            'referencia_pagamento' => $recibo->referencia_pagamento,
                            'data_emissao' => $recibo->data_emissao,
                            'hora_emissao' => $recibo->hora_emissao,
                            'estado' => 'paga',
                        ];
                    }),
                ] : null,

                // Itens
                'itens' => $venda->itens->map(function ($item) {
                    $ehServico = $item->produto && $item->produto->tipo === 'servico';

                    return [
                        'produto' => $item->produto,
                        'quantidade' => $item->quantidade,
                        'preco_venda' => $item->preco_venda,
                        'desconto' => $item->desconto,
                        'subtotal' => $item->subtotal,
                        'base_tributavel' => $item->base_tributavel,
                        'valor_iva' => $item->valor_iva,
                        'valor_retencao' => $item->valor_retencao,
                        'taxa_retencao' => $item->taxa_retencao,
                        'eh_servico' => $ehServico,
                        'subtotal_liquido' => $item->subtotal - ($item->valor_retencao ?? 0),
                    ];
                }),

                // ✅ Totais por tipo
                'totais_por_tipo' => [
                    'produtos' => [
                        'quantidade' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'produto')->count(),
                        'total' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'produto')->sum('subtotal'),
                    ],
                    'servicos' => [
                        'quantidade' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'servico')->count(),
                        'total' => $venda->itens->filter(fn($i) => $i->produto && $i->produto->tipo === 'servico')->sum('subtotal'),
                        'retencao' => $totalRetencaoServicos,
                    ],
                ],
            ],
        ]);
    }

    /**
     * Criar nova venda
     */
    public function store(Request $request)
    {
        $this->authorize('create', Venda::class);

        Log::info('VendaController::store - Request recebida', [
            'all' => $request->all(),
            'tipo_documento' => $request->input('tipo_documento'),
            'faturar' => $request->input('faturar')
        ]);

        // ✅ Validação incluindo campos de serviço
        $dados = $request->validate([
            'cliente_id' => 'nullable|uuid|exists:clientes,id',
            'cliente_nome' => 'nullable|string|max:255',
            'itens' => 'required|array|min:1',
            'itens.*.produto_id' => 'required|uuid|exists:produtos,id',
            'itens.*.quantidade' => 'required|integer|min:1',
            'itens.*.preco_venda' => 'required|numeric|min:0',
            'itens.*.desconto' => 'nullable|numeric|min:0',
            'itens.*.taxa_retencao' => 'nullable|numeric|min:0|max:100', // ✅ Para serviços
            'faturar' => 'nullable|boolean',
            'tipo_documento' => 'nullable|in:FT,FR,FP',
            'dados_pagamento' => 'nullable|array',
            'dados_pagamento.metodo' => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
            'dados_pagamento.valor' => 'required_with:dados_pagamento|numeric|min:0',
            'dados_pagamento.referencia' => 'nullable|string|max:255',
        ]);

        Log::info('VendaController::store - Dados validados', [
            'tipo_documento' => $dados['tipo_documento'] ?? 'NÃO ENVIADO (usará FT)',
            'faturar' => $dados['faturar'] ?? false,
            'dados_completos' => $dados
        ]);

        // VALIDAÇÃO PARA CLIENTE AVULSO
        if (empty($dados['cliente_id']) && empty($dados['cliente_nome'])) {
            return response()->json([
                'message' => 'É necessário informar um cliente (selecionado ou avulso).'
            ], 422);
        }

        // FR obrigatoriamente precisa de dados_pagamento
        if (($dados['tipo_documento'] ?? 'FT') === 'FR') {
            if (empty($dados['dados_pagamento'])) {
                return response()->json([
                    'message' => 'Campo dados_pagamento é obrigatório para Fatura-Recibo (FR).'
                ], 422);
            }

            if ($dados['dados_pagamento']['valor'] <= 0) {
                return response()->json([
                    'message' => 'Valor do pagamento deve ser maior que zero.'
                ], 422);
            }

            // ✅ VALIDAÇÃO ADICIONAL: O valor pago deve ser igual ao total da venda
            // Calculamos o total aproximado baseado nos itens
            $totalEstimado = 0;
            foreach ($dados['itens'] as $item) {
                $produto = Produto::find($item['produto_id']);
                if ($produto) {
                    $valorBruto = $produto->preco_venda * $item['quantidade'];
                    $desconto = $item['desconto'] ?? 0;
                    $baseTributavel = $valorBruto - $desconto;
                    $taxaIva = $produto->taxa_iva ?? 14;
                    $valorIva = ($baseTributavel * $taxaIva) / 100;

                    // Retenção apenas para serviços
                    $taxaRetencao = ($produto->tipo === 'servico') ? ($item['taxa_retencao'] ?? 6.5) : 0;
                    $valorRetencao = ($produto->tipo === 'servico') ? ($baseTributavel * $taxaRetencao) / 100 : 0;

                    $totalEstimado += round($baseTributavel + $valorIva - $valorRetencao, 2);
                }
            }

            // 🔍 Comparação com tolerância de 0.01 (1 centavo)
            $diferenca = abs($dados['dados_pagamento']['valor'] - $totalEstimado);
            if ($diferenca > 0.01) {
                return response()->json([
                    'message' => "Para Fatura-Recibo (FR), o valor pago ({$dados['dados_pagamento']['valor']}) deve ser igual ao total da venda ({$totalEstimado}). Diferença: {$diferenca}"
                ], 422);
            }
        }

        // Para FP, faturar deve ser false (é proforma)
        if (($dados['tipo_documento'] ?? 'FT') === 'FP') {
            $dados['faturar'] = false;
        }

        // Se não especificado, assume true para FT e FR, false para FP
        if (!isset($dados['faturar'])) {
            $dados['faturar'] = ($dados['tipo_documento'] ?? 'FT') !== 'FP';
        }

        $venda = $this->vendaService->criarVenda(
            $dados,
            $dados['faturar'],
            $dados['tipo_documento'] ?? 'FT'
        );

        // Determinar estado de pagamento após criação
        $estadoPagamento = $this->determinarEstadoPagamentoVenda($venda);

        // ✅ Estatísticas de serviços
        $servicos = $venda->itens->filter(function ($item) {
            return $item->produto && $item->produto->tipo === 'servico';
        });

        Log::info('VendaController::store - Venda criada', [
            'venda_id' => $venda->id,
            'tipo_documento_gerado' => $venda->documentoFiscal?->tipo_documento ?? 'N/A',
            'estado_pagamento' => $estadoPagamento,
            'cliente_tipo' => $venda->cliente_id ? 'cadastrado' : 'avulso',
            'quantidade_servicos' => $servicos->count(),
            'retencao_total' => $servicos->sum('valor_retencao')
        ]);

        return response()->json([
            'message' => 'Venda criada com sucesso',
            'venda' => [
                'id' => $venda->id,
                'numero' => $venda->numero,
                'serie' => $venda->serie,
                'cliente' => $venda->cliente,
                'user' => $venda->user,
                'data_venda' => $venda->data_venda,
                'hora_venda' => $venda->hora_venda,
                'total' => $venda->total,
                'base_tributavel' => $venda->base_tributavel,
                'total_iva' => $venda->total_iva,
                'total_retencao' => $venda->total_retencao,
                'status' => $venda->status,

                // Estado de pagamento
                'estado_pagamento' => $estadoPagamento,
                'paga' => $estadoPagamento === 'paga',

                // Documento fiscal gerado
                'documento_fiscal' => $venda->documentoFiscal ? [
                    'id' => $venda->documentoFiscal->id,
                    'numero_documento' => $venda->documentoFiscal->numero_documento,
                    'tipo_documento' => $venda->documentoFiscal->tipo_documento,
                    'tipo_documento_nome' => $venda->documentoFiscal->tipo_documento_nome,
                    'estado' => $venda->documentoFiscal->estado,
                    'estado_pagamento' => $this->determinarEstadoPagamentoDocumento($venda->documentoFiscal),
                    'retencao_total' => $venda->documentoFiscal->total_retencao ?? 0,
                ] : null,

                // Itens
                'itens' => $venda->itens->map(function ($item) {
                    $ehServico = $item->produto && $item->produto->tipo === 'servico';

                    return [
                        'produto' => $item->produto,
                        'quantidade' => $item->quantidade,
                        'preco_venda' => $item->preco_venda,
                        'desconto' => $item->desconto,
                        'subtotal' => $item->subtotal,
                        'base_tributavel' => $item->base_tributavel,
                        'valor_iva' => $item->valor_iva,
                        'valor_retencao' => $item->valor_retencao,
                        'taxa_retencao' => $item->taxa_retencao,
                        'eh_servico' => $ehServico,
                    ];
                }),

                // ✅ Estatísticas de serviços
                'tem_servicos' => $servicos->count() > 0,
                'quantidade_servicos' => $servicos->count(),
                'retencao_servicos' => $servicos->sum('valor_retencao'),
            ],
        ]);
    }

    /**
     * Cancelar venda
     */
    public function cancelar(Venda $venda)
    {
        $this->authorize('cancel', $venda);

        if ($venda->estado_pagamento === 'paga') {
            return response()->json([
                'message' => 'Não é possível cancelar uma venda já paga. Cancele o documento fiscal primeiro.'
            ], 422);
        }

        if ($venda->documentoFiscal) {
            if (!in_array($venda->documentoFiscal->estado, ['emitido', 'parcialmente_paga'])) {
                return response()->json([
                    'message' => 'Não é possível cancelar venda com documento fiscal ' .
                        $venda->documentoFiscal->estado . '. Cancele o documento fiscal primeiro.'
                ], 422);
            }
        }

        $vendaCancelada = $this->vendaService->cancelarVenda($venda->id);

        return response()->json([
            'message' => 'Venda cancelada com sucesso',
            'venda' => [
                'id' => $vendaCancelada->id,
                'status' => $vendaCancelada->status,
                'estado_pagamento' => $vendaCancelada->estado_pagamento,
            ],
        ]);
    }

    /**
     * Gerar recibo para venda (FT pendente)
     */
    public function gerarRecibo(Venda $venda, Request $request)
    {
        $this->authorize('update', $venda);

        if (!$venda->documentoFiscal || $venda->documentoFiscal->tipo_documento !== 'FT') {
            return response()->json([
                'message' => 'Apenas vendas com Fatura (FT) podem receber recibo.'
            ], 422);
        }

        if ($venda->estado_pagamento === 'paga') {
            return response()->json([
                'message' => 'Venda já está totalmente paga.'
            ], 422);
        }

        $dados = $request->validate([
            'valor' => 'required|numeric|min:0.01|max:' . $this->calcularValorPendente($venda->documentoFiscal),
            'metodo_pagamento' => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
            'data_pagamento' => 'nullable|date',
            'referencia' => 'nullable|string|max:100'
        ]);

        // Chamar service de documento fiscal para gerar recibo
        $recibo = app(\App\Services\DocumentoFiscalService::class)
            ->gerarRecibo($venda->documentoFiscal, $dados);

        // Atualizar estado da venda
        $venda->update([
            'estado_pagamento' => $this->determinarEstadoPagamentoVenda($venda->fresh())
        ]);

        return response()->json([
            'message' => 'Recibo gerado com sucesso',
            'recibo' => $recibo,
            'venda' => $venda->fresh()
        ]);
    }

    /* ================= MÉTODOS AUXILIARES PRIVADOS ================= */

    /**
     * Verificar se é venda válida (FT, FR ou RC)
     */
    private function ehVendaValida(?DocumentoFiscal $documento): bool
    {
        if (!$documento) return false;
        return in_array($documento->tipo_documento, ['FT', 'FR', 'RC']);
    }

    /**
     * Determinar estado de pagamento da venda
     */
    private function determinarEstadoPagamentoVenda(Venda $venda): string
    {
        if (!$venda->documentoFiscal) {
            return 'pendente';
        }

        if ($venda->documentoFiscal->estado === 'cancelado') {
            return 'cancelada';
        }

        if ($venda->documentoFiscal->tipo_documento === 'FP') {
            return 'pendente';
        }

        if ($venda->documentoFiscal->tipo_documento === 'FA') {
            if ($venda->documentoFiscal->recibos()->where('estado', '!=', 'cancelado')->exists()) {
                return 'paga';
            }
            return 'pendente';
        }

        if (in_array($venda->documentoFiscal->tipo_documento, ['FR', 'RC'])) {
            return 'paga';
        }

        if ($venda->documentoFiscal->tipo_documento === 'FT') {
            return $this->determinarEstadoPagamentoDocumento($venda->documentoFiscal);
        }

        return 'pendente';
    }

    /**
     * Determinar estado de pagamento de um documento fiscal
     */
    private function determinarEstadoPagamentoDocumento(DocumentoFiscal $documento): string
    {
        if ($documento->tipo_documento === 'FR') {
            return 'paga';
        }

        if ($documento->tipo_documento === 'FP') {
            return 'pendente';
        }

        if ($documento->tipo_documento === 'FA') {
            if ($documento->recibos()->where('estado', '!=', 'cancelado')->exists()) {
                return 'paga';
            }
            return 'pendente';
        }

        if ($documento->tipo_documento === 'RC') {
            return 'paga';
        }

        if ($documento->tipo_documento === 'FT') {
            $valorPendente = $this->calcularValorPendente($documento);

            if ($valorPendente <= 0) {
                return 'paga';
            }

            $valorPago = $this->calcularValorPago($documento);
            if ($valorPago > 0) {
                return 'parcial';
            }
        }

        return match ($documento->estado) {
            'paga' => 'paga',
            'parcialmente_paga' => 'parcial',
            'cancelado' => 'cancelada',
            default => 'pendente',
        };
    }

    /**
     * Calcular valor total pago via recibos
     */
    private function calcularValorPago(DocumentoFiscal $documento): float
    {
        if (in_array($documento->tipo_documento, ['FR', 'RC'])) {
            return $documento->total_liquido;
        }

        if (in_array($documento->tipo_documento, ['FA', 'FT'])) {
            return $documento->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0;
        }

        return 0;
    }

    /**
     * Calcular valor pendente
     */
    private function calcularValorPendente(DocumentoFiscal $documento): float
    {
        if ($documento->tipo_documento === 'FP') {
            return $documento->total_liquido;
        }

        if ($documento->tipo_documento === 'FA') {
            $totalPago = $this->calcularValorPago($documento);
            return max(0, $documento->total_liquido - $totalPago);
        }

        if (in_array($documento->tipo_documento, ['FR', 'RC'])) {
            return 0;
        }

        if ($documento->tipo_documento === 'FT') {
            $totalPago = $this->calcularValorPago($documento);
            $totalAdiantamentos = DB::table('adiantamento_fatura')
                ->where('fatura_id', $documento->id)
                ->sum('valor_utilizado');
            return max(0, $documento->total_liquido - $totalPago - $totalAdiantamentos);
        }

        return 0;
    }

    /**
     * Verificar se a venda pode receber pagamento
     */
    private function podeReceberPagamento(Venda $venda): bool
    {
        if (!$venda->documentoFiscal) {
            return false;
        }

        if (!in_array($venda->documentoFiscal->tipo_documento, ['FT', 'FA'])) {
            return false;
        }

        if ($venda->documentoFiscal->estado === 'cancelado') {
            return false;
        }

        $estadoPagamento = $this->determinarEstadoPagamentoVenda($venda);
        return in_array($estadoPagamento, ['pendente', 'parcial']);
    }
}
