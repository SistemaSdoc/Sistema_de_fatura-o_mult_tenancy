<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Auth\Authenticatable;

class AuthTenant
{
// App\Http\Middleware\AuthenticateTenant.php
public function handle($request, Closure $next)
{
    $guard = auth()->guard('tenant');
    
    // Log antes
    Log::info('[AUTH TENANT] ---------- Tentando autenticar -----------------', [
        'cookies' => $request->cookies->all(),
        'session_id' => session()->getId(),
        'query' => $request->query(),
    ]);

    // Tenta autenticar manualmente via Sanctum (se for SPA)
    if (!$guard->check() && $request->hasCookie('laravel_session')) {
        Log::info('[AUTH TENANT] Tentativa de autenticação via cookie');
        // O Sanctum já faz isso automaticamente, mas forçamos para log
        $guard->setUser(null);
    }

    $authenticated = $guard->check();
    $user = $guard->user();

    Log::info('[AUTH TENANT] Resultado', [
        'authenticated' => $authenticated,
        'user_id' => $user?->id,
        'user_role' => $user?->role,
    ]);

    if (!$authenticated) {
        Log::warning('[AUTH TENANT] 401 – autenticação falhou', ['query' => $request->query()]);
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }

    return $next($request);
}
}
