<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->guard('sanctum')->user();

        /* ===================== CONTADORES ===================== */

        $faturasEmitidas = DB::table('faturas')->count();
        $clientesAtivos  = DB::table('clientes')->count();

        /* ===================== RECEITAS ===================== */

        $receitaMesAtual = DB::table('faturas')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total');

        $receitaMesAnterior = DB::table('faturas')
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->sum('total');

        // Mantém compatibilidade com campo antigo
        $receitaMensal = $receitaMesAtual;

        /* ===================== VENDAS POR MÊS ===================== */

        $vendasPorMes = DB::table('vendas')
            ->selectRaw('MONTH(created_at) as mes, SUM(total) as total')
            ->whereYear('created_at', now()->year)
            ->groupBy('mes')
            ->orderBy('mes')
            ->get()
            ->map(fn ($v) => [
                'mes'   => date('M', mktime(0, 0, 0, $v->mes, 1)),
                'total' => (float) $v->total,
            ]);

        /* ===================== PRODUTOS MAIS VENDIDOS ===================== */

        $produtosMaisVendidos = DB::table('itens_venda as iv')
            ->join('produtos as p', 'iv.produto_id', '=', 'p.id')
            ->select(
                'p.nome as produto',
                DB::raw('SUM(iv.quantidade) as quantidade')
            )
            ->groupBy('p.nome')
            ->orderByDesc('quantidade')
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'produto'    => $p->produto,
                'quantidade' => (int) $p->quantidade,
            ]);

        /* ===================== ÚLTIMAS FATURAS ===================== */

        $ultimasFaturas = DB::table('faturas as f')
            ->leftJoin('vendas as v', 'f.venda_id', '=', 'v.id')
            ->leftJoin('clientes as c', 'v.cliente_id', '=', 'c.id')
            ->select(
                'f.id',
                'f.created_at as data',
                'f.total',
                'f.status',
                'c.nome as cliente'
            )
            ->latest('f.created_at')
            ->limit(5)
            ->get()
            ->map(fn ($f) => [
                'id'      => $f->id,
                'cliente' => $f->cliente ?? 'Desconhecido',
                'data'    => $f->data,
                'total'   => (float) $f->total,
                'status'  => $f->status,
            ]);

        /* ===================== RESPONSE ===================== */

        return response()->json([
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],

            'faturasEmitidas'   => $faturasEmitidas,
            'clientesAtivos'    => $clientesAtivos,
            'receitaMensal'     => (float) $receitaMensal,

            'receitaMesAtual'   => (float) $receitaMesAtual,
            'receitaMesAnterior'=> (float) $receitaMesAnterior,

            'vendasPorMes'      => $vendasPorMes,
            'produtosMaisVendidos' => $produtosMaisVendidos,

            'ultimasFaturas'    => $ultimasFaturas,
        ]);
    }
}
