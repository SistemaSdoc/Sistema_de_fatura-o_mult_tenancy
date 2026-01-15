<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;


class EnsureTenantUser
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = app('tenant');

        // Usuário autenticado no tenant
        $user = auth('tenant')->user();

        if (!$user) {
            return redirect()->route('tenant.login')->with('error', 'Faça login para continuar.');
        }

        // Pertence ao tenant?
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Acesso negado: tenant inválido.');
        }

        // Email verificado?
        if (!$user->hasVerifiedEmail()) {
            return redirect()->route('verification.notice');
        }

        return $next($request);
    }
}
