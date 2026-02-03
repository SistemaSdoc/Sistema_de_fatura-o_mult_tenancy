<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RelatoriosService;

class RelatoriosController extends Controller
{
    protected $relatoriosService;

    public function __construct(RelatoriosService $relatoriosService)
    {
        $this->relatoriosService = $relatoriosService;
    }

    /**
     * Relatório de vendas
     */
    public function vendas(Request $request)
    {
        $dados = $request->validate([
            'data_inicio' => 'nullable|date',
            'data_fim' => 'nullable|date|after_or_equal:data_inicio'
        ]);

        $relatorio = $this->relatoriosService->relatorioVendas(
            $dados['data_inicio'] ?? null,
            $dados['data_fim'] ?? null
        );

        return response()->json([
            'message' => 'Relatório de vendas carregado com sucesso',
            'relatorio' => $relatorio
        ]);
    }

    /**
     * Relatório de compras
     */
    public function compras(Request $request)
    {
        $dados = $request->validate([
            'data_inicio' => 'nullable|date',
            'data_fim' => 'nullable|date|after_or_equal:data_inicio'
        ]);

        $relatorio = $this->relatoriosService->relatorioCompras(
            $dados['data_inicio'] ?? null,
            $dados['data_fim'] ?? null
        );

        return response()->json([
            'message' => 'Relatório de compras carregado com sucesso',
            'relatorio' => $relatorio
        ]);
    }

    /**
     * Relatório de faturação
     */
    public function faturacao(Request $request)
    {
        $dados = $request->validate([
            'data_inicio' => 'nullable|date',
            'data_fim' => 'nullable|date|after_or_equal:data_inicio'
        ]);

        $relatorio = $this->relatoriosService->relatorioFaturacao(
            $dados['data_inicio'] ?? null,
            $dados['data_fim'] ?? null
        );

        return response()->json([
            'message' => 'Relatório de faturação carregado com sucesso',
            'relatorio' => $relatorio
        ]);
    }

    /**
     * Relatório de stock
     */
    public function stock()
    {
        $relatorio = $this->relatoriosService->relatorioStock();

        return response()->json([
            'message' => 'Relatório de stock carregado com sucesso',
            'relatorio' => $relatorio
        ]);
    }

    /**
     * Dashboard geral
     */
    public function dashboard()
    {
        $dashboard = $this->relatoriosService->dashboard();

        return response()->json([
            'message' => 'Dashboard carregado com sucesso',
            'dashboard' => $dashboard
        ]);
    }
}
