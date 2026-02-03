<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\StockService;
use App\Models\MovimentoStock;

class MovimentoStockController extends Controller
{
    protected $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Listar todos os movimentos de stock
     */
    public function index()
    {
        $movimentos = MovimentoStock::with('produto', 'user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'message' => 'Movimentos de stock carregados com sucesso',
            'movimentos' => $movimentos
        ]);
    }

    /**
     * Entrada de compra
     */
    public function entradaCompra(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|uuid|exists:produtos,id',
            'quantidade' => 'required|integer|min:1',
            'preco' => 'required|numeric|min:0',
            'compra_id' => 'nullable|uuid|exists:compras,id',
            'observacao' => 'nullable|string',
        ]);

        try {
            $this->stockService->entradaCompra(
                $dados['produto_id'],
                $dados['quantidade'],
                (float) $dados['preco'],
                $dados['compra_id'] ?? null
            );

            return response()->json([
                'message' => 'Entrada de stock registrada com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Saída de venda
     */
    public function saidaVenda(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|uuid|exists:produtos,id',
            'quantidade' => 'required|integer|min:1',
            'venda_id' => 'nullable|uuid|exists:vendas,id',
            'observacao' => 'nullable|string',
        ]);

        try {
            $this->stockService->saidaVenda(
                $dados['produto_id'],
                $dados['quantidade'],
                $dados['venda_id'] ?? null
            );

            return response()->json([
                'message' => 'Saída de stock registrada com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Ajuste manual de stock
     */
    public function ajusteManual(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|uuid|exists:produtos,id',
            'quantidade' => 'required|integer|min:0',
            'tipo' => 'required|in:entrada,saida',
            'referencia' => 'nullable|string|max:255',
            'observacao' => 'nullable|string',
        ]);

        try {
            $this->stockService->ajusteManual(
                $dados['produto_id'],
                $dados['quantidade'],
                $dados['tipo'],
                $dados['referencia'] ?? null,
                $dados['observacao'] ?? null
            );

            return response()->json([
                'message' => 'Ajuste de stock registrado com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Relatório de stock
     */
    public function relatorio()
    {
        $relatorio = $this->stockService->relatorio(); // método correto do service

        return response()->json([
            'message' => 'Relatório de stock carregado com sucesso',
            'relatorio' => $relatorio
        ]);
    }

    /**
     * Dashboard de stock
     */
    public function dashboard()
    {
        $dashboard = $this->stockService->dashboard(); // método correto do service

        return response()->json([
            'message' => 'Dashboard de stock carregado com sucesso',
            'dashboard' => $dashboard
        ]);
    }

    /**
     * Produtos com stock abaixo do mínimo
     */
    public function produtosEmRisco()
    {
        $produtos = $this->stockService->produtosEmRisco(); // método correto do service

        return response()->json([
            'message' => 'Produtos com stock abaixo do mínimo',
            'produtos' => $produtos
        ]);
    }
}
