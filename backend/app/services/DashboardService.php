<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\Venda;
use App\Models\Fatura;
use App\Models\Pagamento;
use App\Models\Cliente;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DashboardService
{
    public function getDashboard(): array
    {
        // Sem cache (modo teste)
        return $this->calcularDashboard();
    }

    private function calcularDashboard(): array
    {
        $hoje = Carbon::now();
        $mesAtual = $hoje->month;
        $anoAtual = $hoje->year;
        $mesAnterior = $hoje->copy()->subMonth()->month;
        $anoAnterior = $hoje->copy()->subMonth()->year;

        /* ================= KPI ================= */
        $totalFaturado = Fatura::where('estado', 'emitido')->sum('total_liquido');
        $totalVendas   = Venda::count();

        $ticketMedio = $totalVendas > 0
            ? round($totalFaturado / $totalVendas, 2)
            : 0;

        $receitaMesAtual = Fatura::where('estado', 'emitido')
            ->whereMonth('data_emissao', $mesAtual)
            ->whereYear('data_emissao', $anoAtual)
            ->sum('total_liquido');

        $receitaMesAnterior = Fatura::where('estado', 'emitido')
            ->whereMonth('data_emissao', $mesAnterior)
            ->whereYear('data_emissao', $anoAnterior)
            ->sum('total_liquido');

        $crescimentoPercentual = $receitaMesAnterior > 0
            ? round((($receitaMesAtual - $receitaMesAnterior) / $receitaMesAnterior) * 100, 2)
            : 0;

        $ivaArrecadado = Fatura::where('estado', 'emitido')->sum('total_iva');

        /* ================= CLIENTES ================= */
        $clientesAtivos = Cliente::count();

        Log::info('Dashboard - Clientes ativos', ['clientesAtivos' => $clientesAtivos]);

        /* ================= ÚLTIMOS REGISTROS ================= */
        $ultimasVendas = Venda::latest()
            ->limit(5)
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'cliente' => $v->cliente_nome ?? 'Consumidor Final',
                'total' => $v->total,
                'status' => $v->status,
                'data' => $v->created_at->format('Y-m-d'),
            ])
            ->toArray();

        $ultimasFaturas = Fatura::latest()
            ->limit(5)
            ->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'venda_id' => $f->venda_id,
                'total' => $f->total_liquido,
                'estado' => $f->estado,
                'data' => $f->created_at->format('Y-m-d'),
            ])
            ->toArray();

        /* ================= GRÁFICOS ================= */
        $vendasPorMes = Fatura::select(
                DB::raw("DATE_FORMAT(data_emissao, '%Y-%m') as mes"),
                DB::raw('SUM(total_liquido) as total')
            )
            ->where('estado', 'emitido')
            ->where('data_emissao', '>=', now()->subYear())
            ->groupBy('mes')
            ->orderBy('mes')
            ->get()
            ->map(fn ($v) => [
                'mes' => Carbon::createFromFormat('Y-m', $v->mes)->format('m/Y'),
                'total' => $v->total,
            ])
            ->toArray();

        $vendasPorDia = Fatura::select(
                DB::raw('DATE(data_emissao) as dia'),
                DB::raw('SUM(total_liquido) as total')
            )
            ->where('estado', 'emitido')
            ->where('data_emissao', '>=', now()->subDays(30))
            ->groupBy('dia')
            ->orderBy('dia')
            ->get()
            ->map(fn ($v) => [
                'dia' => Carbon::parse($v->dia)->format('d/m'),
                'total' => $v->total,
            ])
            ->toArray();

        $produtosMaisVendidos = DB::table('itens_venda')
            ->join('produtos', 'produtos.id', '=', 'itens_venda.produto_id')
            ->select(
                'produtos.nome as produto',
                DB::raw('SUM(itens_venda.quantidade) as quantidade')
            )
            ->groupBy('produtos.nome')
            ->orderByDesc('quantidade')
            ->limit(5)
            ->get()
            ->toArray();

        /* ================= PAGAMENTOS ================= */
        $pagamentos = Pagamento::select(
                'metodo',
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('metodo')
            ->get()
            ->toArray();

        /* ================= RETORNO FINAL ================= */
        return [
            'kpis' => [
                'ticketMedio' => $ticketMedio,
                'crescimentoPercentual' => $crescimentoPercentual,
                'ivaArrecadado' => $ivaArrecadado,
            ],

            'produtos' => [
                'total' => Produto::count(),
                'ativos' => Produto::where('status', 'ativo')->count(),
                'inativos' => Produto::where('status', 'inativo')->count(),
                'stock_baixo' => Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')->count(),
            ],

            'vendas' => [
                'total' => Venda::count(),
                'abertas' => Venda::where('status', 'aberta')->count(),
                'faturadas' => Venda::where('status', 'faturada')->count(),
                'canceladas' => Venda::where('status', 'cancelada')->count(),
                'ultimas' => $ultimasVendas,
                'vendasPorMes' => $vendasPorMes,
                'vendasPorDia' => $vendasPorDia,
            ],

            'faturas' => [
                'total' => Fatura::count(),
                'pendentes' => Fatura::where('estado', 'pendente')->count(),
                'pagas' => Fatura::where('estado', 'pago')->count(),
                'ultimas' => $ultimasFaturas,
                'receitaMesAtual' => $receitaMesAtual,
                'receitaMesAnterior' => $receitaMesAnterior,
            ],

            'pagamentos' => $pagamentos,

            'clientesAtivos' => $clientesAtivos,

            'indicadores' => [
                'produtosMaisVendidos' => $produtosMaisVendidos,
            ],
        ];
    }
}
