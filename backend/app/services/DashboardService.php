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
     * Obter todos os dados do dashboard
     */
    public function getDashboard(): array
    {
        try {
            // Sem cache (modo teste)
            return $this->calcularDashboard();
        } catch (\Exception $e) {
            Log::error('Erro ao calcular dashboard:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Calcular todos os dados do dashboard
     */
    private function calcularDashboard(): array
    {
        $hoje = Carbon::now();
        $mesAtual = $hoje->month;
        $anoAtual = $hoje->year;
        $mesAnterior = $hoje->copy()->subMonth()->month;
        $anoAnterior = $hoje->copy()->subMonth()->year;

        /* ================= DOCUMENTOS FISCAIS - KPIs ================= */
        $kpisDocumentos = $this->calcularKPIsDocumentos($mesAtual, $anoAtual, $mesAnterior, $anoAnterior);

        /* ================= PRODUTOS ================= */
        $dadosProdutos = $this->getDadosProdutos();

        /* ================= VENDAS ================= */
        $dadosVendas = $this->getDadosVendas();

        /* ================= DOCUMENTOS FISCAIS ================= */
        $dadosDocumentos = $this->getDadosDocumentosFiscais($hoje);

        /* ================= PAGAMENTOS ================= */
        $dadosPagamentos = $this->getDadosPagamentos($hoje);

        /* ================= CLIENTES ================= */
        $dadosClientes = $this->getDadosClientes($mesAtual, $anoAtual);

        /* ================= PRODUTOS MAIS VENDIDOS ================= */
        $produtosMaisVendidos = $this->getProdutosMaisVendidos();

        /* ================= ALERTAS ================= */
        $alertas = $this->calcularAlertas();

        /* ================= RETORNO FINAL ================= */
        return [
            'kpis' => $kpisDocumentos,
            'produtos' => $dadosProdutos,
            'vendas' => $dadosVendas,
            'documentos_fiscais' => $dadosDocumentos,
            'pagamentos' => $dadosPagamentos,
            'clientes' => $dadosClientes,
            'indicadores' => [
                'produtosMaisVendidos' => $produtosMaisVendidos,
            ],
            'alertas' => $alertas,
            'periodo' => [
                'mes_atual' => $mesAtual,
                'ano_atual' => $anoAtual,
                'mes_anterior' => $mesAnterior,
                'ano_anterior' => $anoAnterior,
            ],
        ];
    }

    /**
     * Calcular KPIs de documentos fiscais
     */
    private function calcularKPIsDocumentos(int $mesAtual, int $anoAtual, int $mesAnterior, int $anoAnterior): array
    {
        $totalDocumentos = DocumentoFiscal::whereNotIn('estado', ['anulada'])->count();

        $totalFaturado = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR'])
            ->whereNotIn('estado', ['anulada'])
            ->sum('total_liquido');

        $totalNotasCredito = DocumentoFiscal::where('tipo_documento', 'NC')
            ->whereNotIn('estado', ['anulada'])
            ->sum('total_liquido');

        $totalLiquido = $totalFaturado - $totalNotasCredito;

        $ticketMedio = $totalDocumentos > 0
            ? round($totalLiquido / $totalDocumentos, 2)
            : 0;

        /* ================= RECEITA MENSAL ================= */
        $receitaMesAtual = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR'])
            ->whereNotIn('estado', ['anulada'])
            ->whereMonth('data_emissao', $mesAtual)
            ->whereYear('data_emissao', $anoAtual)
            ->sum('total_liquido');

        $receitaMesAnterior = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR'])
            ->whereNotIn('estado', ['anulada'])
            ->whereMonth('data_emissao', $mesAnterior)
            ->whereYear('data_emissao', $anoAnterior)
            ->sum('total_liquido');

        $crescimentoPercentual = $receitaMesAnterior > 0
            ? round((($receitaMesAtual - $receitaMesAnterior) / $receitaMesAnterior) * 100, 2)
            : 0;

        $ivaArrecadado = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR'])
            ->whereNotIn('estado', ['anulada'])
            ->sum('total_iva');

        return [
            'ticketMedio' => $ticketMedio,
            'crescimentoPercentual' => $crescimentoPercentual,
            'ivaArrecadado' => $ivaArrecadado,
            'totalFaturado' => $totalFaturado,
            'totalNotasCredito' => $totalNotasCredito,
            'totalLiquido' => $totalLiquido,
        ];
    }

    /**
     * Obter dados de produtos
     */
    private function getDadosProdutos(): array
    {
        return [
            'total' => Produto::count(),
            'ativos' => Produto::where('status', 'ativo')->count(),
            'inativos' => Produto::where('status', 'inativo')->count(),
            'stock_baixo' => Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')->count(),
        ];
    }

    /**
     * Obter dados de vendas
     */
    private function getDadosVendas(): array
    {
        $ultimasVendas = Venda::with('documentoFiscal', 'cliente')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($v) => [
                'id' => $v->id,
                'cliente' => $v->cliente?->nome ?? 'Consumidor Final',
                'total' => $v->total,
                'status' => $v->status,
                'estado_pagamento' => $v->estado_pagamento,
                'documento_fiscal' => $v->documentoFiscal ? [
                    'tipo' => $v->documentoFiscal->tipo_documento,
                    'numero' => $v->documentoFiscal->numero_documento,
                    'estado' => $v->documentoFiscal->estado,
                ] : null,
                'data' => $v->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        return [
            'total' => Venda::count(),
            'abertas' => Venda::where('status', 'aberta')->count(),
            'faturadas' => Venda::where('status', 'faturada')->count(),
            'canceladas' => Venda::where('status', 'cancelada')->count(),
            'ultimas' => $ultimasVendas,
        ];
    }

    /**
     * Obter dados de documentos fiscais
     */
    private function getDadosDocumentosFiscais(Carbon $hoje): array
    {
        $totalDocumentos = DocumentoFiscal::whereNotIn('estado', ['anulada'])->count();

        $ultimosDocumentos = DocumentoFiscal::with('cliente')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'tipo' => $d->tipo_documento,
                'tipo_nome' => $d->tipo_documento_nome,
                'numero' => $d->numero_documento,
                'cliente' => $d->cliente?->nome ?? 'Consumidor Final',
                'total' => $d->total_liquido,
                'estado' => $d->estado,
                'estado_pagamento' => $this->determinarEstadoPagamento($d),
                'data' => $d->created_at->format('Y-m-d H:i'),
            ])
            ->toArray();

        $documentosPorMes = $this->getDocumentosPorMes();
        $documentosPorDia = $this->getDocumentosPorDia($hoje);
        $documentosPorEstado = $this->getDocumentosPorEstado();

        return [
            'total' => $totalDocumentos,
            'por_tipo' => $this->getDocumentosPorTipo(),
            'por_estado' => $documentosPorEstado,
            'ultimos' => $ultimosDocumentos,
            'por_mes' => $documentosPorMes,
            'por_dia' => $documentosPorDia,
        ];
    }

    /**
     * Obter documentos fiscais por mês (último ano)
     */
    private function getDocumentosPorMes(): array
    {
        return DocumentoFiscal::select(
            DB::raw("DATE_FORMAT(data_emissao, '%Y-%m') as mes"),
            DB::raw('tipo_documento'),
            DB::raw('COUNT(*) as quantidade'),
            DB::raw('SUM(total_liquido) as total')
        )
            ->whereNotIn('estado', ['anulada'])
            ->where('data_emissao', '>=', now()->subYear())
            ->groupBy('mes', 'tipo_documento')
            ->orderBy('mes')
            ->get()
            ->groupBy('mes')
            ->map(fn($grupo) => [
                'mes' => Carbon::createFromFormat('Y-m', $grupo->first()->mes)->format('m/Y'),
                'FT' => $grupo->firstWhere('tipo_documento', 'FT')?->total ?? 0,
                'FR' => $grupo->firstWhere('tipo_documento', 'FR')?->total ?? 0,
                'NC' => $grupo->firstWhere('tipo_documento', 'NC')?->total ?? 0,
                'ND' => $grupo->firstWhere('tipo_documento', 'ND')?->total ?? 0,
                'total' => $grupo->sum('total'),
            ])
            ->values()
            ->toArray();
    }

    /**
     * Obter documentos fiscais por dia (últimos 30 dias)
     */
    private function getDocumentosPorDia(Carbon $hoje): array
    {
        return DocumentoFiscal::select(
            DB::raw('DATE(data_emissao) as dia'),
            DB::raw('tipo_documento'),
            DB::raw('SUM(total_liquido) as total')
        )
            ->whereNotIn('estado', ['anulada'])
            ->where('data_emissao', '>=', $hoje->copy()->subDays(30))
            ->groupBy('dia', 'tipo_documento')
            ->orderBy('dia')
            ->get()
            ->groupBy('dia')
            ->map(fn($grupo) => [
                'dia' => Carbon::parse($grupo->first()->dia)->format('d/m'),
                'total' => $grupo->sum('total'),
            ])
            ->values()
            ->toArray();
    }

    /**
     * Obter documentos fiscais por estado
     */
    private function getDocumentosPorEstado(): array
    {
        return DocumentoFiscal::select(
            'tipo_documento',
            'estado',
            DB::raw('COUNT(*) as quantidade'),
            DB::raw('SUM(total_liquido) as valor_total')
        )
            ->groupBy('tipo_documento', 'estado')
            ->get()
            ->groupBy('tipo_documento')
            ->map(fn($grupo) => [
                'tipo' => $grupo->first()->tipo_documento,
                'por_estado' => $grupo->mapWithKeys(fn($item) => [
                    $item->estado => [
                        'quantidade' => $item->quantidade,
                        'valor' => $item->valor_total
                    ]
                ])->toArray(),
                'total_quantidade' => $grupo->sum('quantidade'),
                'total_valor' => $grupo->sum('valor_total'),
            ])
            ->toArray();
    }

    /**
     * Obter dados de pagamentos
     */
    private function getDadosPagamentos(Carbon $hoje): array
    {
        $pagamentosHoje = DocumentoFiscal::where('tipo_documento', 'RC')
            ->whereNotIn('estado', ['anulada'])
            ->whereDate('data_emissao', $hoje->toDateString())
            ->sum('total_liquido');

        $totalPendente = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
            ->whereIn('estado', ['emitida', 'parcialmente_paga'])
            ->sum('total_liquido');

        $totalAtrasado = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
            ->whereIn('estado', ['emitida', 'parcialmente_paga'])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->sum('total_liquido');

        $metodosPagamento = $this->getMetodosPagamento();

        return [
            'hoje' => $pagamentosHoje,
            'total_pendente' => $totalPendente,
            'total_atrasado' => $totalAtrasado,
            'metodos' => $metodosPagamento,
        ];
    }

    /**
     * Obter métodos de pagamento mais utilizados
     */
    private function getMetodosPagamento(): array
    {
        return DocumentoFiscal::where('tipo_documento', 'RC')
            ->whereNotIn('estado', ['anulada'])
            ->select(
                'metodo_pagamento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as valor_total')
            )
            ->groupBy('metodo_pagamento')
            ->get()
            ->map(fn($p) => [
                'metodo' => $p->metodo_pagamento,
                'metodo_nome' => $this->nomeMetodoPagamento($p->metodo_pagamento),
                'quantidade' => $p->quantidade,
                'valor_total' => $p->valor_total,
            ])
            ->toArray();
    }

    /**
     * Obter dados de clientes
     */
    private function getDadosClientes(int $mesAtual, int $anoAtual): array
    {
        $clientesAtivos = Cliente::count();
        $clientesNovosMes = Cliente::whereMonth('created_at', $mesAtual)
            ->whereYear('created_at', $anoAtual)
            ->count();

        Log::info('Dashboard - Clientes', [
            'clientesAtivos' => $clientesAtivos,
            'clientesNovosMes' => $clientesNovosMes
        ]);

        return [
            'ativos' => $clientesAtivos,
            'novos_mes' => $clientesNovosMes,
        ];
    }

    /**
     * Obter produtos mais vendidos
     */
    private function getProdutosMaisVendidos(): array
    {
        return DB::table('itens_documento_fiscal')
            ->join('documentos_fiscais', 'documentos_fiscais.id', '=', 'itens_documento_fiscal.documento_fiscal_id')
            ->join('produtos', 'produtos.id', '=', 'itens_documento_fiscal.produto_id')
            ->whereIn('documentos_fiscais.tipo_documento', ['FT', 'FR'])
            ->whereNotIn('documentos_fiscais.estado', ['anulada'])
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
     * Calcular alertas do sistema
     */
    private function calcularAlertas(): array
    {
        $hoje = now();

        return [
            'documentos_vencidos' => DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
                ->whereIn('estado', ['emitida', 'parcialmente_paga'])
                ->whereDate('data_vencimento', '<', $hoje->toDateString())
                ->count(),
            'documentos_proximo_vencimento' => DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
                ->whereIn('estado', ['emitida', 'parcialmente_paga'])
                ->whereDate('data_vencimento', '<=', $hoje->copy()->addDays(3)->toDateString())
                ->whereDate('data_vencimento', '>=', $hoje->toDateString())
                ->count(),
            'proformas_antigas' => DocumentoFiscal::whereIn('tipo_documento', ['PF', 'PFA'])
                ->where('estado', 'emitida')
                ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
                ->count(),
        ];
    }

    /**
     * Obter documentos fiscais agrupados por tipo
     */
    private function getDocumentosPorTipo(): array
    {
        return DocumentoFiscal::whereNotIn('estado', ['anulada'])
            ->select('tipo_documento', DB::raw('COUNT(*) as quantidade'), DB::raw('SUM(total_liquido) as valor'))
            ->groupBy('tipo_documento')
            ->get()
            ->mapWithKeys(fn($item) => [
                $item->tipo_documento => [
                    'nome' => $this->nomeTipoDocumento($item->tipo_documento),
                    'quantidade' => $item->quantidade,
                    'valor' => $item->valor,
                ]
            ])
            ->toArray();
    }

    /**
     * Determinar estado de pagamento de um documento
     */
    private function determinarEstadoPagamento($documento): string
    {
        if ($documento->tipo_documento === 'FR') {
            return 'paga';
        }

        if (in_array($documento->tipo_documento, ['FT', 'ND'])) {
            $valorPago = $documento->recibos()
                ->whereNotIn('estado', ['anulada'])
                ->sum('total_liquido');

            if ($valorPago >= $documento->total_liquido) {
                return 'paga';
            } elseif ($valorPago > 0) {
                return 'parcial';
            }
        }

        return 'pendente';
    }

    /**
     * Obter nome do tipo de documento
     */
    private function nomeTipoDocumento(string $tipo): string
    {
        return match ($tipo) {
            'FT' => 'Fatura',
            'FR' => 'Fatura-Recibo',
            'RC' => 'Recibo',
            'NC' => 'Nota de Crédito',
            'ND' => 'Nota de Débito',
            'NA' => 'Nota de Adiantamento',
            'PF' => 'Fatura Pro-forma',
            'PFA' => 'Fatura Pró-forma de Adiantamento',
            'FRt' => 'Fatura de Retificação',
            default => 'Desconhecido',
        };
    }

    /**
     * Obter nome do método de pagamento
     */
    private function nomeMetodoPagamento(?string $metodo): string
    {
        return match ($metodo) {
            'transferencia' => 'Transferência Bancária',
            'multibanco' => 'Multibanco',
            'dinheiro' => 'Dinheiro',
            'cartao' => 'Cartão',
            'cheque' => 'Cheque',
            default => 'Não especificado',
        };
    }

    /* ================= MÉTODOS PÚBLICOS PARA ENDPOINTS ESPECÍFICOS ================= */

    /**
     * Resumo de documentos fiscais para dashboard específico
     */
    public function getResumoDocumentosFiscais(): array
    {
        try {
            $hoje = now();
            $inicioMes = $hoje->copy()->startOfMonth();
            $fimMes = $hoje->copy()->endOfMonth();

            $tipos = ['FT', 'FR', 'NC', 'ND', 'NA', 'PF', 'PFA', 'RC', 'FRt'];
            $porTipo = [];

            foreach ($tipos as $tipo) {
                $query = DocumentoFiscal::where('tipo_documento', $tipo)
                    ->whereNotIn('estado', ['anulada']);

                $porTipo[$tipo] = [
                    'nome' => $this->nomeTipoDocumento($tipo),
                    'quantidade' => $query->count(),
                    'valor_total' => $query->sum('total_liquido'),
                    'mes_atual' => (clone $query)
                        ->whereBetween('data_emissao', [$inicioMes, $fimMes])
                        ->sum('total_liquido'),
                ];
            }

            $estados = ['emitida', 'paga', 'parcialmente_paga', 'anulada', 'convertida', 'vinculada'];
            $porEstado = [];

            foreach ($estados as $estado) {
                $porEstado[$estado] = DocumentoFiscal::where('estado', $estado)->count();
            }

            return [
                'total_emitidos' => DocumentoFiscal::whereNotIn('estado', ['anulada'])->count(),
                'por_tipo' => $porTipo,
                'por_estado' => $porEstado,
                'periodo' => [
                    'inicio' => $inicioMes->toDateString(),
                    'fim' => $fimMes->toDateString(),
                ],
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao obter resumo de documentos fiscais:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Estatísticas de pagamentos
     */
    public function getEstatisticasPagamentos(): array
    {
        try {
            $hoje = now();
            $mesAtual = $hoje->month;
            $anoAtual = $hoje->year;

            $recebidosHoje = DocumentoFiscal::where('tipo_documento', 'RC')
                ->whereNotIn('estado', ['anulada'])
                ->whereDate('data_emissao', $hoje->toDateString())
                ->sum('total_liquido');

            $recebidosMes = DocumentoFiscal::where('tipo_documento', 'RC')
                ->whereNotIn('estado', ['anulada'])
                ->whereMonth('data_emissao', $mesAtual)
                ->whereYear('data_emissao', $anoAtual)
                ->sum('total_liquido');

            $recebidosAno = DocumentoFiscal::where('tipo_documento', 'RC')
                ->whereNotIn('estado', ['anulada'])
                ->whereYear('data_emissao', $anoAtual)
                ->sum('total_liquido');

            $pendentes = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
                ->whereIn('estado', ['emitida', 'parcialmente_paga'])
                ->sum('total_liquido');

            $atrasados = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
                ->whereIn('estado', ['emitida', 'parcialmente_paga'])
                ->whereDate('data_vencimento', '<', $hoje->toDateString())
                ->get();

            // Calcular prazo médio de pagamento
            $prazoMedio = $this->calcularPrazoMedioPagamento();

            $metodos = DocumentoFiscal::where('tipo_documento', 'RC')
                ->whereNotIn('estado', ['anulada'])
                ->select('metodo_pagamento', DB::raw('SUM(total_liquido) as total'))
                ->groupBy('metodo_pagamento')
                ->pluck('total', 'metodo_pagamento')
                ->toArray();

            return [
                'recebidos_hoje' => $recebidosHoje,
                'recebidos_mes' => $recebidosMes,
                'recebidos_ano' => $recebidosAno,
                'pendentes' => $pendentes,
                'atrasados' => [
                    'quantidade' => $atrasados->count(),
                    'valor_total' => $atrasados->sum('total_liquido'),
                    'documentos' => $atrasados->take(5)->map(fn($d) => [
                        'id' => $d->id,
                        'numero' => $d->numero_documento,
                        'cliente' => $d->cliente?->nome,
                        'valor' => $d->total_liquido,
                        'dias_atraso' => Carbon::parse($d->data_vencimento)->diffInDays($hoje),
                    ])->toArray(),
                ],
                'prazo_medio_pagamento' => round($prazoMedio, 1),
                'metodos_pagamento' => $metodos,
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao obter estatísticas de pagamentos:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Calcular prazo médio de pagamento
     */
    private function calcularPrazoMedioPagamento(): float
    {
        return DocumentoFiscal::whereIn('tipo_documento', ['FT'])
            ->whereHas('recibos', fn($q) => $q->whereNotIn('estado', ['anulada']))
            ->with('recibos')
            ->get()
            ->map(fn($f) => [
                'data_emissao' => $f->data_emissao,
                'data_primeiro_pagamento' => $f->recibos
                    ->whereNotIn('estado', ['anulada'])
                    ->sortBy('data_emissao')
                    ->first()?->data_emissao,
            ])
            ->filter(fn($item) => $item['data_primeiro_pagamento'])
            ->map(fn($item) => Carbon::parse($item['data_emissao'])
                ->diffInDays(Carbon::parse($item['data_primeiro_pagamento'])))
            ->average() ?? 0;
    }

    /**
     * Alertas de documentos pendentes
     */
    public function getAlertasPendentes(): array
    {
        try {
            $hoje = now();
            $tresDias = $hoje->copy()->addDays(3);

            // Documentos vencidos
            $vencidos = $this->getDocumentosVencidos($hoje);

            // Próximos do vencimento (3 dias)
            $proximosVencimento = $this->getDocumentosProximosVencimento($hoje, $tresDias);

            // Pro-formas pendentes (> 7 dias)
            $proformasPendentes = $this->getProformasPendentes($hoje);

            return [
                'vencidos' => [
                    'quantidade' => $vencidos->count(),
                    'valor_total' => $vencidos->sum('valor_pendente'),
                    'documentos' => $vencidos->toArray(),
                ],
                'proximos_vencimento' => [
                    'quantidade' => $proximosVencimento->count(),
                    'valor_total' => $proximosVencimento->sum('valor_pendente'),
                    'documentos' => $proximosVencimento->toArray(),
                ],
                'proformas_pendentes' => [
                    'quantidade' => $proformasPendentes->count(),
                    'valor_total' => $proformasPendentes->sum('valor'),
                    'documentos' => $proformasPendentes->toArray(),
                ],
                'total_alertas' => $vencidos->count() + $proximosVencimento->count() + $proformasPendentes->count(),
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao obter alertas pendentes:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Obter documentos vencidos
     */
    private function getDocumentosVencidos(Carbon $hoje)
    {
        return DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
            ->whereIn('estado', ['emitida', 'parcialmente_paga'])
            ->whereDate('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento', 'asc')
            ->limit(10)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'tipo' => $d->tipo_documento,
                'numero' => $d->numero_documento,
                'cliente' => $d->cliente?->nome,
                'valor' => $d->total_liquido,
                'valor_pendente' => $d->valor_pendente ?? $d->total_liquido,
                'data_vencimento' => $d->data_vencimento,
                'dias_atraso' => Carbon::parse($d->data_vencimento)->diffInDays($hoje),
            ]);
    }

    /**
     * Obter documentos próximos do vencimento
     */
    private function getDocumentosProximosVencimento(Carbon $hoje, Carbon $tresDias)
    {
        return DocumentoFiscal::whereIn('tipo_documento', ['FT', 'ND'])
            ->whereIn('estado', ['emitida', 'parcialmente_paga'])
            ->whereDate('data_vencimento', '>=', $hoje->toDateString())
            ->whereDate('data_vencimento', '<=', $tresDias->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento', 'asc')
            ->limit(10)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'tipo' => $d->tipo_documento,
                'numero' => $d->numero_documento,
                'cliente' => $d->cliente?->nome,
                'valor' => $d->total_liquido,
                'valor_pendente' => $d->valor_pendente ?? $d->total_liquido,
                'data_vencimento' => $d->data_vencimento,
                'dias_ate_vencimento' => $hoje->diffInDays(Carbon::parse($d->data_vencimento)),
            ]);
    }

    /**
     * Obter proformas pendentes
     */
    private function getProformasPendentes(Carbon $hoje)
    {
        return DocumentoFiscal::whereIn('tipo_documento', ['PF', 'PFA'])
            ->where('estado', 'emitida')
            ->whereDate('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->with('cliente')
            ->orderBy('data_emissao', 'asc')
            ->limit(10)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'tipo' => $d->tipo_documento,
                'numero' => $d->numero_documento,
                'cliente' => $d->cliente?->nome,
                'valor' => $d->total_liquido,
                'data_emissao' => $d->data_emissao,
                'dias_pendentes' => Carbon::parse($d->data_emissao)->diffInDays($hoje),
            ]);
    }

    /**
     * Evolução mensal de documentos fiscais
     */
    public function getEvolucaoMensal(int $ano): array
    {
        try {
            $meses = [];

            for ($mes = 1; $mes <= 12; $mes++) {
                $inicioMes = Carbon::create($ano, $mes, 1)->startOfMonth();
                $fimMes = Carbon::create($ano, $mes, 1)->endOfMonth();

                $faturas = DocumentoFiscal::where('tipo_documento', 'FT')
                    ->whereNotIn('estado', ['anulada'])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

                $notasCredito = DocumentoFiscal::where('tipo_documento', 'NC')
                    ->whereNotIn('estado', ['anulada'])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

                $recibos = DocumentoFiscal::where('tipo_documento', 'RC')
                    ->whereNotIn('estado', ['anulada'])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes]);

                $meses[] = [
                    'mes' => $mes,
                    'nome' => $inicioMes->locale('pt_PT')->monthName,
                    'faturas_emitidas' => $faturas->count(),
                    'valor_faturado' => $faturas->sum('total_liquido'),
                    'valor_pago' => $recibos->sum('total_liquido'),
                    'valor_pendente' => $faturas->sum('total_liquido') - $recibos->sum('total_liquido'),
                    'notas_credito' => $notasCredito->count(),
                    'valor_notas_credito' => $notasCredito->sum('total_liquido'),
                ];
            }

            return [
                'ano' => $ano,
                'meses' => $meses,
            ];
        } catch (\Exception $e) {
            Log::error('Erro ao obter evolução mensal:', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
