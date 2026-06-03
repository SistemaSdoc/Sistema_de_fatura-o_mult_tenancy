<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Landlord\LandlordUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Empresa;

class LandlordUserController extends Controller
{
    /**
     * Construtor - aplica middleware de autenticação landlord
     */
    public function __construct()
    {
        $this->middleware('auth:landlord');
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
                LandlordUser::ROLE_SUPER_ADMIN,
                LandlordUser::ROLE_SUPORTE
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

        $user = Auth::guard('landlord')->user();        
        

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

        $user = Auth::guard('landlord')->user();

        // Sincroniza com tenant
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
            'data' => $landlordUser->load('empresa')
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
}