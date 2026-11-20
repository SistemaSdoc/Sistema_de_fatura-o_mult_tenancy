<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restringe rotas do landlord por role da conta landlord.
 *
 * Contas tenant espelhadas pelo WebAuthController (role `user`/`admin_empresa`)
 * também têm sessão em landlord_api; este middleware impede que operadores
 * de tenant usem endpoints do landlord (freelancer, pagamentos-plano, ...).
 *
 * Alias: 'landlord.role'  →  ->middleware('landlord.role:admin_empresa,super_admin')
 */
class EnsureLandlordRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = Auth::guard('landlord_api')->user() ?? Auth::guard('landlord')->user();

        if (!$user) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }

        if (!($user->ativo ?? true)) {
            return response()->json(['message' => 'Conta desativada.'], 403);
        }

        if (!in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        return $next($request);
    }
}