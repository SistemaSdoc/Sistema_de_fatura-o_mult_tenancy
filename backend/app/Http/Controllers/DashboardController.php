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
        $clientesAtivos = DB::table('clientes')->where('ativo', true)->count();

        // Receita do mês atual
        $receitaMensal = DB::table('faturas')
            ->whereMonth('data', now()->month)
            ->sum('valor');

        // Vendas por mês
        $vendasPorMes = DB::table('vendas')
            ->selectRaw('MONTH(data) as mes, SUM(total) as total')
            ->groupBy('mes')
            ->orderBy('mes')
            ->get()
            ->map(fn($v) => [
                'mes' => date('M', mktime(0, 0, 0, $v->mes, 1)),
                'total' => (float) $v->total,
            ]);

        // Últimas 5 faturas com dados do cliente
        $ultimasFaturas = DB::table('faturas as f')
            ->leftJoin('clientes as c', 'f.cliente_id', '=', 'c.id')
            ->select('f.id', 'f.data', 'f.valor as total', 'f.status', 'c.nome as cliente_nome')
            ->latest('f.data')
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
            'faturasEmitidas' => $faturasEmitidas,
            'clientesAtivos' => $clientesAtivos,
            'receitaMensal' => (float) $receitaMensal,
            'vendasPorMes' => $vendasPorMes,
            'ultimasFaturas' => $ultimasFaturas,
        ]);
    }
}
