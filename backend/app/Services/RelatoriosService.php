<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\Compra;
use App\Models\DocumentoFiscal;
use App\Models\Produto;
use App\Models\Cliente;
use App\Models\Fornecedor;
use App\Models\MovimentoStock;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Carbon\Carbon;

class RelatoriosService
{
    protected $stockService;

    public function __construct()
    {
        $this->stockService = app(\App\Services\StockService::class);
    }

    /**
     * Dashboard geral com indicadores principais
     */
    public function dashboard()
    {
        Log::info('[RELATORIOS SERVICE] Iniciando dashboard');

        $hoje = now()->startOfDay();
        $inicioMes = now()->startOfMonth();
        $inicioAno = now()->startOfYear();

        // Vendas de hoje (faturadas)
        $vendasHoje = Venda::whereDate('created_at', $hoje)
            ->where('status', 'faturada')
            ->sum('total');

        // Vendas do mês (faturadas)
        $vendasMes = Venda::whereDate('created_at', '>=', $inicioMes)
            ->where('status', 'faturada')
            ->sum('total');

        // Vendas do ano (faturadas)
        $vendasAno = Venda::whereDate('created_at', '>=', $inicioAno)
            ->where('status', 'faturada')
            ->sum('total');

        // Documentos fiscais
        $documentosMes = DocumentoFiscal::whereBetween('data_emissao', [$inicioMes, $hoje])->count();
        $faturasPendentes = DocumentoFiscal::where('tipo_documento', 'FT')
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->count();

        $totalPendenteCobranca = DocumentoFiscal::where('tipo_documento', 'FT')
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->sum('total_liquido');

        // Totais
        $totalClientes = Cliente::count();
        $totalProdutos = Produto::count();
        $totalFornecedores = Fornecedor::count();

        // Alertas de stock
        $alertasStock = Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')->count();

        // Adiantamentos pendentes
        $adiantamentosPendentes = DocumentoFiscal::where('tipo_documento', 'FA')
            ->where('estado', 'emitido')
            ->count();

        // Proformas pendentes
        $proformasPendentes = DocumentoFiscal::where('tipo_documento', 'FP')
            ->where('estado', 'emitido')
            ->count();

        $resultado = [
            'vendas_hoje' => $vendasHoje,
            'vendas_mes' => $vendasMes,
            'vendas_ano' => $vendasAno,
            'documentos_mes' => $documentosMes,
            'faturas_pendentes' => $faturasPendentes,
            'total_pendente_cobranca' => $totalPendenteCobranca,
            'adiantamentos_pendentes' => $adiantamentosPendentes,
            'proformas_pendentes' => $proformasPendentes,
            'total_clientes' => $totalClientes,
            'total_produtos' => $totalProdutos,
            'total_fornecedores' => $totalFornecedores,
            'alertas_stock' => $alertasStock
        ];

        Log::info('[RELATORIOS SERVICE] Dashboard processado', $resultado);

        return $resultado;
    }

    /**
     * Relatório detalhado de vendas
     */
    public function relatorioVendas($dataInicio = null, $dataFim = null, $filtros = [])
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de vendas', [
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'filtros' => $filtros
        ]);

        $query = Venda::with(['cliente', 'itens.produto', 'documentoFiscal']);

        if ($dataInicio) {
            $query->whereDate('data_venda', '>=', $dataInicio);
        }

        if ($dataFim) {
            $query->whereDate('data_venda', '<=', $dataFim);
        }

        // Filtros adicionais
        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }

        if (!empty($filtros['apenas_vendas'])) {
            $query->whereHas('documentoFiscal', function ($q) {
                $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
            });
        }

        if (!empty($filtros['estado_pagamento'])) {
            $query->where('estado_pagamento', $filtros['estado_pagamento']);
        }

        $vendas = $query->orderBy('data_venda', 'desc')->get();

        Log::info('[RELATORIOS SERVICE] Vendas encontradas', ['quantidade' => $vendas->count()]);

        // Calcular KPIs
        $totalPeriodo = $vendas->sum('total');
        $quantidadeVendas = $vendas->count();
        $ticketMedio = $quantidadeVendas > 0 ? $totalPeriodo / $quantidadeVendas : 0;
        $clientesUnicos = $vendas->pluck('cliente_id')->filter()->unique()->count();
        $produtosVendidos = $vendas->flatMap(function ($venda) {
            return $venda->itens->pluck('produto_id');
        })->filter()->unique()->count();

        // Vendas por status
        $vendasPorStatus = [
            'pagas' => $vendas->where('estado_pagamento', 'paga')->count(),
            'pendentes' => $vendas->whereIn('estado_pagamento', ['pendente', 'parcial'])->count(),
            'canceladas' => $vendas->where('estado_pagamento', 'cancelada')->count(),
        ];

        $resultado = [
            'vendas' => $vendas->map(function ($venda) {
                return [
                    'id' => $venda->id,
                    'numero_documento' => $venda->numero_documento,
                    'cliente' => $venda->cliente->nome ?? $venda->cliente_nome ?? 'Cliente não identificado',
                    'data' => $venda->data_venda,
                    'hora' => $venda->hora_venda,
                    'total' => $venda->total,
                    'base_tributavel' => $venda->base_tributavel,
                    'total_iva' => $venda->total_iva,
                    'estado_pagamento' => $venda->estado_pagamento,
                    'tipo_documento' => $venda->documentoFiscal?->tipo_documento,
                ];
            }),
            'kpis' => [
                'total_vendas' => $totalPeriodo,
                'quantidade_vendas' => $quantidadeVendas,
                'ticket_medio' => round($ticketMedio, 2),
                'clientes_periodo' => $clientesUnicos,
                'produtos_vendidos' => $produtosVendidos,
                'vendas_por_status' => $vendasPorStatus,
            ],
            'periodo' => [
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
            ]
        ];

        Log::info('[RELATORIOS SERVICE] Relatório de vendas processado', [
            'total_periodo' => $totalPeriodo,
            'quantidade_vendas' => $quantidadeVendas
        ]);

        return $resultado;
    }

    /**
     * Relatório detalhado de compras
     */
    public function relatorioCompras($dataInicio = null, $dataFim = null, $fornecedorId = null)
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de compras', [
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'fornecedor_id' => $fornecedorId
        ]);

        $query = Compra::with(['fornecedor', 'itens.produto']);

        if ($dataInicio) {
            $query->whereDate('data', '>=', $dataInicio);
        }

        if ($dataFim) {
            $query->whereDate('data', '<=', $dataFim);
        }

        if ($fornecedorId) {
            $query->where('fornecedor_id', $fornecedorId);
        }

        $compras = $query->orderBy('data', 'desc')->get();

        Log::info('[RELATORIOS SERVICE] Compras encontradas', ['quantidade' => $compras->count()]);

        $totalCompras = $compras->sum('total');
        $quantidadeCompras = $compras->count();
        $fornecedoresAtivos = $compras->pluck('fornecedor_id')->filter()->unique()->count();

        // Agrupar por fornecedor
        $comprasPorFornecedor = $compras->groupBy('fornecedor_id')->map(function ($grupo) {
            $primeiraCompra = $grupo->first();
            return [
                'fornecedor' => $primeiraCompra->fornecedor->nome ?? 'Fornecedor não identificado',
                'total' => $grupo->sum('total'),
                'quantidade' => $grupo->count()
            ];
        })->values();

        // Agrupar por mês
        $comprasPorMes = $compras->groupBy(function ($compra) {
            return Carbon::parse($compra->data)->format('Y-m');
        })->map(function ($grupo, $mes) {
            return [
                'mes' => $mes,
                'total' => $grupo->sum('total'),
                'quantidade' => $grupo->count()
            ];
        })->values();

        $resultado = [
            'total_compras' => $totalCompras,
            'quantidade_compras' => $quantidadeCompras,
            'fornecedores_ativos' => $fornecedoresAtivos,
            'compras_por_fornecedor' => $comprasPorFornecedor,
            'compras_por_mes' => $comprasPorMes,
            'periodo' => [
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
            ]
        ];

        Log::info('[RELATORIOS SERVICE] Relatório de compras processado', [
            'total_compras' => $totalCompras,
            'quantidade_compras' => $quantidadeCompras
        ]);

        return $resultado;
    }

    /**
     * Relatório detalhado de faturação/documentos fiscais
     */
    public function relatorioFaturacao($dataInicio = null, $dataFim = null, $filtros = [])
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de faturação', [
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'filtros' => $filtros
        ]);

        $query = DocumentoFiscal::with(['cliente']);

        if ($dataInicio) {
            $query->whereDate('data_emissao', '>=', $dataInicio);
        }

        if ($dataFim) {
            $query->whereDate('data_emissao', '<=', $dataFim);
        }

        // Filtros adicionais
        if (!empty($filtros['tipo'])) {
            $query->where('tipo_documento', $filtros['tipo']);
        }

        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }

        if (!empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }

        $documentos = $query->orderBy('data_emissao', 'desc')->get();

        Log::info('[RELATORIOS SERVICE] Documentos encontrados', ['quantidade' => $documentos->count()]);

        // Totais por tipo
        $porTipo = $documentos->groupBy('tipo_documento')->map(function ($grupo, $tipo) {
            return [
                'quantidade' => $grupo->count(),
                'total_liquido' => $grupo->sum('total_liquido'),
                'total_base' => $grupo->sum('base_tributavel'),
                'total_iva' => $grupo->sum('total_iva'),
            ];
        });

        // Totais por estado
        $porEstado = $documentos->groupBy('estado')->map(fn($g) => $g->count());

        $faturacaoTotal = $documentos->sum('total_liquido');
        $faturacaoPaga = $documentos->whereIn('estado', ['paga'])->sum('total_liquido');
        $faturacaoPendente = $documentos->whereIn('estado', ['emitido', 'parcialmente_paga'])->sum('total_liquido');

        // Agrupar por mês
        $faturacaoPorMes = $documentos->groupBy(function ($doc) {
            return Carbon::parse($doc->data_emissao)->format('Y-m');
        })->map(function ($grupo, $mes) {
            return [
                'mes' => $mes,
                'total' => $grupo->sum('total_liquido'),
                'quantidade' => $grupo->count()
            ];
        })->values();

        $resultado = [
            'faturacao_total' => $faturacaoTotal,
            'faturacao_paga' => $faturacaoPaga,
            'faturacao_pendente' => $faturacaoPendente,
            'faturacao_por_mes' => $faturacaoPorMes,
            'por_tipo' => $porTipo,
            'por_estado' => $porEstado,
            'periodo' => [
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
            ]
        ];

        Log::info('[RELATORIOS SERVICE] Relatório de faturação processado', [
            'faturacao_total' => $faturacaoTotal
        ]);

        return $resultado;
    }

    /**
     * Relatório detalhado de stock - CORRIGIDO
     */
    public function relatorioStock($filtros = [])
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de stock');

        try {
            // Buscar produtos com suas categorias
            $query = Produto::with('categoria')
                ->where('tipo', 'produto'); // Apenas produtos físicos

            // Filtros
            if (!empty($filtros['categoria_id'])) {
                $query->where('categoria_id', $filtros['categoria_id']);
            }

            if (!empty($filtros['apenas_ativos'])) {
                $query->where('status', 'ativo');
            }

            if (!empty($filtros['estoque_baixo'])) {
                $query->estoqueBaixo();
            }

            if (!empty($filtros['sem_estoque'])) {
                $query->semEstoque();
            }

            $produtos = $query->get();

            Log::info('[RELATORIOS SERVICE] Produtos encontrados', ['quantidade' => $produtos->count()]);

            // Processar dados de cada produto
            $produtosProcessados = $produtos->map(function ($produto) {
                $custo = $produto->custo_medio ?? $produto->preco_compra ?? 0;
                return [
                    'id' => $produto->id,
                    'nome' => $produto->nome,
                    'codigo' => $produto->codigo,
                    'categoria_id' => $produto->categoria_id,
                    'categoria_nome' => $produto->categoria?->nome ?? 'Sem categoria',
                    'estoque_atual' => $produto->estoque_atual,
                    'estoque_minimo' => $produto->estoque_minimo,
                    'preco_compra' => $produto->preco_compra,
                    'preco_venda' => $produto->preco_venda,
                    'custo_medio' => $custo,
                    'status' => $produto->status,
                    'margem_lucro' => $custo > 0 ? (($produto->preco_venda - $custo) / $custo) * 100 : 0,
                    'valor_total_stock' => $produto->estoque_atual * $custo,
                    'em_risco' => $produto->estoque_atual <= $produto->estoque_minimo,
                ];
            });

            $totalProdutos = $produtosProcessados->count();
            $valorStockTotal = $produtosProcessados->sum('valor_total_stock');
            $produtosBaixoStock = $produtosProcessados->where('em_risco', true)->count();
            $produtosSemStock = $produtosProcessados->where('estoque_atual', 0)->count();

            // Agrupar por categoria
            $produtosPorCategoria = $produtosProcessados->groupBy('categoria_id')->map(function ($grupo) {
                $primeiro = $grupo->first();
                return [
                    'categoria' => $primeiro['categoria_nome'],
                    'quantidade' => $grupo->sum('estoque_atual'),
                    'valor' => $grupo->sum('valor_total_stock'),
                    'produtos' => $grupo->count()
                ];
            })->values();

            // Movimentações recentes (últimos 30 dias)
            $movimentosRecentes = MovimentoStock::with(['produto', 'user'])
                ->where('created_at', '>=', now()->subDays(30))
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get()
                ->map(function ($mov) {
                    return [
                        'id' => $mov->id,
                        'produto' => $mov->produto?->nome ?? 'N/A',
                        'tipo' => $mov->tipo,
                        'quantidade' => $mov->quantidade,
                        'motivo' => $mov->motivo,
                        'data' => $mov->created_at->format('Y-m-d H:i'),
                        'user' => $mov->user?->name ?? 'Sistema',
                    ];
                });

            $resultado = [
                'total_produtos' => $totalProdutos,
                'valor_stock_total' => $valorStockTotal,
                'produtos_baixo_stock' => $produtosBaixoStock,
                'produtos_sem_stock' => $produtosSemStock,
                'produtos_por_categoria' => $produtosPorCategoria,
                'movimentos_recentes' => $movimentosRecentes,
                'produtos' => $produtosProcessados // Opcional: lista completa
            ];

            Log::info('[RELATORIOS SERVICE] Relatório de stock processado', [
                'total_produtos' => $totalProdutos,
                'valor_stock_total' => $valorStockTotal
            ]);

            return $resultado;

        } catch (\Exception $e) {
            Log::error('[RELATORIOS SERVICE] Erro no relatório de stock:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Retornar estrutura vazia em caso de erro
            return [
                'total_produtos' => 0,
                'valor_stock_total' => 0,
                'produtos_baixo_stock' => 0,
                'produtos_sem_stock' => 0,
                'produtos_por_categoria' => [],
                'movimentos_recentes' => [],
                'produtos' => []
            ];
        }
    }

    /**
     * Relatório de pagamentos pendentes
     */
    public function relatorioPagamentosPendentes()
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de pagamentos pendentes');

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

            return [
                'resumo' => [
                    'total_pendente' => $totalPendente,
                    'total_atrasado' => $totalAtrasado,
                    'quantidade_faturas' => $faturasPendentes->count(),
                    'quantidade_adiantamentos' => $adiantamentosPendentes->count(),
                ],
                'faturas_pendentes' => $faturasPendentes,
                'adiantamentos_pendentes' => $adiantamentosPendentes,
            ];

        } catch (\Exception $e) {
            Log::error('[RELATORIOS SERVICE] Erro no relatório de pagamentos:', [
                'error' => $e->getMessage()
            ]);

            return [
                'resumo' => [
                    'total_pendente' => 0,
                    'total_atrasado' => 0,
                    'quantidade_faturas' => 0,
                    'quantidade_adiantamentos' => 0,
                ],
                'faturas_pendentes' => [],
                'adiantamentos_pendentes' => [],
            ];
        }
    }

    /**
     * Relatório de proformas
     */
    public function relatorioProformas($dataInicio = null, $dataFim = null, $clienteId = null, $apenasPendentes = false)
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de proformas');

        try {
            $query = DocumentoFiscal::where('tipo_documento', 'FP')
                ->with(['cliente']);

            if ($dataInicio && $dataFim) {
                $query->whereBetween('data_emissao', [$dataInicio, $dataFim]);
            } elseif ($dataInicio) {
                $query->whereDate('data_emissao', '>=', $dataInicio);
            } elseif ($dataFim) {
                $query->whereDate('data_emissao', '<=', $dataFim);
            }

            if ($clienteId) {
                $query->where('cliente_id', $clienteId);
            }

            if ($apenasPendentes) {
                $query->where('estado', 'emitido');
            }

            $proformas = $query->orderBy('data_emissao', 'desc')->get();

            return [
                'total' => $proformas->count(),
                'valor_total' => $proformas->sum('total_liquido'),
                'proformas' => $proformas->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'numero_documento' => $p->numero_documento,
                        'cliente' => $p->cliente?->nome ?? $p->cliente_nome ?? 'Consumidor Final',
                        'data_emissao' => $p->data_emissao,
                        'total_liquido' => $p->total_liquido,
                        'estado' => $p->estado,
                    ];
                }),
            ];

        } catch (\Exception $e) {
            Log::error('[RELATORIOS SERVICE] Erro no relatório de proformas:', [
                'error' => $e->getMessage()
            ]);

            return [
                'total' => 0,
                'valor_total' => 0,
                'proformas' => [],
            ];
        }
    }

    /**
     * Exportar relatório para Excel
     */
    public function exportarRelatorioExcel(string $tipo, $dataInicio = null, $dataFim = null, $filtros = [])
    {
        Log::info('[RELATORIOS SERVICE] Exportando Excel', [
            'tipo' => $tipo,
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim
        ]);

        $arquivo = now()->format('Ymd_His') . "_relatorio_{$tipo}.xlsx";

        return Excel::download(new class($tipo, $dataInicio, $dataFim, $filtros) implements
            \Maatwebsite\Excel\Concerns\FromCollection,
            \Maatwebsite\Excel\Concerns\WithHeadings,
            \Maatwebsite\Excel\Concerns\WithMapping
        {
            protected $tipo;
            protected $dataInicio;
            protected $dataFim;
            protected $filtros;

            public function __construct($tipo, $dataInicio, $dataFim, $filtros)
            {
                $this->tipo = $tipo;
                $this->dataInicio = $dataInicio;
                $this->dataFim = $dataFim;
                $this->filtros = $filtros;
            }

            public function collection()
            {
                try {
                    switch ($this->tipo) {
                        case 'vendas':
                            $query = Venda::with('cliente', 'itens.produto', 'documentoFiscal');
                            if ($this->dataInicio) $query->whereDate('data_venda', '>=', $this->dataInicio);
                            if ($this->dataFim) $query->whereDate('data_venda', '<=', $this->dataFim);
                            return $query->orderBy('data_venda', 'desc')->get();

                        case 'compras':
                            $query = Compra::with('fornecedor', 'itens.produto');
                            if ($this->dataInicio) $query->whereDate('data', '>=', $this->dataInicio);
                            if ($this->dataFim) $query->whereDate('data', '<=', $this->dataFim);
                            return $query->orderBy('data', 'desc')->get();

                        case 'faturacao':
                        case 'documentos':
                            $query = DocumentoFiscal::with('cliente');
                            if ($this->dataInicio) $query->whereDate('data_emissao', '>=', $this->dataInicio);
                            if ($this->dataFim) $query->whereDate('data_emissao', '<=', $this->dataFim);
                            return $query->orderBy('data_emissao', 'desc')->get();

                        case 'stock':
                            return Produto::with('categoria')
                                ->where('tipo', 'produto')
                                ->orderBy('nome')
                                ->get();

                        case 'proformas':
                            $query = DocumentoFiscal::where('tipo_documento', 'FP')
                                ->with('cliente');
                            if ($this->dataInicio) $query->whereDate('data_emissao', '>=', $this->dataInicio);
                            if ($this->dataFim) $query->whereDate('data_emissao', '<=', $this->dataFim);
                            return $query->orderBy('data_emissao', 'desc')->get();
                    }
                } catch (\Exception $e) {
                    Log::error('[RELATORIOS SERVICE] Erro na exportação:', [
                        'tipo' => $this->tipo,
                        'error' => $e->getMessage()
                    ]);
                    return collect([]);
                }
            }

            public function headings(): array
            {
                switch ($this->tipo) {
                    case 'vendas':
                        return ['ID', 'Nº Documento', 'Cliente', 'Data', 'Hora', 'Base Tributável', 'IVA', 'Total', 'Estado Pagamento'];
                    case 'compras':
                        return ['ID', 'Fornecedor', 'Data', 'Total', 'Itens', 'Documento'];
                    case 'faturacao':
                    case 'documentos':
                        return ['ID', 'Nº Documento', 'Tipo', 'Cliente', 'Data Emissão', 'Base Tributável', 'IVA', 'Total Líquido', 'Estado'];
                    case 'stock':
                        return ['ID', 'Nome', 'Categoria', 'Stock Atual', 'Stock Mínimo', 'Preço Compra', 'Preço Venda', 'Custo Médio', 'Valor Total Stock', 'Margem Lucro (%)', 'Em Risco'];
                    case 'proformas':
                        return ['ID', 'Nº Documento', 'Cliente', 'Data Emissão', 'Total', 'Estado'];
                }
                return [];
            }

            public function map($row): array
            {
                try {
                    switch ($this->tipo) {
                        case 'vendas':
                            return [
                                $row->id,
                                $row->numero_documento,
                                $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                                $row->data_venda,
                                $row->hora_venda,
                                $row->base_tributavel,
                                $row->total_iva,
                                $row->total,
                                $row->estado_pagamento,
                            ];
                        case 'compras':
                            return [
                                $row->id,
                                $row->fornecedor->nome ?? 'N/A',
                                $row->data,
                                $row->total,
                                $row->itens->count(),
                                $row->numero_documento,
                            ];
                        case 'faturacao':
                        case 'documentos':
                            return [
                                $row->id,
                                $row->numero_documento,
                                $row->tipo_documento,
                                $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                                $row->data_emissao,
                                $row->base_tributavel,
                                $row->total_iva,
                                $row->total_liquido,
                                $row->estado,
                            ];
                        case 'stock':
                            $custo = $row->custo_medio ?? $row->preco_compra ?? 0;
                            $margem = $custo > 0 ? (($row->preco_venda - $custo) / $custo) * 100 : 0;
                            return [
                                $row->id,
                                $row->nome,
                                $row->categoria?->nome ?? 'Sem categoria',
                                $row->estoque_atual,
                                $row->estoque_minimo,
                                $row->preco_compra,
                                $row->preco_venda,
                                $custo,
                                $row->estoque_atual * $custo,
                                round($margem, 2),
                                $row->estoque_atual <= $row->estoque_minimo ? 'SIM' : 'NÃO',
                            ];
                        case 'proformas':
                            return [
                                $row->id,
                                $row->numero_documento,
                                $row->cliente->nome ?? $row->cliente_nome ?? 'N/A',
                                $row->data_emissao,
                                $row->total_liquido,
                                $row->estado,
                            ];
                    }
                } catch (\Exception $e) {
                    Log::error('[RELATORIOS SERVICE] Erro no mapeamento Excel:', [
                        'tipo' => $this->tipo,
                        'error' => $e->getMessage()
                    ]);
                }
                return [];
            }
        }, $arquivo, ExcelFormat::XLSX);
    }
}
