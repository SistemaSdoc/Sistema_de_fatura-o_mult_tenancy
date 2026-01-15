<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Categoria;

class CategoriaController extends Controller
{
    public function __construct()
    {
        // Aplica a policy de Categoria em todas as ações do CRUD
        $this->authorizeResource(Categoria::class, 'categoria');
    }

    // LISTAR CATEGORIAS
    public function index()
    {
        $categorias = Categoria::all();
        return response()->json($categorias);
    }

    // CRIAR CATEGORIA
    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
        ]);

        $categoria = Categoria::create($dados);
        return response()->json($categoria, 201);
    }

    // MOSTRAR CATEGORIA
    public function show(Categoria $categoria)
    {
        return response()->json($categoria);
    }

    // ATUALIZAR CATEGORIA
    public function update(Request $request, Categoria $categoria)
    {
        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
        ]);

        $categoria->update($dados);
        return response()->json($categoria);
    }

    // DELETAR CATEGORIA
    public function destroy(Categoria $categoria)
    {
        $categoria->delete();
        return response()->json(null, 204);
    }
}
