<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClienteController extends Controller
{
    /**
     * Listar apenas clientes ATIVOS (não deletados)
     */
    public function index()
    {
        $clientes = Cliente::all(); // retorna apenas registros ativos

        return response()->json([
            'message' => 'Lista de clientes carregada com sucesso',
            'clientes' => $clientes,
            'total' => $clientes->count(),
        ]);
    }

    /**
     * Mostrar cliente específico (ativo)
     */
    public function show(Cliente $cliente)
    {
        return response()->json([
            'message' => 'Cliente carregado com sucesso',
            'cliente' => $cliente,
        ]);
    }

    /**
     * Criar cliente
     */
    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'nullable|string|max:50|unique:clientes,nif',
            'tipo' => 'nullable|in:consumidor_final,empresa',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:clientes,email',
            'endereco' => 'nullable|string',
            'data_registro' => 'nullable|date',
        ]);

        $dados['data_registro'] = $dados['data_registro'] ?? now();

        $cliente = Cliente::create($dados);

        return response()->json([
            'message' => 'Cliente criado com sucesso',
            'cliente' => $cliente,
        ], 201);
    }

    /**
     * Atualizar cliente
     */
    public function update(Request $request, Cliente $cliente)
    {
        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'sometimes|nullable|string|max:50|unique:clientes,nif,' . $cliente->id,
            'tipo' => 'nullable|in:consumidor_final,empresa',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:clientes,email,' . $cliente->id,
            'endereco' => 'nullable|string',
            'data_registro' => 'nullable|date',
        ]);

        $cliente->update($dados);

        return response()->json([
            'message' => 'Cliente atualizado com sucesso',
            'cliente' => $cliente,
        ]);
    }

    /**
     * Deletar cliente (SOFT DELETE)
     */
    public function destroy(Cliente $cliente)
    {
        try {
            DB::beginTransaction();

            // Regra: cliente com faturas não pode ser deletado
            if ($cliente->faturas()->exists()) {
                return response()->json([
                    'message' => 'Não é possível deletar um cliente com faturas associadas',
                ], 409);
            }

            $cliente->delete(); // soft delete

            DB::commit();

            return response()->json([
                'message' => 'Cliente deletado com sucesso',
                'soft_deleted' => true,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('[CLIENTE DELETE ERROR]', [
                'cliente_id' => $cliente->id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Erro ao deletar cliente',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Listar clientes (ATIVOS + DELETADOS) — ADMIN / DEBUG
     */
    public function indexWithTrashed()
    {
        $clientes = Cliente::withTrashed()->get();

        return response()->json([
            'message' => 'Lista completa de clientes',
            'clientes' => $clientes,
            'total' => $clientes->count(),
            'ativos' => $clientes->whereNull('deleted_at')->count(),
            'deletados' => $clientes->whereNotNull('deleted_at')->count(),
        ]);
    }

    /**
     * Restaurar cliente soft deleted
     */
    public function restore(string $id)
    {
        $cliente = Cliente::withTrashed()->findOrFail($id);

        if (! $cliente->trashed()) {
            return response()->json([
                'message' => 'Cliente não está deletado',
            ], 400);
        }

        $cliente->restore();

        return response()->json([
            'message' => 'Cliente restaurado com sucesso',
            'cliente' => $cliente,
        ]);
    }

    /**
     * Remover cliente permanentemente (FORCE DELETE)
     */
    public function forceDelete(string $id)
    {
        $cliente = Cliente::withTrashed()->findOrFail($id);

        if ($cliente->faturas()->exists()) {
            return response()->json([
                'message' => 'Não é possível remover permanentemente um cliente com faturas',
            ], 409);
        }

        $cliente->forceDelete();

        return response()->json([
            'message' => 'Cliente removido permanentemente',
        ]);
    }
}
