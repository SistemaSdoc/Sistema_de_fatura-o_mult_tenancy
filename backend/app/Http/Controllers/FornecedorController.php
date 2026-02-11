<?php

namespace App\Http\Controllers;

use App\Models\Fornecedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FornecedorController extends Controller
{
    public function __construct()
    {
        // Aplica automaticamente as policies do modelo Fornecedor
        $this->authorizeResource(Fornecedor::class, 'fornecedor');
    }

    /**
     * Listar fornecedores ativos (não deletados)
     */
    public function index()
    {
        $this->authorize('viewAny', Fornecedor::class);

        $fornecedores = Fornecedor::all();

        return response()->json([
            'message' => 'Lista de fornecedores carregada com sucesso',
            'fornecedores' => $fornecedores
        ]);
    }

    /**
     * Listar TODOS os fornecedores (ativos + deletados)
     */
    public function indexWithTrashed()
    {
        $this->authorize('viewAny', Fornecedor::class);

        $fornecedores = Fornecedor::withTrashed()->get();

        return response()->json([
            'message' => 'Lista completa de fornecedores (incluindo deletados)',
            'fornecedores' => $fornecedores
        ]);
    }

    /**
     * Listar APENAS fornecedores deletados (lixeira)
     */
    public function indexOnlyTrashed()
    {
        $this->authorize('viewAny', Fornecedor::class);

        $fornecedores = Fornecedor::onlyTrashed()->get();

        return response()->json([
            'message' => 'Lista de fornecedores na lixeira',
            'fornecedores' => $fornecedores
        ]);
    }

    /**
     * Mostrar fornecedor específico
     */
    public function show(Fornecedor $fornecedor)
    {
        return response()->json([
            'message' => 'Fornecedor carregado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Criar novo fornecedor
     */
    public function store(Request $request)
    {
        $this->authorize('create', Fornecedor::class);

        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'required|string|max:50|unique:fornecedores,nif',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:fornecedores,email',
            'endereco' => 'nullable|string',
            'tipo' => 'nullable|in:Nacional,Internacional',
            'status' => 'nullable|in:ativo,inativo',
        ]);

        $dados['user_id'] = Auth::id();
        $dados['tipo'] = $dados['tipo'] ?? 'Nacional';
        $dados['status'] = $dados['status'] ?? 'ativo';

        $fornecedor = Fornecedor::create($dados);

        return response()->json([
            'message' => 'Fornecedor criado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Atualizar fornecedor
     */
    public function update(Request $request, Fornecedor $fornecedor)
    {
        $this->authorize('update', $fornecedor);

        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'sometimes|required|string|max:50|unique:fornecedores,nif,' . $fornecedor->id,
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:fornecedores,email,' . $fornecedor->id,
            'endereco' => 'nullable|string',
            'tipo' => 'nullable|in:Nacional,Internacional',
            'status' => 'nullable|in:ativo,inativo',
        ]);

        $fornecedor->update($dados);

        return response()->json([
            'message' => 'Fornecedor atualizado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Soft Delete - "Deletar" fornecedor (mantém no banco)
     */
    public function destroy(Fornecedor $fornecedor)
    {
        $this->authorize('delete', $fornecedor);

        // Verifica se há compras associadas antes de "deletar"
        if ($fornecedor->compras()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível deletar fornecedor com compras associadas',
                'error' => 'fornecedor_has_compras'
            ], 422);
        }

        $fornecedor->delete(); // Soft delete

        return response()->json([
            'message' => 'Fornecedor movido para a lixeira com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Restaurar fornecedor deletado
     */
    public function restore($id)
    {
        $this->authorize('restore', Fornecedor::class);

        $fornecedor = Fornecedor::onlyTrashed()->findOrFail($id);
        $fornecedor->restore();

        return response()->json([
            'message' => 'Fornecedor restaurado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Deletar permanentemente (force delete)
     */
    public function forceDelete($id)
    {
        $this->authorize('forceDelete', Fornecedor::class);

        $fornecedor = Fornecedor::onlyTrashed()->findOrFail($id);
        $fornecedor->forceDelete();

        return response()->json([
            'message' => 'Fornecedor removido permanentemente'
        ]);
    }
}
