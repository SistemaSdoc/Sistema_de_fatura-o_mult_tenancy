<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\Venda;
use App\Models\DocumentoFiscal;
use App\Models\Cliente;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DashboardService
{
    /**
     * Cache duration in seconds (0 = disabled for testing)
     */
    protected int $cacheDuration = 0;

    /**
     * Aplicar filtros de data à query
     */
    private function aplicarFiltrosData($query, ?array $filtros, string $coluna = 'created_at')
    {
        if (isset($filtros['data_inicio']) && !empty($filtros['data_inicio'])) {
            $query->whereDate($coluna, '>=', Carbon::parse($filtros['data_inicio'])->format('Y-m-d'));
        }

        if (isset($filtros['data_fim']) && !empty($filtros['data_fim'])) {
            $query->whereDate($coluna, '<=', Carbon::parse($filtros['data_fim'])->format('Y-m-d'));
        }

        return $query;
    }

    /**
     * Obter todos os dados do dashboard com filtros
     */
    public function getDashboard(array $filtros = []): array
    {
        try {
            return $this->calcularDashboard($filtros);
        } catch (\Exception $e) {
            Log::error('Erro ao calcular dashboard:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            throw $e;
        }
    }

    /**
     * Calcular todos os dados do dashboard com filtros
     */
    private function calcularDashboard(array $filtros = []): array
    {
        $hoje = Carbon::now();

        if (isset($filtros['data_inicio']) && isset($filtros['data_fim'])) {
            $dataInicio = Carbon::parse($filtros['data_inicio']);
            $dataFim    = Carbon::parse($filtros['data_fim']);

            $mesAtual = $dataFim->month;
            $anoAtual = $dataFim->year;

            $diasPeriodo        = $dataInicio->diffInDays($dataFim) + 1;
            $dataInicioAnterior = (clone $dataInicio)->subDays($diasPeriodo);
            $dataFimAnterior    = (clone $dataInicio)->subDay();

            $mesAnterior = $dataFimAnterior->month;
            $anoAnterior = $dataFimAnterior->year;
        } else {
            $mesAtual    = $hoje->month;
            $anoAtual    = $hoje->year;
            $mesAnterior = $hoje->copy()->subMonth()->month;
            $anoAnterior = $hoje->copy()->subMonth()->year;
        }

        $kpisDocumentos      = $this->calcularKPIsDocumentos($filtros, $mesAtual, $anoAtual, $mesAnterior, $anoAnterior);
        $dadosProdutos       = $this->getDadosProdutos($filtros);
        $dadosVendas         = $this->getDadosVendas($filtros);
        $dadosDocumentos     = $this->getDadosDocumentosFiscais($hoje, $filtros);
        $dadosPagamentos     = $this->getDadosPagamentos($hoje, $filtros);
        $dadosClientes       = $this->getDadosClientes($filtros, $mesAtual, $anoAtual);
        $produtosMaisVendidos = $this->getProdutosMaisVendidos($filtros);
        $servicosMaisVendidos = $this->getServicosMaisVendidos($filtros);
        $alertas             = $this->calcularAlertas($filtros);

        return [
            'kpis'             => $kpisDocumentos,
            'produtos'         => $dadosProdutos,
            'vendas'           => $dadosVendas,
            'documentos_fiscais' => $dadosDocumentos,
            'pagamentos'       => $dadosPagamentos,
            'clientes'         => $dadosClientes,
            'indicadores'      => [
                'produtosMaisVendidos' => $produtosMaisVendidos,
                'servicosMaisVendidos' => $servicosMaisVendidos,
            ],
            'alertas' => $alertas,
            'periodo' => [
                'mes_atual'    => $mesAtual,
                'ano_atual'    => $anoAtual,
                'mes_anterior' => $mesAnterior,
                'ano_anterior' => $anoAnterior,
            ],
        ];
    }

    /**
     * Calcular KPIs de documentos fiscais com filtros
     */
    private function calcularKPIsDocumentos(array $filtros, int $mesAtual, int $anoAtual, int $mesAnterior, int $anoAnterior): array
    {
        // CORRIGIDO: 'cancelado' em vez de 'anulada'
        $queryBase = DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
        $this->aplicarFiltrosData($queryBase, $filtros, 'data_emissao');
        $totalDocumentos = $queryBase->count();

        $queryFaturado = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_FATURA_RECIBO])
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
        $this->aplicarFiltrosData($queryFaturado, $filtros, 'data_emissao');
        $totalFaturado = $queryFaturado->sum('total_liquido');

        $queryNotasCredito = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_NOTA_CREDITO)
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
        $this->aplicarFiltrosData($queryNotasCredito, $filtros, 'data_emissao');
        $totalNotasCredito = $queryNotasCredito->sum('total_liquido');

        $totalLiquido = $totalFaturado - $totalNotasCredito;
        $ticketMedio  = $totalDocumentos > 0 ? round($totalLiquido / $totalDocumentos, 2) : 0;

        $queryReceitaMesAtual = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_FATURA_RECIBO])
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->whereMonth('data_emissao', $mesAtual)
            ->whereYear('data_emissao', $anoAtual);
        $this->aplicarFiltrosData($queryReceitaMesAtual, $filtros, 'data_emissao');
        $receitaMesAtual = $queryReceitaMesAtual->sum('total_liquido');

        $queryReceitaMesAnterior = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_FATURA_RECIBO])
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->whereMonth('data_emissao', $mesAnterior)
            ->whereYear('data_emissao', $anoAnterior);
        $this->aplicarFiltrosData($queryReceitaMesAnterior, $filtros, 'data_emissao');
        $receitaMesAnterior = $queryReceitaMesAnterior->sum('total_liquido');

        $crescimentoPercentual = $receitaMesAnterior > 0
            ? round((($receitaMesAtual - $receitaMesAnterior) / $receitaMesAnterior) * 100, 2)
            : 0;

        $queryIva = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_FATURA_RECIBO])
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
        $this->aplicarFiltrosData($queryIva, $filtros, 'data_emissao');
        $ivaArrecadado = $queryIva->sum('total_iva');

        $queryRetencao = DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
        $this->aplicarFiltrosData($queryRetencao, $filtros, 'data_emissao');
        $totalRetencao = $queryRetencao->sum('total_retencao');

        return [
            'ticketMedio'           => $ticketMedio,
            'crescimentoPercentual' => $crescimentoPercentual,
            'ivaArrecadado'         => $ivaArrecadado,
            'totalFaturado'         => $totalFaturado,
            'totalNotasCredito'     => $totalNotasCredito,
            'totalLiquido'          => $totalLiquido,
            'totalRetencao'         => $totalRetencao,
        ];
    }

    /**
     * Obter dados de produtos com filtros
     */
    private function getDadosProdutos(array $filtros = []): array
    {
        return [
            'total'      => Produto::count(),
            'ativos'     => Produto::where('status', 'ativo')->count(),
            'inativos'   => Produto::where('status', 'inativo')->count(),
            'stock_baixo' => Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')->count(),
            'servicos'   => [
                'total'         => Produto::where('tipo', 'servico')->count(),
                'ativos'        => Produto::where('tipo', 'servico')->where('status', 'ativo')->count(),
                'com_retencao'  => Produto::where('tipo', 'servico')->where('retencao', '>', 0)->count(),
            ],
        ];
    }

    /**
     * Obter dados de vendas com filtros
     */
    private function getDadosVendas(array $filtros = []): array
    {
        $queryUltimasVendas = Venda::with('documentoFiscal', 'cliente');
        $this->aplicarFiltrosData($queryUltimasVendas, $filtros, 'data_venda');

        $ultimasVendas = $queryUltimasVendas
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($v) => [
                'id'              => $v->id,
                'cliente'         => $v->cliente?->nome ?? 'Consumidor Final',
                'total'           => $v->total,
                'status'          => $v->status,
                'estado_pagamento' => $v->estado_pagamento,
                'documento_fiscal' => $v->documentoFiscal ? [
                    'tipo'          => $v->documentoFiscal->tipo_documento,
                    'numero'        => $v->documentoFiscal->numero_documento,
                    'estado'        => $v->documentoFiscal->estado,
                    'total_retencao' => $v->documentoFiscal->total_retencao,
                ] : null,
                'data' => $v->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        $queryTotal     = Venda::query();
        $queryAbertas   = Venda::where('status', 'aberta');
        $queryFaturadas = Venda::where('status', 'faturada');
        $queryCanceladas = Venda::where('status', 'cancelada');

        $this->aplicarFiltrosData($queryTotal,     $filtros, 'data_venda');
        $this->aplicarFiltrosData($queryAbertas,   $filtros, 'data_venda');
        $this->aplicarFiltrosData($queryFaturadas, $filtros, 'data_venda');
        $this->aplicarFiltrosData($queryCanceladas, $filtros, 'data_venda');

        return [
            'total'      => $queryTotal->count(),
            'abertas'    => $queryAbertas->count(),
            'faturadas'  => $queryFaturadas->count(),
            'canceladas' => $queryCanceladas->count(),
            'ultimas'    => $ultimasVendas,
        ];
    }

    /**
     * Obter dados de documentos fiscais com filtros
     */
    private function getDadosDocumentosFiscais(Carbon $hoje, array $filtros = []): array
    {
        $queryTotal = DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
        $this->aplicarFiltrosData($queryTotal, $filtros, 'data_emissao');
        $totalDocumentos = $queryTotal->count();

        $queryUltimos = DocumentoFiscal::with('cliente');
        $this->aplicarFiltrosData($queryUltimos, $filtros, 'data_emissao');
        $ultimosDocumentos = $queryUltimos
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'id'              => $d->id,
                'tipo'            => $d->tipo_documento,
                'tipo_nome'       => $d->tipo_documento_nome,
                'numero'          => $d->numero_documento,
                'cliente'         => $d->cliente?->nome ?? 'Consumidor Final',
                'total'           => $d->total_liquido,
                'total_retencao'  => $d->total_retencao,
                'estado'          => $d->estado,
                'estado_pagamento' => $this->determinarEstadoPagamento($d),
                'data'            => $d->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        return [
            'total'      => $totalDocumentos,
            'por_tipo'   => $this->getDocumentosPorTipo($filtros),
            'por_estado' => $this->getDocumentosPorEstado($filtros),
            'ultimos'    => $ultimosDocumentos,
            'por_mes'    => $this->getDocumentosPorMes($filtros),
            'por_dia'    => $this->getDocumentosPorDia($hoje, $filtros),
        ];
    }

    /**
     * Obter documentos fiscais por mês com filtros
     */
    private function getDocumentosPorMes(array $filtros = []): array
    {
        $query = DocumentoFiscal::select(
            DB::raw("DATE_FORMAT(data_emissao, '%Y-%m') as mes"),
            DB::raw('tipo_documento'),
            DB::raw('COUNT(*) as quantidade'),
            DB::raw('SUM(total_liquido) as total'),
            DB::raw('SUM(total_retencao) as retencao')
        )->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query
            ->groupBy('mes', 'tipo_documento')
            ->orderBy('mes')
            ->get()
            ->groupBy('mes')
            ->map(fn ($grupo) => [
                'mes'     => Carbon::createFromFormat('Y-m', $grupo->first()->mes)->format('m/Y'),
                'FT'      => $grupo->firstWhere('tipo_documento', 'FT')?->total ?? 0,
                'FR'      => $grupo->firstWhere('tipo_documento', 'FR')?->total ?? 0,
                'NC'      => $grupo->firstWhere('tipo_documento', 'NC')?->total ?? 0,
                'ND'      => $grupo->firstWhere('tipo_documento', 'ND')?->total ?? 0,
                'total'   => $grupo->sum('total'),
                'retencao' => $grupo->sum('retencao'),
            ])
            ->values()
            ->toArray();
    }

    /**
     * Obter documentos fiscais por dia com filtros
     */
    private function getDocumentosPorDia(Carbon $hoje, array $filtros = []): array
    {
        $query = DocumentoFiscal::select(
            DB::raw('DATE(data_emissao) as dia'),
            DB::raw('tipo_documento'),
            DB::raw('SUM(total_liquido) as total'),
            DB::raw('SUM(total_retencao) as retencao')
        )->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query
            ->groupBy('dia', 'tipo_documento')
            ->orderBy('dia')
            ->get()
            ->groupBy('dia')
            ->map(fn ($grupo) => [
                'dia'      => Carbon::parse($grupo->first()->dia)->format('d/m'),
                'total'    => $grupo->sum('total'),
                'retencao' => $grupo->sum('retencao'),
            ])
            ->values()
            ->toArray();
    }

    /**
     * Obter documentos fiscais por estado com filtros
     */
    private function getDocumentosPorEstado(array $filtros = []): array
    {
        $query = DocumentoFiscal::select(
            'tipo_documento',
            'estado',
            DB::raw('COUNT(*) as quantidade'),
            DB::raw('SUM(total_liquido) as valor_total'),
            DB::raw('SUM(total_retencao) as retencao')
        )->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query
            ->groupBy('tipo_documento', 'estado')
            ->get()
            ->groupBy('tipo_documento')
            ->map(fn ($grupo) => [
                'tipo'            => $grupo->first()->tipo_documento,
                'por_estado'      => $grupo->mapWithKeys(fn ($item) => [
                    $item->estado => [
                        'quantidade' => $item->quantidade,
                        'valor'      => $item->valor_total,
                        'retencao'   => $item->retencao,
                    ],
                ])->toArray(),
                'total_quantidade' => $grupo->sum('quantidade'),
                'total_valor'      => $grupo->sum('valor_total'),
                'total_retencao'   => $grupo->sum('retencao'),
            ])
            ->toArray();
    }

    /**
     * Obter dados de pagamentos com filtros
     */
    private function getDadosPagamentos(Carbon $hoje, array $filtros = []): array
    {
        $queryHoje = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->whereDate('data_emissao', $hoje->toDateString());
        $this->aplicarFiltrosData($queryHoje, $filtros, 'data_emissao');
        $pagamentosHoje = $queryHoje->sum('total_liquido');

        // CORRIGIDO: 'emitido' em vez de 'emitida'
        $queryPendente = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA]);
        $this->aplicarFiltrosData($queryPendente, $filtros, 'data_emissao');
        $totalPendente = $queryPendente->sum('total_liquido');

        $queryAtrasado = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
            ->whereDate('data_vencimento', '<', $hoje->toDateString());
        $this->aplicarFiltrosData($queryAtrasado, $filtros, 'data_emissao');
        $totalAtrasado = $queryAtrasado->sum('total_liquido');

        return [
            'hoje'           => $pagamentosHoje,
            'total_pendente' => $totalPendente,
            'total_atrasado' => $totalAtrasado,
            'metodos'        => $this->getMetodosPagamento($filtros),
        ];
    }

    /**
     * Obter métodos de pagamento mais utilizados com filtros
     */
    private function getMetodosPagamento(array $filtros = []): array
    {
        $query = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->select(
                'metodo_pagamento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor_total')
            );

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query
            ->groupBy('metodo_pagamento')
            ->get()
            ->map(fn ($p) => [
                'metodo'      => $p->metodo_pagamento,
                'metodo_nome' => $this->nomeMetodoPagamento($p->metodo_pagamento),
                'quantidade'  => $p->quantidade,
                'valor_total' => $p->valor_total,
            ])
            ->toArray();
    }

    /**
     * Obter dados de clientes com filtros
     */
    private function getDadosClientes(array $filtros = [], int $mesAtual = 0, int $anoAtual = 0): array
    {
        $clientesAtivos   = Cliente::count();
        $clientesInativos = Cliente::where('status', 'inativo')->count();

        $queryNovosMes = Cliente::whereMonth('created_at', $mesAtual)
            ->whereYear('created_at', $anoAtual);
        $this->aplicarFiltrosData($queryNovosMes, $filtros, 'created_at');
        $clientesNovosMes = $queryNovosMes->count();

        return [
            'ativos'    => $clientesAtivos,
            'inativos'  => $clientesInativos,
            'novos_mes' => $clientesNovosMes,
        ];
    }

    /**
     * Obter produtos mais vendidos com filtros
     */
    private function getProdutosMaisVendidos(array $filtros = []): array
    {
        $query = DB::table('itens_documento_fiscal')
            ->join('documentos_fiscais', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
            ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
            ->whereIn('documentos_fiscais.tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_FATURA_RECIBO])
            ->whereNotIn('documentos_fiscais.estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->where('produtos.tipo', 'produto');

        if (!empty($filtros['data_inicio'])) {
            $query->whereDate('documentos_fiscais.data_emissao', '>=', $filtros['data_inicio']);
        }
        if (!empty($filtros['data_fim'])) {
            $query->whereDate('documentos_fiscais.data_emissao', '<=', $filtros['data_fim']);
        }

        return $query
            ->select(
                'produtos.nome as produto',
                'produtos.codigo as codigo',
                DB::raw('SUM(itens_documento_fiscal.quantidade) as quantidade'),
                DB::raw('SUM(itens_documento_fiscal.total_linha) as valor_total')
            )
            ->groupBy('produtos.id', 'produtos.nome', 'produtos.codigo')
            ->orderByDesc('quantidade')
            ->limit(5)
            ->get()
            ->toArray();
    }

    /**
     * Obter serviços mais vendidos com filtros
     */
    private function getServicosMaisVendidos(array $filtros = []): array
    {
        $query = DB::table('itens_documento_fiscal')
            ->join('documentos_fiscais', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
            ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
            ->whereIn('documentos_fiscais.tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_FATURA_RECIBO])
            ->whereNotIn('documentos_fiscais.estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->where('produtos.tipo', 'servico');

        if (!empty($filtros['data_inicio'])) {
            $query->whereDate('documentos_fiscais.data_emissao', '>=', $filtros['data_inicio']);
        }
        if (!empty($filtros['data_fim'])) {
            $query->whereDate('documentos_fiscais.data_emissao', '<=', $filtros['data_fim']);
        }

        return $query
            ->select(
                'produtos.nome as produto',
                'produtos.codigo as codigo',
                DB::raw('SUM(itens_documento_fiscal.quantidade) as quantidade'),
                DB::raw('SUM(itens_documento_fiscal.total_linha) as valor_total'),
                DB::raw('SUM(itens_documento_fiscal.valor_retencao) as retencao_total')
            )
            ->groupBy('produtos.id', 'produtos.nome', 'produtos.codigo')
            ->orderByDesc('quantidade')
            ->limit(5)
            ->get()
            ->toArray();
    }

    /**
     * Calcular alertas do sistema com filtros
     * CORRIGIDO: 'emitido' em vez de 'emitida'
     */
    private function calcularAlertas(array $filtros = []): array
    {
        $hoje = now();

        $queryVencidos = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
            ->whereDate('data_vencimento', '<', $hoje->toDateString());
        $this->aplicarFiltrosData($queryVencidos, $filtros, 'data_emissao');

        $queryProximos = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
            ->whereDate('data_vencimento', '<=', $hoje->copy()->addDays(3)->toDateString())
            ->whereDate('data_vencimento', '>=', $hoje->toDateString());
        $this->aplicarFiltrosData($queryProximos, $filtros, 'data_emissao');

        $queryProformas = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA_PROFORMA)
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString());
        $this->aplicarFiltrosData($queryProformas, $filtros, 'data_emissao');

        $queryServicosRetencao = DocumentoFiscal::where('total_retencao', '>', 0)
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
            ->whereDate('data_vencimento', '<', $hoje->copy()->addDays(5)->toDateString());
        $this->aplicarFiltrosData($queryServicosRetencao, $filtros, 'data_emissao');

        return [
            'documentos_vencidos'              => $queryVencidos->count(),
            'documentos_proximo_vencimento'    => $queryProximos->count(),
            'proformas_antigas'                => $queryProformas->count(),
            'servicos_com_retencao_pendente'   => $queryServicosRetencao->count(),
            'valor_retencao_pendente'          => $queryServicosRetencao->sum('total_retencao'),
        ];
    }

    /**
     * Obter documentos fiscais agrupados por tipo com filtros
     */
    private function getDocumentosPorTipo(array $filtros = []): array
    {
        $query = DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->select(
                'tipo_documento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor'),
                DB::raw('SUM(total_retencao) as retencao')
            );

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query
            ->groupBy('tipo_documento')
            ->get()
            ->mapWithKeys(fn ($item) => [
                $item->tipo_documento => [
                    'nome'       => $this->nomeTipoDocumento($item->tipo_documento),
                    'quantidade' => $item->quantidade,
                    'valor'      => $item->valor,
                    'retencao'   => $item->retencao,
                ],
            ])
            ->toArray();
    }

    /* ================= MÉTODOS PÚBLICOS PARA ENDPOINTS ESPECÍFICOS ================= */

    /**
     * Resumo de documentos fiscais com filtros
     */
    public function getResumoDocumentosFiscais(array $filtros = []): array
    {
        try {
            $hoje      = now();
            $inicioMes = $hoje->copy()->startOfMonth();
            $fimMes    = $hoje->copy()->endOfMonth();

            $tipos   = ['FT', 'FR', 'NC', 'ND', 'FP', 'FA', 'RC', 'FRt'];
            $porTipo = [];

            foreach ($tipos as $tipo) {
                $query = DocumentoFiscal::where('tipo_documento', $tipo)
                    ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
                $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

                $queryMes = (clone $query)->whereBetween('data_emissao', [$inicioMes, $fimMes]);

                $porTipo[$tipo] = [
                    'nome'          => $this->nomeTipoDocumento($tipo),
                    'quantidade'    => $query->count(),
                    'valor_total'   => $query->sum('total_liquido'),
                    'mes_atual'     => $queryMes->sum('total_liquido'),
                    'retencao_total' => $query->sum('total_retencao'),
                ];
            }

            $estados   = [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PAGA, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA, DocumentoFiscal::ESTADO_CANCELADO, DocumentoFiscal::ESTADO_EXPIRADO];
            $porEstado = [];

            foreach ($estados as $estado) {
                $query = DocumentoFiscal::where('estado', $estado);
                $this->aplicarFiltrosData($query, $filtros, 'data_emissao');
                $porEstado[$estado] = $query->count();
            }

            $queryTotal = DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]);
            $this->aplicarFiltrosData($queryTotal, $filtros, 'data_emissao');

            return [
                'total_emitidos' => $queryTotal->count(),
                'por_tipo'       => $porTipo,
                'por_estado'     => $porEstado,
                'periodo'        => [
                    'inicio' => $inicioMes->toDateString(),
                    'fim'    => $fimMes->toDateString(),
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao obter resumo de documentos fiscais:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Estatísticas de pagamentos com filtros
     */
    public function getEstatisticasPagamentos(array $filtros = []): array
    {
        try {
            $hoje     = now();
            $mesAtual = $hoje->month;
            $anoAtual = $hoje->year;

            $queryHoje = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
                ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                ->whereDate('data_emissao', $hoje->toDateString());
            $this->aplicarFiltrosData($queryHoje, $filtros, 'data_emissao');
            $recebidosHoje = $queryHoje->sum('total_liquido');

            $queryMes = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
                ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                ->whereMonth('data_emissao', $mesAtual)
                ->whereYear('data_emissao', $anoAtual);
            $this->aplicarFiltrosData($queryMes, $filtros, 'data_emissao');
            $recebidosMes = $queryMes->sum('total_liquido');

            $queryAno = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
                ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                ->whereYear('data_emissao', $anoAtual);
            $this->aplicarFiltrosData($queryAno, $filtros, 'data_emissao');
            $recebidosAno = $queryAno->sum('total_liquido');

            // CORRIGIDO: 'emitido' em vez de 'emitida'
            $queryPendentes = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
                ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA]);
            $this->aplicarFiltrosData($queryPendentes, $filtros, 'data_emissao');
            $pendentes = $queryPendentes->sum('total_liquido');

            $atrasados = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
                ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
                ->whereDate('data_vencimento', '<', $hoje->toDateString())
                ->with('cliente')
                ->get();

            $prazoMedio = $this->calcularPrazoMedioPagamento($filtros);

            $metodos = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
                ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                ->select('metodo_pagamento', DB::raw('SUM(total_liquido) as total'))
                ->groupBy('metodo_pagamento')
                ->pluck('total', 'metodo_pagamento')
                ->toArray();

            return [
                'recebidos_hoje' => $recebidosHoje,
                'recebidos_mes'  => $recebidosMes,
                'recebidos_ano'  => $recebidosAno,
                'pendentes'      => $pendentes,
                'atrasados'      => [
                    'quantidade'  => $atrasados->count(),
                    'valor_total' => $atrasados->sum('total_liquido'),
                    'documentos'  => $atrasados->take(5)->map(fn ($d) => [
                        'id'          => $d->id,
                        'numero'      => $d->numero_documento,
                        'cliente'     => $d->cliente?->nome,
                        'valor'       => $d->total_liquido,
                        'dias_atraso' => Carbon::parse($d->data_vencimento)->diffInDays($hoje),
                    ])->toArray(),
                ],
                'prazo_medio_pagamento' => round($prazoMedio, 1),
                'metodos_pagamento'     => $metodos,
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao obter estatísticas de pagamentos:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Calcular prazo médio de pagamento com filtros
     */
    private function calcularPrazoMedioPagamento(array $filtros = []): float
    {
        $query = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA)
            ->whereHas('recibos', fn ($q) => $q->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO]))
            ->with('recibos');

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query
            ->get()
            ->map(fn ($f) => [
                'data_emissao'             => $f->data_emissao,
                'data_primeiro_pagamento'  => $f->recibos
                    ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                    ->sortBy('data_emissao')
                    ->first()?->data_emissao,
            ])
            ->filter(fn ($item) => $item['data_primeiro_pagamento'])
            ->map(fn ($item) => Carbon::parse($item['data_emissao'])
                ->diffInDays(Carbon::parse($item['data_primeiro_pagamento'])))
            ->average() ?? 0;
    }

    /**
     * Alertas de documentos pendentes com filtros
     */
    public function getAlertasPendentes(array $filtros = []): array
    {
        try {
            $hoje     = now();
            $tresDias = $hoje->copy()->addDays(3);

            $vencidos          = $this->getDocumentosVencidos($hoje, $filtros);
            $proximosVencimento = $this->getDocumentosProximosVencimento($hoje, $tresDias, $filtros);
            $proformasPendentes = $this->getProformasPendentes($hoje, $filtros);
            $servicosRetencao  = $this->getServicosRetencaoProximos($hoje, $filtros);

            return [
                'vencidos'              => [
                    'quantidade'  => $vencidos->count(),
                    'valor_total' => $vencidos->sum('valor_pendente'),
                    'documentos'  => $vencidos->toArray(),
                ],
                'proximos_vencimento'   => [
                    'quantidade'  => $proximosVencimento->count(),
                    'valor_total' => $proximosVencimento->sum('valor_pendente'),
                    'documentos'  => $proximosVencimento->toArray(),
                ],
                'proformas_pendentes'   => [
                    'quantidade'  => $proformasPendentes->count(),
                    'valor_total' => $proformasPendentes->sum('valor'),
                    'documentos'  => $proformasPendentes->toArray(),
                ],
                'servicos_com_retencao_proximos' => [
                    'quantidade'    => $servicosRetencao->count(),
                    'valor_total'   => $servicosRetencao->sum('valor'),
                    'valor_retencao' => $servicosRetencao->sum('retencao'),
                    'documentos'    => $servicosRetencao->toArray(),
                ],
                'total_alertas' => $vencidos->count() + $proximosVencimento->count() + $proformasPendentes->count() + $servicosRetencao->count(),
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao obter alertas pendentes:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function getDocumentosVencidos(Carbon $hoje, array $filtros = [])
    {
        $query = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento', 'asc')
            ->limit(10);

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query->get()->map(fn ($d) => [
            'id'              => $d->id,
            'tipo'            => $d->tipo_documento,
            'numero'          => $d->numero_documento,
            'cliente'         => $d->cliente?->nome,
            'valor'           => $d->total_liquido,
            'valor_pendente'  => $d->total_liquido,
            'retencao'        => $d->total_retencao,
            'data_vencimento' => $d->data_vencimento,
            'dias_atraso'     => Carbon::parse($d->data_vencimento)->diffInDays($hoje),
        ]);
    }

    private function getDocumentosProximosVencimento(Carbon $hoje, Carbon $tresDias, array $filtros = [])
    {
        $query = DocumentoFiscal::whereIn('tipo_documento', [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $tresDias->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento', 'asc')
            ->limit(10);

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query->get()->map(fn ($d) => [
            'id'                    => $d->id,
            'tipo'                  => $d->tipo_documento,
            'numero'                => $d->numero_documento,
            'cliente'               => $d->cliente?->nome,
            'valor'                 => $d->total_liquido,
            'valor_pendente'        => $d->total_liquido,
            'retencao'              => $d->total_retencao,
            'data_vencimento'       => $d->data_vencimento,
            'dias_ate_vencimento'   => $hoje->diffInDays(Carbon::parse($d->data_vencimento)),
        ]);
    }

    private function getProformasPendentes(Carbon $hoje, array $filtros = [])
    {
        $query = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA_PROFORMA)
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->with('cliente')
            ->orderBy('data_emissao', 'asc')
            ->limit(10);

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query->get()->map(fn ($d) => [
            'id'             => $d->id,
            'tipo'           => $d->tipo_documento,
            'numero'         => $d->numero_documento,
            'cliente'        => $d->cliente?->nome,
            'valor'          => $d->total_liquido,
            'data_emissao'   => $d->data_emissao,
            'dias_pendentes' => Carbon::parse($d->data_emissao)->diffInDays($hoje),
        ]);
    }

    private function getServicosRetencaoProximos(Carbon $hoje, array $filtros = [])
    {
        $query = DocumentoFiscal::where('total_retencao', '>', 0)
            ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
            ->whereDate('data_vencimento', '<=', $hoje->copy()->addDays(5)->toDateString())
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento', 'asc')
            ->limit(10);

        $this->aplicarFiltrosData($query, $filtros, 'data_emissao');

        return $query->get()->map(fn ($d) => [
            'id'                   => $d->id,
            'numero'               => $d->numero_documento,
            'cliente'              => $d->cliente?->nome,
            'valor'                => $d->total_liquido,
            'retencao'             => $d->total_retencao,
            'data_vencimento'      => $d->data_vencimento,
            'dias_ate_vencimento'  => $hoje->diffInDays(Carbon::parse($d->data_vencimento)),
        ]);
    }

    /**
     * Evolução mensal de documentos fiscais com filtros
     */
    public function getEvolucaoMensal(int $ano, array $filtros = []): array
    {
        try {
            $meses = [];

            for ($mes = 1; $mes <= 12; $mes++) {
                $inicioMes = Carbon::create($ano, $mes, 1)->startOfMonth();
                $fimMes    = Carbon::create($ano, $mes, 1)->endOfMonth();

                $queryFaturas = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA)
                    ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes]);
                $this->aplicarFiltrosData($queryFaturas, $filtros, 'data_emissao');

                $queryNC = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_NOTA_CREDITO)
                    ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes]);
                $this->aplicarFiltrosData($queryNC, $filtros, 'data_emissao');

                $queryRC = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
                    ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes]);
                $this->aplicarFiltrosData($queryRC, $filtros, 'data_emissao');

                $queryFP = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA_PROFORMA)
                    ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes]);
                $this->aplicarFiltrosData($queryFP, $filtros, 'data_emissao');

                $valorFaturado = $queryFaturas->sum('total_liquido');
                $valorPago     = $queryRC->sum('total_liquido');

                $meses[] = [
                    'mes'                 => $mes,
                    'nome'               => $inicioMes->locale('pt_PT')->monthName,
                    'faturas_emitidas'   => $queryFaturas->count(),
                    'valor_faturado'     => $valorFaturado,
                    'valor_pago'         => $valorPago,
                    'valor_pendente'     => max(0, $valorFaturado - $valorPago),
                    'notas_credito'      => $queryNC->count(),
                    'valor_notas_credito' => $queryNC->sum('total_liquido'),
                    'proformas'          => $queryFP->count(),
                    'valor_proformas'    => $queryFP->sum('total_liquido'),
                    'retencao'           => $queryFaturas->sum('total_retencao'),
                ];
            }

            return ['ano' => $ano, 'meses' => $meses];
        } catch (\Exception $e) {
            Log::error('Erro ao obter evolução mensal:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Determinar estado de pagamento de um documento
     */
    private function determinarEstadoPagamento($documento): string
    {
        if ($documento->tipo_documento === DocumentoFiscal::TIPO_FATURA_RECIBO) {
            return 'paga';
        }

        if (in_array($documento->tipo_documento, [DocumentoFiscal::TIPO_FATURA, DocumentoFiscal::TIPO_NOTA_DEBITO])) {
            $valorPago = $documento->recibos()
                ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
                ->sum('total_liquido');

            if ($valorPago >= $documento->total_liquido) return 'paga';
            if ($valorPago > 0) return 'parcial';
        }

        return 'pendente';
    }

    private function nomeTipoDocumento(string $tipo): string
    {
        return match ($tipo) {
            'FT'  => 'Fatura',
            'FR'  => 'Fatura-Recibo',
            'RC'  => 'Recibo',
            'NC'  => 'Nota de Crédito',
            'ND'  => 'Nota de Débito',
            'FA'  => 'Fatura de Adiantamento',
            'FP'  => 'Fatura Proforma',
            'FRt' => 'Fatura de Retificação',
            default => 'Desconhecido',
        };
    }

    private function nomeMetodoPagamento(?string $metodo): string
    {
        return match ($metodo) {
            'transferencia' => 'Transferência Bancária',
            'multibanco'    => 'Multibanco',
            'dinheiro'      => 'Dinheiro',
            'cartao'        => 'Cartão',
            'cheque'        => 'Cheque',
            default         => 'Não especificado',
        };
    }
}
