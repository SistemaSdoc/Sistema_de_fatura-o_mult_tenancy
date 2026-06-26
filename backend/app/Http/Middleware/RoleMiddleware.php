<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  mixed ...$roles  Lista de roles permitidas
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // ✅ 1. Verifica autenticação no guard landlord (onde o login foi feito)
        if (!Auth::guard('landlord')->check()) {
            Log::warning('[ROLE] Usuário não autenticado no landlord', [
                'path' => $request->path(),
            ]);
            return response()->json(['message' => 'Não autorizado'], 401);
        }

        // ✅ 2. Obtém o landlord user
        $landlordUser = Auth::guard('landlord')->user();
        
        // ✅ 3. Obtém o tenant_id da sessão
        $tenantId = session('tenant_id');
        if (!$tenantId) {
            Log::warning('[ROLE] Tenant não identificado na sessão', [
                'path' => $request->path(),
                'session' => session()->all(),
            ]);
            return response()->json(['message' => 'Tenant não identificado'], 401);
        }

        // ✅ 4. Busca o usuário tenant correspondente
        $user = $this->getTenantUser($landlordUser->email, $tenantId);
        
        if (!$user) {
            Log::warning('[ROLE] Usuário não encontrado no tenant', [
                'email' => $landlordUser->email,
                'tenant_id' => $tenantId,
                'path' => $request->path(),
            ]);
            return response()->json(['message' => 'Usuário não encontrado no tenant'], 401);
        }

        // ✅ 5. Verifica a role
        $userRole = $user->role ?? 'operador';
        
        if (!in_array($userRole, $roles)) {
            Log::warning('[ROLE] Acesso negado - role insuficiente', [
                'user_id' => $user->id,
                'user_role' => $userRole,
                'roles_required' => $roles,
                'path' => $request->path(),
            ]);
            return response()->json([
                'message' => 'Acesso negado: permissão insuficiente',
                'user_role' => $userRole,
                'roles_required' => $roles,
            ], 403);
        }

        // ✅ 6. Armazena o usuário tenant na request para uso posterior
        $request->merge(['tenant_user' => $user]);
        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        Log::info('[ROLE] Acesso permitido', [
            'user_id' => $user->id,
            'user_role' => $userRole,
            'path' => $request->path(),
        ]);

        return $next($request);
    }

    /**
     * Busca o usuário no tenant correto (singulares ou colectivo)
     */
    private function getTenantUser(string $email, string $tenantId): ?object
    {
        // Busca a empresa
        $empresa = \App\Models\Empresa::on('landlord')->find($tenantId);
        if (!$empresa) {
            Log::error('[ROLE] Empresa não encontrada', ['tenant_id' => $tenantId]);
            return null;
        }

        // Busca o usuário conforme o modo da empresa
        if ($empresa->modo === 'singular') {
            return \App\Models\Tenant\User::on('tenant')
                ->where('email', $email)
                ->first();
        } else {
            return \App\Models\Shared\User::on('shared')
                ->where('email', $email)
                ->where('tenant_id', $tenantId)
                ->first();
        }
    }
}