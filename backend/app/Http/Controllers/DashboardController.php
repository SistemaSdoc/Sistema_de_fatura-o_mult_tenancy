<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\DashboardService;

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

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data' => array_merge([
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role
                    ]
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
     * Resumo de documentos fiscais para o dashboard
     */
    public function resumoDocumentosFiscais()
    {
        try {
            $user = Auth::user();

            $resumo = $this->dashboardService->getResumoDocumentosFiscais();

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
                    'evolucao' => $evolucao
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
}
