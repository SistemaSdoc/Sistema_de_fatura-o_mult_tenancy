<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        // Usuário autenticado
        $user = auth()->guard('sanctum')->user();

        // Total de faturas emitidas
        $faturasEmitidas = DB::table('faturas')->count();

        // Total de clientes ativos
        $clientesAtivos = DB::table('clientes')->count();

        // Receita do mês atual (usando created_at)
        $receitaMensal = DB::table('faturas')
            ->whereMonth('created_at', now()->month)
            ->sum('total');

        // Vendas por mês (usando created_at)
        $vendasPorMes = DB::table('vendas')
            ->selectRaw('MONTH(created_at) as mes, SUM(total) as total')
            ->groupBy('mes')
            ->orderBy('mes')
            ->get()
            ->map(fn($v) => [
                'mes' => date('M', mktime(0, 0, 0, $v->mes, 1)),
                'total' => (float) $v->total,
            ]);

        // Últimas 5 faturas com dados do cliente via venda
        $ultimasFaturas = DB::table('faturas as f')
            ->leftJoin('vendas as v', 'f.venda_id', '=', 'v.id')
            ->leftJoin('clientes as c', 'v.cliente_id', '=', 'c.id') // join via vendas
            ->select(
                'f.id',
                'f.created_at as data',
                'f.total',
                'f.status',
                'c.nome as cliente_nome'
            )
            ->latest('f.created_at')
            ->limit(5)
            ->get()
            ->map(fn($f) => [
                'id' => $f->id,
                'cliente' => ['nome' => $f->cliente_nome ?? 'Desconhecido'],
                'data' => $f->data,
                'total' => (float) $f->total,
                'status' => $f->status,
            ]);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'faturasEmitidas' => $faturasEmitidas,
            'clientesAtivos' => $clientesAtivos,
            'receitaMensal' => (float) $receitaMensal,
            'vendasPorMes' => $vendasPorMes,
            'ultimasFaturas' => $ultimasFaturas,
        ]);
    }
}
