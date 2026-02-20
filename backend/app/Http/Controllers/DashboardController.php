<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\DashboardService;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function index()
    {
        $user = Auth::user();

        // Obtem todos os dados do dashboard via service
        $dashboardData = $this->dashboardService->getDashboard();

        return response()->json([
            'message' => 'Dashboard carregado com sucesso',
            'dados' => array_merge([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role
                ]
            ], $dashboardData)
        ]);
    }

    /**
     * Resumo de documentos fiscais para o dashboard
     */
    public function resumoDocumentosFiscais()
    {
        $user = Auth::user();

        $resumo = $this->dashboardService->getResumoDocumentosFiscais();

        return response()->json([
            'message' => 'Resumo de documentos fiscais carregado',
            'dados' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role
                ],
                'resumo' => $resumo
            ]
        ]);
    }

    /**
     * Estatísticas de pagamentos para o dashboard
     */
    public function estatisticasPagamentos()
    {
        $user = Auth::user();

        $estatisticas = $this->dashboardService->getEstatisticasPagamentos();

        return response()->json([
            'message' => 'Estatísticas de pagamentos carregadas',
            'dados' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role
                ],
                'estatisticas' => $estatisticas
            ]
        ]);
    }

    /**
     * Alertas de documentos pendentes (vencidos, próximos do vencimento)
     */
    public function alertasPendentes()
    {
        $user = Auth::user();

        $alertas = $this->dashboardService->getAlertasPendentes();

        return response()->json([
            'message' => 'Alertas de documentos pendentes carregados',
            'dados' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role
                ],
                'alertas' => $alertas
            ]
        ]);
    }

    /**
     * Evolução mensal de documentos fiscais
     */
    public function evolucaoMensal(Request $request)
    {
        $user = Auth::user();

        $ano = $request->input('ano', now()->year);

        $evolucao = $this->dashboardService->getEvolucaoMensal($ano);

        return response()->json([
            'message' => 'Evolução mensal carregada',
            'dados' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role
                ],
                'ano' => $ano,
                'evolucao' => $evolucao
            ]
        ]);
    }
}
