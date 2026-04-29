<?php

namespace App\Services;

use App\Models\Tenant\Produto;
use App\Models\Tenant\Venda;
use App\Models\Tenant\DocumentoFiscal;
use App\Models\Tenant\Cliente;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * DashboardService
 *
 * Alterações:
 *  - Filtros de data removidos de todos os métodos (simplificação pedida)
 *  - 'retencao' → 'taxa_retencao' no getDadosProdutos()
 *  - Constantes do Model usadas em vez de strings literais
 */
class DashboardService
{
    public function getDashboard(): array
    {
        try {
            return $this->calcularDashboard();
        } catch (\Exception $e) {
            Log::error('Erro ao calcular dashboard:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    private function calcularDashboard(): array
    {
        $hoje        = Carbon::now();
        $mesAtual    = $hoje->month;
        $anoAtual    = $hoje->year;
        $mesAnterior = $hoje->copy()->subMonth()->month;
        $anoAnterior = $hoje->copy()->subMonth()->year;

        return [
            'kpis'             => $this->calcularKPIs($mesAtual, $anoAtual, $mesAnterior, $anoAnterior),
            'produtos'         => $this->getDadosProdutos(),
            'vendas'           => $this->getDadosVendas(),
            'documentos_fiscais' => $this->getDadosDocumentosFiscais($hoje),
            'pagamentos'       => $this->getDadosPagamentos($hoje),
            'clientes'         => $this->getDadosClientes($mesAtual, $anoAtual),
            'indicadores'      => [
                'produtosMaisVendidos' => $this->getProdutosMaisVendidos(),
                'servicosMaisVendidos' => $this->getServicosMaisVendidos(),
            ],
            'alertas' => $this->calcularAlertas(),
            'periodo' => [
                'mes_atual'    => $mesAtual,
                'ano_atual'    => $anoAtual,
                'mes_anterior' => $mesAnterior,
                'ano_anterior' => $anoAnterior,
            ],
        ];
    }

    // ── KPIs ──────────────────────────────────────────────────────────────

    private function calcularKPIs(int $mesAtual, int $anoAtual, int $mesAnterior, int $anoAnterior): array
    {
        $cancelado = DocumentoFiscal::ESTADO_CANCELADO;

        $totalDocumentos = DocumentoFiscal::whereNotIn('estado', [$cancelado])->count();

        $totalFaturado = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_FATURA_RECIBO,
            ])
            ->whereNotIn('estado', [$cancelado])
            ->sum('total_liquido');

        $totalNotasCredito = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_NOTA_CREDITO)
            ->whereNotIn('estado', [$cancelado])
            ->sum('total_liquido');

        $totalLiquido = $totalFaturado - $totalNotasCredito;
        $ticketMedio  = $totalDocumentos > 0 ? round($totalLiquido / $totalDocumentos, 2) : 0;

        $receitaMesAtual = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_FATURA_RECIBO,
            ])
            ->whereNotIn('estado', [$cancelado])
            ->whereMonth('data_emissao', $mesAtual)
            ->whereYear('data_emissao', $anoAtual)
            ->sum('total_liquido');

        $receitaMesAnterior = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_FATURA_RECIBO,
            ])
            ->whereNotIn('estado', [$cancelado])
            ->whereMonth('data_emissao', $mesAnterior)
            ->whereYear('data_emissao', $anoAnterior)
            ->sum('total_liquido');

        $crescimentoPercentual = $receitaMesAnterior > 0
            ? round((($receitaMesAtual - $receitaMesAnterior) / $receitaMesAnterior) * 100, 2)
            : 0;

        $ivaArrecadado = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_FATURA_RECIBO,
            ])
            ->whereNotIn('estado', [$cancelado])
            ->sum('total_iva');

        $totalRetencao = DocumentoFiscal::whereNotIn('estado', [$cancelado])
            ->sum('total_retencao');

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

    // ── Produtos ──────────────────────────────────────────────────────────

    private function getDadosProdutos(): array
    {
        return [
            'total'       => Produto::count(),
            'ativos'      => Produto::where('status', 'ativo')->count(),
            'inativos'    => Produto::where('status', 'inativo')->count(),
            'stock_baixo' => Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')->count(),
            'servicos'    => [
                'total'        => Produto::where('tipo', 'servico')->count(),
                'ativos'       => Produto::where('tipo', 'servico')->where('status', 'ativo')->count(),
                // Corrigido: 'retencao' → 'taxa_retencao'
                'com_retencao' => Produto::where('tipo', 'servico')->where('taxa_retencao', '>', 0)->count(),
            ],
        ];
    }

    // ── Vendas ────────────────────────────────────────────────────────────

    private function getDadosVendas(): array
    {
        $ultimasVendas = Venda::with('documentoFiscal', 'cliente')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($v) => [
                'id'               => $v->id,
                'cliente'          => $v->cliente?->nome ?? 'Consumidor Final',
                'total'            => $v->total,
                'status'           => $v->status,
                'estado_pagamento' => $v->estado_pagamento,
                'documento_fiscal' => $v->documentoFiscal ? [
                    'tipo'           => $v->documentoFiscal->tipo_documento,
                    'numero'         => $v->documentoFiscal->numero_documento,
                    'estado'         => $v->documentoFiscal->estado,
                    'total_retencao' => $v->documentoFiscal->total_retencao,
                ] : null,
                'data' => $v->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        return [
            'total'      => Venda::count(),
            'abertas'    => Venda::where('status', 'aberta')->count(),
            'faturadas'  => Venda::where('status', 'faturada')->count(),
            'canceladas' => Venda::where('status', 'cancelada')->count(),
            'ultimas'    => $ultimasVendas,
        ];
    }

    // ── Documentos Fiscais ────────────────────────────────────────────────

    private function getDadosDocumentosFiscais(Carbon $hoje): array
    {
        $cancelado = DocumentoFiscal::ESTADO_CANCELADO;

        $ultimosDocumentos = DocumentoFiscal::with('cliente')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'id'               => $d->id,
                'tipo'             => $d->tipo_documento,
                'tipo_nome'        => $d->tipo_documento_nome,
                'numero'           => $d->numero_documento,
                'cliente'          => $d->cliente?->nome ?? 'Consumidor Final',
                'total'            => $d->total_liquido,
                'total_retencao'   => $d->total_retencao,
                'estado'           => $d->estado,
                'estado_pagamento' => $this->determinarEstadoPagamento($d),
                'data'             => $d->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        return [
            'total'      => DocumentoFiscal::whereNotIn('estado', [$cancelado])->count(),
            'por_tipo'   => $this->getDocumentosPorTipo(),
            'por_estado' => $this->getDocumentosPorEstado(),
            'ultimos'    => $ultimosDocumentos,
            'por_mes'    => $this->getDocumentosPorMes(),
            'por_dia'    => $this->getDocumentosPorDia($hoje),
        ];
    }

    private function getDocumentosPorTipo(): array
    {
        return DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->select(
                'tipo_documento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor'),
                DB::raw('SUM(total_retencao) as retencao')
            )
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

    private function getDocumentosPorEstado(): array
    {
        return DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->select(
                'tipo_documento',
                'estado',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor_total'),
                DB::raw('SUM(total_retencao) as retencao')
            )
            ->groupBy('tipo_documento', 'estado')
            ->get()
            ->groupBy('tipo_documento')
            ->map(fn ($grupo) => [
                'tipo'             => $grupo->first()->tipo_documento,
                'por_estado'       => $grupo->mapWithKeys(fn ($item) => [
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
            ->values()
            ->toArray();
    }

    private function getDocumentosPorMes(): array
    {
        return DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->select(
                DB::raw("DATE_FORMAT(data_emissao, '%Y-%m') as mes"),
                'tipo_documento',
                DB::raw('SUM(total_liquido) as total'),
                DB::raw('SUM(total_retencao) as retencao')
            )
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

    private function getDocumentosPorDia(Carbon $hoje): array
    {
        return DocumentoFiscal::whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->where('data_emissao', '>=', $hoje->copy()->subDays(30))
            ->select(
                DB::raw('DATE(data_emissao) as dia'),
                DB::raw('SUM(total_liquido) as total'),
                DB::raw('SUM(total_retencao) as retencao')
            )
            ->groupBy('dia')
            ->orderBy('dia')
            ->get()
            ->map(fn ($item) => [
                'dia'      => Carbon::parse($item->dia)->format('d/m'),
                'total'    => $item->total,
                'retencao' => $item->retencao,
            ])
            ->values()
            ->toArray();
    }

    // ── Pagamentos ────────────────────────────────────────────────────────

    private function getDadosPagamentos(Carbon $hoje): array
    {
        $cancelado = DocumentoFiscal::ESTADO_CANCELADO;

        $pagamentosHoje = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereDate('data_emissao', $hoje->toDateString())
            ->sum('total_liquido');

        $totalPendente = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->sum('total_liquido');

        $totalAtrasado = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->sum('total_liquido');

        return [
            'hoje'           => $pagamentosHoje,
            'total_pendente' => $totalPendente,
            'total_atrasado' => $totalAtrasado,
            'metodos'        => $this->getMetodosPagamento(),
        ];
    }

    private function getMetodosPagamento(): array
    {
        return DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->select(
                'metodo_pagamento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor_total')
            )
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

    // ── Clientes ──────────────────────────────────────────────────────────

    private function getDadosClientes(int $mesAtual, int $anoAtual): array
    {
        return [
            'ativos'    => Cliente::where('status', 'ativo')->count(),
            'inativos'  => Cliente::where('status', 'inativo')->count(),
            'novos_mes' => Cliente::whereMonth('created_at', $mesAtual)
                ->whereYear('created_at', $anoAtual)
                ->count(),
        ];
    }

    // ── Indicadores ───────────────────────────────────────────────────────

    private function getProdutosMaisVendidos(): array
    {
        return DB::table('itens_documento_fiscal')
            ->join('documentos_fiscais', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
            ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
            ->whereIn('documentos_fiscais.tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_FATURA_RECIBO,
            ])
            ->whereNotIn('documentos_fiscais.estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->where('produtos.tipo', 'produto')
            ->select(
                'produtos.nome as produto',
                'produtos.codigo',
                DB::raw('SUM(itens_documento_fiscal.quantidade) as quantidade'),
                DB::raw('SUM(itens_documento_fiscal.total_linha) as valor_total')
            )
            ->groupBy('produtos.id', 'produtos.nome', 'produtos.codigo')
            ->orderByDesc('quantidade')
            ->limit(5)
            ->get()
            ->toArray();
    }

    private function getServicosMaisVendidos(): array
    {
        return DB::table('itens_documento_fiscal')
            ->join('documentos_fiscais', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
            ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
            ->whereIn('documentos_fiscais.tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_FATURA_RECIBO,
            ])
            ->whereNotIn('documentos_fiscais.estado', [DocumentoFiscal::ESTADO_CANCELADO])
            ->where('produtos.tipo', 'servico')
            ->select(
                'produtos.nome as produto',
                'produtos.codigo',
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

    // ── Alertas ───────────────────────────────────────────────────────────

    private function calcularAlertas(): array
    {
        $hoje = now();

        $documentosVencidos = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->count();

        $documentosProximos = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $hoje->copy()->addDays(3)->toDateString())
            ->count();

        $proformasAntigas = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA_PROFORMA)
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->count();

        $queryRetencao = DocumentoFiscal::where('total_retencao', '>', 0)
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->copy()->addDays(5)->toDateString());

        return [
            'documentos_vencidos'            => $documentosVencidos,
            'documentos_proximo_vencimento'  => $documentosProximos,
            'proformas_antigas'              => $proformasAntigas,
            'servicos_com_retencao_pendente' => $queryRetencao->count(),
            'valor_retencao_pendente'        => $queryRetencao->sum('total_retencao'),
        ];
    }

    // ── Métodos públicos para endpoints específicos ───────────────────────

    public function getResumoDocumentosFiscais(): array
    {
        $hoje      = now();
        $inicioMes = $hoje->copy()->startOfMonth();
        $fimMes    = $hoje->copy()->endOfMonth();
        $cancelado = DocumentoFiscal::ESTADO_CANCELADO;

        $tipos   = ['FT', 'FR', 'NC', 'ND', 'FP', 'FA', 'RC', 'FRt'];
        $porTipo = [];

        foreach ($tipos as $tipo) {
            $query    = DocumentoFiscal::where('tipo_documento', $tipo)->whereNotIn('estado', [$cancelado]);
            $queryMes = (clone $query)->whereBetween('data_emissao', [$inicioMes, $fimMes]);

            $porTipo[$tipo] = [
                'nome'           => $this->nomeTipoDocumento($tipo),
                'quantidade'     => $query->count(),
                'valor_total'    => $query->sum('total_liquido'),
                'mes_atual'      => $queryMes->sum('total_liquido'),
                'retencao_total' => $query->sum('total_retencao'),
            ];
        }

        $estados   = [
            DocumentoFiscal::ESTADO_EMITIDO,
            DocumentoFiscal::ESTADO_PAGA,
            DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            DocumentoFiscal::ESTADO_CANCELADO,
            DocumentoFiscal::ESTADO_EXPIRADO,
        ];
        $porEstado = [];
        foreach ($estados as $estado) {
            $porEstado[$estado] = DocumentoFiscal::where('estado', $estado)->count();
        }

        return [
            'total_emitidos' => DocumentoFiscal::whereNotIn('estado', [$cancelado])->count(),
            'por_tipo'       => $porTipo,
            'por_estado'     => $porEstado,
            'periodo'        => [
                'inicio' => $inicioMes->toDateString(),
                'fim'    => $fimMes->toDateString(),
            ],
        ];
    }

    public function getEstatisticasPagamentos(): array
    {
        $hoje      = now();
        $cancelado = DocumentoFiscal::ESTADO_CANCELADO;

        $recebidosHoje = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereDate('data_emissao', $hoje->toDateString())
            ->sum('total_liquido');

        $recebidosMes = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereMonth('data_emissao', $hoje->month)
            ->whereYear('data_emissao', $hoje->year)
            ->sum('total_liquido');

        $recebidosAno = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
            ->whereYear('data_emissao', $hoje->year)
            ->sum('total_liquido');

        $pendentes = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->sum('total_liquido');

        $atrasados = DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->get();

        $metodos = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
            ->whereNotIn('estado', [$cancelado])
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
            'prazo_medio_pagamento' => 0,
            'metodos_pagamento'     => $metodos,
        ];
    }

    public function getAlertasPendentes(): array
    {
        $hoje     = now();
        $tresDias = $hoje->copy()->addDays(3);

        $vencidos           = $this->getDocumentosVencidos($hoje);
        $proximosVencimento = $this->getDocumentosProximosVencimento($hoje, $tresDias);
        $proformasPendentes = $this->getProformasPendentes($hoje);
        $servicosRetencao   = $this->getServicosRetencaoProximos($hoje);

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
                'quantidade'     => $servicosRetencao->count(),
                'valor_total'    => $servicosRetencao->sum('valor'),
                'valor_retencao' => $servicosRetencao->sum('retencao'),
                'documentos'     => $servicosRetencao->toArray(),
            ],
            'total_alertas' => $vencidos->count()
                + $proximosVencimento->count()
                + $proformasPendentes->count()
                + $servicosRetencao->count(),
        ];
    }

    private function getDocumentosVencidos(Carbon $hoje)
    {
        return DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get()
            ->map(fn ($d) => [
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

    private function getDocumentosProximosVencimento(Carbon $hoje, Carbon $tresDias)
    {
        return DocumentoFiscal::whereIn('tipo_documento', [
                DocumentoFiscal::TIPO_FATURA,
                DocumentoFiscal::TIPO_NOTA_DEBITO,
            ])
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $tresDias->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get()
            ->map(fn ($d) => [
                'id'                  => $d->id,
                'tipo'                => $d->tipo_documento,
                'numero'              => $d->numero_documento,
                'cliente'             => $d->cliente?->nome,
                'valor'               => $d->total_liquido,
                'valor_pendente'      => $d->total_liquido,
                'retencao'            => $d->total_retencao,
                'data_vencimento'     => $d->data_vencimento,
                'dias_ate_vencimento' => $hoje->diffInDays(Carbon::parse($d->data_vencimento)),
            ]);
    }

    private function getProformasPendentes(Carbon $hoje)
    {
        return DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA_PROFORMA)
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->with('cliente')
            ->orderBy('data_emissao')
            ->limit(10)
            ->get()
            ->map(fn ($d) => [
                'id'             => $d->id,
                'tipo'           => $d->tipo_documento,
                'numero'         => $d->numero_documento,
                'cliente'        => $d->cliente?->nome,
                'valor'          => $d->total_liquido,
                'data_emissao'   => $d->data_emissao,
                'dias_pendentes' => Carbon::parse($d->data_emissao)->diffInDays($hoje),
            ]);
    }

    private function getServicosRetencaoProximos(Carbon $hoje)
    {
        return DocumentoFiscal::where('total_retencao', '>', 0)
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $hoje->copy()->addDays(5)->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get()
            ->map(fn ($d) => [
                'id'                  => $d->id,
                'numero'              => $d->numero_documento,
                'cliente'             => $d->cliente?->nome,
                'valor'               => $d->total_liquido,
                'retencao'            => $d->total_retencao,
                'data_vencimento'     => $d->data_vencimento,
                'dias_ate_vencimento' => $hoje->diffInDays(Carbon::parse($d->data_vencimento)),
            ]);
    }

    public function getEvolucaoMensal(int $ano): array
    {
        $cancelado = DocumentoFiscal::ESTADO_CANCELADO;
        $meses     = [];

        for ($mes = 1; $mes <= 12; $mes++) {
            $inicioMes = Carbon::create($ano, $mes, 1)->startOfMonth();
            $fimMes    = Carbon::create($ano, $mes, 1)->endOfMonth();

            $faturas   = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA)
                ->whereNotIn('estado', [$cancelado])
                ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

            $nc = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_NOTA_CREDITO)
                ->whereNotIn('estado', [$cancelado])
                ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

            $rc = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_RECIBO)
                ->whereNotIn('estado', [$cancelado])
                ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

            $fp = DocumentoFiscal::where('tipo_documento', DocumentoFiscal::TIPO_FATURA_PROFORMA)
                ->whereNotIn('estado', [$cancelado])
                ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

            $valorFaturado = $faturas->sum('total_liquido');
            $valorPago     = $rc->sum('total_liquido');

            $meses[] = [
                'mes'                 => $mes,
                'nome'               => $inicioMes->locale('pt_PT')->monthName,
                'faturas_emitidas'   => $faturas->count(),
                'valor_faturado'     => $valorFaturado,
                'valor_pago'         => $valorPago,
                'valor_pendente'     => max(0, $valorFaturado - $valorPago),
                'notas_credito'      => $nc->count(),
                'valor_notas_credito' => $nc->sum('total_liquido'),
                'proformas'          => $fp->count(),
                'valor_proformas'    => $fp->sum('total_liquido'),
                'retencao'           => $faturas->sum('total_retencao'),
            ];
        }

        return ['ano' => $ano, 'meses' => $meses];
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private function determinarEstadoPagamento($documento): string
    {
        if ($documento->tipo_documento === DocumentoFiscal::TIPO_FATURA_RECIBO) {
            return 'paga';
        }

        if (in_array($documento->tipo_documento, [
            DocumentoFiscal::TIPO_FATURA,
            DocumentoFiscal::TIPO_NOTA_DEBITO,
        ])) {
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