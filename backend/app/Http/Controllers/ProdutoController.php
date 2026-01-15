<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Produto;
use App\Models\Categoria;

class ProdutoController extends Controller
{
    public function __construct()
    {
        // Garante que todas as queries usam a conexão tenant
        // O ResolveTenant Middleware deve ter configurado o tenant
    }

    // LISTAR PRODUTOS
    public function index()
    {
        $produtos = Produto::all();
        return response()->json($produtos);
    }

    // CRIAR PRODUTO
    public function store(Request $request)
    {
        $dados = $request->validate([
            'categoria_id' => 'required|uuid',
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_compra' => 'required|numeric|min:0',
            'preco_venda' => 'required|numeric|min:0',
            'estoque_atual' => 'required|integer|min:0',
            'estoque_minimo' => 'required|integer|min:0',
        ]);

        // VALIDAÇÃO MANUAL DA CATEGORIA NO TENANT
        if (!Categoria::find($dados['categoria_id'])) {
            return response()->json(['message' => 'Categoria não encontrada'], 422);
        }

        $produto = Produto::create($dados);
        return response()->json($produto, 201);
    }

    // MOSTRAR PRODUTO
    public function show($id)
    {
        $produto = Produto::findOrFail($id);
        return response()->json($produto);
    }

    // ATUALIZAR PRODUTO
    public function update(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);

        $dados = $request->validate([
            'categoria_id' => 'sometimes|required|uuid',
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_compra' => 'sometimes|required|numeric|min:0',
            'preco_venda' => 'sometimes|required|numeric|min:0',
            'estoque_atual' => 'sometimes|required|integer|min:0',
            'estoque_minimo' => 'sometimes|required|integer|min:0',
        ]);

        // VALIDAÇÃO MANUAL DA CATEGORIA CASO SEJA ALTERADA
        if (isset($dados['categoria_id']) && !Categoria::find($dados['categoria_id'])) {
            return response()->json(['message' => 'Categoria não encontrada'], 422);
        }

        $produto->update($dados);
        return response()->json($produto);
    }

    // DELETAR PRODUTO
    public function destroy($id)
    {
        $produto = Produto::findOrFail($id);
        $produto->delete();
        return response()->json(null, 204);
    }
}
