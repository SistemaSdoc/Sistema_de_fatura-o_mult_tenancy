<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Produto;
use App\Services\ProdutoService;

class ProdutoController extends Controller
{
    protected $produtoService;

    public function __construct(ProdutoService $produtoService)
    {
        $this->produtoService = $produtoService;
        $this->authorizeResource(Produto::class, 'produto');
    }

    /**
     * Listar produtos (ativos por padrão)
     */
    public function index()
    {
        $this->authorize('viewAny', Produto::class);

        $produtos = $this->produtoService->listarProdutos(true);

        return response()->json([
            'message' => 'Lista de produtos carregada com sucesso',
            'produtos' => $produtos
        ]);
    }

    /**
     * Mostrar produto específico
     */
    public function show(Produto $produto)
    {
        $this->authorize('view', $produto);

        $produto = $this->produtoService->buscarProduto($produto->id);

        return response()->json([
            'message' => 'Produto carregado com sucesso',
            'produto' => $produto
        ]);
    }

    /**
     * Criar novo produto
     */
    public function store(Request $request)
    {
        $this->authorize('create', Produto::class);

        $dados = $request->validate([
            'categoria_id' => 'required|uuid|exists:categorias,id',
            'codigo' => 'nullable|string|max:50',
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_compra' => 'required|numeric|min:0',
            'preco_venda' => 'required|numeric|min:0',
            'taxa_iva' => 'nullable|numeric|min:0|max:100',
            'sujeito_iva' => 'nullable|boolean',
            'estoque_atual' => 'nullable|integer|min:0',
            'estoque_minimo' => 'nullable|integer|min:0',
            'status' => 'nullable|in:ativo,inativo',
            'tipo' => 'nullable|in:produto,servico',
        ]);

        $produto = $this->produtoService->criarProduto($dados);

        return response()->json([
            'message' => 'Produto criado com sucesso',
            'produto' => $produto
        ]);
    }

    /**
     * Atualizar produto
     */
    public function update(Request $request, Produto $produto)
    {
        $this->authorize('update', $produto);

        $dados = $request->validate([
            'categoria_id' => 'sometimes|required|uuid|exists:categorias,id',
            'codigo' => 'nullable|string|max:50',
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
            'preco_compra' => 'sometimes|required|numeric|min:0',
            'preco_venda' => 'sometimes|required|numeric|min:0',
            'taxa_iva' => 'nullable|numeric|min:0|max:100',
            'sujeito_iva' => 'nullable|boolean',
            'estoque_atual' => 'nullable|integer|min:0',
            'estoque_minimo' => 'nullable|integer|min:0',
            'status' => 'nullable|in:ativo,inativo',
            'tipo' => 'nullable|in:produto,servico',
        ]);

        $produto = $this->produtoService->editarProduto($produto->id, $dados);

        return response()->json([
            'message' => 'Produto atualizado com sucesso',
            'produto' => $produto
        ]);
    }

    /**
     * Alterar status (ativo/inativo)
     */
    public function alterarStatus(Produto $produto, Request $request)
    {
        $this->authorize('update', $produto);

        $status = $request->validate([
            'status' => 'required|in:ativo,inativo'
        ])['status'];

        $produto = $this->produtoService->alterarStatus($produto->id, $status);

        return response()->json([
            'message' => 'Status do produto atualizado',
            'produto' => $produto
        ]);
    }

    /**
     * Deletar produto
     */
    public function destroy(Produto $produto)
    {
        $this->authorize('delete', $produto);

        $produto->delete();

        return response()->json([
            'message' => 'Produto deletado com sucesso'
        ]);
    }
}
