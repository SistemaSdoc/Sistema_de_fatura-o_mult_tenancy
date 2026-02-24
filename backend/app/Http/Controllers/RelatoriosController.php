<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RelatoriosService;
use App\Models\DocumentoFiscal;
use App\Models\Venda;
use App\Models\Produto;
use App\Models\Cliente;
use App\Models\MovimentoStock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RelatoriosController extends Controller
{
    protected $relatoriosService;

    public function __construct(RelatoriosService $relatoriosService)
    {
        $this->relatoriosService = $relatoriosService;
    }

    /**
     * Dashboard geral com indicadores principais
     * GET /api/relatorios/dashboard
     */
    public function dashboard()
    {
        try {
            $hoje = now();
            $inicioMes = $hoje->copy()->startOfMonth();

            // Totais de documentos fiscais
            $totalDocumentos = DocumentoFiscal::whereNotIn('estado', ['cancelado'])->count();

            $totalFaturado = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR'])
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_liquido');

            $totalNotasCredito = DocumentoFiscal::where('tipo_documento', 'NC')
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_liquido');

            $totalLiquido = $totalFaturado - $totalNotasCredito;

            // ✅ Totais de retenção de serviços
            $totalRetencaoServicos = DocumentoFiscal::whereNotIn('estado', ['cancelado'])
                ->sum('total_retencao');

            $totalRetencaoMes = DocumentoFiscal::whereBetween('data_emissao', [$inicioMes, $hoje])
                ->whereNotIn('estado', ['cancelado'])
                ->sum('total_retencao');

            // Vendas do mês
            $vendasMes = Venda::whereBetween('data_venda', [$inicioMes, $hoje])
                ->where('status', 'faturada')
                ->count();

            $valorVendasMes = Venda::whereBetween('data_venda', [$inicioMes, $hoje])
                ->where('status', 'faturada')
                ->sum('total');

            // Clientes
            $totalClientes = Cliente::count();
            $clientesNovosMes = Cliente::whereBetween('created_at', [$inicioMes, $hoje])->count();

            // Produtos e Serviços
            $totalProdutos = Produto::where('tipo', 'produto')->count();
            $totalServicos = Produto::where('tipo', 'servico')->count();
            $servicosAtivos = Produto::where('tipo', 'servico')->where('status', 'ativo')->count();

            $produtosEstoqueBaixo = Produto::where('tipo', 'produto')
                ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
                ->count();

            $produtosSemEstoque = Produto::where('tipo', 'produto')
                ->where('estoque_atual', '<=', 0)
                ->count();

            // Alertas
            $documentosVencidos = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->whereNotNull('data_vencimento')
                ->where('data_vencimento', '<', $hoje)
                ->count();

            $proformasAntigas = DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', 'emitido')
                ->where('data_emissao', '<', $hoje->copy()->subDays(7))
                ->count();

            // ✅ Alertas de serviços com retenção não paga
            $servicosComRetencaoPendente = DocumentoFiscal::where('total_retencao', '>', 0)
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->where('data_vencimento', '<', $hoje->copy()->addDays(5))
                ->count();

            $dashboard = [
                'documentos_fiscais' => [
                    'total' => $totalDocumentos,
                    'total_faturado' => $totalFaturado,
                    'total_notas_credito' => $totalNotasCredito,
                    'total_liquido' => $totalLiquido,
                    'total_retencao' => $totalRetencaoServicos,
                    'total_retencao_mes' => $totalRetencaoMes,
                ],
                'vendas' => [
                    'total_mes' => $vendasMes,
                    'valor_mes' => $valorVendasMes,
                ],
                'clientes' => [
                    'total' => $totalClientes,
                    'novos_mes' => $clientesNovosMes,
                ],
                'produtos' => [
                    'total' => $totalProdutos,
                    'estoque_baixo' => $produtosEstoqueBaixo,
                    'sem_estoque' => $produtosSemEstoque,
                ],
                'servicos' => [
                    'total' => $totalServicos,
                    'ativos' => $servicosAtivos,
                    'inativos' => $totalServicos - $servicosAtivos,
                ],
                'alertas' => [
                    'documentos_vencidos' => $documentosVencidos,
                    'proformas_antigas' => $proformasAntigas,
                    'servicos_com_retencao_pendente' => $servicosComRetencaoPendente,
                ],
                'periodo' => [
                    'inicio_mes' => $inicioMes->toDateString(),
                    'hoje' => $hoje->toDateString(),
                ],
            ];

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'dashboard' => $dashboard
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar dashboard:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de vendas detalhado
     * GET /api/relatorios/vendas
     */
    public function vendas(Request $request)
    {
        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'apenas_vendas' => 'nullable|boolean', // FT, FR, RC
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'tipo_documento' => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado_pagamento' => 'nullable|in:paga,pendente,parcial,cancelada',
                'agrupar_por' => 'nullable|in:dia,mes,ano',
                'incluir_servicos' => 'nullable|boolean', // ✅ NOVO
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            $query = Venda::with(['cliente', 'documentoFiscal', 'itens.produto'])
                ->whereBetween('data_venda', [$dataInicio, $dataFim]);

            // Filtros opcionais
            if (!empty($dados['apenas_vendas'])) {
                $query->whereHas('documentoFiscal', function ($q) {
                    $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
                });
            }

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            }

            if (!empty($dados['tipo_documento'])) {
                $query->whereHas('documentoFiscal', function ($q) use ($dados) {
                    $q->where('tipo_documento', $dados['tipo_documento']);
                });
            }

            if (!empty($dados['estado_pagamento'])) {
                $query->where('estado_pagamento', $dados['estado_pagamento']);
            }

            $vendas = $query->orderBy('data_venda', 'desc')->get();

            // ✅ Estatísticas de serviços
            $totalServicos = 0;
            $totalRetencaoServicos = 0;
            $servicosPorVenda = [];

            foreach ($vendas as $venda) {
                $itensServicos = $venda->itens->filter(function ($item) {
                    return $item->produto && $item->produto->tipo === 'servico';
                });

                if ($itensServicos->count() > 0) {
                    $totalServicos += $itensServicos->count();
                    $totalRetencaoServicos += $itensServicos->sum('valor_retencao');
                    $servicosPorVenda[$venda->id] = [
                        'quantidade' => $itensServicos->count(),
                        'retencao' => $itensServicos->sum('valor_retencao'),
                    ];
                }
            }

            // Totais
            $totais = [
                'total_vendas' => $vendas->count(),
                'total_valor' => $vendas->sum('total'),
                'total_base_tributavel' => $vendas->sum('base_tributavel'),
                'total_iva' => $vendas->sum('total_iva'),
                'total_retencao' => $vendas->sum('total_retencao'),
                // ✅ Novos totais
                'total_servicos' => $totalServicos,
                'total_retencao_servicos' => $totalRetencaoServicos,
                'percentual_retencao_media' => $vendas->sum('base_tributavel') > 0
                    ? round(($vendas->sum('total_retencao') / $vendas->sum('base_tributavel')) * 100, 2)
                    : 0,
            ];

            // Agrupamento opcional
            $agrupado = [];
            if (!empty($dados['agrupar_por'])) {
                $agrupado = $this->agruparVendas($vendas, $dados['agrupar_por']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Relatório de vendas carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'filtros' => $dados,
                    'totais' => $totais,
                    'vendas' => $vendas->map(function ($v) use ($servicosPorVenda) {
                        $resumo = $v->resumo;
                        $resumo['tem_servicos'] = isset($servicosPorVenda[$v->id]);
                        $resumo['dados_servicos'] = $servicosPorVenda[$v->id] ?? null;
                        return $resumo;
                    }),
                    'agrupado' => $agrupado,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de vendas:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de vendas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de compras
     * GET /api/relatorios/compras
     */
    public function compras(Request $request)
    {
        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'fornecedor_id' => 'nullable|uuid|exists:fornecedores,id',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // Usar o serviço para buscar compras
            $relatorio = $this->relatoriosService->relatorioCompras($dataInicio, $dataFim, $dados['fornecedor_id'] ?? null);

            return response()->json([
                'success' => true,
                'message' => 'Relatório de compras carregado com sucesso',
                'relatorio' => $relatorio
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de compras:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de compras: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de faturação (documentos fiscais)
     * GET /api/relatorios/faturacao
     */
    public function faturacao(Request $request)
    {
        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'tipo' => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'incluir_retencoes' => 'nullable|boolean', // ✅ NOVO
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // Usar o serviço
            $relatorio = $this->relatoriosService->relatorioFaturacao($dataInicio, $dataFim, $dados);

            // ✅ Adicionar informações de retenção se solicitado
            if (!empty($dados['incluir_retencoes'])) {
                $retencoes = DocumentoFiscal::whereBetween('data_emissao', [$dataInicio, $dataFim])
                    ->where('total_retencao', '>', 0)
                    ->whereNotIn('estado', ['cancelado'])
                    ->with(['cliente'])
                    ->get();

                $relatorio['retencoes'] = [
                    'total' => $retencoes->sum('total_retencao'),
                    'quantidade_documentos' => $retencoes->count(),
                    'detalhes' => $retencoes->map(function ($doc) {
                        return [
                            'numero' => $doc->numero_documento,
                            'data' => $doc->data_emissao,
                            'cliente' => $doc->nome_cliente,
                            'total' => $doc->total_liquido,
                            'retencao' => $doc->total_retencao,
                            'percentual' => $doc->base_tributavel > 0
                                ? round(($doc->total_retencao / $doc->base_tributavel) * 100, 2)
                                : 0,
                        ];
                    }),
                ];
            }

            return response()->json([
                'success' => true,
                'message' => 'Relatório de faturação carregado com sucesso',
                'relatorio' => $relatorio
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de faturação:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de faturação: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de stock
     * GET /api/relatorios/stock
     */
    public function stock(Request $request)
    {
        try {
            $dados = $request->validate([
                'estoque_baixo' => 'nullable|boolean',
                'sem_estoque' => 'nullable|boolean',
                'categoria_id' => 'nullable|uuid|exists:categorias,id',
                'apenas_ativos' => 'nullable|boolean',
            ]);

            $query = Produto::with(['categoria', 'fornecedor'])
                ->where('tipo', 'produto'); // ✅ Apenas produtos

            // Filtros
            if (!empty($dados['apenas_ativos'])) {
                $query->where('status', 'ativo');
            }

            if (!empty($dados['categoria_id'])) {
                $query->where('categoria_id', $dados['categoria_id']);
            }

            if (!empty($dados['estoque_baixo'])) {
                $query->estoqueBaixo();
            }

            if (!empty($dados['sem_estoque'])) {
                $query->semEstoque();
            }

            $produtos = $query->get();

            // Calcular totais
            $totalValorEstoque = 0;
            $porCategoria = [];

            foreach ($produtos as $produto) {
                $valorEstoque = $produto->estoque_atual * ($produto->custo_medio ?? $produto->preco_compra ?? 0);
                $totalValorEstoque += $valorEstoque;

                // Agrupar por categoria
                $catNome = $produto->categoria->nome ?? 'Sem Categoria';
                if (!isset($porCategoria[$catNome])) {
                    $porCategoria[$catNome] = [
                        'quantidade' => 0,
                        'valor' => 0,
                        'produtos' => 0,
                    ];
                }
                $porCategoria[$catNome]['quantidade'] += $produto->estoque_atual;
                $porCategoria[$catNome]['valor'] += $valorEstoque;
                $porCategoria[$catNome]['produtos']++;
            }

            $relatorio = [
                'resumo' => [
                    'total_produtos' => $produtos->count(),
                    'total_quantidade_estoque' => $produtos->sum('estoque_atual'),
                    'total_valor_estoque' => $totalValorEstoque,
                    'produtos_estoque_baixo' => $produtos->filter(fn($p) => $p->estoque_atual <= $p->estoque_minimo)->count(),
                    'produtos_sem_estoque' => $produtos->filter(fn($p) => $p->estoque_atual <= 0)->count(),
                ],
                'por_categoria' => $porCategoria,
                'produtos' => $produtos->map(fn($p) => [
                    'id' => $p->id,
                    'nome' => $p->nome,
                    'codigo' => $p->codigo,
                    'categoria' => $p->categoria->nome ?? null,
                    'estoque_atual' => $p->estoque_atual,
                    'estoque_minimo' => $p->estoque_minimo,
                    'preco_venda' => $p->preco_venda,
                    'custo_medio' => $p->custo_medio,
                    'valor_estoque' => $p->estoque_atual * ($p->custo_medio ?? $p->preco_compra ?? 0),
                    'status' => $p->status,
                    'em_estoque_baixo' => $p->estoque_atual <= $p->estoque_minimo,
                ]),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Relatório de stock carregado com sucesso',
                'data' => $relatorio
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de stock:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de stock: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ NOVO: Relatório específico de serviços
     * GET /api/relatorios/servicos
     */
    public function servicos(Request $request)
    {
        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'apenas_ativos' => 'nullable|boolean',
                'agrupar_por' => 'nullable|in:servico,categoria',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            // Serviços vendidos no período
            $servicosVendidos = DB::table('itens_venda')
                ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
                ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
                ->where('produtos.tipo', 'servico')
                ->whereBetween('vendas.data_venda', [$dataInicio, $dataFim])
                ->where('vendas.status', '!=', 'cancelada')
                ->select(
                    'produtos.id',
                    'produtos.nome',
                    'produtos.retencao',
                    'produtos.unidade_medida',
                    DB::raw('SUM(itens_venda.quantidade) as total_quantidade'),
                    DB::raw('SUM(itens_venda.subtotal) as total_receita'),
                    DB::raw('SUM(itens_venda.valor_retencao) as total_retencao'),
                    DB::raw('COUNT(DISTINCT vendas.id) as total_vendas')
                )
                ->groupBy('produtos.id', 'produtos.nome', 'produtos.retencao', 'produtos.unidade_medida')
                ->orderByDesc('total_receita')
                ->get();

            // Totais gerais
            $totais = [
                'total_servicos_vendidos' => $servicosVendidos->count(),
                'total_receita' => $servicosVendidos->sum('total_receita'),
                'total_retencao' => $servicosVendidos->sum('total_retencao'),
                'total_quantidade' => $servicosVendidos->sum('total_quantidade'),
                'percentual_retencao_media' => $servicosVendidos->sum('total_receita') > 0
                    ? round(($servicosVendidos->sum('total_retencao') / $servicosVendidos->sum('total_receita')) * 100, 2)
                    : 0,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Relatório de serviços carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'totais' => $totais,
                    'servicos' => $servicosVendidos->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'nome' => $item->nome,
                            'unidade_medida' => $item->unidade_medida,
                            'taxa_retencao' => $item->retencao,
                            'quantidade' => (int) $item->total_quantidade,
                            'vendas' => (int) $item->total_vendas,
                            'receita' => round($item->total_receita, 2),
                            'receita_formatada' => number_format($item->total_receita, 2, ',', '.') . ' Kz',
                            'retencao' => round($item->total_retencao, 2),
                            'retencao_formatada' => number_format($item->total_retencao, 2, ',', '.') . ' Kz',
                            'percentual_retencao_real' => $item->total_receita > 0
                                ? round(($item->total_retencao / $item->total_receita) * 100, 2)
                                : 0,
                        ];
                    }),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de serviços:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de serviços: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ NOVO: Relatório de retenções
     * GET /api/relatorios/retencoes
     */
    public function retencoes(Request $request)
    {
        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            $query = DocumentoFiscal::where('total_retencao', '>', 0)
                ->whereNotIn('estado', ['cancelado'])
                ->whereBetween('data_emissao', [$dataInicio, $dataFim])
                ->with(['cliente', 'itens.produto']);

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            }

            $documentos = $query->orderBy('data_emissao', 'desc')->get();

            // Agrupar por cliente
            $porCliente = [];
            foreach ($documentos as $doc) {
                $clienteNome = $doc->nome_cliente ?? 'Consumidor Final';
                if (!isset($porCliente[$clienteNome])) {
                    $porCliente[$clienteNome] = [
                        'cliente' => $clienteNome,
                        'total_documentos' => 0,
                        'total_base' => 0,
                        'total_retencao' => 0,
                    ];
                }
                $porCliente[$clienteNome]['total_documentos']++;
                $porCliente[$clienteNome]['total_base'] += $doc->base_tributavel;
                $porCliente[$clienteNome]['total_retencao'] += $doc->total_retencao;
            }

            return response()->json([
                'success' => true,
                'message' => 'Relatório de retenções carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'resumo' => [
                        'total_documentos' => $documentos->count(),
                        'total_base' => $documentos->sum('base_tributavel'),
                        'total_retencao' => $documentos->sum('total_retencao'),
                        'percentual_medio' => $documentos->sum('base_tributavel') > 0
                            ? round(($documentos->sum('total_retencao') / $documentos->sum('base_tributavel')) * 100, 2)
                            : 0,
                    ],
                    'por_cliente' => array_values($porCliente),
                    'documentos' => $documentos->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'numero' => $doc->numero_documento,
                            'data' => $doc->data_emissao,
                            'cliente' => $doc->nome_cliente,
                            'base' => $doc->base_tributavel,
                            'retencao' => $doc->total_retencao,
                            'percentual' => $doc->base_tributavel > 0
                                ? round(($doc->total_retencao / $doc->base_tributavel) * 100, 2)
                                : 0,
                            'servicos' => $doc->itens->filter(fn($i) => $i->produto && $i->produto->isServico())->count(),
                        ];
                    }),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de retenções:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de retenções: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de documentos fiscais (detalhado)
     * GET /api/relatorios/documentos-fiscais
     */
    public function documentosFiscais(Request $request)
    {
        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'tipo' => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
                'estado' => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'apenas_vendas' => 'nullable|boolean',
                'apenas_nao_vendas' => 'nullable|boolean',
                'com_retencao' => 'nullable|boolean', // ✅ NOVO
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            $query = DocumentoFiscal::with(['cliente'])
                ->whereBetween('data_emissao', [$dataInicio, $dataFim]);

            // Aplicar filtros
            if (!empty($dados['tipo'])) {
                $query->where('tipo_documento', $dados['tipo']);
            }

            if (!empty($dados['estado'])) {
                $query->where('estado', $dados['estado']);
            }

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (!empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            if (!empty($dados['apenas_vendas'])) {
                $query->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
            }

            if (!empty($dados['apenas_nao_vendas'])) {
                $query->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']);
            }

            if (!empty($dados['com_retencao'])) {
                $query->where('total_retencao', '>', 0);
            }

            $documentos = $query->orderBy('data_emissao', 'desc')->get();

            // Estatísticas
            $estatisticas = [
                'total_documentos' => $documentos->count(),
                'total_valor' => $documentos->sum('total_liquido'),
                'total_base' => $documentos->sum('base_tributavel'),
                'total_iva' => $documentos->sum('total_iva'),
                'total_retencao' => $documentos->sum('total_retencao'), // ✅ NOVO
                'por_tipo' => $documentos->groupBy('tipo_documento')
                    ->map(fn($docs) => [
                        'quantidade' => $docs->count(),
                        'valor' => $docs->sum('total_liquido'),
                        'retencao' => $docs->sum('total_retencao'),
                    ]),
                'por_estado' => $documentos->groupBy('estado')
                    ->map(fn($docs) => $docs->count()),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Relatório de documentos fiscais carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'filtros' => $dados,
                    'estatisticas' => $estatisticas,
                    'documentos' => $documentos->map(fn($d) => array_merge($d->toArray(), [
                        'resumo' => $d->resumo,
                    ])),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de documentos fiscais:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de documentos fiscais: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de pagamentos pendentes
     * GET /api/relatorios/pagamentos-pendentes
     */
    public function pagamentosPendentes(Request $request)
    {
        try {
            $hoje = now();

            // Faturas pendentes (FT emitidas ou parcialmente pagas)
            $faturasPendentes = DocumentoFiscal::where('tipo_documento', 'FT')
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->with(['cliente'])
                ->orderBy('data_vencimento', 'asc')
                ->get()
                ->map(function ($fatura) use ($hoje) {
                    $valorPago = $fatura->recibos()
                        ->where('estado', '!=', 'cancelado')
                        ->sum('total_liquido') ?? 0;

                    $valorAdiantamentos = DB::table('adiantamento_fatura')
                        ->where('fatura_id', $fatura->id)
                        ->sum('valor_utilizado');

                    $valorPendente = $fatura->total_liquido - $valorPago - $valorAdiantamentos;

                    return [
                        'id' => $fatura->id,
                        'numero_documento' => $fatura->numero_documento,
                        'cliente' => $fatura->cliente?->nome ?? $fatura->cliente_nome ?? 'Consumidor Final',
                        'data_emissao' => $fatura->data_emissao,
                        'data_vencimento' => $fatura->data_vencimento,
                        'valor_total' => $fatura->total_liquido,
                        'valor_pendente' => max(0, $valorPendente),
                        'retencao' => $fatura->total_retencao, // ✅ NOVO
                        'dias_atraso' => $fatura->data_vencimento && $fatura->data_vencimento < $hoje
                            ? $hoje->diffInDays($fatura->data_vencimento)
                            : 0,
                        'estado' => $fatura->estado,
                    ];
                })
                ->filter(fn($f) => $f['valor_pendente'] > 0)
                ->values();

            // Adiantamentos pendentes (FA emitidos)
            $adiantamentosPendentes = DocumentoFiscal::where('tipo_documento', 'FA')
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->with(['cliente'])
                ->orderBy('data_vencimento', 'asc')
                ->get()
                ->map(function ($adiantamento) use ($hoje) {
                    $valorPago = $adiantamento->recibos()
                        ->where('estado', '!=', 'cancelado')
                        ->sum('total_liquido') ?? 0;

                    $valorPendente = $adiantamento->total_liquido - $valorPago;

                    return [
                        'id' => $adiantamento->id,
                        'numero_documento' => $adiantamento->numero_documento,
                        'cliente' => $adiantamento->cliente?->nome ?? $adiantamento->cliente_nome ?? 'Consumidor Final',
                        'data_emissao' => $adiantamento->data_emissao,
                        'data_vencimento' => $adiantamento->data_vencimento,
                        'valor_total' => $adiantamento->total_liquido,
                        'valor_pendente' => max(0, $valorPendente),
                        'dias_atraso' => $adiantamento->data_vencimento && $adiantamento->data_vencimento < $hoje
                            ? $hoje->diffInDays($adiantamento->data_vencimento)
                            : 0,
                        'estado' => $adiantamento->estado,
                    ];
                })
                ->filter(fn($a) => $a['valor_pendente'] > 0)
                ->values();

            // Estatísticas
            $totalPendente = $faturasPendentes->sum('valor_pendente') + $adiantamentosPendentes->sum('valor_pendente');
            $totalAtrasado = $faturasPendentes->where('dias_atraso', '>', 0)->sum('valor_pendente') +
                            $adiantamentosPendentes->where('dias_atraso', '>', 0)->sum('valor_pendente');

            // ✅ Total de retenção pendente
            $retencaoPendente = $faturasPendentes->sum('retencao');

            return response()->json([
                'success' => true,
                'message' => 'Relatório de pagamentos pendentes carregado com sucesso',
                'data' => [
                    'resumo' => [
                        'total_pendente' => $totalPendente,
                        'total_atrasado' => $totalAtrasado,
                        'quantidade_faturas' => $faturasPendentes->count(),
                        'quantidade_adiantamentos' => $adiantamentosPendentes->count(),
                        'retencao_pendente' => $retencaoPendente, // ✅ NOVO
                    ],
                    'faturas_pendentes' => $faturasPendentes,
                    'adiantamentos_pendentes' => $adiantamentosPendentes,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de pagamentos pendentes:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de pagamentos pendentes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de proformas pendentes
     * GET /api/relatorios/proformas
     */
    public function proformas(Request $request)
    {
        try {
            $dados = $request->validate([
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'pendentes' => 'nullable|boolean',
            ]);

            $dataInicio = $dados['data_inicio'] ?? now()->startOfMonth()->toDateString();
            $dataFim = $dados['data_fim'] ?? now()->toDateString();

            $query = DocumentoFiscal::where('tipo_documento', 'FP')
                ->with(['cliente'])
                ->whereBetween('data_emissao', [$dataInicio, $dataFim]);

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            }

            if (!empty($dados['pendentes'])) {
                $query->where('estado', 'emitido');
            }

            $proformas = $query->orderBy('data_emissao', 'desc')->get();

            return response()->json([
                'success' => true,
                'message' => 'Relatório de proformas carregado com sucesso',
                'data' => [
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                    ],
                    'total' => $proformas->count(),
                    'valor_total' => $proformas->sum('total_liquido'),
                    'proformas' => $proformas,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar relatório de proformas:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório de proformas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Método auxiliar para agrupar vendas
     */
    private function agruparVendas($vendas, $agruparPor)
    {
        $agrupado = [];

        foreach ($vendas as $venda) {
            $chave = match ($agruparPor) {
                'dia' => $venda->data_venda->format('Y-m-d'),
                'mes' => $venda->data_venda->format('Y-m'),
                'ano' => $venda->data_venda->format('Y'),
                default => $venda->data_venda->format('Y-m-d'),
            };

            if (!isset($agrupado[$chave])) {
                $agrupado[$chave] = [
                    'periodo' => $chave,
                    'quantidade' => 0,
                    'total' => 0,
                    'base_tributavel' => 0,
                    'total_iva' => 0,
                    'total_retencao' => 0, // ✅ NOVO
                ];
            }

            $agrupado[$chave]['quantidade']++;
            $agrupado[$chave]['total'] += $venda->total;
            $agrupado[$chave]['base_tributavel'] += $venda->base_tributavel;
            $agrupado[$chave]['total_iva'] += $venda->total_iva;
            $agrupado[$chave]['total_retencao'] += $venda->total_retencao; // ✅ NOVO
        }

        return array_values($agrupado);
    }
}
