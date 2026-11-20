<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Autentica pedidos de tenant.
 *
 * Os tenants autenticam-se pelos guards landlord (landlord_api / landlord),
 * por isso é OBRIGATÓRIO provar que a sessão pertence à empresa do pedido.
 * Sem isto, o cookie partilhado entre subdomínios (ou um X-Tenant-ID forjado,
 * que o ResolveTenant grava em session('tenant_id')) daria acesso a outro tenant.
 *
 * Deve correr DEPOIS de resolve.tenant (usa o atributo current_empresa).
 */
class AuthTenant
{
    public function handle($request, Closure $next)
    {
        $guard = Auth::guard('landlord_api')->check()
            ? Auth::guard('landlord_api')
            : Auth::guard('landlord');

        // 1. Autenticação
        if (!$guard->check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $landlordUser = $guard->user();

        if (!($landlordUser->ativo ?? true)) {
            return response()->json(['message' => 'Conta desativada.'], 403);
        }

        // 2. Tenant resolvido para ESTE pedido
        $empresa   = $request->attributes->get('current_empresa');
        $empresaId = $empresa?->id ?? session('tenant_id');

        if (!$empresaId || !session()->has('tenant_id')) {
            return response()->json(['message' => 'Tenant not identified.'], 401);
        }

        // 3. A sessão tem de pertencer a esta empresa:
        //    - auth_tenant_id: gravado no login (WebAuthController::finalizarLogin), ou
        //    - empresa_id fixo da conta landlord (ex.: utilizador criado via Google/onboarding)
        $autenticouNaEmpresa = session('auth_tenant_id') === $empresaId;
        $contaDaEmpresa      = !empty($landlordUser->empresa_id) && $landlordUser->empresa_id === $empresaId;

        if (!$autenticouNaEmpresa && !$contaDaEmpresa) {
            Log::warning('[AUTH TENANT] 403 – sessão não pertence à empresa do pedido', [
                'user_id'        => $landlordUser->id,
                'empresa_pedido' => $empresaId,
                'auth_tenant_id' => session('auth_tenant_id'),
                'path'           => $request->path(),
                'ip'             => $request->ip(),
            ]);

            return response()->json(['message' => 'Sessão não pertence a esta empresa.'], 403);
        }

        return $next($request);
    }
}