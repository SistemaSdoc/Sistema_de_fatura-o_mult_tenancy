<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\DashboardService;
use App\Models\Produto;
use App\Models\DocumentoFiscal;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Aplicar filtros de data à query
     */
    private function aplicarFiltrosData($query, Request $request, string $coluna = 'created_at')
    {
        if ($request->has('data_inicio') && !empty($request->data_inicio)) {
            $query->whereDate($coluna, '>=', Carbon::parse($request->data_inicio)->format('Y-m-d'));
        }

        if ($request->has('data_fim') && !empty($request->data_fim)) {
            $query->whereDate($coluna, '<=', Carbon::parse($request->data_fim)->format('Y-m-d'));
        }

        return $query;
    }

    /**
     * Dashboard principal com todos os dados (AGORA COM FILTROS)
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            // Passar os filtros para o DashboardService
            $filtros = [
                'data_inicio' => $request->data_inicio,
                'data_fim' => $request->data_fim,
            ];

            $dashboardData = $this->dashboardService->getDashboard($filtros);

            // Passar filtros para estatísticas de serviços
            $estatisticasServicos = $this->getEstatisticasServicos($request);

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data' => array_merge([
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role
                    ],
                    'servicos' => $estatisticasServicos
                ], $dashboardData)
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar dashboard:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estatísticas específicas de serviços (COM FILTROS)
     */
    protected function getEstatisticasServicos(Request $request = null): array
    {
        $queryProdutos = Produto::where('tipo', 'servico');

        // Total de serviços (não é afetado por data)
        $totalServicos = Produto::where('tipo', 'servico')->count();
        $servicosAtivos = Produto::where('tipo', 'servico')
            ->where('status', 'ativo')
            ->count();

        $precoMedioServicos = Produto::where('tipo', 'servico')
            ->where('status', 'ativo')
            ->avg('preco_venda') ?? 0;

        // Retenções com filtros de data
        $queryRetencoes = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO);

        if ($request) {
            $this->aplicarFiltrosData($queryRetencoes, $request, 'data_emissao');
        }

        $retencoesPeriodo = $queryRetencoes->sum('total_retencao') ?? 0;

        // Comparação com período anterior (se houver filtros)
        $variacaoRetencao = 0;
        $retencoesPeriodoAnterior = 0;
        $crescimento = 0;

        if ($request && $request->data_inicio && $request->data_fim) {
            $inicio = Carbon::parse($request->data_inicio);
            $fim = Carbon::parse($request->data_fim);
            $diasPeriodo = $inicio->diffInDays($fim) + 1;

            $inicioAnterior = (clone $inicio)->subDays($diasPeriodo);
            $fimAnterior = (clone $inicio)->subDay();

            $retencoesPeriodoAnterior = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->whereDate('data_emissao', '>=', $inicioAnterior->format('Y-m-d'))
                ->whereDate('data_emissao', '<=', $fimAnterior->format('Y-m-d'))
                ->sum('total_retencao') ?? 0;

            $variacaoRetencao = $retencoesPeriodoAnterior > 0
                ? round((($retencoesPeriodo - $retencoesPeriodoAnterior) / $retencoesPeriodoAnterior) * 100, 2)
                : 0;
        } else {
            // Sem filtros, compara mês atual com mês anterior
            $mesAtual = now()->startOfMonth();
            $mesAnterior = now()->subMonth()->startOfMonth();

            $retencoesPeriodo = DocumentoFiscal::whereMonth('data_emissao', $mesAtual->month)
                ->whereYear('data_emissao', $mesAtual->year)
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_retencao') ?? 0;

            $retencoesPeriodoAnterior = DocumentoFiscal::whereMonth('data_emissao', $mesAnterior->month)
                ->whereYear('data_emissao', $mesAnterior->year)
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_retencao') ?? 0;

            $variacaoRetencao = $retencoesPeriodoAnterior > 0
                ? round((($retencoesPeriodo - $retencoesPeriodoAnterior) / $retencoesPeriodoAnterior) * 100, 2)
                : 0;
        }

        // Top serviços com filtros de data
        $queryTopServicos = DB::table('itens_venda')
            ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
            ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
            ->where('produtos.tipo', 'servico')
            ->where('vendas.status', '!=', 'cancelada');

        if ($request) {
            if ($request->data_inicio) {
                $queryTopServicos->whereDate('vendas.data_venda', '>=', $request->data_inicio);
            }
            if ($request->data_fim) {
                $queryTopServicos->whereDate('vendas.data_venda', '<=', $request->data_fim);
            }
        }

        $topServicos = $queryTopServicos
            ->select(
                'produtos.id',
                'produtos.nome',
                DB::raw('SUM(itens_venda.quantidade) as total_quantidade'),
                DB::raw('SUM(itens_venda.subtotal) as total_receita'),
                DB::raw('SUM(itens_venda.valor_retencao) as total_retencao')
            )
            ->groupBy('produtos.id', 'produtos.nome')
            ->orderByDesc('total_receita')
            ->limit(5)
            ->get();

        // Cálculo de crescimento
        if ($request && $request->data_inicio && $request->data_fim && $retencoesPeriodoAnterior > 0) {
            $crescimento = round((($retencoesPeriodo - $retencoesPeriodoAnterior) / $retencoesPeriodoAnterior) * 100, 2);
        }

        return [
            'servicos' => [
                'total' => $totalServicos,
                'ativos' => $servicosAtivos,
                'inativos' => $totalServicos - $servicosAtivos,
                'preco_medio' => round($precoMedioServicos, 2),
                'preco_medio_formatado' => number_format($precoMedioServicos, 2, ',', '.') . ' Kz',
            ],
            'retencoes' => [
                'periodo' => round($retencoesPeriodo, 2),
                'periodo_formatado' => number_format($retencoesPeriodo, 2, ',', '.') . ' Kz',
                'periodo_anterior' => round($retencoesPeriodoAnterior, 2),
                'periodo_anterior_formatado' => number_format($retencoesPeriodoAnterior, 2, ',', '.') . ' Kz',
                'variacao' => $variacaoRetencao,
                'variacao_sinal' => $variacaoRetencao >= 0 ? '+' : '',
                'crescimento' => $crescimento,
            ],
            'top_servicos' => $topServicos->map(function ($item) {
                return [
                    'id' => $item->id,
                    'nome' => $item->nome,
                    'quantidade' => (int) $item->total_quantidade,
                    'receita' => round($item->total_receita, 2),
                    'receita_formatada' => number_format($item->total_receita, 2, ',', '.') . ' Kz',
                    'retencao' => round($item->total_retencao, 2),
                    'retencao_formatada' => number_format($item->total_retencao, 2, ',', '.') . ' Kz',
                ];
            }),
        ];
    }

    /**
     * Resumo de documentos fiscais para o dashboard (COM FILTROS)
     */
    public function resumoDocumentosFiscais(Request $request)
    {
        try {
            $user = Auth::user();

            $filtros = [
                'data_inicio' => $request->data_inicio,
                'data_fim' => $request->data_fim,
            ];

            $resumo = $this->dashboardService->getResumoDocumentosFiscais($filtros);

            $queryRetencoes = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO);
            $this->aplicarFiltrosData($queryRetencoes, $request, 'data_emissao');

            $retencaoTotal = $queryRetencoes->sum('total_retencao');

            $queryDocsComRetencao = DocumentoFiscal::where('total_retencao', '>', 0)
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO);
            $this->aplicarFiltrosData($queryDocsComRetencao, $request, 'data_emissao');

            $resumo['retencoes'] = [
                'total' => round($retencaoTotal, 2),
                'total_formatado' => number_format($retencaoTotal, 2, ',', '.') . ' Kz',
                'documentos_com_retencao' => $queryDocsComRetencao->count(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Resumo de documentos fiscais carregado',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role
                    ],
                    'resumo' => $resumo
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar resumo de documentos:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar resumo de documentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estatísticas de pagamentos para o dashboard (COM FILTROS)
     */
    public function estatisticasPagamentos(Request $request)
    {
        try {
            $user = Auth::user();

            $filtros = [
                'data_inicio' => $request->data_inicio,
                'data_fim' => $request->data_fim,
            ];

            $estatisticas = $this->dashboardService->getEstatisticasPagamentos($filtros);

            $queryPagamentosServicos = DB::table('documentos_fiscais')
                ->join('recibos', 'documentos_fiscais.id', '=', 'recibos.fatura_id')
                ->where('documentos_fiscais.tipo_documento', DocumentoFiscal::TIPO_FATURA)
                ->where('documentos_fiscais.total_retencao', '>', 0);

            if ($request->data_inicio) {
                $queryPagamentosServicos->whereDate('recibos.data_emissao', '>=', $request->data_inicio);
            }
            if ($request->data_fim) {
                $queryPagamentosServicos->whereDate('recibos.data_emissao', '<=', $request->data_fim);
            }

            $pagamentosServicos = $queryPagamentosServicos
                ->select(
                    DB::raw('SUM(recibos.total_liquido) as total_pago_com_retencao'),
                    DB::raw('COUNT(DISTINCT documentos_fiscais.id) as documentos_com_retencao_pagos')
                )
                ->first();

            $estatisticas['servicos'] = [
                'total_pago_com_retencao' => round($pagamentosServicos->total_pago_com_retencao ?? 0, 2),
                'total_pago_com_retencao_formatado' => number_format($pagamentosServicos->total_pago_com_retencao ?? 0, 2, ',', '.') . ' Kz',
                'documentos_com_retencao_pagos' => $pagamentosServicos->documentos_com_retencao_pagos ?? 0,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de pagamentos carregadas',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role
                    ],
                    'estatisticas' => $estatisticas
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar estatísticas de pagamentos:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar estatísticas de pagamentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Alertas de documentos pendentes (COM FILTROS)
     */
    public function alertasPendentes(Request $request)
    {
        try {
            $user = Auth::user();

            $filtros = [
                'data_inicio' => $request->data_inicio,
                'data_fim' => $request->data_fim,
            ];

            $alertas = $this->dashboardService->getAlertasPendentes($filtros);

            $queryServicos = DocumentoFiscal::where('total_retencao', '>', 0)
                ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
                ->where('data_vencimento', '<', now()->addDays(5));

            if ($request->data_inicio) {
                $queryServicos->whereDate('data_vencimento', '>=', $request->data_inicio);
            }
            if ($request->data_fim) {
                $queryServicos->whereDate('data_vencimento', '<=', $request->data_fim);
            }

            $servicosComRetencaoNaoPaga = $queryServicos->count();

            if ($servicosComRetencaoNaoPaga > 0) {
                $alertas['servicos_com_retencao_proximos'] = [
                    'quantidade' => $servicosComRetencaoNaoPaga,
                    'mensagem' => "{$servicosComRetencaoNaoPaga} serviço(s) com retenção próxima do vencimento",
                ];
            }

            return response()->json([
                'success' => true,
                'message' => 'Alertas de documentos pendentes carregados',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role
                    ],
                    'alertas' => $alertas
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar alertas:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar alertas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Evolução mensal de documentos fiscais
     */
    public function evolucaoMensal(Request $request)
    {
        try {
            $user = Auth::user();

            $dados = $request->validate([
                'ano' => 'nullable|integer|min:2000|max:' . (now()->year + 1)
            ]);

            $ano = $dados['ano'] ?? now()->year;

            $filtros = [
                'data_inicio' => $request->data_inicio,
                'data_fim' => $request->data_fim,
            ];

            $evolucao = $this->dashboardService->getEvolucaoMensal($ano, $filtros);

            $queryRetencoes = DocumentoFiscal::whereYear('data_emissao', $ano)
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO);

            if ($request->data_inicio) {
                $queryRetencoes->whereDate('data_emissao', '>=', $request->data_inicio);
            }
            if ($request->data_fim) {
                $queryRetencoes->whereDate('data_emissao', '<=', $request->data_fim);
            }

            $retencoesPorMes = $queryRetencoes
                ->select(
                    DB::raw('MONTH(data_emissao) as mes'),
                    DB::raw('SUM(total_retencao) as total')
                )
                ->groupBy('mes')
                ->orderBy('mes')
                ->get();

            $retencoesMapeadas = [];
            foreach ($retencoesPorMes as $item) {
                $nomeMes = \Carbon\Carbon::create()->month($item->mes)->locale('pt')->monthName;
                $retencoesMapeadas[] = [
                    'mes' => $nomeMes,
                    'mes_numero' => $item->mes,
                    'total_retencao' => round($item->total, 2),
                    'total_retencao_formatado' => number_format($item->total, 2, ',', '.') . ' Kz',
                ];
            }

            return response()->json([
                'success' => true,
                'message' => 'Evolução mensal carregada',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role
                    ],
                    'ano' => $ano,
                    'evolucao' => $evolucao,
                    'retencoes_por_mes' => $retencoesMapeadas,
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar evolução mensal:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar evolução mensal',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estatísticas detalhadas de serviços (COM FILTROS)
     */
    public function estatisticasServicos(Request $request)
    {
        try {
            $user = Auth::user();

            $estatisticas = $this->getEstatisticasServicos($request);

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de serviços carregadas',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role
                    ],
                    'estatisticas' => $estatisticas
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar estatísticas de serviços:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar estatísticas de serviços',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ranking de serviços por receita (COM FILTROS)
     */
    public function rankingServicos(Request $request)
    {
        try {
            $user = Auth::user();

            $dados = $request->validate([
                'periodo' => 'nullable|in:mes,trimestre,ano,todo',
                'limite' => 'nullable|integer|min:1|max:50'
            ]);

            $periodo = $dados['periodo'] ?? 'mes';
            $limite = $dados['limite'] ?? 10;

            $query = DB::table('itens_venda')
                ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
                ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
                ->where('produtos.tipo', 'servico')
                ->where('vendas.status', '!=', 'cancelada');

            // Aplicar filtros de data do request primeiro (se existirem)
            if ($request->data_inicio) {
                $query->whereDate('vendas.data_venda', '>=', $request->data_inicio);
            }
            if ($request->data_fim) {
                $query->whereDate('vendas.data_venda', '<=', $request->data_fim);
            }

            // Se não houver filtros explícitos, usar o período selecionado
            if (!$request->data_inicio && !$request->data_fim) {
                switch ($periodo) {
                    case 'mes':
                        $query->whereMonth('vendas.data_venda', now()->month)
                              ->whereYear('vendas.data_venda', now()->year);
                        break;
                    case 'trimestre':
                        $query->where('vendas.data_venda', '>=', now()->subMonths(3));
                        break;
                    case 'ano':
                        $query->whereYear('vendas.data_venda', now()->year);
                        break;
                    case 'todo':
                    default:
                        break;
                }
            }

            $ranking = $query->select(
                    'produtos.id',
                    'produtos.nome',
                    DB::raw('SUM(itens_venda.quantidade) as total_quantidade'),
                    DB::raw('SUM(itens_venda.subtotal) as total_receita'),
                    DB::raw('SUM(itens_venda.valor_retencao) as total_retencao'),
                    DB::raw('COUNT(DISTINCT vendas.id) as total_vendas')
                )
                ->groupBy('produtos.id', 'produtos.nome')
                ->orderByDesc('total_receita')
                ->limit($limite)
                ->get()
                ->map(function ($item, $index) {
                    return [
                        'posicao' => $index + 1,
                        'id' => $item->id,
                        'nome' => $item->nome,
                        'quantidade' => (int) $item->total_quantidade,
                        'vendas' => (int) $item->total_vendas,
                        'receita' => round($item->total_receita, 2),
                        'receita_formatada' => number_format($item->total_receita, 2, ',', '.') . ' Kz',
                        'retencao' => round($item->total_retencao, 2),
                        'retencao_formatada' => number_format($item->total_retencao, 2, ',', '.') . ' Kz',
                        'percentual_retencao' => $item->total_receita > 0
                            ? round(($item->total_retencao / $item->total_receita) * 100, 2)
                            : 0,
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Ranking de serviços carregado',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role
                    ],
                    'periodo' => $periodo,
                    'ranking' => $ranking
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar ranking de serviços:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar ranking de serviços',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
