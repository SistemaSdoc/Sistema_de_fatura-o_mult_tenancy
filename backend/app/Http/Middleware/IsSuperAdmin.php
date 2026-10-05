<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class IsSuperAdmin
{
    /**
     * Permite acesso apenas a utilizadores com role = 'super_admin'.
     *
     * Comportamento:
     *  - Sem autenticação  → 401 (API) ou redirect login (browser)
     *  - Autenticado mas role errada → 403 (API) ou redirect login (browser)
     */
    public function handle(Request $request, Closure $next): Response
    {
        // ⭐ Detetar se é pedido de API/AJAX (axios, fetch) ou browser normal
        $isApiRequest = $request->expectsJson()
            || $request->is('api/*')
            || $request->ajax();

        $user = Auth::guard('landlord_api')->user()
            ?? Auth::guard('landlord')->user()
            ?? $request->user();

        // ─────────────────────────────────────────────
        // 1. Sem autenticação
        // ─────────────────────────────────────────────
        if (!$user) {
            Log::info('[IsSuperAdmin] Sem autenticação', [
                'path'   => $request->path(),
                'ip'     => $request->ip(),
                'is_api' => $isApiRequest,
            ]);

            if ($isApiRequest) {
                return response()->json([
                    'message' => 'Não autenticado.',
                    'code'    => 'UNAUTHENTICATED',
                ], 401);
            }

            return redirect()
                ->route('landlord.login') 
                ->with('error', 'Faça login para continuar.');
        }

        // ─────────────────────────────────────────────
        // 2. Autenticado mas não é super_admin
        // ─────────────────────────────────────────────
        if (($user->role ?? null) !== 'super_admin') {
            Log::warning('[IsSuperAdmin] Acesso negado — role não autorizada', [
                'user_id' => $user->id,
                'email'   => $user->email,
                'role'    => $user->role,
                'path'    => $request->path(),
                'ip'      => $request->ip(),
                'is_api'  => $isApiRequest,
            ]);

            // Fazer logout (opcional — se quiseres forçar saída)
            // Auth::guard('landlord_api')->logout();
            // $request->session()->invalidate();
            // $request->session()->regenerateToken();

            if ($isApiRequest) {
                return response()->json([
                    'message' => 'Acesso restrito a super administradores.',
                    'code'    => 'NOT_SUPER_ADMIN',
                ], 403);
            }

            return redirect()
                ->route('landlord.login')
                ->with('error', 'Acesso restrito a super administradores.');
        }

        return $next($request);
    }
}