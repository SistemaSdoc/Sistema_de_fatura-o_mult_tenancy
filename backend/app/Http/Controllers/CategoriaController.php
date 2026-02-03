<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CategoriaController extends Controller
{
    public function __construct()
    {
        // Aplica policy automaticamente
        $this->authorizeResource(Categoria::class, 'categoria');
    }

    /**
     * Listar todas as categorias
     */
    public function index()
    {
        $this->authorize('viewAny', Categoria::class);

        $categorias = Categoria::all();

        return response()->json([
            'message' => 'Lista de categorias carregada com sucesso',
            'categorias' => $categorias
        ]);
    }

    /**
     * Criar nova categoria
     */
    public function store(Request $request)
    {
        $this->authorize('create', Categoria::class);

        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'status' => 'nullable|in:ativo,inativo',
            'tipo' => 'nullable|in:produto,servico',
        ]);

        // Valores padrão
        $dados['status'] = $dados['status'] ?? 'ativo';
        $dados['tipo'] = $dados['tipo'] ?? 'produto';
        $dados['user_id'] = Auth::id();

        $categoria = Categoria::create($dados);

        return response()->json([
            'message' => 'Categoria criada com sucesso',
            'categoria' => $categoria
        ]);
    }

    /**
     * Mostrar categoria específica
     */
    public function show(Categoria $categoria)
    {
        $this->authorize('view', $categoria);

        return response()->json([
            'message' => 'Categoria carregada com sucesso',
            'categoria' => $categoria
        ]);
    }

    /**
     * Atualizar categoria
     */
    public function update(Request $request, Categoria $categoria)
    {
        $this->authorize('update', $categoria);

        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
            'status' => 'nullable|in:ativo,inativo',
            'tipo' => 'nullable|in:produto,servico',
        ]);

        $categoria->update($dados);

        return response()->json([
            'message' => 'Categoria atualizada com sucesso',
            'categoria' => $categoria
        ]);
    }

    /**
     * Deletar categoria
     */
    public function destroy(Categoria $categoria)
    {
        $this->authorize('delete', $categoria);

        $categoria->delete();

        return response()->json([
            'message' => 'Categoria deletada com sucesso'
        ]);
    }
}
