<?php

namespace App\Http\Controllers;

use App\Models\Shared\Cliente as SharedCliente;
use App\Models\Tenant\Cliente as TenantCliente;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Controller;

class ClienteController extends Controller
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[ClienteController] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS
     | ================================================================== */

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        return $this->modo;
    }

    protected function getEmpresa(): ?Empresa
    {
        if (!$this->empresa) {
            $this->empresa = app('current.empresa');
        }
        return $this->empresa;
    }

    protected function getUser(): ?object
    {
        return $this->tenantUser;
    }

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[ClienteController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[ClienteController] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // ✅ Atualiza o modo
        $this->modo = $this->empresa->modo ?? 'colectivo';

        // 2️⃣ Obtém o landlord user (guard onde o login foi feito)
        $landlordUser = Auth::guard('landlord')->user();

        // 3️⃣ Fallback: tenta obter da sessão
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[ClienteController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[ClienteController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[ClienteController] Acesso verificado com sucesso', [
            'modo' => $this->modo,
            'user_id' => $tenantUser->id,
            'email' => $tenantUser->email,
        ]);
    }

    /**
     * Busca usuário no banco correto
     */
    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }
        return SharedUser::on('shared')
            ->where('email', $email)
            ->where('tenant_id', $empresa->id)
            ->first();
    }

    /**
     * Obtém o user_id do tenantUser
     */
    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    /* =====================================================================
     | HELPERS: Models e Queries
     | ================================================================== */

    protected function clienteModel()
    {
        return $this->isColectivo() ? new SharedCliente() : new TenantCliente();
    }

    /**
     * Query com scope para clientes (apenas colectivo)
     */
    protected function queryClientes()
    {
        if ($this->isColectivo()) {
            return SharedCliente::doTenant();
        }
        return TenantCliente::query();
    }

    /**
     * Query com scope para clientes deletados (apenas colectivo)
     */
    protected function queryClientesDeletados()
    {
        if ($this->isColectivo()) {
            return SharedCliente::doTenant()->onlyTrashed();
        }
        return TenantCliente::onlyTrashed();
    }

    /**
     * Busca cliente com scope (apenas colectivo)
     */
    protected function buscarCliente(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedCliente::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->first();
        }

        if ($comTrashed) {
            return TenantCliente::withTrashed()->where('id', $id)->first();
        }
        return TenantCliente::where('id', $id)->first();
    }

    /**
     * Busca cliente com scope e lança exceção se não encontrada
     */
    protected function buscarClienteOrFail(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedCliente::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->firstOrFail();
        }

        if ($comTrashed) {
            return TenantCliente::withTrashed()->where('id', $id)->firstOrFail();
        }
        return TenantCliente::where('id', $id)->firstOrFail();
    }

    /**
     * Adiciona tenant_id (apenas para colectivo)
     */
    protected function adicionarTenantId(array $dados): array
    {
        if ($this->isColectivo() && $this->empresa) {
            $dados['tenant_id'] = $this->empresa->id;
        }
        return $dados;
    }

    /**
     * Valida e normaliza o NIF/BI
     */
    private function validarENormalizarNIF(?string $nif, string $tipo): ?string
    {
        if (empty($nif)) {
            return null;
        }

        $nifLimpo = preg_replace('/[^A-Za-z0-9]/', '', $nif);

        if ($tipo === 'empresa') {
            if (!preg_match('/^\d{10}$/', $nifLimpo)) {
                throw ValidationException::withMessages([
                    'nif' => 'Empresa deve ter NIF com exatamente 10 dígitos numéricos'
                ]);
            }
            return $nifLimpo;
        }

        if ($tipo === 'consumidor_final' && !empty($nifLimpo)) {
            if (!preg_match('/^\d{10}$|^\d{9}[A-Za-z]{2}\d{3}$/', $nifLimpo)) {
                throw ValidationException::withMessages([
                    'nif' => 'Consumidor final: NIF deve ter 10 dígitos ou BI (9 números + 2 letras + 3 números)'
                ]);
            }
            return $nifLimpo;
        }

        return $nifLimpo;
    }

    /**
     * Verifica se cliente tem dependências
     */
    private function verificarDependencias($cliente): bool
    {
        // Verificar vendas
        $temVendas = $cliente->vendas()->exists();

        // Verificar documentos fiscais
        $temDocumentos = $cliente->documentosFiscais()->exists();

        return $temVendas || $temDocumentos;
    }

    /* =====================================================================
     | MÉTODOS DO CONTROLLER
     | ================================================================== */

    /**
     * Listar clientes
     */
    public function index(Request $request)
    {
        $modo = $this->getModo();
        
        Log::info('[ClienteController::index] Iniciando listagem de clientes', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
            'filters' => $request->only(['search', 'tipo', 'status', 'sort_by', 'sort_order']),
            'per_page' => $request->per_page ?? 15
        ]);

        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryClientes();

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

            // Normaliza o status
            if ($request->status) {
                $status = $request->status;
                if ($status === 'ativos') {
                    $status = 'ativo';
                } elseif ($status === 'inativos') {
                    $status = 'inativo';
                }

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

            // Paginação
            $perPage = $request->per_page ?? 15;
            $clientes = $query->paginate($perPage);

            Log::info('[ClienteController::index] Consulta executada com sucesso', [
                'total_registros' => $clientes->total(),
                'registros_na_pagina' => $clientes->count(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Clientes listados com sucesso',
                'data' => $clientes,
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::index] Erro ao listar clientes', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $this->getUserId(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar clientes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar novo cliente
     */
    public function store(Request $request)
    {
        $modo = $this->getModo();
        
        Log::info('[ClienteController::store] Iniciando criação de cliente', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
            'dados' => $request->except(['password', 'password_confirmation'])
        ]);

        try {
            $this->verificarAcessoUsuario();

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

            // ⭐ ADICIONAR TENANT_ID (apenas para colectivo)
            if ($this->isColectivo()) {
                $dados['tenant_id'] = $this->empresa->id;
            }

            // ⭐ USAR O MODEL CORRETO
            if ($this->isColectivo()) {
                $cliente = SharedCliente::create($dados);
            } else {
                $cliente = TenantCliente::create($dados);
            }

            Log::info('[ClienteController::store] Cliente criado com sucesso', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'tipo' => $cliente->tipo,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente criado com sucesso',
                'data' => $cliente,
                'modo' => $modo,
            ], 201);

        } catch (ValidationException $e) {
            Log::warning('[ClienteController::store] Erro de validação', [
                'errors' => $e->errors(),
                'dados' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[ClienteController::store] Erro ao criar cliente', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $request->all(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
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
        $modo = $this->getModo();
        
        Log::info('[ClienteController::show] Buscando cliente', [
            'cliente_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $cliente = $this->buscarClienteOrFail($id);

            Log::info('[ClienteController::show] Cliente encontrado', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente encontrado',
                'data' => $cliente,
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[ClienteController::show] Cliente não encontrado', [
                'cliente_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Cliente não encontrado',
            ], 404);
        } catch (\Exception $e) {
            Log::error('[ClienteController::show] Erro ao buscar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar cliente
     */
    public function update(Request $request, $id)
    {
        $modo = $this->getModo();
        
        Log::info('[ClienteController::update] Iniciando atualização', [
            'cliente_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $cliente = $this->buscarClienteOrFail($id);

            // 🔥 PASSO 1: Validação básica (sem unique para NIF ainda)
            $dados = $request->validate([
                'nome' => 'sometimes|required|string|max:255',
                'tipo' => 'nullable|in:consumidor_final,empresa',
                'nif' => 'nullable|string|max:20',
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

            if (isset($dados['nif'])) {
                $nifNormalizado = $this->validarENormalizarNIF($dados['nif'], $tipo);
                $dados['nif'] = $nifNormalizado;

                // 🔥 PASSO 3: Verifica unicidade após normalização
                if ($nifNormalizado !== null) {
                    $exists = $this->queryClientes()
                        ->where('nif', $nifNormalizado)
                        ->where('id', '!=', $cliente->id)
                        ->exists();

                    if ($exists) {
                        throw ValidationException::withMessages([
                            'nif' => 'Este NIF já está cadastrado'
                        ]);
                    }
                }
            } elseif (isset($dados['tipo']) && $dados['tipo'] !== $cliente->tipo) {
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
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente atualizado com sucesso',
                'data' => $cliente,
                'modo' => $modo,
            ]);

        } catch (ValidationException $e) {
            Log::warning('[ClienteController::update] Erro de validação', [
                'cliente_id' => $id,
                'errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[ClienteController::update] Cliente não encontrado', [
                'cliente_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Cliente não encontrado',
            ], 404);
        } catch (\Exception $e) {
            Log::error('[ClienteController::update] Erro ao atualizar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $request->all(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
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
        $modo = $this->getModo();
        
        Log::info('[ClienteController::destroy] Iniciando arquivamento', [
            'cliente_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $cliente = $this->buscarClienteOrFail($id);

            $cliente->delete();

            Log::info('[ClienteController::destroy] Cliente arquivado com sucesso', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente arquivado com sucesso',
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[ClienteController::destroy] Cliente não encontrado', [
                'cliente_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Cliente não encontrado',
            ], 404);
        } catch (\Exception $e) {
            Log::error('[ClienteController::destroy] Erro ao arquivar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao arquivar cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restaurar cliente
     */
    public function restore($id)
    {
        $modo = $this->getModo();
        
        Log::info('[ClienteController::restore] Iniciando restauração', [
            'cliente_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $cliente = $this->buscarClienteOrFail($id, true);

            if (!$cliente->trashed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente não está arquivado',
                    'error' => 'not_trashed'
                ], 400);
            }

            $cliente->restore();

            Log::info('[ClienteController::restore] Cliente restaurado com sucesso', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente restaurado com sucesso',
                'data' => $cliente,
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[ClienteController::restore] Cliente não encontrado', [
                'cliente_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Cliente não encontrado',
            ], 404);
        } catch (\Exception $e) {
            Log::error('[ClienteController::restore] Erro ao restaurar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao restaurar cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar clientes deletados (lixeira)
     */
    public function listDeleted(Request $request)
    {
        $modo = $this->getModo();
        
        Log::info('[ClienteController::listDeleted] Listando clientes deletados', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryClientesDeletados();

            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('nome', 'LIKE', "%{$request->search}%")
                      ->orWhere('nif', 'LIKE', "%{$request->search}%");
                });
            }

            $clientes = $query->orderBy('deleted_at', 'desc')
                ->paginate($request->per_page ?? 15);

            Log::info('[ClienteController::listDeleted] Clientes deletados listados', [
                'total' => $clientes->total(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Clientes deletados listados com sucesso',
                'data' => $clientes,
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::listDeleted] Erro ao listar clientes deletados', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar clientes deletados',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir permanentemente
     */
    public function forceDelete($id)
    {
        $modo = $this->getModo();
        
        Log::info('[ClienteController::forceDelete] Iniciando exclusão permanente', [
            'cliente_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $cliente = $this->buscarClienteOrFail($id, true);

            // Verificar se cliente está na lixeira
            if (!$cliente->trashed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente não está arquivado. Use o arquivamento primeiro.',
                    'error' => 'not_trashed'
                ], 400);
            }

            // Verificar se cliente tem dependências (ex: vendas, documentos)
            $temDependencias = $this->verificarDependencias($cliente);

            if ($temDependencias) {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível excluir permanentemente. Cliente possui documentos/vendas associados.',
                    'error' => 'has_dependencies'
                ], 409);
            }

            $cliente->forceDelete();

            Log::info('[ClienteController::forceDelete] Cliente excluído permanentemente', [
                'cliente_id' => $cliente->id,
                'nome' => $cliente->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente excluído permanentemente',
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[ClienteController::forceDelete] Cliente não encontrado', [
                'cliente_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Cliente não encontrado',
            ], 404);
        } catch (\Exception $e) {
            Log::error('[ClienteController::forceDelete] Erro ao excluir cliente permanentemente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ativar cliente
     */
    public function ativar($id)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            $cliente = $this->buscarClienteOrFail($id);
            $cliente->status = 'ativo';
            $cliente->save();

            Log::info('[ClienteController::ativar] Cliente ativado', [
                'cliente_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente ativado com sucesso',
                'data' => $cliente,
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::ativar] Erro ao ativar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao ativar cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Inativar cliente
     */
    public function inativar($id)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            $cliente = $this->buscarClienteOrFail($id);
            $cliente->status = 'inativo';
            $cliente->save();

            Log::info('[ClienteController::inativar] Cliente inativado', [
                'cliente_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente inativado com sucesso',
                'data' => $cliente,
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::inativar] Erro ao inativar cliente', [
                'cliente_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao inativar cliente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar clientes com trashed (todos)
     */
    public function indexWithTrashed(Request $request)
    {
        $modo = $this->getModo();
        
        try {
            $this->verificarAcessoUsuario();

            $query = $this->queryClientes()->withTrashed();

            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('nome', 'LIKE', "%{$request->search}%")
                      ->orWhere('nif', 'LIKE', "%{$request->search}%")
                      ->orWhere('email', 'LIKE', "%{$request->search}%");
                });
            }

            if ($request->tipo) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->status) {
                $query->where('status', $request->status);
            }

            $clientes = $query->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'message' => 'Clientes listados com sucesso (incluindo arquivados)',
                'data' => $clientes,
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[ClienteController::indexWithTrashed] Erro ao listar clientes', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar clientes',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}