<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\Pagamento;
use App\Models\Plano;
use App\Models\Subscricao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:landlord_api');
    }

    /**
     * Resumo completo para o dashboard de analytics
     */
    public function resumo(Request $request)
    {
        // ============================================================
        // 1. MÉTRICAS GERAIS
        // ============================================================
        $totalEmpresas = Empresa::on('landlord')->count();
        $empresasAtivas = Empresa::on('landlord')->where('status', 'ativo')->count();
        $empresasSuspensas = Empresa::on('landlord')->where('status', 'suspenso')->count();

        // ============================================================
        // 2. MÉTRICAS FINANCEIRAS (usando Pagamento diretamente)
        // ============================================================
        // MRR: soma dos planos com pagamentos confirmados no mês atual
        $mrr = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->whereHas('empresa', fn ($q) => $q->where('status', 'ativo'))
            ->join('planos', 'pagamentos.plano_id', '=', 'planos.id')
            ->whereMonth('pagamentos.created_at', now()->month)
            ->whereYear('pagamentos.created_at', now()->year)
            ->sum('planos.valor_mensal') ?? 0;

        // Receita total (YTD – desde início do ano)
        $receitaTotal = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->whereYear('created_at', now()->year)
            ->sum('valor') ?? 0;

        // Ticket médio (valor médio por pagamento)
        $ticketMedio = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->avg('valor') ?? 0;

        // MRR por plano
        $mrrPorPlano = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->whereHas('empresa', fn ($q) => $q->where('status', 'ativo'))
            ->join('planos', 'pagamentos.plano_id', '=', 'planos.id')
            ->whereMonth('pagamentos.created_at', now()->month)
            ->whereYear('pagamentos.created_at', now()->year)
            ->select('planos.nome', DB::raw('SUM(planos.valor_mensal) as total'))
            ->groupBy('planos.id', 'planos.nome')
            ->get();

        // LTV (Lifetime Value) – receita média por empresa
        $receitaTotalGeral = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->sum('valor') ?? 0;

        $totalEmpresasPagadoras = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->distinct('empresa_id')
            ->count('empresa_id');

        $ltv = $totalEmpresasPagadoras > 0
            ? $receitaTotalGeral / $totalEmpresasPagadoras
            : 0;

        // Net New MRR
        $mrrMesAnterior = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->join('planos', 'pagamentos.plano_id', '=', 'planos.id')
            ->whereMonth('pagamentos.created_at', now()->subMonth()->month)
            ->whereYear('pagamentos.created_at', now()->subMonth()->year)
            ->sum('planos.valor_mensal') ?? 0;

        $netNewMrr = $mrr - $mrrMesAnterior;

        // ============================================================
        // 3. MÉTRICAS DE CRESCIMENTO
        // ============================================================
        // Novos registos (últimos 6 meses)
        $novosRegistos = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = Carbon::now()->subMonths($i);
            $count = Empresa::on('landlord')
                ->whereMonth('created_at', $mes->month)
                ->whereYear('created_at', $mes->year)
                ->count();

            $novosRegistos[] = [
                'mes' => $mes->translatedFormat('M/y'),
                'total' => $count,
            ];
        }

        // Crescimento percentual
        $empresasMesAtual = Empresa::on('landlord')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $empresasMesAnterior = Empresa::on('landlord')
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->count();

        $crescimentoPercentual = $empresasMesAnterior > 0
            ? round((($empresasMesAtual - $empresasMesAnterior) / $empresasMesAnterior) * 100, 1)
            : ($empresasMesAtual > 0 ? 100 : 0);

        // Churn Rate (assumindo status 'cancelada' nas subscrições)
        $subscricoesAtivasInicio = Subscricao::on('landlord')
            ->where('status', 'ativa')
            ->whereDate('data_inicio', '<=', now()->startOfMonth())
            ->count();

        $subscricoesCanceladasMes = Subscricao::on('landlord')
            ->where('status', 'cancelada')
            ->whereMonth('updated_at', now()->month)
            ->whereYear('updated_at', now()->year)
            ->count();

        $churnRate = $subscricoesAtivasInicio > 0
            ? round(($subscricoesCanceladasMes / $subscricoesAtivasInicio) * 100, 2)
            : 0;

        // ============================================================
        // 4. MÉTRICAS OPERACIONAIS
        // ============================================================
        $subscricoesAtivas = Subscricao::on('landlord')
            ->where('status', 'ativa')
            ->count();

        // Distribuição de planos
        $distribuicaoPlanos = Plano::on('landlord')
            ->select('planos.nome', DB::raw('COUNT(subscricoes.id) as total'))
            ->leftJoin('subscricoes', 'subscricoes.plano_id', '=', 'planos.id')
            ->where('subscricoes.status', 'ativa')
            ->groupBy('planos.id', 'planos.nome')
            ->get();

        $totalSubscricoes = $distribuicaoPlanos->sum('total');
        $distribuicaoPlanos = $distribuicaoPlanos->map(function ($item) use ($totalSubscricoes) {
            return [
                'nome' => $item->nome,
                'total' => $item->total,
                'percentagem' => $totalSubscricoes > 0
                    ? round(($item->total / $totalSubscricoes) * 100, 1)
                    : 0,
            ];
        });

        $totalComRenovacao = Subscricao::on('landlord')
            ->where('renovacao_automatica', true)
            ->where('status', 'ativa')
            ->count();

        $taxaRenovacao = $subscricoesAtivas > 0
            ? round(($totalComRenovacao / $subscricoesAtivas) * 100, 1)
            : 0;

        $pagamentosEmAnalise = Pagamento::on('landlord')
            ->where('status', 'em_analise')
            ->count();

        // ============================================================
        // 5. DISTRIBUIÇÃO POR REGIME FISCAL
        // ============================================================
        $porRegimeFiscal = Empresa::on('landlord')
            ->select('regime_fiscal', DB::raw('count(*) as total'))
            ->groupBy('regime_fiscal')
            ->get()
            ->map(fn ($item) => [
                'regime' => $item->regime_fiscal ?? 'Não definido',
                'total' => $item->total,
            ]);

        // ============================================================
        // 6. STATUS DOS PAGAMENTOS (últimos 30 dias)
        // ============================================================
        $pagamentosPorStatus = Pagamento::on('landlord')
            ->where('created_at', '>=', now()->subDays(30))
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get()
            ->pluck('total', 'status');

        // ============================================================
        // 7. TOP PLANOS
        // ============================================================
        $topPlanos = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->join('planos', 'pagamentos.plano_id', '=', 'planos.id')
            ->select('planos.nome', DB::raw('count(*) as total'))
            ->groupBy('planos.id', 'planos.nome')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        // ============================================================
        // 8. MÉTRICAS GEOGRÁFICAS (opcional)
        // ============================================================
        $empresasPorProvincia = [];
        try {
            $empresasPorProvincia = Empresa::on('landlord')
                ->select('provincia', DB::raw('count(*) as total'))
                ->whereNotNull('provincia')
                ->groupBy('provincia')
                ->orderByDesc('total')
                ->limit(5)
                ->get()
                ->toArray();
        } catch (\Exception $e) {
            // Coluna 'provincia' pode não existir
        }

        // ============================================================
        // 9. UTILIZAÇÃO (facturas emitidas no mês) – com Cache
        // ============================================================
        $totalFacturasMes = Cache::remember('analytics_facturas_mes', now()->addHour(), function () {
            $total = 0;
            try {
                $empresas = Empresa::on('landlord')->where('status', 'ativo')->get();
                foreach ($empresas as $empresa) {
                    config(['database.connections.tenant.database' => $empresa->db_name]);
                    DB::purge('tenant');
                    DB::reconnect('tenant');
                    $count = DB::connection('tenant')
                        ->table('facturas')
                        ->whereMonth('created_at', now()->month)
                        ->whereYear('created_at', now()->year)
                        ->count();
                    $total += $count;
                }
            } catch (\Exception $e) {
                // Falha silenciosa
            }
            return $total;
        });

        // ============================================================
        // 10. RESPOSTA
        // ============================================================
        return response()->json([
            'success' => true,
            'data' => [
                // Gerais
                'total_empresas' => $totalEmpresas,
                'empresas_ativas' => $empresasAtivas,
                'empresas_suspensas' => $empresasSuspensas,

                // Financeiras
                'mrr' => (float) $mrr,
                'receita_total' => (float) $receitaTotal,
                'ticket_medio' => (float) $ticketMedio,
                'mrr_por_plano' => $mrrPorPlano,
                'ltv' => (float) $ltv,
                'net_new_mrr' => (float) $netNewMrr,

                // Crescimento
                'novos_registos' => $novosRegistos,
                'crescimento_percentual' => $crescimentoPercentual,
                'churn_rate' => (float) $churnRate,

                // Operacionais
                'subscricoes_ativas' => $subscricoesAtivas,
                'distribuicao_planos' => $distribuicaoPlanos,
                'taxa_renovacao' => $taxaRenovacao,
                'pagamentos_em_analise' => $pagamentosEmAnalise,

                // Distribuição
                'por_regime_fiscal' => $porRegimeFiscal,

                // Pagamentos
                'pagamentos_por_status' => [
                    'em_analise' => $pagamentosPorStatus['em_analise'] ?? 0,
                    'aprovado'   => $pagamentosPorStatus['pago'] ?? 0,
                    'rejeitado'  => $pagamentosPorStatus['rejeitado'] ?? 0,
                ],

                // Top planos
                'top_planos' => $topPlanos,

                // Geográficas
                'empresas_por_provincia' => $empresasPorProvincia,

                // Utilização
                'total_facturas_mes' => $totalFacturasMes,
            ],
        ]);
    }

    /**
     * Versão resumida (para dashboards rápidos)
     */
    public function resumoSimples()
    {
        $totalEmpresas = Empresa::on('landlord')->count();
        $empresasAtivas = Empresa::on('landlord')->where('status', 'ativo')->count();

        $mrr = Pagamento::on('landlord')
            ->where('status', 'pago')
            ->join('planos', 'pagamentos.plano_id', '=', 'planos.id')
            ->whereMonth('pagamentos.created_at', now()->month)
            ->whereYear('pagamentos.created_at', now()->year)
            ->sum('planos.valor_mensal') ?? 0;

        $pagamentosPendentes = Pagamento::on('landlord')
            ->where('status', 'em_analise')
            ->count();

        $subscricoesAtivas = Subscricao::on('landlord')
            ->where('status', 'ativa')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'empresas' => $totalEmpresas,
                'ativas' => $empresasAtivas,
                'mrr' => (float) $mrr,
                'pagamentos_pendentes' => $pagamentosPendentes,
                'subscricoes_ativas' => $subscricoesAtivas,
            ],
        ]);
    }
}