<?php

namespace App\Http\Controllers;

use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;

class UserController extends Controller
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct()
    {
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');

        Log::debug('[UserController] Inicializado', [
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
     | VERIFICAÇÃO DE ACESSO
     | ================================================================== */

protected function verificarAcessoUsuario(): void
{
    Log::debug('[UserController] Verificando acesso');

    $this->empresa = app('current.empresa');
    if (!$this->empresa) {
        Log::error('[UserController] Empresa não identificada.');
        throw new \Exception('Empresa não identificada.', 400);
    }

    $this->modo = $this->empresa->modo ?? 'colectivo';

    // ⚠️ CORRIGIDO: era 'landlord', mas o login (normal e Google)
    // sempre autentica no guard 'landlord_api'. Guards diferentes
    // usam chaves de sessão diferentes, então 'landlord' nunca
    // encontrava o usuário logado.
    $landlordUser = Auth::guard('landlord_api')->user();

    if (!$landlordUser) {
        $landlordId = session('landlord_user_id');
        if ($landlordId) {
            $landlordUser = LandlordUser::find($landlordId);
        }
    }

    if (!$landlordUser) {
        Log::error('[UserController] Utilizador landlord não autenticado.');
        throw new \Exception('Usuário não autenticado.', 401);
    }

    $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
    if (!$tenantUser) {
        Log::error('[UserController] Utilizador tenant não encontrado.', [
            'email' => $landlordUser->email,
        ]);
        throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
    }

    $this->tenantUser = $tenantUser;

    Log::info('[UserController] Acesso verificado com sucesso', [
        'modo' => $this->modo,
        'user_id' => $tenantUser->id,
        'email' => $tenantUser->email,
    ]);
}

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

    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    protected function getUserRole($user): string
    {
        if ($this->isColectivo()) {
            $role = $user->getRoleNoTenant($this->empresa?->id);
            return $role ?? 'usuario';
        }
        return $user->role ?? 'usuario';
    }

    /**
     * Verifica se o usuário é administrador
     */
    private function isAdmin($user): bool
    {
        if (!$user) {
            return false;
        }

        if (isset($user->role_global) && $user->role_global === 'super_admin') {
            return true;
        }

        return $user->role === 'admin';
    }

    /* =====================================================================
     | HELPERS: Models e Queries
     | ================================================================== */

    protected function userModel()
    {
        return $this->isColectivo() ? new SharedUser() : new TenantUser();
    }

    protected function queryUsers()
    {
        if ($this->isColectivo()) {
            return SharedUser::doTenant();
        }
        return TenantUser::query();
    }

    protected function buscarUser(string $id)
    {
        if ($this->isColectivo()) {
            return SharedUser::doTenant()->where('id', $id)->first();
        }
        return TenantUser::where('id', $id)->first();
    }

    protected function buscarUserOrFail(string $id)
    {
        if ($this->isColectivo()) {
            return SharedUser::doTenant()->where('id', $id)->firstOrFail();
        }
        return TenantUser::where('id', $id)->firstOrFail();
    }

    protected function obterEmpresaAtual(): ?array
    {
        Log::info('[obterEmpresaAtual] Iniciando', [
            'tem_empresa_no_contexto' => !is_null($this->empresa),
            'session_tenant_id' => session('tenant_id'),
            'modo_atual' => $this->modo,
        ]);

        if ($this->empresa) {
            Log::info('[obterEmpresaAtual] Usando empresa do contexto', [
                'empresa_id' => $this->empresa->id,
                'nome' => $this->empresa->nome,
                'campos_bancarios' => [
                    'nome_banco' => $this->empresa->nome_banco ?? 'null',
                    'iban' => $this->empresa->iban ?? 'null',
                    'numero_conta' => $this->empresa->numero_conta ?? 'null',
                ],
            ]);

            return [
                'id' => $this->empresa->id,
                'nome' => $this->empresa->nome,
                'nif' => $this->empresa->nif,
                'email' => $this->empresa->email,
                'telefone' => $this->empresa->telefone,
                'endereco' => $this->empresa->endereco,
                'subdomain' => $this->empresa->subdomain,
                'logo' => $this->empresa->logo,
                'regime_fiscal' => $this->empresa->regime_fiscal ?? 'simplificado',
                'sujeito_iva' => (bool) $this->empresa->sujeito_iva,
                'iva_padrao' => (float) ($this->empresa->iva_padrao ?? 0),
                'status' => $this->empresa->status ?? 'ativo',
                'data_registro' => $this->empresa->data_registro ? date('Y-m-d H:i:s', strtotime($this->empresa->data_registro)) : null,
                'nome_banco' => $this->empresa->nome_banco ?? null,
                'iban' => $this->empresa->iban ?? null,
                'numero_conta' => $this->empresa->numero_conta ?? null,
                'created_at' => $this->empresa->created_at ? date('Y-m-d H:i:s', strtotime($this->empresa->created_at)) : null,
                'updated_at' => $this->empresa->updated_at ? date('Y-m-d H:i:s', strtotime($this->empresa->updated_at)) : null,
                'modo' => $this->modo,
            ];
        }

        $dbName = Config::get('database.connections.tenant.database');
        Log::info('[obterEmpresaAtual] Buscando empresa por db_name', [
            'db_name' => $dbName,
            'tenant_id' => session('tenant_id'),
        ]);

        if ($dbName) {
            $empresa = Empresa::on('landlord')
                ->where('db_name', $dbName)
                ->orWhere('id', session('tenant_id'))
                ->first();

            if ($empresa) {
                Log::info('[obterEmpresaAtual] Empresa encontrada no banco', [
                    'empresa_id' => $empresa->id,
                    'nome' => $empresa->nome,
                    'campos_bancarios' => [
                        'nome_banco' => $empresa->nome_banco ?? 'null',
                        'iban' => $empresa->iban ?? 'null',
                        'numero_conta' => $empresa->numero_conta ?? 'null',
                    ],
                    'colunas_existentes' => array_keys($empresa->getAttributes()),
                ]);

                $this->empresa = $empresa;
                $this->modo = $empresa->modo ?? 'colectivo';

                return [
                    'id' => $empresa->id,
                    'nome' => $empresa->nome,
                    'nif' => $empresa->nif,
                    'email' => $empresa->email,
                    'telefone' => $empresa->telefone,
                    'endereco' => $empresa->endereco,
                    'subdomain' => $empresa->subdomain,
                    'logo' => $empresa->logo,
                    'regime_fiscal' => $empresa->regime_fiscal ?? 'simplificado',
                    'sujeito_iva' => (bool) $empresa->sujeito_iva,
                    'iva_padrao' => (float) ($empresa->iva_padrao ?? 0),
                    'status' => $empresa->status ?? 'ativo',
                    'data_registro' => $empresa->data_registro ? date('Y-m-d H:i:s', strtotime($empresa->data_registro)) : null,
                    'nome_banco' => $empresa->nome_banco ?? null,
                    'iban' => $empresa->iban ?? null,
                    'numero_conta' => $empresa->numero_conta ?? null,
                    'created_at' => $empresa->created_at ? date('Y-m-d H:i:s', strtotime($empresa->created_at)) : null,
                    'updated_at' => $empresa->updated_at ? date('Y-m-d H:i:s', strtotime($empresa->updated_at)) : null,
                    'modo' => $this->modo,
                ];
            } else {
                Log::warning('[obterEmpresaAtual] Empresa NÃO encontrada', [
                    'db_name' => $dbName,
                    'tenant_id' => session('tenant_id'),
                ]);
            }
        } else {
            Log::warning('[obterEmpresaAtual] db_name vazio na configuração');
        }

        Log::warning('[obterEmpresaAtual] Retornando null');
        return null;
    }
    /* =====================================================================
     | MÉTODOS DO CONTROLLER
     | ================================================================== */

    public function me(Request $request)
    {
        $modo = $this->getModo();

        Log::info('[UserController::me] Método chamado', [
            'modo' => $modo,
            'empresa_id' => $this->empresa?->id,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $user = $this->tenantUser;

            Log::info('[UserController::me] User carregado', [
                'user_id' => $user->id,
                'user_name' => $user->name ?? $user->nome,
                'ativo' => $user->ativo,
                'modo' => $modo,
            ]);

            $empresaData = $this->obterEmpresaAtual();

            if (!$empresaData) {
                Log::warning('[UserController::me] Empresa não encontrada', [
                    'modo' => $modo,
                ]);
            }

            $fmt = fn($date) => $date ? date('Y-m-d H:i:s', strtotime($date)) : null;

            $userData = [
                'id' => $user->id,
                'name' => $user->name ?? $user->nome,
                'email' => $user->email,
                'role' => $this->getUserRole($user),
                'ativo' => (bool) $user->ativo,
                'printer_ip' => $user->printer_ip ?? null,
                'ultimo_login' => $fmt($user->ultimo_login ?? null),
                'created_at' => $fmt($user->created_at ?? null),
                'updated_at' => $fmt($user->updated_at ?? null),
                'email_verified_at' => $fmt($user->email_verified_at ?? null),
                'modo' => $modo,
            ];

            $empresaDataCompleta = null;
            if ($empresaData) {
                $empresaCompleta = $this->empresa ?? Empresa::on('landlord')->find($this->empresa?->id);

                if ($empresaCompleta) {
                    $empresaDataCompleta = [
                        'id' => $empresaCompleta->id,
                        'nome' => $empresaCompleta->nome,
                        'nif' => $empresaCompleta->nif,
                        'email' => $empresaCompleta->email,
                        'telefone' => $empresaCompleta->telefone,
                        'endereco' => $empresaCompleta->endereco,
                        'subdomain' => $empresaCompleta->subdomain,
                        'logo' => $empresaCompleta->logo,
                        'regime_fiscal' => $empresaCompleta->regime_fiscal ?? 'simplificado',
                        'sujeito_iva' => (bool) $empresaCompleta->sujeito_iva,
                        'iva_padrao' => (float) ($empresaCompleta->iva_padrao ?? 0),
                        'status' => $empresaCompleta->status ?? 'ativo',
                        'data_registro' => $empresaCompleta->data_registro ? date('Y-m-d H:i:s', strtotime($empresaCompleta->data_registro)) : null,
                        'nome_banco' => $empresaCompleta->nome_banco ?? null,
                        'iban' => $empresaCompleta->iban ?? null,
                        'numero_conta' => $empresaCompleta->numero_conta ?? null,
                        'created_at' => $empresaCompleta->created_at ? date('Y-m-d H:i:s', strtotime($empresaCompleta->created_at)) : null,
                        'updated_at' => $empresaCompleta->updated_at ? date('Y-m-d H:i:s', strtotime($empresaCompleta->updated_at)) : null,
                    ];
                } else {
                    $empresaDataCompleta = $empresaData;
                }
            }

            $response = [
                'success' => true,
                'message' => 'Utilizador carregado com sucesso',
                'user' => $userData,
                'empresa' => $empresaDataCompleta,
                'modo' => $modo,
            ];

            Log::info('[UserController::me] Resposta enviada', [
                'user_id' => $user->id,
                'modo' => $modo,
            ]);

            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('[UserController::me] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'modo' => $modo,
            ], 401);
        }
    }

    public function index(Request $request)
    {
        $modo = $this->getModo();

        Log::info('[UserController::index] Listando utilizadores', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $currentUser = $this->tenantUser;

            if (!$this->isAdmin($currentUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado. Apenas administradores podem listar utilizadores.',
                    'modo' => $modo,
                ], 403);
            }

            $query = $this->queryUsers();

            if ($request->has('ativo')) {
                $query->where('ativo', $request->boolean('ativo'));
            }

            if ($request->has('role')) {
                $query->where('role', $request->role);
            }

            $users = $query->orderBy('name')->get();

            return response()->json([
                'success' => true,
                'message' => 'Lista de utilizadores carregada com sucesso',
                'data' => $users,
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[UserController::index] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar utilizadores',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function show($id)
    {
        $modo = $this->getModo();

        Log::info('[UserController::show] Buscando utilizador', [
            'user_id' => $id,
            'current_user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $currentUser = $this->tenantUser;

            $user = $this->buscarUserOrFail($id);

            if (!$this->isAdmin($currentUser) && $currentUser->id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado',
                    'modo' => $modo,
                ], 403);
            }

            return response()->json([
                'success' => true,
                'message' => 'Utilizador carregado com sucesso',
                'data' => $user,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilizador não encontrado',
                'error' => 'not_found',
                'modo' => $modo,
            ], 404);
        } catch (\Exception $e) {
            Log::error('[UserController::show] Erro', [
                'user_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar utilizador',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $modo = $this->getModo();

        Log::info('[UserController::store] Criando utilizador', [
            'user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $currentUser = $this->tenantUser;

            if (!$this->isAdmin($currentUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas administradores podem criar utilizadores',
                    'modo' => $modo,
                ], 403);
            }

            $dados = $request->validate([
                'name' => 'required|string|max:255',
                'email' => [
                    'required',
                    'email',
                    function ($attribute, $value, $fail) {
                        $exists = $this->queryUsers()->where('email', $value)->exists();
                        if ($exists) {
                            $fail('Este email já está cadastrado.');
                        }
                    },
                ],
                'password' => 'required|string|min:6',
                'role' => ['required', Rule::in(['admin', 'operador', 'contablista', 'gestor'])],
                'ativo' => 'nullable|boolean',
            ]);

            $dados['ativo'] = $dados['ativo'] ?? true;
            $dados['password'] = Hash::make($dados['password']);

            if ($this->isColectivo()) {
                $dados['tenant_id'] = $this->empresa->id;
                $user = SharedUser::create($dados);

                Log::info('[UserController::store] Utilizador criado no modo colectivo', [
                    'user_id' => $user->id,
                    'tenant_id' => $this->empresa->id,
                    'modo' => $modo,
                ]);
            } else {
                $user = TenantUser::create($dados);
            }

            Log::info('[UserController::store] Utilizador criado com sucesso', [
                'user_id' => $user->id,
                'modo' => $modo,
            ]);

            AuditLogger::log('Utilizador Criado', '👥', ['area' => 'Utilizadores', 'detalhes' => ['user_id' => $user->id, 'user_email' => $user->email]]);

            return response()->json([
                'success' => true,
                'message' => 'Utilizador criado com sucesso',
                'data' => $user,
                'modo' => $modo,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
                'modo' => $modo,
            ], 422);
        } catch (\Exception $e) {
            Log::error('[UserController::store] Erro', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar utilizador',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $modo = $this->getModo();

        Log::info('[UserController::update] Atualizando utilizador', [
            'user_id' => $id,
            'current_user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $currentUser = $this->tenantUser;

            $user = $this->buscarUserOrFail($id);

            if (!$this->isAdmin($currentUser) && $currentUser->id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado',
                    'modo' => $modo,
                ], 403);
            }

            $dados = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'email' => [
                    'sometimes',
                    'required',
                    'email',
                    function ($attribute, $value, $fail) use ($user) {
                        $exists = $this->queryUsers()
                            ->where('email', $value)
                            ->where('id', '!=', $user->id)
                            ->exists();
                        if ($exists) {
                            $fail('Este email já está cadastrado.');
                        }
                    },
                ],
                'password' => 'nullable|string|min:6',
                'role' => ['sometimes', 'required', Rule::in(['admin', 'operador', 'contablista', 'gestor'])],
                'ativo' => 'nullable|boolean',
                'printer_ip' => 'nullable|string|max:255',
            ]);

            if (isset($dados['role']) && !$this->isAdmin($currentUser)) {
                unset($dados['role']);
            }

            if (!empty($dados['password'])) {
                $dados['password'] = Hash::make($dados['password']);
            } else {
                unset($dados['password']);
            }

            $user->update($dados);

            Log::info('[UserController::update] Utilizador atualizado com sucesso', [
                'user_id' => $user->id,
                'modo' => $modo,
            ]);

            AuditLogger::log('Utilizador Editado', '✏️', ['area' => 'Utilizadores', 'detalhes' => ['user_id' => $user->id, 'campos_alterados' => array_keys($dados)]]);

            return response()->json([
                'success' => true,
                'message' => 'Utilizador atualizado com sucesso',
                'data' => $user->fresh(),
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilizador não encontrado',
                'error' => 'not_found',
                'modo' => $modo,
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors(),
                'modo' => $modo,
            ], 422);
        } catch (\Exception $e) {
            Log::error('[UserController::update] Erro', [
                'user_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar utilizador',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function destroy($id)
    {
        $modo = $this->getModo();

        Log::info('[UserController::destroy] Eliminando utilizador', [
            'user_id' => $id,
            'current_user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $currentUser = $this->tenantUser;

            if (!$this->isAdmin($currentUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas administradores podem eliminar utilizadores',
                    'modo' => $modo,
                ], 403);
            }

            $user = $this->buscarUserOrFail($id);

            if ($currentUser->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Não pode eliminar a sua própria conta',
                    'modo' => $modo,
                ], 403);
            }

            // ⭐ No modo colectivo, o user tem tenant_id diretamente
            // ⭐ Não precisa de tabela pivot separada

            $user->delete();

            Log::info('[UserController::destroy] Utilizador eliminado com sucesso', [
                'user_id' => $id,
                'modo' => $modo,
            ]);

            AuditLogger::log('Utilizador Deletado', '❌', ['area' => 'Utilizadores', 'detalhes' => ['user_id' => $id]]);

            return response()->json([
                'success' => true,
                'message' => 'Utilizador eliminado com sucesso',
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilizador não encontrado',
                'error' => 'not_found',
                'modo' => $modo,
            ], 404);
        } catch (\Exception $e) {
            Log::error('[UserController::destroy] Erro', [
                'user_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao eliminar utilizador',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function atualizarUltimoLogin($id)
    {
        $modo = $this->getModo();

        Log::info('[UserController::atualizarUltimoLogin] Atualizando último login', [
            'user_id' => $id,
            'current_user_id' => $this->getUserId(),
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            $currentUser = $this->tenantUser;

            $user = $this->buscarUserOrFail($id);

            if (!$this->isAdmin($currentUser) && $currentUser->id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado',
                    'modo' => $modo,
                ], 403);
            }

            $user->ultimo_login = now();
            $user->save();

            Log::info('[UserController::atualizarUltimoLogin] Último login atualizado', [
                'user_id' => $user->id,
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Último login atualizado com sucesso',
                'data' => $user,
                'modo' => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilizador não encontrado',
                'error' => 'not_found',
                'modo' => $modo,
            ], 404);
        } catch (\Exception $e) {
            Log::error('[UserController::atualizarUltimoLogin] Erro', [
                'user_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar último login',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }

    public function create()
    {
        $modo = $this->getModo();

        Log::info('[UserController::create] Dados para criação de usuário', [
            'modo' => $modo,
        ]);

        try {
            $this->verificarAcessoUsuario();

            // ✅ CORRETO - $this->tenantUser
            $currentUser = $this->tenantUser;

            if (!$this->isAdmin($currentUser)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado',
                    'modo' => $modo,
                ], 403);
            }

            return response()->json([
                'success' => true,
                'message' => 'Dados para criação de usuário',
                'data' => [
                    'roles' => ['admin', 'operador', 'contablista', 'gestor'],
                ],
                'modo' => $modo,
            ]);
        } catch (\Exception $e) {
            Log::error('[UserController::create] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dados',
                'error' => $e->getMessage(),
                'modo' => $modo,
            ], 500);
        }
    }
}
