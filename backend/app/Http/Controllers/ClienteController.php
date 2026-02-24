<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClienteController extends Controller
{
    /**
     * Listar clientes (apenas ativos por padrão)
     */
    public function index(Request $request)
    {
        $query = Cliente::query();

        // Filtrar por status se solicitado
        if ($request->has('status')) {
            if ($request->status === 'todos') {
                // Mostrar todos (ativos e inativos)
                // Não aplica filtro
            } elseif ($request->status === 'ativos') {
                $query->where('status', 'ativo');
            } elseif ($request->status === 'inativos') {
                $query->where('status', 'inativo');
            }
        } else {
            // Por padrão, mostrar apenas ativos
            $query->where('status', 'ativo');
        }

        // Filtrar por tipo
        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        // Busca por nome ou NIF
        if ($request->has('busca')) {
            $busca = $request->busca;
            $query->where(function($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                  ->orWhere('nif', 'like', "%{$busca}%")
                  ->orWhere('email', 'like', "%{$busca}%");
            });
        }

        // Ordenação
        $ordenarPor = $request->get('ordenar_por', 'nome');
        $direcao = $request->get('direcao', 'asc');
        $query->orderBy($ordenarPor, $direcao);

        // Paginação ou lista completa
        if ($request->has('paginar') && $request->paginar) {
            $perPage = $request->get('per_page', 15);
            $clientes = $query->paginate($perPage);
        } else {
            $clientes = $query->get();
        }

        return response()->json([
            'message' => 'Lista de clientes carregada com sucesso',
            'clientes' => $clientes,
            'filtros' => [
                'status' => $request->get('status', 'ativos'),
                'total' => $clientes->count(),
                'ativos' => Cliente::where('status', 'ativo')->count(),
                'inativos' => Cliente::where('status', 'inativo')->count(),
            ],
        ]);
    }

    /**
     * Mostrar cliente específico
     */
    public function show($id)
    {
        $cliente = Cliente::withTrashed()->findOrFail($id);

        return response()->json([
            'message' => 'Cliente carregado com sucesso',
            'cliente' => $cliente,
        ]);
    }

    /**
     * Criar novo cliente
     */
    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'nif' => 'nullable|string|max:50|unique:clientes,nif',
            'tipo' => 'nullable|in:consumidor_final,empresa',
            'status' => 'nullable|in:ativo,inativo', // NOVO
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:clientes,email',
            'endereco' => 'nullable|string',
            'data_registro' => 'nullable|date',
        ]);

        $dados['data_registro'] = $dados['data_registro'] ?? now();
        $dados['status'] = $dados['status'] ?? 'ativo'; // Valor padrão

        $cliente = Cliente::create($dados);

        return response()->json([
            'message' => 'Cliente criado com sucesso',
            'cliente' => $cliente,
        ], 201);
    }

    /**
     * Atualizar cliente
     */
    public function update(Request $request, $id)
    {
        $cliente = Cliente::findOrFail($id);

        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'nif' => 'sometimes|nullable|string|max:50|unique:clientes,nif,' . $cliente->id,
            'tipo' => 'nullable|in:consumidor_final,empresa',
            'status' => 'nullable|in:ativo,inativo', // NOVO
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
     * NOVO: Ativar cliente
     */
    public function ativar($id)
    {
        $cliente = Cliente::findOrFail($id);

        $cliente->ativar();

        return response()->json([
            'message' => 'Cliente ativado com sucesso',
            'cliente' => $cliente,
        ]);
    }

    /**
     * NOVO: Inativar cliente
     */
    public function inativar($id)
    {
        $cliente = Cliente::findOrFail($id);

        $cliente->inativar();

        return response()->json([
            'message' => 'Cliente inativado com sucesso',
            'cliente' => $cliente,
        ]);
    }

    /**
     * Deletar cliente (SOFT DELETE)
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $cliente = Cliente::find($id);

            if (!$cliente) {
                return response()->json([
                    'message' => 'Cliente não encontrado',
                ], 404);
            }

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

            $cliente->delete();

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

    /**
     * Listar todos (incluindo inativos e deletados)
     */
    public function indexWithTrashed()
    {
        $clientes = Cliente::withTrashed()->get();

        return response()->json([
            'message' => 'Lista completa de clientes',
            'clientes' => $clientes,
            'total' => $clientes->count(),
            'ativos' => $clientes->where('status', 'ativo')->whereNull('deleted_at')->count(),
            'inativos' => $clientes->where('status', 'inativo')->whereNull('deleted_at')->count(),
            'deletados' => $clientes->whereNotNull('deleted_at')->count(),
        ]);
    }

    /**
     * Restaurar cliente deletado
     */
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

    /**
     * Remover permanentemente
     */
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
