<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MovimentoStock;
use App\Models\Produto;

class MovimentoStockController extends Controller
{
    // LISTAR MOVIMENTOS DE STOCK
    public function index()
    {
        return response()->json(MovimentoStock::all());
    }

    // CRIAR NOVO MOVIMENTO
    public function store(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|uuid',
            'tipo' => 'required|in:entrada,saida',
            'quantidade' => 'required|integer|min:1',
            'origem' => 'nullable|string',
            'referencia' => 'nullable|string',
            'data' => 'nullable|date',
        ]);

        // Validação manual do produto
        if (!Produto::find($dados['produto_id'])) {
            return response()->json(['message' => 'Produto não encontrado'], 422);
        }

        $movimento = MovimentoStock::create($dados);
        return response()->json($movimento, 201);
    }

    // MOSTRAR MOVIMENTO
    public function show($id)
    {
        $movimento = MovimentoStock::findOrFail($id);
        return response()->json($movimento);
    }

    // ATUALIZAR MOVIMENTO
    public function update(Request $request, $id)
    {
        $movimento = MovimentoStock::findOrFail($id);

        $dados = $request->validate([
            'produto_id' => 'sometimes|required|uuid',
            'tipo' => 'sometimes|required|in:entrada,saida',
            'quantidade' => 'sometimes|required|integer|min:1',
            'origem' => 'nullable|string',
            'referencia' => 'nullable|string',
            'data' => 'nullable|date',
        ]);

        if (isset($dados['produto_id']) && !Produto::find($dados['produto_id'])) {
            return response()->json(['message' => 'Produto não encontrado'], 422);
        }

        $movimento->update($dados);
        return response()->json($movimento);
    }

    // DELETAR MOVIMENTO
    public function destroy($id)
    {
        $movimento = MovimentoStock::findOrFail($id);
        $movimento->delete();
        return response()->json(null, 204);
    }
}
