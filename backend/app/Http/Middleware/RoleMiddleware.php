<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
       $user = auth()->guard('sanctum')->user();


        if (!$user) {
            return response()->json(['message' => 'Não autorizado'], 401);
        }

        // Checa se a role do usuário está na lista de roles permitidas
        if (!in_array($user->role, $roles)) {
            return response()->json(['message' => 'Acesso negado: permissão insuficiente'], 403);
        }

        return $next($request);
    }
}
