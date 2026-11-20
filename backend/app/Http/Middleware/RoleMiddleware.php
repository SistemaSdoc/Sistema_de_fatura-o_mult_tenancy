<?php

namespace App\Http\Middleware;

use App\Models\Empresa;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Valida que o utilizador autenticado (guards landlord) é MEMBRO ATIVO da
 * empresa do pedido e tem uma das roles exigidas.
 *
 * Uso: ->middleware('role:admin,gestor')
 * Deve correr DEPOIS de resolve.tenant.
 */
class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // 1. Autenticação (landlord_api ou landlord)
        $guard = Auth::guard('landlord_api')->check()
            ? Auth::guard('landlord_api')
            : Auth::guard('landlord');

        if (!$guard->check()) {
            Log::warning('[ROLE] Não autenticado', ['path' => $request->path()]);
            return response()->json(['message' => 'Não autorizado'], 401);
        }

        $landlordUser = $guard->user();

        // 2. Empresa do pedido: a resolvida pelo ResolveTenant; a sessão é só fallback
        $empresa = $request->attributes->get('current_empresa');

        if (!$empresa && session('tenant_id')) {
            $empresa = Empresa::on('landlord')->find(session('tenant_id'));
        }

        if (!$empresa) {
            Log::warning('[ROLE] Tenant não identificado', ['path' => $request->path()]);
            return response()->json(['message' => 'Tenant não identificado'], 401);
        }

        // 3. Utilizador no tenant
        $user = $this->getTenantUser($landlordUser->email, $empresa);

        if (!$user) {
            Log::warning('[ROLE] Utilizador não pertence ao tenant', [
                'landlord_user_id' => $landlordUser->id,
                'tenant_id'        => $empresa->id,
                'path'             => $request->path(),
            ]);
            return response()->json(['message' => 'Utilizador não pertence a esta empresa'], 403);
        }

        // 4. Utilizador desativado (a sessão não morre ao desativar — aplica-se aqui)
        if (!$user->ativo) {
            Log::warning('[ROLE] Utilizador inativo', ['user_id' => $user->id, 'path' => $request->path()]);
            return response()->json(['message' => 'Utilizador inativo. Contacte o administrador.'], 403);
        }

        // 5. Role (mesma fonte do UserController e do WebAuthController)
        $userRole = method_exists($user, 'getRoleNoTenant')
            ? ($user->getRoleNoTenant($empresa->id) ?? 'operador')
            : ($user->role ?? 'operador');

        if (!in_array($userRole, $roles, true)) {
            Log::warning('[ROLE] Acesso negado - role insuficiente', [
                'user_id'        => $user->id,
                'user_role'      => $userRole,
                'roles_required' => $roles,
                'path'           => $request->path(),
            ]);
            return response()->json(['message' => 'Acesso negado: permissão insuficiente'], 403);
        }

        // 6. Disponibiliza o utilizador do tenant
        $request->attributes->set('tenant_user', $user);
        $request->setUserResolver(fn () => $user);

        // Compatibilidade: pesquise `tenant_user` nos controllers
        // (grep -rn "tenant_user" app/). Se ninguém usar $request->tenant_user
        // ou input('tenant_user'), apague esta linha — mete um model no input do pedido.
        $request->merge(['tenant_user' => $user]);

        return $next($request);
    }

    private function getTenantUser(string $email, Empresa $empresa): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }

        return SharedUser::on('shared')
            ->where('email', $email)
            ->where('tenant_id', $empresa->id)
            ->first();
    }
}