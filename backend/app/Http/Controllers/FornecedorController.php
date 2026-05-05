<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Fornecedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class FornecedorController extends Controller
{
    /**
     * Listar fornecedores ativos (não deletados)
     */
    public function index()
    {
        Gate::forUser(auth('tenant')->user())->authorize('viewAny', Fornecedor::class);

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
        Gate::forUser(auth('tenant')->user())->authorize('viewAny', Fornecedor::class);

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
        Gate::forUser(auth('tenant')->user())->authorize('viewAny', Fornecedor::class);

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
        Gate::forUser(auth('tenant')->user())->authorize('view', $fornecedor);

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
        Gate::forUser(auth('tenant')->user())->authorize('create', Fornecedor::class);

        $dados = $request->validate([
            'nome'     => 'required|string|max:255',
            'nif'      => 'required|string|max:50|unique:fornecedores,nif',
            'telefone' => 'nullable|string|max:20',
            'email'    => 'nullable|email|max:255|unique:fornecedores,email',
            'endereco' => 'nullable|string',
            'tipo'     => 'nullable|in:Nacional,Internacional',
            'status'   => 'nullable|in:ativo,inativo',
        ]);

        $dados['user_id'] = auth('tenant')->id();
        $dados['tipo']    = $dados['tipo'] ?? 'Nacional';
        $dados['status']  = $dados['status'] ?? 'ativo';

        $fornecedor = Fornecedor::create($dados);

        Log::info('Fornecedor criado com sucesso', [
            'fornecedor_id' => $fornecedor->id,
            'nome' => $fornecedor->nome
        ]);

        return response()->json([
            'message' => 'Fornecedor criado com sucesso',
            'fornecedor' => $fornecedor
        ], 201);
    }

    /**
     * Atualizar fornecedor (EDITAR)
     */
    public function update(Request $request, $id)
    {
        $fornecedor = Fornecedor::findOrFail($id);

        Gate::forUser(auth('tenant')->user())->authorize('update', $fornecedor);

        try {
            $dados = $request->validate([
                'nome'     => 'sometimes|required|string|max:255',
                'nif'      => 'sometimes|required|string|max:50|unique:fornecedores,nif,' . $fornecedor->id,
                'telefone' => 'nullable|string|max:30',
                'email'    => 'nullable|email|max:255|unique:fornecedores,email,' . $fornecedor->id,
                'endereco' => 'nullable|string',
                'tipo'     => 'nullable|in:Nacional,Internacional',
                'status'   => 'nullable|in:ativo,inativo',
            ]);

            // Normalização extra (segurança)
            if (isset($dados['tipo'])) {
                $dados['tipo'] = ucfirst(strtolower($dados['tipo']));
            }

            $fornecedor->update($dados);

            return response()->json([
                'message'    => 'Fornecedor atualizado com sucesso',
                'fornecedor' => $fornecedor->fresh()
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        }
    }
    /**
     * Soft Delete - Mover fornecedor para a lixeira
     */
    public function destroy($id)
    {
        Log::info('🗑️ Tentativa de SOFT DELETE fornecedor', [
            'id_recebido' => $id,
            'user_id'     => auth('tenant')->id(),
            'user_role'   => auth('tenant')->user()?->role,
        ]);

        $fornecedor = Fornecedor::findOrFail($id);

        Gate::forUser(auth('tenant')->user())->authorize('delete', $fornecedor);

        // Verifica se tem compras associadas
        if ($fornecedor->compras()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível mover para a lixeira: este fornecedor tem compras associadas.',
                'error'   => 'fornecedor_has_compras'
            ], 422);
        }

        $fornecedor->delete(); // Soft delete

        Log::info('✅ Fornecedor movido para lixeira', ['id' => $id, 'nome' => $fornecedor->nome]);

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
        Gate::forUser(auth('tenant')->user())->authorize('restore', Fornecedor::class);

        $fornecedor = Fornecedor::onlyTrashed()->findOrFail($id);
        $fornecedor->restore();

        return response()->json([
            'message' => 'Fornecedor restaurado com sucesso',
            'fornecedor' => $fornecedor
        ]);
    }

    /**
     * Deletar permanentemente
     */
    public function forceDelete($id)
    {
        Gate::forUser(auth('tenant')->user())->authorize('forceDelete', Fornecedor::class);

        $fornecedor = Fornecedor::onlyTrashed()->findOrFail($id);
        $fornecedor->forceDelete();

        return response()->json([
            'message' => 'Fornecedor removido permanentemente'
        ]);
    }
}
