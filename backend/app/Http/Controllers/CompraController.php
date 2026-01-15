<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CompraService;
use App\Models\Compra;

class CompraController extends Controller
{
    protected $compraService;

    public function __construct(CompraService $compraService)
    {
        $this->compraService = $compraService;
    }

    // Listar todas as compras
    public function index()
    {
        $compras = Compra::all();
        return response()->json($compras);
    }

    // Criar nova compra
    public function store(Request $request)
    {
        $dados = $request->validate([
            'fornecedor_id' => 'required|uuid',
            'itens' => 'required|array|min:1',
            'itens.*.produto_id' => 'required|uuid',
            'itens.*.quantidade' => 'required|integer|min:1',
        ]);

        $compra = $this->compraService->criarCompra($dados);

        return response()->json([
            'compra' => $compra,
        ], 201);
    }

    // Mostrar compra específica
    public function show($id)
    {
        $compra = Compra::find($id);

        if (!$compra) {
            return response()->json(['message' => 'Compra não encontrada'], 404);
        }

        return response()->json($compra);
    }

    // Excluir compra
    public function destroy($id)
    {
        $compra = Compra::find($id);

        if (!$compra) {
            return response()->json(['message' => 'Compra não encontrada'], 404);
        }

        $compra->delete();
        return response()->json(null, 204);
    }
}
