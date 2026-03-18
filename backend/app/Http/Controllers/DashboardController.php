<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Services\DashboardService;
use App\Models\Produto;
use App\Models\DocumentoFiscal;
use Carbon\Carbon;

/**
 * DashboardController
 *
 * Orquestra pedidos HTTP → DashboardService → resposta JSON.
 * Filtros de data removidos (simplificação pedida).
 */
class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    // ── Dashboard principal ───────────────────────────────────────────────

    public function index()
    {
        try {
            $dashboardData = $this->dashboardService->getDashboard();

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data'    => array_merge(
                    ['user'     => $this->dadosUser()],
                    ['servicos' => $this->estatisticasServicosData()],
                    $dashboardData
                ),
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar dashboard', $e);
        }
    }

    // ── Resumo de documentos fiscais ──────────────────────────────────────

    public function resumoDocumentosFiscais()
    {
        try {
            $resumo = $this->dashboardService->getResumoDocumentosFiscais();

            $totalRetencao         = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)->sum('total_retencao');
            $documentosComRetencao = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)->where('total_retencao', '>', 0)->count();

            $resumo['retencoes'] = [
                'total'                   => round($totalRetencao, 2),
                'total_formatado'         => $this->formatarKz($totalRetencao),
                'documentos_com_retencao' => $documentosComRetencao,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Resumo de documentos fiscais carregado',
                'data'    => ['user' => $this->dadosUser(), 'resumo' => $resumo],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar resumo de documentos', $e);
        }
    }

    // ── Estatísticas de pagamentos ────────────────────────────────────────

    public function estatisticasPagamentos()
    {
        try {
            $estatisticas = $this->dashboardService->getEstatisticasPagamentos();

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de pagamentos carregadas',
                'data'    => ['user' => $this->dadosUser(), 'estatisticas' => $estatisticas],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar estatísticas de pagamentos', $e);
        }
    }

    // ── Alertas ───────────────────────────────────────────────────────────

    public function alertasPendentes()
    {
        try {
            $alertas = $this->dashboardService->getAlertasPendentes();

            return response()->json([
                'success' => true,
                'message' => 'Alertas carregados',
                'data'    => ['user' => $this->dadosUser(), 'alertas' => $alertas],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar alertas', $e);
        }
    }

    // ── Evolução mensal ───────────────────────────────────────────────────

    public function evolucaoMensal(Request $request)
    {
        try {
            $dados = $request->validate([
                'ano' => 'nullable|integer|min:2000|max:' . (now()->year + 1),
            ]);

            $ano      = $dados['ano'] ?? now()->year;
            $evolucao = $this->dashboardService->getEvolucaoMensal($ano);

            return response()->json([
                'success' => true,
                'message' => 'Evolução mensal carregada',
                'data'    => ['user' => $this->dadosUser(), 'ano' => $ano, 'evolucao' => $evolucao],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar evolução mensal', $e);
        }
    }

    // ── Estatísticas de serviços ──────────────────────────────────────────

    public function estatisticasServicos()
    {
        try {
            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de serviços carregadas',
                'data'    => ['user' => $this->dadosUser(), 'estatisticas' => $this->estatisticasServicosData()],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar estatísticas de serviços', $e);
        }
    }

    // ── Ranking de serviços ───────────────────────────────────────────────

    public function rankingServicos(Request $request)
    {
        try {
            $dados = $request->validate([
                'periodo' => 'nullable|in:mes,trimestre,ano,todo',
                'limite'  => 'nullable|integer|min:1|max:50',
            ]);

            $periodo = $dados['periodo'] ?? 'mes';
            $limite  = $dados['limite']  ?? 10;

            $query = DB::table('itens_venda')
                ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
                ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
                ->where('produtos.tipo', 'servico')
                ->where('vendas.status', '!=', 'cancelada');

            match ($periodo) {
                'mes'       => $query->whereMonth('vendas.data_venda', now()->month)->whereYear('vendas.data_venda', now()->year),
                'trimestre' => $query->where('vendas.data_venda', '>=', now()->subMonths(3)),
                'ano'       => $query->whereYear('vendas.data_venda', now()->year),
                default     => null,
            };

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
            ->map(fn ($item, $index) => [
                'posicao'             => $index + 1,
                'id'                  => $item->id,
                'nome'                => $item->nome,
                'quantidade'          => (int) $item->total_quantidade,
                'vendas'              => (int) $item->total_vendas,
                'receita'             => round($item->total_receita, 2),
                'receita_formatada'   => $this->formatarKz($item->total_receita),
                'retencao'            => round($item->total_retencao, 2),
                'retencao_formatada'  => $this->formatarKz($item->total_retencao),
                'percentual_retencao' => $item->total_receita > 0
                    ? round(($item->total_retencao / $item->total_receita) * 100, 2)
                    : 0,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Ranking de serviços carregado',
                'data'    => ['user' => $this->dadosUser(), 'periodo' => $periodo, 'ranking' => $ranking],
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar ranking de serviços', $e);
        }
    }

    // ── Helpers privados ──────────────────────────────────────────────────

    private function estatisticasServicosData(): array
    {
        $totalServicos  = Produto::where('tipo', 'servico')->count();
        $servicosAtivos = Produto::where('tipo', 'servico')->where('status', 'ativo')->count();
        $precoMedio     = Produto::where('tipo', 'servico')->where('status', 'ativo')->avg('preco_venda') ?? 0;

        $retencoesMes = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->whereMonth('data_emissao', now()->month)
            ->whereYear('data_emissao', now()->year)
            ->sum('total_retencao') ?? 0;

        $retencoesAnt = DocumentoFiscal::where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->whereMonth('data_emissao', now()->subMonth()->month)
            ->whereYear('data_emissao', now()->subMonth()->year)
            ->sum('total_retencao') ?? 0;

        $variacao = $retencoesAnt > 0
            ? round((($retencoesMes - $retencoesAnt) / $retencoesAnt) * 100, 2)
            : 0;

        $topServicos = DB::table('itens_venda')
            ->join('produtos', 'itens_venda.produto_id', '=', 'produtos.id')
            ->join('vendas', 'itens_venda.venda_id', '=', 'vendas.id')
            ->where('produtos.tipo', 'servico')
            ->where('vendas.status', '!=', 'cancelada')
            ->whereMonth('vendas.data_venda', now()->month)
            ->whereYear('vendas.data_venda', now()->year)
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
            ->get()
            ->map(fn ($item) => [
                'id'                 => $item->id,
                'nome'               => $item->nome,
                'quantidade'         => (int) $item->total_quantidade,
                'receita'            => round($item->total_receita, 2),
                'receita_formatada'  => $this->formatarKz($item->total_receita),
                'retencao'           => round($item->total_retencao, 2),
                'retencao_formatada' => $this->formatarKz($item->total_retencao),
            ]);

        return [
            'servicos'    => [
                'total'                 => $totalServicos,
                'ativos'                => $servicosAtivos,
                'inativos'              => $totalServicos - $servicosAtivos,
                'preco_medio'           => round($precoMedio, 2),
                'preco_medio_formatado' => $this->formatarKz($precoMedio),
            ],
            'retencoes'   => [
                'periodo'                    => round($retencoesMes, 2),
                'periodo_formatado'          => $this->formatarKz($retencoesMes),
                'periodo_anterior'           => round($retencoesAnt, 2),
                'periodo_anterior_formatado' => $this->formatarKz($retencoesAnt),
                'variacao'                   => $variacao,
                'variacao_sinal'             => $variacao >= 0 ? '+' : '',
            ],
            'top_servicos' => $topServicos,
        ];
    }

    private function dadosUser(): array
    {
        $user = Auth::user();
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role];
    }

    private function formatarKz(float|int|null $valor): string
    {
        return number_format((float) $valor, 2, ',', '.') . ' Kz';
    }

    private function erroInterno(string $mensagem, \Exception $e): \Illuminate\Http\JsonResponse
    {
        Log::error($mensagem . ':', ['error' => $e->getMessage()]);
        return response()->json(['success' => false, 'message' => $mensagem, 'error' => $e->getMessage()], 500);
    }
}