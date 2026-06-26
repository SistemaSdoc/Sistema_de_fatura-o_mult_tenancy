<?php

namespace App\Http\Controllers;

use App\Models\Shared\Fornecedor as SharedFornecedor;
use App\Models\Tenant\Fornecedor as TenantFornecedor;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class FornecedorController extends Controller
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[FornecedorController] Inicializado', [
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
        Log::debug('[FornecedorController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[FornecedorController] Empresa não identificada.');
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
            Log::error('[FornecedorController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[FornecedorController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[FornecedorController] Acesso verificado com sucesso', [
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

    protected function fornecedorModel()
    {
        return $this->isColectivo() ? new SharedFornecedor() : new TenantFornecedor();
    }

    /**
     * Query com scope para fornecedores (apenas colectivo)
     */
    protected function queryFornecedores(bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedFornecedor::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query;
        }

        if ($comTrashed) {
            return TenantFornecedor::withTrashed();
        }
        return TenantFornecedor::query();
    }

    /**
     * Query com scope para fornecedores deletados (apenas colectivo)
     */
    protected function queryFornecedoresDeletados()
    {
        if ($this->isColectivo()) {
            return SharedFornecedor::doTenant()->onlyTrashed();
        }
        return TenantFornecedor::onlyTrashed();
    }

    /**
     * Busca fornecedor com scope (apenas colectivo)
     */
    protected function buscarFornecedor(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedFornecedor::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->first();
        }

        if ($comTrashed) {
            return TenantFornecedor::withTrashed()->where('id', $id)->first();
        }
        return TenantFornecedor::where('id', $id)->first();
    }

    /**
     * Busca fornecedor com scope e lança exceção se não encontrado
     */
    protected function buscarFornecedorOrFail(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedFornecedor::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->firstOrFail();
        }

        if ($comTrashed) {
            return TenantFornecedor::withTrashed()->where('id', $id)->firstOrFail();
        }
        return TenantFornecedor::where('id', $id)->firstOrFail();
    }

    /**
     * Verifica se NIF já existe no tenant
     */
    protected function nifExisteNoTenant(string $nif, ?string $excluirId = null): bool
    {
        $query = $this->queryFornecedores();
        
        if ($excluirId) {
            $query->where('id', '!=', $excluirId);
        }
        
        return $query->where('nif', $nif)->exists();
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
     * Valida e normaliza NIF/BI
     */
    private function validarENormalizarNIF(?string $nif): ?string
    {
        if (empty($nif)) {
            return null;
        }

        $clean = preg_replace('/[^a-zA-Z0-9]/', '', $nif);
        
        // NIF: 10 dígitos
        if (preg_match('/^[0-9]{10}$/', $clean)) {
            return $clean;
        }
        
        // BI: 9 números + 2 letras + 3 números
        if (preg_match('/^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/', $clean)) {
            return $clean;
        }
        
        throw new \Illuminate\Validation\ValidationException(
            \Illuminate\Support\Facades\Validator::make([], [
                'nif' => 'O NIF deve ter 10 dígitos ou o BI deve ter 9 números, 2 letras e 3 números (ex: 123456789AB123)'
            ])
        );
    }

    /* =====================================================================
     | MÉTODOS DO CONTROLLER
     | ================================================================== */

    /**
     * Listar fornecedores ativos (não deletados)
     */
    public function index()
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::index] Listando fornecedores', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ QUERY COM SCOPE
            $fornecedores = $this->queryFornecedores()->get();

            return response()->json([
                'success' => true,
                'message' => 'Lista de fornecedores carregada com sucesso',
                'data' => $fornecedores,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::index] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar fornecedores',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar TODOS os fornecedores (ativos + deletados)
     */
    public function indexWithTrashed()
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::indexWithTrashed] Listando todos os fornecedores', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ QUERY COM SCOPE (com trashed)
            $fornecedores = $this->queryFornecedores(true)->get();

            return response()->json([
                'success' => true,
                'message' => 'Lista completa de fornecedores (incluindo deletados)',
                'data' => $fornecedores,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::indexWithTrashed] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar fornecedores',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar APENAS fornecedores deletados (lixeira)
     */
    public function indexOnlyTrashed()
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::indexOnlyTrashed] Listando fornecedores deletados', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ QUERY COM SCOPE (apenas deletados)
            $fornecedores = $this->queryFornecedoresDeletados()->get();

            return response()->json([
                'success' => true,
                'message' => 'Lista de fornecedores na lixeira',
                'data' => $fornecedores,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::indexOnlyTrashed] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar fornecedores deletados',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar fornecedor específico
     */
    public function show($id)
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::show] Buscando fornecedor', [
            'fornecedor_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ BUSCAR COM SCOPE
            $fornecedor = $this->buscarFornecedorOrFail($id);

            return response()->json([
                'success' => true,
                'message' => 'Fornecedor carregado com sucesso',
                'data' => $fornecedor,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fornecedor não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::show] Erro', [
                'fornecedor_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar fornecedor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar novo fornecedor
     */
    public function store(Request $request)
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::store] Criando fornecedor', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
            'dados' => $request->except(['password', 'password_confirmation']),
        ]);

        try {
            $this->verificarAcessoUsuario();

            $dados = $request->validate([
                'nome'     => 'required|string|max:255',
                'nif'      => [
                    'required',
                    'string',
                    'max:14',
                    function ($attribute, $value, $fail) {
                        try {
                            $this->validarENormalizarNIF($value);
                        } catch (\Exception $e) {
                            $fail($e->getMessage());
                        }
                    },
                ],
                'telefone' => 'nullable|string|max:20',
                'email'    => 'nullable|email|max:255',
                'endereco' => 'nullable|string',
                'tipo'     => 'nullable|in:Nacional,Internacional',
                'status'   => 'nullable|in:ativo,inativo',
            ], [
                'nif.required' => 'O NIF/BI é obrigatório',
            ]);

            // Normaliza NIF
            $dados['nif'] = $this->validarENormalizarNIF($dados['nif']);

            // ⭐ VERIFICAR UNICIDADE NO TENANT
            if ($this->nifExisteNoTenant($dados['nif'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este NIF/BI já está cadastrado nesta empresa.',
                    'error' => 'nif_duplicado'
                ], 422);
            }

            // Verificar email único no tenant
            if (!empty($dados['email']) && $this->queryFornecedores()->where('email', $dados['email'])->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este email já está cadastrado nesta empresa.',
                    'error' => 'email_duplicado'
                ], 422);
            }

            $dados['user_id'] = $this->getUserId();
            $dados['tipo']    = $dados['tipo'] ?? 'Nacional';
            $dados['status']  = $dados['status'] ?? 'ativo';

            // ⭐ ADICIONAR TENANT_ID (apenas para colectivo)
            if ($this->isColectivo()) {
                $dados['tenant_id'] = $this->empresa->id;
            }

            // ⭐ USAR O MODEL CORRETO
            if ($this->isColectivo()) {
                $fornecedor = SharedFornecedor::create($dados);
            } else {
                $fornecedor = TenantFornecedor::create($dados);
            }

            Log::info('[FornecedorController::store] Fornecedor criado com sucesso', [
                'fornecedor_id' => $fornecedor->id,
                'nome' => $fornecedor->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Fornecedor criado com sucesso',
                'data' => $fornecedor,
                'modo' => $modo,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::store] Erro', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar fornecedor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar fornecedor
     */
    public function update(Request $request, $id)
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::update] Atualizando fornecedor', [
            'fornecedor_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $fornecedor = $this->buscarFornecedorOrFail($id);

            $dados = $request->validate([
                'nome'     => 'sometimes|required|string|max:255',
                'nif'      => [
                    'sometimes',
                    'required',
                    'string',
                    'max:14',
                    function ($attribute, $value, $fail) {
                        try {
                            $this->validarENormalizarNIF($value);
                        } catch (\Exception $e) {
                            $fail($e->getMessage());
                        }
                    },
                ],
                'telefone' => 'nullable|string|max:30',
                'email'    => 'nullable|email|max:255',
                'endereco' => 'nullable|string',
                'tipo'     => 'nullable|in:Nacional,Internacional',
                'status'   => 'nullable|in:ativo,inativo',
            ]);

            // Normaliza NIF se fornecido
            if (isset($dados['nif'])) {
                $dados['nif'] = $this->validarENormalizarNIF($dados['nif']);
                
                // Verificar unicidade no tenant (excluindo o próprio)
                if ($this->nifExisteNoTenant($dados['nif'], $id)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Este NIF/BI já está cadastrado nesta empresa.',
                        'error' => 'nif_duplicado'
                    ], 422);
                }
            }

            // Verificar email único no tenant (excluindo o próprio)
            if (!empty($dados['email']) && $this->queryFornecedores()->where('email', $dados['email'])->where('id', '!=', $id)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este email já está cadastrado nesta empresa.',
                    'error' => 'email_duplicado'
                ], 422);
            }

            // Normalização extra
            if (isset($dados['tipo'])) {
                $dados['tipo'] = ucfirst(strtolower($dados['tipo']));
            }

            $fornecedor->update($dados);

            Log::info('[FornecedorController::update] Fornecedor atualizado com sucesso', [
                'fornecedor_id' => $fornecedor->id,
                'nome' => $fornecedor->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message'    => 'Fornecedor atualizado com sucesso',
                'data' => $fornecedor->fresh(),
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fornecedor não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::update] Erro', [
                'fornecedor_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar fornecedor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soft Delete - Mover fornecedor para a lixeira
     */
    public function destroy($id)
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::destroy] Movendo fornecedor para lixeira', [
            'fornecedor_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $fornecedor = $this->buscarFornecedorOrFail($id);

            // Verifica se tem compras associadas
            if ($fornecedor->compras()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível mover para a lixeira: este fornecedor tem compras associadas.',
                    'error'   => 'fornecedor_has_compras'
                ], 422);
            }

            $fornecedor->delete();

            Log::info('[FornecedorController::destroy] Fornecedor movido para lixeira', [
                'fornecedor_id' => $id,
                'nome' => $fornecedor->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Fornecedor movido para a lixeira com sucesso',
                'data' => $fornecedor,
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fornecedor não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::destroy] Erro', [
                'fornecedor_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao mover fornecedor para lixeira',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restaurar fornecedor deletado
     */
    public function restore($id)
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::restore] Restaurando fornecedor', [
            'fornecedor_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ BUSCAR DELETADO COM SCOPE
            if ($this->isColectivo()) {
                $fornecedor = SharedFornecedor::doTenant()->onlyTrashed()->where('id', $id)->firstOrFail();
            } else {
                $fornecedor = TenantFornecedor::onlyTrashed()->where('id', $id)->firstOrFail();
            }

            $fornecedor->restore();

            Log::info('[FornecedorController::restore] Fornecedor restaurado com sucesso', [
                'fornecedor_id' => $fornecedor->id,
                'nome' => $fornecedor->nome,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Fornecedor restaurado com sucesso',
                'data' => $fornecedor,
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fornecedor não encontrado na lixeira',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::restore] Erro', [
                'fornecedor_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao restaurar fornecedor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deletar permanentemente
     */
    public function forceDelete($id)
    {
        $modo = $this->getModo();
        
        Log::info('[FornecedorController::forceDelete] Deletando permanentemente', [
            'fornecedor_id' => $id,
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ⭐ BUSCAR DELETADO COM SCOPE
            if ($this->isColectivo()) {
                $fornecedor = SharedFornecedor::doTenant()->onlyTrashed()->where('id', $id)->firstOrFail();
            } else {
                $fornecedor = TenantFornecedor::onlyTrashed()->where('id', $id)->firstOrFail();
            }

            // Verificar se tem compras (mesmo deletadas)
            if ($fornecedor->compras()->withTrashed()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível deletar permanentemente: este fornecedor tem compras associadas.',
                    'error'   => 'fornecedor_has_compras'
                ], 422);
            }

            $fornecedor->forceDelete();

            Log::info('[FornecedorController::forceDelete] Fornecedor removido permanentemente', [
                'fornecedor_id' => $id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Fornecedor removido permanentemente',
                'modo' => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fornecedor não encontrado na lixeira',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[FornecedorController::forceDelete] Erro', [
                'fornecedor_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao deletar permanentemente',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}