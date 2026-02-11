<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClienteController extends Controller
{
    public function index()
    {
        $clientes = Cliente::whereNull('deleted_at')->get();

        return response()->json([
            'message' => 'Lista de clientes carregada com sucesso',
            'clientes' => $clientes,
            'total' => $clientes->count(),
        ]);
    }

    public function show($id)
    {
        $cliente = Cliente::findOrFail($id);

        return response()->json([
            'message' => 'Cliente carregado com sucesso',
            'cliente' => $cliente,
        ]);
    }

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

    public function update(Request $request, $id)
    {
        $cliente = Cliente::findOrFail($id);

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
        $cliente->refresh();

        return response()->json([
            'message' => 'Cliente atualizado com sucesso',
            'cliente' => $cliente,
        ]);
    }

    /**
     * Deletar cliente (SOFT DELETE) - CORRIGIDO
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            // Busca o cliente pelo ID (incluindo soft deleted se necessário)
            $cliente = Cliente::find($id);

            if (!$cliente) {
                return response()->json([
                    'message' => 'Cliente não encontrado',
                ], 404);
            }

            // Verifica se já está deletado
            if ($cliente->trashed()) {
                return response()->json([
                    'message' => 'Cliente já está deletado',
                    'soft_deleted' => true,
                ], 400);
            }

            // Regra: cliente com faturas não pode ser deletado
            if ($cliente->faturas()->exists()) {
                return response()->json([
                    'message' => 'Não é possível deletar um cliente com faturas associadas',
                ], 409);
            }

            // FORÇA o soft delete
            $cliente->delete();

            // Verifica se foi deletado
            $cliente->refresh();

            Log::info('[CLIENTE DELETE]', [
                'id' => $cliente->id,
                'deleted_at' => $cliente->deleted_at,
                'trashed' => $cliente->trashed()
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Cliente deletado com sucesso',
                'soft_deleted' => true,
                'id' => $cliente->id,
                'deleted_at' => $cliente->deleted_at,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('[CLIENTE DELETE ERROR]', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erro ao deletar cliente',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

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

    public function restore($id)
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

    public function forceDelete($id)
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
