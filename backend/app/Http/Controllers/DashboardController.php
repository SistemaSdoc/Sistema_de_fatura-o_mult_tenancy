<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\DashboardService;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function index(): \Illuminate\Http\JsonResponse
    {
        try {
            $data = $this->dashboardService->getDashboard();
            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data' => $data,
                'modo' => $this->dashboardService->getModo(), // ✅ correto
            ]);
        } catch (\Exception $e) {
            Log::error('Erro no dashboard:', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function resumoDocumentosFiscais(): \Illuminate\Http\JsonResponse
    {
        try {
            $resumo = $this->dashboardService->getResumoDocumentosFiscais();
            return response()->json([
                'success' => true,
                'message' => 'Resumo de documentos fiscais carregado',
                'data' => [
                    'user' => $this->getUserData()['user'],
                    'resumo' => $resumo,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar resumo de documentos', $e);
        }
    }

    public function estatisticasPagamentos(): \Illuminate\Http\JsonResponse
    {
        try {
            $estatisticas = $this->dashboardService->getEstatisticasPagamentos();
            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de pagamentos carregadas',
                'data' => [
                    'user' => $this->getUserData()['user'],
                    'estatisticas' => $estatisticas,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar estatísticas de pagamentos', $e);
        }
    }

    public function alertasPendentes(): \Illuminate\Http\JsonResponse
    {
        try {
            $alertas = $this->dashboardService->getAlertasPendentes();
            
            // Correção semântica: proformas_pendentes -> proformas_em_aberto
            if (isset($alertas['proformas_pendentes'])) {
                $alertas['proformas_em_aberto'] = $alertas['proformas_pendentes'];
                unset($alertas['proformas_pendentes']);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Alertas carregados',
                'data' => [
                    'user' => $this->getUserData()['user'],
                    'alertas' => $alertas,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar alertas', $e);
        }
    }

    public function evolucaoMensal(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $dados = $request->validate([
                'ano' => 'nullable|integer|min:2000|max:' . (now()->year + 1),
            ]);
            
            $ano = $dados['ano'] ?? now()->year;
            $evolucao = $this->dashboardService->getEvolucaoMensal($ano);
            
            return response()->json([
                'success' => true,
                'message' => 'Evolução mensal carregada',
                'data' => [
                    'user' => $this->getUserData()['user'],
                    'ano' => $ano,
                    'evolucao' => $evolucao,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar evolução mensal', $e);
        }
    }

    public function estatisticasServicos(): \Illuminate\Http\JsonResponse
    {
        try {
            $estatisticas = $this->dashboardService->getEstatisticasServicos();
            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de serviços carregadas',
                'data' => [
                    'user' => $this->getUserData()['user'],
                    'estatisticas' => $estatisticas,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar estatísticas de serviços', $e);
        }
    }

    public function rankingServicos(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $dados = $request->validate([
                'periodo' => 'nullable|in:mes,trimestre,ano,todo',
                'limite'  => 'nullable|integer|min:1|max:50',
            ]);
            
            $periodo = $dados['periodo'] ?? 'mes';
            $limite  = $dados['limite']  ?? 10;
            
            $ranking = $this->dashboardService->getRankingServicos($periodo, $limite);
            
            return response()->json([
                'success' => true,
                'message' => 'Ranking de serviços carregado',
                'data' => [
                    'user' => $this->getUserData()['user'],
                    'periodo' => $periodo,
                    'ranking' => $ranking,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar ranking de serviços', $e);
        }
    }

    /**
     * Obtém os dados do utilizador formatados
     */
   private function getUserData(): array
{
    $empresa = $this->dashboardService->getEmpresa();
    $user = $this->dashboardService->getUser();
    
    return [
        'user' => [
            'id' => $user?->id ?? null,
            'name' => $user?->name ?? $user?->nome ?? null,
            'email' => $user?->email ?? null,
            'role' => $user?->role ?? $user?->role_global ?? 'operador',
            'ativo' => (bool) ($user?->ativo ?? true),
            'ultimo_login' => $user?->ultimo_login ? \Carbon\Carbon::parse($user->ultimo_login)->toIso8601String() : null,
        ],
        'empresa' => $empresa ? [
            'id' => $empresa->id,
            'nome' => $empresa->nome,
            'nif' => $empresa->nif,
            'subdomain' => $empresa->subdomain,
            'modo' => $empresa->modo,
            'logo' => $empresa->logo,
        ] : null,
        'modo' => $empresa?->modo ?? 'colectivo',
    ];
}
    /**
     * Resposta de erro padronizada
     */
    private function erroInterno(string $mensagem, \Exception $e): \Illuminate\Http\JsonResponse
    {
        Log::error($mensagem . ':', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'message' => $mensagem,
            'error' => $e->getMessage(),
        ], 500);
    }
}