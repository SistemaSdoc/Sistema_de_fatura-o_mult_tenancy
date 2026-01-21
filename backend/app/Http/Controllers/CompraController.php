<?php

namespace App\Http\Controllers;

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

        // Aplica a policy de Compra em todas as ações do CRUD
        $this->authorizeResource(Compra::class, 'compra');
    }

    // LISTAR TODAS AS COMPRAS
    public function index()
    {
        $compras = Compra::all();
        return response()->json($compras);
    }

    // CRIAR NOVA COMPRA
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

    // MOSTRAR COMPRA
    public function show(Compra $compra)
    {
        return response()->json($compra);
    }

    // EXCLUIR COMPRA
    public function destroy(Compra $compra)
    {
        $compra->delete();
        return response()->json(null, 204);
    }
}
