<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\DashboardService;
use App\Models\Produto;
use App\Models\DocumentoFiscal;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Dashboard principal com todos os dados
     */
    public function index()
    {
        try {
            $user = Auth::user();

            // Obtem todos os dados do dashboard via service
            $dashboardData = $this->dashboardService->getDashboard();

            // ✅ Adicionar estatísticas de serviços
            $estatisticasServicos = $this->getEstatisticasServicos();

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
     * ✅ NOVO: Estatísticas específicas de serviços
     */
    protected function getEstatisticasServicos(): array
    {
        $mesAtual = now()->startOfMonth();
        $mesAnterior = now()->subMonth()->startOfMonth();

        // Totais de serviços
        $totalServicos = Produto::where('tipo', 'servico')->count();
        $servicosAtivos = Produto::where('tipo', 'servico')
            ->where('status', 'ativo')
            ->count();

        // Preços
        $precoMedioServicos = Produto::where('tipo', 'servico')
            ->where('status', 'ativo')
            ->avg('preco_venda') ?? 0;

        // Retenções
        $retencoesMesAtual = DocumentoFiscal::whereMonth('data_emissao', $mesAtual->month)
            ->whereYear('data_emissao', $mesAtual->year)
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_retencao') ?? 0;

        $retencoesMesAnterior = DocumentoFiscal::whereMonth('data_emissao', $mesAnterior->month)
            ->whereYear('data_emissao', $mesAnterior->year)
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_retencao') ?? 0;

        // Variação percentual
        $variacaoRetencao = $retencoesMesAnterior > 0
            ? round((($retencoesMesAtual - $retencoesMesAnterior) / $retencoesMesAnterior) * 100, 2)
            : 0;

        // Top serviços mais vendidos
        $topServicos = DB::table('itens_venda')
            ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
            ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
            ->where('produtos.tipo', 'servico')
            ->where('vendas.status', '!=', 'cancelada')
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

        return [
            'servicos' => [
                'total' => $totalServicos,
                'ativos' => $servicosAtivos,
                'inativos' => $totalServicos - $servicosAtivos,
                'preco_medio' => round($precoMedioServicos, 2),
                'preco_medio_formatado' => number_format($precoMedioServicos, 2, ',', '.') . ' Kz',
            ],
            'retencoes' => [
                'mes_atual' => round($retencoesMesAtual, 2),
                'mes_atual_formatado' => number_format($retencoesMesAtual, 2, ',', '.') . ' Kz',
                'mes_anterior' => round($retencoesMesAnterior, 2),
                'mes_anterior_formatado' => number_format($retencoesMesAnterior, 2, ',', '.') . ' Kz',
                'variacao' => $variacaoRetencao,
                'variacao_sinal' => $variacaoRetencao >= 0 ? '+' : '',
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
     * Resumo de documentos fiscais para o dashboard
     */
    public function resumoDocumentosFiscais()
    {
        try {
            $user = Auth::user();

            $resumo = $this->dashboardService->getResumoDocumentosFiscais();

            // ✅ Adicionar informações de retenção
            $retencaoTotal = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_retencao');

            $resumo['retencoes'] = [
                'total' => round($retencaoTotal, 2),
                'total_formatado' => number_format($retencaoTotal, 2, ',', '.') . ' Kz',
                'documentos_com_retencao' => DocumentoFiscal::where('total_retencao', '>', 0)
                    ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                    ->count(),
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
     * Estatísticas de pagamentos para o dashboard
     */
    public function estatisticasPagamentos()
    {
        try {
            $user = Auth::user();

            $estatisticas = $this->dashboardService->getEstatisticasPagamentos();

            // ✅ Adicionar estatísticas de pagamentos de serviços
            $pagamentosServicos = DB::table('documentos_fiscais')
                ->join('recibos', 'documentos_fiscais.id', '=', 'recibos.fatura_id')
                ->where('documentos_fiscais.tipo_documento', DocumentoFiscal::TIPO_FATURA)
                ->where('documentos_fiscais.total_retencao', '>', 0)
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
     * Alertas de documentos pendentes (vencidos, próximos do vencimento)
     */
    public function alertasPendentes()
    {
        try {
            $user = Auth::user();

            $alertas = $this->dashboardService->getAlertasPendentes();

            // ✅ Adicionar alertas específicos de serviços
            $servicosComRetencaoNaoPaga = DocumentoFiscal::where('total_retencao', '>', 0)
                ->whereIn('estado', [DocumentoFiscal::ESTADO_EMITIDO, DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA])
                ->where('data_vencimento', '<', now()->addDays(5))
                ->count();

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

            $evolucao = $this->dashboardService->getEvolucaoMensal($ano);

            // ✅ Adicionar evolução de retenções por mês
            $retencoesPorMes = DocumentoFiscal::retencaoPorMes($ano);

            // Mapear retenções para o formato esperado
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
     * ✅ NOVO: Estatísticas detalhadas de serviços
     */
    public function estatisticasServicos()
    {
        try {
            $user = Auth::user();

            $estatisticas = $this->getEstatisticasServicos();

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
     * ✅ NOVO: Ranking de serviços por receita
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

            // Filtrar por período
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
                    // Sem filtro de período
                    break;
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
