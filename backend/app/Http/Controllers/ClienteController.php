<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Controller;

class ClienteController extends Controller
{
    /**
     * Valida e normaliza o NIF/BI
     */
    private function validarENormalizarNIF(?string $nif, string $tipo): ?string
    {
        if (empty($nif)) {
            return null;
        }

        // Remove espaços, barras, hífens, pontos
        $nifLimpo = preg_replace('/[^A-Za-z0-9]/', '', $nif);

        // Validação para empresa (10 dígitos numéricos)
        if ($tipo === 'empresa') {
            if (!preg_match('/^\d{10}$/', $nifLimpo)) {
                throw ValidationException::withMessages([
                    'nif' => 'Empresa deve ter NIF com exatamente 10 dígitos numéricos'
                ]);
            }
            return $nifLimpo;
        }

        // Validação para consumidor final
        if ($tipo === 'consumidor_final' && !empty($nifLimpo)) {
            // Aceita: 10 dígitos (NIF) ou 9 números + 2 letras + 3 números (BI)
            if (!preg_match('/^\d{10}$|^\d{9}[A-Za-z]{2}\d{3}$/', $nifLimpo)) {
                throw ValidationException::withMessages([
                    'nif' => 'Consumidor final: NIF deve ter 10 dígitos ou BI (9 números + 2 letras + 3 números)'
                ]);
            }
            return $nifLimpo;
        }

        // Consumidor final sem NIF (opcional)
        return $nifLimpo;
    }

    /**
     * Listar clientes
     */
  /**
 * Listar clientes
 */
public function index(Request $request)
{
    Log::info('[ClienteController::index] Iniciando listagem de clientes', [
        'user_id' => auth('tenant')->id(),
        'filters' => $request->only(['search', 'tipo', 'status', 'sort_by', 'sort_order']),
        'per_page' => $request->per_page ?? 15
    ]);

    try {
        Gate::forUser(auth('tenant')->user())->authorize('viewAny', Cliente::class);
        Log::info('[ClienteController::index] Autorização passou');

        Log::info('[ClienteController::index] Verificando modelo Cliente', [
            'model_exists' => class_exists(Cliente::class),
            'model_class' => Cliente::class
        ]);

        $totalClientes = Cliente::count();
        Log::info('[ClienteController::index] Total de clientes no banco', [
            'total' => $totalClientes
        ]);

        $query = Cliente::query();
        Log::info('[ClienteController::index] Query inicial construída');

        // Aplicar filtros
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('nome', 'LIKE', "%{$request->search}%")
                  ->orWhere('nif', 'LIKE', "%{$request->search}%")
                  ->orWhere('email', 'LIKE', "%{$request->search}%");
            });
            Log::info('[ClienteController::index] Filtro search aplicado', [
                'search' => $request->search
            ]);
        }

        if ($request->tipo) {
            $query->where('tipo', $request->tipo);
            Log::info('[ClienteController::index] Filtro tipo aplicado', [
                'tipo' => $request->tipo
            ]);
        }

        //  CORREÇÃO: Normaliza o status
        if ($request->status) {
            $status = $request->status;
            
            // Converte "ativos" para "ativo" e "inativos" para "inativo"
            if ($status === 'ativos') {
                $status = 'ativo';
            } elseif ($status === 'inativos') {
                $status = 'inativo';
            }
            
            // Verifica se o status é válido antes de aplicar
            if (in_array($status, ['ativo', 'inativo'])) {
                $query->where('status', $status);
                Log::info('[ClienteController::index] Filtro status aplicado', [
                    'status_original' => $request->status,
                    'status_normalizado' => $status
                ]);
            } else {
                Log::warning('[ClienteController::index] Status inválido ignorado', [
                    'status_recebido' => $request->status
                ]);
            }
        }

        // Ordenação
        $sortBy = $request->sort_by ?? 'created_at';
        $sortOrder = $request->sort_order ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);
        Log::info('[ClienteController::index] Ordenação aplicada', [
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder
        ]);

        // Paginação
        $perPage = $request->per_page ?? 15;
        $clientes = $query->paginate($perPage);
        
        Log::info('[ClienteController::index] Consulta executada com sucesso', [
            'total_registros' => $clientes->total(),
            'registros_na_pagina' => $clientes->count(),
            'pagina_atual' => $clientes->currentPage(),
            'ultima_pagina' => $clientes->lastPage(),
            'por_pagina' => $clientes->perPage(),
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings()
        ]);

        if (config('app.debug')) {
            Log::debug('[ClienteController::index] Dados dos clientes', [
                'clientes' => $clientes->items()
            ]);
        }

        return response()->json([
            'message' => 'Clientes listados com sucesso',
            'data' => $clientes
        ]);

    } catch (\Exception $e) {
        Log::error('[ClienteController::index] Erro ao listar clientes', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'user_id' => auth('tenant')->id()
        ]);

        throw $e;
    }
}
    /**
     * Criar novo cliente
     */
    public function store(Request $request)
    {
        Log::info('[ClienteController::store] Iniciando criação de cliente', [
            'user_id' => auth('tenant')->id(),
            'dados' => $request->except(['password', 'password_confirmation'])
        ]);

        Gate::forUser(auth('tenant')->user())->authorize('create', Cliente::class);

        try {
            $dados = $request->validate([
                'nome' => 'required|string|max:255',
                'tipo' => 'required|in:consumidor_final,empresa',
                'nif' => 'nullable|string|max:20|unique:clientes,nif',
                'status' => 'nullable|in:ativo,inativo',
                'telefone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255|unique:clientes,email',
                'endereco' => 'nullable|string',
                'data_registro' => 'nullable|date',
            ], [
                'nome.required' => 'O nome é obrigatório',
                'nome.max' => 'O nome não pode ter mais que 255 caracteres',
                'tipo.required' => 'O tipo é obrigatório',
                'tipo.in' => 'O tipo deve ser consumidor_final ou empresa',
                'nif.unique' => 'Este NIF já está cadastrado',
                'email.email' => 'O email deve ser válido',
                'email.unique' => 'Este email já está cadastrado',
                'status.in' => 'O status deve ser ativo ou inativo',
                'data_registro.date' => 'A data de registro deve ser uma data válida',
            ]);

            Log::info('[ClienteController::store] Validação passou', [
                'dados_validados' => $dados
            ]);

            // Normaliza e valida NIF
            if (isset($dados['nif'])) {
                $dados['nif'] = $this->validarENormalizarNIF($dados['nif'], $dados['tipo']);
                Log::info('[ClienteController::store] NIF normalizado', [
                    'nif_normalizado' => $dados['nif']
                ]);
            }

            // Valores padrão
            $dados['data_registro'] = $dados['data_registro'] ?? now();
            $dados['status'] = $dados['status'] ?? 'ativo';

            Log::info('[ClienteController::store] Dados finais para criação', [
                'dados_finais' => $dados
            ]);

            $cliente = Cliente::create($dados);

            Log::info('[ClienteController::store] Cliente criado com sucesso', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'tipo' => $cliente->tipo,
            ]);

            return response()->json([
                'message' => 'Cliente criado com sucesso',
                'cliente' => $cliente
            ], 201);

        } catch (ValidationException $e) {
            Log::warning('[ClienteController::store] Erro de validação', [
                'errors' => $e->errors(),
                'dados' => $request->all()
            ]);

            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[ClienteController::store] Erro ao criar cliente', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $request->all()
            ]);

            return response()->json([
                'message' => 'Erro ao criar cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar cliente específico
     */
    public function show($id)
    {
        Log::info('[ClienteController::show] Buscando cliente', [
            'cliente_id' => $id,
            'user_id' => auth('tenant')->id()
        ]);

        $cliente = Cliente::findOrFail($id);
        
        Gate::forUser(auth('tenant')->user())->authorize('view', $cliente);

        Log::info('[ClienteController::show] Cliente encontrado', [
            'cliente_id' => $cliente->id,
            'nome' => $cliente->nome
        ]);

        return response()->json([
            'message' => 'Cliente encontrado',
            'cliente' => $cliente
        ]);
    }

    /**
     * Atualizar cliente
     */
public function update(Request $request, $id)
{
    Log::info('[ClienteController::update] Iniciando atualização', [
        'cliente_id' => $id,
        'user_id' => auth('tenant')->id()
    ]);

    $cliente = Cliente::findOrFail($id);
    
    Gate::forUser(auth('tenant')->user())->authorize('update', $cliente);

    try {
        // 🔥 PASSO 1: Validação básica (sem unique para NIF ainda)
        $dados = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'tipo' => 'nullable|in:consumidor_final,empresa',
            'nif' => 'nullable|string|max:20', // 🔥 Remove unique daqui
            'status' => 'nullable|in:ativo,inativo',
            'telefone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:clientes,email,' . $cliente->id,
            'endereco' => 'nullable|string',
            'data_registro' => 'nullable|date',
        ], [
            'nome.required' => 'O nome é obrigatório',
            'nome.max' => 'O nome não pode ter mais que 255 caracteres',
            'tipo.in' => 'O tipo deve ser consumidor_final ou empresa',
            'email.email' => 'O email deve ser válido',
            'email.unique' => 'Este email já está cadastrado',
            'status.in' => 'O status deve ser ativo ou inativo',
            'data_registro.date' => 'A data de registro deve ser uma data válida',
        ]);

        // 🔥 PASSO 2: Determina o tipo e normaliza o NIF
        $tipo = $dados['tipo'] ?? $cliente->tipo;
        
        // Normaliza o NIF se foi fornecido
        if (isset($dados['nif'])) {
            $nifNormalizado = $this->validarENormalizarNIF($dados['nif'], $tipo);
            $dados['nif'] = $nifNormalizado;
            
            // 🔥 PASSO 3: Verifica unicidade após normalização
            if ($nifNormalizado !== null) {
                $exists = Cliente::where('nif', $nifNormalizado)
                    ->where('id', '!=', $cliente->id)
                    ->exists();
                    
                if ($exists) {
                    throw ValidationException::withMessages([
                        'nif' => 'Este NIF já está cadastrado'
                    ]);
                }
            }
        } elseif (isset($dados['tipo']) && $dados['tipo'] !== $cliente->tipo) {
            // Se mudou o tipo, revalida o NIF existente
            $nifValidado = $this->validarENormalizarNIF($cliente->nif, $dados['tipo']);
            if ($nifValidado !== null) {
                $dados['nif'] = $nifValidado;
            }
        }

        // 🔥 PASSO 4: Atualiza o cliente
        $cliente->update($dados);
        $cliente->refresh();

        Log::info('[ClienteController::update] Cliente atualizado com sucesso', [
            'cliente_id' => $cliente->id,
            'nome' => $cliente->nome,
            'tipo' => $cliente->tipo,
            'user_id' => auth('tenant')->id()
        ]);

        return response()->json([
            'message' => 'Cliente atualizado com sucesso',
            'cliente' => $cliente
        ]);

    } catch (ValidationException $e) {
        Log::warning('[ClienteController::update] Erro de validação', [
            'cliente_id' => $id,
            'errors' => $e->errors()
        ]);

        return response()->json([
            'message' => 'Erro de validação',
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        Log::error('[ClienteController::update] Erro ao atualizar cliente', [
            'cliente_id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'data' => $request->all()
        ]);

        return response()->json([
            'message' => 'Erro ao atualizar cliente',
            'error' => $e->getMessage()
        ], 500);
    }
}

    /**
     * Soft delete (arquivar)
     */
    public function destroy($id)
    {
        Log::info('[ClienteController::destroy] Iniciando arquivamento', [
            'cliente_id' => $id,
            'user_id' => auth('tenant')->id()
        ]);

        $cliente = Cliente::findOrFail($id);
        
        Gate::forUser(auth('tenant')->user())->authorize('delete', $cliente);

        try {
            $cliente->delete();

            Log::info('[ClienteController::destroy] Cliente arquivado com sucesso', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'user_id' => auth('tenant')->id()
            ]);

            return response()->json([
                'message' => 'Cliente arquivado com sucesso'
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::destroy] Erro ao arquivar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erro ao arquivar cliente'
            ], 500);
        }
    }

    /**
     * Restaurar cliente
     */
    public function restore($id)
    {
        Log::info('[ClienteController::restore] Iniciando restauração', [
            'cliente_id' => $id,
            'user_id' => auth('tenant')->id()
        ]);

        $cliente = Cliente::withTrashed()->findOrFail($id);
        
        Gate::forUser(auth('tenant')->user())->authorize('restore', $cliente);

        try {
            $cliente->restore();

            Log::info('[ClienteController::restore] Cliente restaurado com sucesso', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'user_id' => auth('tenant')->id()
            ]);

            return response()->json([
                'message' => 'Cliente restaurado com sucesso',
                'cliente' => $cliente
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::restore] Erro ao restaurar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erro ao restaurar cliente'
            ], 500);
        }
    }

    /**
     * Listar clientes deletados (lixeira)
     */
    public function listDeleted(Request $request)
    {
        Log::info('[ClienteController::listDeleted] Listando clientes deletados', [
            'user_id' => auth('tenant')->id()
        ]);

        Gate::forUser(auth('tenant')->user())->authorize('viewDeleted', Cliente::class);

        try {
            $clientes = Cliente::onlyTrashed()
                ->when($request->search, function ($query, $search) {
                    return $query->where('nome', 'LIKE', "%{$search}%")
                        ->orWhere('nif', 'LIKE', "%{$search}%");
                })
                ->orderBy('deleted_at', 'desc')
                ->paginate($request->per_page ?? 15);

            Log::info('[ClienteController::listDeleted] Clientes deletados listados', [
                'total' => $clientes->total()
            ]);

            return response()->json([
                'message' => 'Clientes deletados listados com sucesso',
                'data' => $clientes
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::listDeleted] Erro ao listar clientes deletados', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    /**
     * Excluir permanentemente
     */
    public function forceDelete($id)
    {
        Log::info('[ClienteController::forceDelete] Iniciando exclusão permanente', [
            'cliente_id' => $id,
            'user_id' => auth('tenant')->id()
        ]);

        $cliente = Cliente::withTrashed()->findOrFail($id);
        
        Gate::forUser(auth('tenant')->user())->authorize('forceDelete', $cliente);

        try {
            $cliente->forceDelete();

            Log::info('[ClienteController::forceDelete] Cliente excluído permanentemente', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'user_id' => auth('tenant')->id()
            ]);

            return response()->json([
                'message' => 'Cliente excluído permanentemente'
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::forceDelete] Erro ao excluir cliente permanentemente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erro ao excluir cliente'
            ], 500);
        }
    }
}