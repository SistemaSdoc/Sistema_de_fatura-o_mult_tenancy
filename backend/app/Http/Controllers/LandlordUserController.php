<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\LandlordUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Empresa;
use Illuminate\Support\Facades\DB;

class LandlordUserController extends Controller
{
    /**
     * Construtor - aplica middleware de autenticação landlord
     */
    public function __construct()
    {
        $this->middleware('auth:landlord_api');
    }

    // ================= LISTAGEM =================

    /**
     * Lista todos os usuários do landlord (super admin vê todos, admin_empresa vê só os dele)
     */
    public function index(Request $request)
    {
        $user = Auth::guard('landlord')->user();

        $query = LandlordUser::on('landlord')->with('empresa');

        // Filtra por role se especificado
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        // Filtra por status
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    // ================= DETALHES =================

    /**
     * Mostra detalhes de um usuário
     */
    public function show(LandlordUser $landlordUser)
    {
        $this->authorize('view', $landlordUser);

        return response()->json([
            'success' => true,
            'data' => $landlordUser->load('empresa', 'tenantUser')
        ]);
    }

    /**
     * Mostra perfil do usuário logado
     */
    public function me(Request $request)
    {
        $user = Auth::guard('landlord')->user();

        return response()->json([
            'success' => true,
            'permissions' => $this->getPermissions($user)
        ]);
    }


    // ================= CRIAÇÃO =================

    /**
     * Cria novo usuário do landlord
     */
    public function store(Request $request)
    {
        $user = Auth::guard('landlord')->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:landlord.users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => ['required', Rule::in([
                LandlordUser::ROLE_SUPER_ADMIN
            ])],
            'empresa_id' => 'nullable|uuid|exists:landlord.empresas,id',
            'ativo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Validações de negócio

        // Cria usuário
        $novoUsuario = LandlordUser::create([
            'id' => (string) Str::uuid(),
            'empresa_id' => $request->empresa_id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'ativo' => $request->ativo ?? true,
        ]);

        // Se for admin_empresa, sincroniza com tenant automaticamente
        if ($novoUsuario->ehAdminEmpresa()) {
            try {
                $novoUsuario->sincronizarTenantUser();
            } catch (\Exception $e) {
                // Log erro, mas não falha a criação
                Log::warning('Falha ao sincronizar tenant user', [
                    'landlord_user_id' => $novoUsuario->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuário criado com sucesso',
            'data' => $novoUsuario->load('empresa')
        ], 201);
    }

    // ================= ATUALIZAÇÃO =================

    /**
     * Atualiza usuário
     */
public function update(Request $request, LandlordUser $landlordUser)
{
    $this->authorize('update', $landlordUser);

    $validator = Validator::make($request->all(), [
        'name' => 'sometimes|required|string|max:255',
        'email' => ['sometimes', 'required', 'email', Rule::unique('landlord.users', 'email')->ignore($landlordUser->id)],
        'role' => ['sometimes', 'required', Rule::in([
            LandlordUser::ROLE_SUPER_ADMIN
        ])],
        'ativo' => 'sometimes|boolean',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    // Não pode alterar a própria role (evita auto-rebaixamento acidental)
    $authUser = Auth::guard('landlord')->user();
    if ($landlordUser->id === $authUser->id && $request->has('role') && $request->role !== $landlordUser->role) {
        return response()->json([
            'success' => false,
            'message' => 'Não podes alterar a tua própria role'
        ], 403);
    }

    $landlordUser->update($validator->validated());

    return response()->json([
        'success' => true,
        'message' => 'Usuário atualizado com sucesso',
        'data' => $landlordUser->fresh()->load('empresa')
    ]);
}

    // ================= EXCLUSÃO =================

    /**
     * Remove usuário (soft delete)
     */
    public function destroy(LandlordUser $landlordUser)
    {
        $this->authorize('delete', $landlordUser);

        $user = Auth::guard('landlord')->user();

        // Não pode deletar a si mesmo
        if ($landlordUser->id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Você não pode deletar sua própria conta'
            ], 403);
        }

        // Desativa no tenant também
        if ($landlordUser->empresa_id) {
            try {
                $tenantUser = $landlordUser->tenantUser();
                $tenantUser?->update(['ativo' => false]);
            } catch (\Exception $e) {
                Log::warning('Falha ao desativar tenant user', [
                    'landlord_user_id' => $landlordUser->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $landlordUser->update(['ativo' => false]);
        // Ou $landlordUser->delete() para soft delete real

        return response()->json([
            'success' => true,
            'message' => 'Usuário desativado com sucesso'
        ]);
    }

    // ================= AÇÕES ESPECÍFICAS =================

    /**
     * Alterna status ativo/inativo
     */
    public function toggleStatus(LandlordUser $landlordUser)
    {
        $this->authorize('update', $landlordUser);

        // Não pode desativar a si mesmo
        if ($landlordUser->id === Auth::guard('landlord')->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Você não pode alterar seu próprio status'
            ], 403);
        }

        $landlordUser->update(['ativo' => !$landlordUser->ativo]);

        // Sincroniza com tenant
        if ($landlordUser->empresa_id) {
            try {
                $tenantUser = $landlordUser->tenantUser();
                $tenantUser?->update(['ativo' => $landlordUser->ativo]);
            } catch (\Exception $e) {
                Log::warning('Falha ao sincronizar status no tenant', [
                    'landlord_user_id' => $landlordUser->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => $landlordUser->ativo ? 'Usuário ativado' : 'Usuário desativado',
            'data' => $landlordUser
        ]);
    }

    /**
     * Reseta senha do usuário
     */
    public function resetPassword(Request $request, LandlordUser $landlordUser)
    {
        $this->authorize('update', $landlordUser);

        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $landlordUser->update([
            'password' => Hash::make($request->password)
        ]);

        // Opcional: enviar email notificando reset

        return response()->json([
            'success' => true,
            'message' => 'Senha resetada com sucesso'
        ]);
    }

    /**
     * Vincula usuário a empresa (transforma em admin_empresa)
     */
public function vincularEmpresa(Request $request, LandlordUser $landlordUser)
{
    $this->authorize('update', $landlordUser);

    $request->validate([
        'empresa_id' => 'required|uuid|exists:landlord.empresas,id',
    ]);

    // ✅ Faltava isto — vincular a empresa antes de sincronizar
    $landlordUser->update([
        'empresa_id' => $request->empresa_id,
        'role' => LandlordUser::ROLE_ADMIN_EMPRESA ?? $landlordUser->role, // ajusta à tua constante real, se existir
    ]);

    try {
        $landlordUser->sincronizarTenantUser();
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Usuário vinculado, mas falha ao criar no tenant: ' . $e->getMessage()
        ], 500);
    }

    return response()->json([
        'success' => true,
        'message' => 'Usuário vinculado à empresa com sucesso',
        'data' => $landlordUser->fresh()->load('empresa')
    ]);
}

    /**
     * Remove vínculo com empresa (volta a ser suporte ou super_admin)
     */
    public function desvincularEmpresa(LandlordUser $landlordUser)
    {
        $this->authorize('update', $landlordUser);

        if (!$landlordUser->empresa_id) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não está vinculado a nenhuma empresa'
            ], 422);
        }

        // Desativa no tenant
        try {
            $tenantUser = $landlordUser->tenantUser();
            $tenantUser?->delete(); // ou update(['ativo' => false])
        } catch (\Exception $e) {
            Log::warning('Falha ao desativar tenant user', [
                'landlord_user_id' => $landlordUser->id,
                'error' => $e->getMessage()
            ]);
        }

        $landlordUser->update([
            'empresa_id' => null,
            'role' => LandlordUser::ROLE_SUPORTE, // ou mantém role anterior
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Vínculo com empresa removido',
            'data' => $landlordUser
        ]);
    }

    // ================= HELPERS =================

    /**
     * Retorna permissões do usuário para frontend
     */
    private function getPermissions(LandlordUser $user): array
    {
        $perms = [
            'is_super_admin' => $user->ehSuperAdmin(),
            'is_admin_empresa' => $user->ehAdminEmpresa(),
            'is_suporte' => $user->ehSuporte,
            'can_create_empresa' => $user->podeCriarEmpresa(),
            'can_delete_empresa' => $user->podeDeletarEmpresa(),
            'can_view_all_empresas' => $user->podeVerRelatoriosGlobais(),
            'can_manage_users' => $user->ehSuperAdmin() || $user->ehAdminEmpresa(),
        ];

        if ($user->empresa_id) {
            $perms['empresa_id'] = $user->empresa_id;
            $perms['can_access_tenant'] = true;
        }

        return $perms;
    }

    // ================= PERFIL DO UTILIZADOR LOGADO =================

/**
 * Atualiza o nome do próprio utilizador logado
 */
public function atualizarPerfil(Request $request)
{
    $user = Auth::guard('landlord')->user();

    $validator = Validator::make($request->all(), [
        'name' => 'required|string|max:255',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    $user->update([
        'name' => $request->name,
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Perfil atualizado com sucesso',
        'data' => $user->fresh()
    ]);
}

/**
 * Altera a senha do próprio utilizador logado (exige senha atual)
 */
public function alterarSenhaPropria(Request $request)
{
    $user = Auth::guard('landlord')->user();

    $validator = Validator::make($request->all(), [
        'senha_atual' => 'required|string',
        'nova_senha' => 'required|string|min:8|confirmed',
    ], [], [
        'nova_senha' => 'nova senha',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    if (!Hash::check($request->senha_atual, $user->password)) {
        return response()->json([
            'success' => false,
            'message' => 'A senha atual está incorreta'
        ], 422);
    }

    $user->update([
        'password' => Hash::make($request->nova_senha),
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Senha alterada com sucesso'
    ]);
}

/**
 * Lista todos os utilizadores do tenant (de todas as empresas)
 */
public function listarTenantUsers()
{
    \Log::info('listarTenantUsers: Iniciando consulta', [
        'user_id' => Auth::guard('landlord_api')->id()
    ]);

    $user = Auth::guard('landlord_api')->user();
    if (!$user) {
        return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
    }

    try {
        // Busca todas as empresas ativas (ou todas, conforme necessidade)
        $empresas = Empresa::on('landlord')->where('status', 'ativo')->get();
        $tenantUsers = [];

        foreach ($empresas as $empresa) {
            $modo = $empresa->modo ?? 'colectivo'; // assume colectivo se não tiver
            $database = $empresa->db_name ?? null;

            \Log::debug('Processando empresa', [
                'empresa_id' => $empresa->id,
                'empresa_nome' => $empresa->nome,
                'modo' => $modo,
                'database' => $database
            ]);

            if ($modo === 'singular' && $database) {
                // -------------------------------
                // MODO SINGULAR: buscar na base tenant dedicada
                // -------------------------------
                try {
                    config(['database.connections.tenant.database' => $database]);
                    $users = DB::connection('tenant')->table('users')->get();

                    foreach ($users as $user) {
                        $user->empresa_nome = $empresa->nome;
                        $user->role = $user->role ?? 'user'; // fallback
                        $tenantUsers[] = $user;
                    }

                    \Log::info('Usuários encontrados (singular)', [
                        'empresa' => $empresa->nome,
                        'quantidade' => $users->count()
                    ]);

                } catch (\Exception $e) {
                    \Log::error('Erro ao buscar usuários (singular)', [
                        'empresa' => $empresa->nome,
                        'error' => $e->getMessage()
                    ]);
                }

            } elseif ($modo === 'colectivo') {
                // -------------------------------
                // MODO COLECTIVO: buscar na base shared
                // -------------------------------
                try {
                    $users = DB::connection('shared')
                        ->table('users')
                        ->where('empresa_id', $empresa->id) // ajuste o nome da coluna (pode ser 'tenant_id')
                        ->get();

                    foreach ($users as $user) {
                        $user->empresa_nome = $empresa->nome;
                        $user->role = $user->role ?? 'user'; // fallback
                        $tenantUsers[] = $user;
                    }

                    \Log::info('Usuários encontrados (colectivo)', [
                        'empresa' => $empresa->nome,
                        'quantidade' => $users->count()
                    ]);

                } catch (\Exception $e) {
                    \Log::error('Erro ao buscar usuários (colectivo)', [
                        'empresa' => $empresa->nome,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        \Log::info('listarTenantUsers: Consulta concluída', [
            'total_empresas' => $empresas->count(),
            'total_usuarios' => count($tenantUsers)
        ]);

        return response()->json([
            'success' => true,
            'data' => $tenantUsers
        ]);

    } catch (\Exception $e) {
        \Log::error('listarTenantUsers: Erro geral', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erro ao processar a requisição: ' . $e->getMessage()
        ], 500);
    }
}


public function listarSharedUsers()
{
    $user = Auth::guard('landlord_api')->user();
    if (!$user) {
        return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
    }

    try {
        // 1. Buscar utilizadores da base shared
        $users = DB::connection('shared')
            ->table('users')
            ->select('id', 'name', 'email', 'tenant_id', 'role', 'created_at')
            ->get();

        // 2. Buscar empresas da base landlord (apenas id e nome)
        $empresas = DB::connection('landlord')
            ->table('empresas')
            ->select('id', 'nome')
            ->get()
            ->keyBy('id'); // transforma em array associativo [id => empresa]

        // 3. Combinar: adicionar o nome da empresa a cada utilizador
        $users->transform(function ($user) use ($empresas) {
            $empresa = $empresas->get($user->tenant_id);
            $user->empresa_nome = $empresa ? $empresa->nome : null;
            return $user;
        });

        // (Opcional) Mapear role para rótulo legível
        $roleLabels = [
            'admin' => 'empresa_admin',
            'contabilista' => 'contabilista',
            'operador' => 'Operador',
        ];
        $users->transform(function ($user) use ($roleLabels) {
            $user->role_label = $roleLabels[$user->role] ?? $user->role;
            return $user;
        });

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    } catch (\Throwable $e) {
        Log::warning('listarSharedUsers: shared indisponível, devolvendo lista vazia', [
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [],
            'warning' => 'Base de dados shared indisponível neste ambiente.',
        ]);
    }
}

}
