<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\Compra;
use App\Models\Fatura;
use App\Models\Produto;
use App\Models\Cliente;
use App\Models\Fornecedor;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Excel as ExcelFormat;

class RelatoriosService
{
    protected $stockService;

    public function __construct()
    {
        $this->stockService = app(\App\Services\StockService::class);
    }

    /**
     * Relatório detalhado de vendas
     */
    public function relatorioVendas($dataInicio = null, $dataFim = null)
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de vendas', [
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim
        ]);

        $query = Venda::with(['cliente', 'itens.produto']);

        if ($dataInicio) {
            $query->whereDate('created_at', '>=', $dataInicio);
            Log::info('[RELATORIOS SERVICE] Filtro data_inicio aplicado', ['data_inicio' => $dataInicio]);
        }

        if ($dataFim) {
            $query->whereDate('created_at', '<=', $dataFim);
            Log::info('[RELATORIOS SERVICE] Filtro data_fim aplicado', ['data_fim' => $dataFim]);
        }

        $vendas = $query->get();

        Log::info('[RELATORIOS SERVICE] Vendas encontradas', ['quantidade' => $vendas->count()]);

        // Calcular KPIs
        $totalPeriodo = $vendas->sum('total');
        $quantidadeVendas = $vendas->count();
        $ticketMedio = $quantidadeVendas > 0 ? $totalPeriodo / $quantidadeVendas : 0;
        $clientesUnicos = $vendas->pluck('cliente_id')->unique()->count();
        $produtosVendidos = $vendas->flatMap(function ($venda) {
            return $venda->itens->pluck('produto_id');
        })->unique()->count();

        $resultado = [
            'vendas' => $vendas->map(function ($venda) {
                return [
                    'id' => $venda->id,
                    'cliente' => $venda->cliente->nome ?? 'Cliente não identificado',
                    'data' => $venda->created_at->format('Y-m-d'),
                    'total' => $venda->total,
                    'status' => $venda->status ?? 'paga'
                ];
            }),
            'kpis' => [
                'totalVendas' => $totalPeriodo,
                'ticketMedio' => round($ticketMedio, 2),
                'clientesPeriodo' => $clientesUnicos,
                'produtos' => $produtosVendidos,
                'fornecedores' => 0 // Não aplicável para vendas
            ],
            'total_periodo' => $totalPeriodo,
            'quantidade_vendas' => $quantidadeVendas
        ];

        Log::info('[RELATORIOS SERVICE] Relatório de vendas processado', [
            'total_periodo' => $totalPeriodo,
            'quantidade_vendas' => $quantidadeVendas,
            'ticket_medio' => $ticketMedio
        ]);

        return $resultado;
    }

    /**
     * Relatório detalhado de compras
     */
    public function relatorioCompras($dataInicio = null, $dataFim = null)
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de compras', [
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim
        ]);

        $query = Compra::with(['fornecedor', 'itens.produto']);

        if ($dataInicio) {
            $query->whereDate('created_at', '>=', $dataInicio);
        }

        if ($dataFim) {
            $query->whereDate('created_at', '<=', $dataFim);
        }

        $compras = $query->get();

        Log::info('[RELATORIOS SERVICE] Compras encontradas', ['quantidade' => $compras->count()]);

        $totalCompras = $compras->sum('total');
        $quantidadeCompras = $compras->count();
        $fornecedoresAtivos = $compras->pluck('fornecedor_id')->unique()->count();

        // Agrupar por fornecedor
        $comprasPorFornecedor = $compras->groupBy('fornecedor_id')->map(function ($grupo) {
            $primeiraCompra = $grupo->first();
            return [
                'fornecedor' => $primeiraCompra->fornecedor->nome ?? 'Fornecedor não identificado',
                'total' => $grupo->sum('total'),
                'quantidade' => $grupo->count()
            ];
        })->values();

        $resultado = [
            'total_compras' => $totalCompras,
            'quantidade_compras' => $quantidadeCompras,
            'fornecedores_ativos' => $fornecedoresAtivos,
            'compras_por_fornecedor' => $comprasPorFornecedor
        ];

        Log::info('[RELATORIOS SERVICE] Relatório de compras processado', [
            'total_compras' => $totalCompras,
            'quantidade_compras' => $quantidadeCompras
        ]);

        return $resultado;
    }

    /**
     * Relatório detalhado de faturação
     */
    public function relatorioFaturacao($dataInicio = null, $dataFim = null)
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de faturação', [
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim
        ]);

        $query = Fatura::with(['cliente', 'venda', 'itens.produto']);

        if ($dataInicio) {
            $query->whereDate('created_at', '>=', $dataInicio);
        }

        if ($dataFim) {
            $query->whereDate('created_at', '<=', $dataFim);
        }

        $faturas = $query->get();

        Log::info('[RELATORIOS SERVICE] Faturas encontradas', ['quantidade' => $faturas->count()]);

        $faturacaoTotal = $faturas->sum('total_liquido');
        $faturacaoPaga = $faturas->where('status', 'paga')->sum('total_liquido');
        $faturacaoPendente = $faturas->where('status', 'pendente')->sum('total_liquido');

        // Agrupar por mês
        $faturacaoPorMes = $faturas->groupBy(function ($fatura) {
            return $fatura->created_at->format('Y-m');
        })->map(function ($grupo, $mes) {
            return [
                'mes' => $mes,
                'total' => $grupo->sum('total_liquido')
            ];
        })->values();

        $resultado = [
            'faturacao_total' => $faturacaoTotal,
            'faturacao_paga' => $faturacaoPaga,
            'faturacao_pendente' => $faturacaoPendente,
            'faturacao_por_mes' => $faturacaoPorMes
        ];

        Log::info('[RELATORIOS SERVICE] Relatório de faturação processado', [
            'faturacao_total' => $faturacaoTotal,
            'faturacao_paga' => $faturacaoPaga,
            'faturacao_pendente' => $faturacaoPendente
        ]);

        return $resultado;
    }

    /**
     * Relatório detalhado de stock
     */
    public function relatorioStock()
    {
        Log::info('[RELATORIOS SERVICE] Iniciando relatório de stock');

        $produtos = Produto::select(
            'id',
            'nome',
            'estoque_atual',
            'estoque_minimo',
            'preco_compra',
            'preco_venda',
            'custo_medio',
            'categoria_id'
        )->with('categoria')->get();

        Log::info('[RELATORIOS SERVICE] Produtos encontrados', ['quantidade' => $produtos->count()]);

        $produtos->each(function ($produto) {
            $produto->margem_lucro = $produto->preco_compra > 0
                ? (($produto->preco_venda - $produto->preco_compra) / $produto->preco_compra) * 100
                : 0;
            $produto->valor_total_stock = $produto->estoque_atual * ($produto->custo_medio ?? $produto->preco_compra);
            $produto->em_risco = $produto->estoque_atual <= $produto->estoque_minimo;
        });

        $totalProdutos = $produtos->count();
        $valorStockTotal = $produtos->sum('valor_total_stock');
        $produtosBaixoStock = $produtos->where('em_risco', true)->count();
        $produtosSemStock = $produtos->where('estoque_atual', 0)->count();

        // Agrupar por categoria
        $produtosPorCategoria = $produtos->groupBy('categoria_id')->map(function ($grupo) {
            $primeiro = $grupo->first();
            return [
                'categoria' => $primeiro->categoria->nome ?? 'Sem categoria',
                'quantidade' => $grupo->sum('estoque_atual'),
                'valor' => $grupo->sum('valor_total_stock')
            ];
        })->values();

        $resultado = [
            'total_produtos' => $totalProdutos,
            'valor_stock_total' => $valorStockTotal,
            'produtos_baixo_stock' => $produtosBaixoStock,
            'produtos_sem_stock' => $produtosSemStock,
            'produtos_por_categoria' => $produtosPorCategoria
        ];

        Log::info('[RELATORIOS SERVICE] Relatório de stock processado', [
            'total_produtos' => $totalProdutos,
            'valor_stock_total' => $valorStockTotal,
            'produtos_baixo_stock' => $produtosBaixoStock
        ]);

        return $resultado;
    }

    /**
     * Dashboard geral
     */
    public function dashboard()
    {
        Log::info('[RELATORIOS SERVICE] Iniciando dashboard');

        $hoje = now()->startOfDay();
        $inicioMes = now()->startOfMonth();
        $inicioAno = now()->startOfYear();

        // Vendas de hoje
        $vendasHoje = Venda::whereDate('created_at', $hoje)->sum('total');

        // Vendas do mês
        $vendasMes = Venda::whereDate('created_at', '>=', $inicioMes)->sum('total');

        // Vendas do ano
        $vendasAno = Venda::whereDate('created_at', '>=', $inicioAno)->sum('total');

        // Totais
        $totalClientes = Cliente::count();
        $totalProdutos = Produto::count();
        $totalFornecedores = Fornecedor::count();

        // Alertas de stock
        $alertasStock = Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')->count();

        $resultado = [
            'vendas_hoje' => $vendasHoje,
            'vendas_mes' => $vendasMes,
            'vendas_ano' => $vendasAno,
            'total_clientes' => $totalClientes,
            'total_produtos' => $totalProdutos,
            'total_fornecedores' => $totalFornecedores,
            'alertas_stock' => $alertasStock
        ];

        Log::info('[RELATORIOS SERVICE] Dashboard processado', $resultado);

        return $resultado;
    }

    /**
     * Exportar relatório para Excel
     */
    public function exportarRelatorioExcel(string $tipo, $dataInicio = null, $dataFim = null)
    {
        Log::info('[RELATORIOS SERVICE] Exportando Excel', ['tipo' => $tipo, 'data_inicio' => $dataInicio, 'data_fim' => $dataFim]);

        $arquivo = now()->format('Ymd_His') . "_relatorio_{$tipo}.xlsx";

        return Excel::download(new class($tipo, $dataInicio, $dataFim) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings {

            protected $tipo;
            protected $dataInicio;
            protected $dataFim;

            public function __construct($tipo, $dataInicio, $dataFim)
            {
                $this->tipo = $tipo;
                $this->dataInicio = $dataInicio;
                $this->dataFim = $dataFim;
            }

            public function collection()
            {
                switch ($this->tipo) {
                    case 'vendas':
                        $query = Venda::with('cliente', 'itens.produto');
                        if ($this->dataInicio) $query->whereDate('created_at', '>=', $this->dataInicio);
                        if ($this->dataFim) $query->whereDate('created_at', '<=', $this->dataFim);
                        return $query->get()->map(function ($v) {
                            return [
                                'ID' => $v->id,
                                'Cliente' => $v->cliente->nome ?? '---',
                                'Data' => $v->created_at->format('Y-m-d'),
                                'Total' => $v->total,
                                'Itens' => $v->itens->count()
                            ];
                        });
                    case 'compras':
                        $query = Compra::with('fornecedor', 'itens');
                        if ($this->dataInicio) $query->whereDate('created_at', '>=', $this->dataInicio);
                        if ($this->dataFim) $query->whereDate('created_at', '<=', $this->dataFim);
                        return $query->get()->map(function ($c) {
                            return [
                                'ID' => $c->id,
                                'Fornecedor' => $c->fornecedor->nome ?? '---',
                                'Data' => $c->created_at->format('Y-m-d'),
                                'Total' => $c->total,
                                'Itens' => $c->itens->count()
                            ];
                        });
                    case 'faturacao':
                        $query = Fatura::with('cliente', 'itens.produto');
                        if ($this->dataInicio) $query->whereDate('created_at', '>=', $this->dataInicio);
                        if ($this->dataFim) $query->whereDate('created_at', '<=', $this->dataFim);
                        return $query->get()->map(function ($f) {
                            return [
                                'ID' => $f->id,
                                'Cliente' => $f->cliente->nome ?? '---',
                                'Data Emissão' => $f->created_at->format('Y-m-d'),
                                'Total Líquido' => $f->total_liquido,
                                'Itens' => $f->itens->count()
                            ];
                        });
                    case 'stock':
                        return Produto::all()->map(function ($p) {
                            $margem = $p->preco_compra > 0 ? (($p->preco_venda - $p->preco_compra) / $p->preco_compra) * 100 : 0;
                            return [
                                'ID' => $p->id,
                                'Nome' => $p->nome,
                                'Stock Atual' => $p->estoque_atual,
                                'Stock Minimo' => $p->estoque_minimo,
                                'Preco Compra' => $p->preco_compra,
                                'Preco Venda' => $p->preco_venda,
                                'Custo Medio' => $p->custo_medio ?? $p->preco_compra,
                                'Margem Lucro (%)' => $margem,
                                'Valor Total Stock' => $p->estoque_atual * ($p->custo_medio ?? $p->preco_compra),
                                'Em Risco' => $p->estoque_atual <= $p->estoque_minimo ? 'SIM' : 'NÃO'
                            ];
                        });
                }
            }

            public function headings(): array
            {
                switch ($this->tipo) {
                    case 'vendas':
                        return ['ID', 'Cliente', 'Data', 'Total', 'Itens'];
                    case 'compras':
                        return ['ID', 'Fornecedor', 'Data', 'Total', 'Itens'];
                    case 'faturacao':
                        return ['ID', 'Cliente', 'Data Emissão', 'Total Líquido', 'Itens'];
                    case 'stock':
                        return ['ID', 'Nome', 'Stock Atual', 'Stock Minimo', 'Preco Compra', 'Preco Venda', 'Custo Medio', 'Margem Lucro (%)', 'Valor Total Stock', 'Em Risco'];
                }
                return [];
            }
        }, $arquivo, ExcelFormat::XLSX);
    }
}
