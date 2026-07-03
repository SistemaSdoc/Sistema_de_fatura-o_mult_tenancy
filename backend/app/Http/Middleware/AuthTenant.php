<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AuthTenant
{
    public function handle($request, Closure $next)
    {
        $landlordGuard = Auth::guard('landlord_api');
        $guardUsed = 'landlord_api';

        if (!$landlordGuard->check()) {
            $landlordGuard = Auth::guard('landlord');
            $guardUsed = 'landlord';
        }

        Log::info('1- [AUTH TENANT] Verificando autenticação', [
            'cookies' => $request->cookies->all(),
            'has_session_cookie' => $request->hasCookie('faturaja_session'),
            'session_id' => session()->getId(),
            'all_session' => session()->all(),
            'guard_used' => $guardUsed,
            'guard_check' => $landlordGuard->check(),
            'guard_user' => $landlordGuard->user(),
            'headers' => [
                'origin' => $request->header('Origin'),
                'referer' => $request->header('Referer'),
            ],
        ]);

        // 1. Verifica autenticação no guard landlord_api ou landlord
        if (!$landlordGuard->check()) {
            Log::warning('[AUTH TENANT] 401 – Landlord não autenticado', [
                'cookies' => $request->cookies->all(),
                'session_id' => session()->getId(),
                'path' => $request->path(),
            ]);
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // 2. Verifica se a sessão contém os dados do tenant (definidos no login)
        if (!session()->has('tenant_id')) {
            Log::warning('[AUTH TENANT] 401 – Tenant não identificado na sessão', [
                'session' => session()->all(),
                'path' => $request->path(),
            ]);
            return response()->json(['message' => 'Tenant not identified.'], 401);
        }

        // (Opcional) Aqui poderia verificar se o usuário tem permissão para este tenant
        // Mas isso já pode ser feito nos services/controllers

        Log::info('[AUTH TENANT] Autenticação bem-sucedida', [
            'guard_used' => $guardUsed,
            'user_id' => $landlordGuard->id(),
            'tenant_id' => session('tenant_id'),
            'path' => $request->path(),
        ]);

        return $next($request);
    }
}