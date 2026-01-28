<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Produto;
use App\Models\Categoria;
use App\Models\Fornecedor;

class ProdutoController extends Controller
{
    // Aplica a policy de Produto para todas as ações do CRUD
    public function __construct()
    {
        $this->authorizeResource(Produto::class, 'produto');
    }

    // LISTAR PRODUTOS COM PAGINAÇÃO
    public function index(Request $request)
    {
        $perPage = $request->query('per_page', 10); // permite customizar itens por página

        // Carrega categoria e fornecedor junto
        $produtos = Produto::with(['categoria', 'fornecedor'])
            ->paginate($perPage);

        return response()->json($produtos);
    }

    // CRIAR PRODUTO
    public function store(Request $request)
    {
        $dados = $request->validate([
            'categoria_id' => 'required|uuid',
            'fornecedor_id' => 'required|uuid',
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_compra' => 'required|numeric|min:0',
            'preco_venda' => 'required|numeric|min:0',
            'estoque_atual' => 'required|integer|min:0',
            'estoque_minimo' => 'required|integer|min:0',
        ]);

        // Validação manual da categoria
        if (!Categoria::find($dados['categoria_id'])) {
            return response()->json(['message' => 'Categoria não encontrada'], 422);
        }

        // Validação manual do fornecedor
        if (!Fornecedor::find($dados['fornecedor_id'])) {
            return response()->json(['message' => 'Fornecedor não encontrado'], 422);
        }

        $produto = Produto::create($dados);

        // Retorna produto completo com relacionamento
        $produto->load(['categoria', 'fornecedor']);

        return response()->json($produto, 201);
    }

    // MOSTRAR PRODUTO
    public function show(Produto $produto)
    {
        $produto->load(['categoria', 'fornecedor']);
        return response()->json($produto);
    }

    // ATUALIZAR PRODUTO
    public function update(Request $request, Produto $produto)
    {
        $dados = $request->validate([
            'categoria_id' => 'sometimes|required|uuid',
            'fornecedor_id' => 'sometimes|required|uuid',
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_compra' => 'sometimes|required|numeric|min:0',
            'preco_venda' => 'sometimes|required|numeric|min:0',
            'estoque_atual' => 'sometimes|required|integer|min:0',
            'estoque_minimo' => 'sometimes|required|integer|min:0',
        ]);

        // Validação manual da categoria caso seja alterada
        if (isset($dados['categoria_id']) && !Categoria::find($dados['categoria_id'])) {
            return response()->json(['message' => 'Categoria não encontrada'], 422);
        }

        // Validação manual do fornecedor caso seja alterado
        if (isset($dados['fornecedor_id']) && !Fornecedor::find($dados['fornecedor_id'])) {
            return response()->json(['message' => 'Fornecedor não encontrado'], 422);
        }

        $produto->update($dados);

        // Retorna produto completo com relacionamento
        $produto->load(['categoria', 'fornecedor']);

        return response()->json($produto);
    }

    // DELETAR PRODUTO
    public function destroy(Produto $produto)
    {
        $produto->delete();
        return response()->json(null, 204);
    }
}
