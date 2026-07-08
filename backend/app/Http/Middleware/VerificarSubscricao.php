<?php

namespace App\Http\Middleware;


use Closure;
use App\Services\PlanoService;
use Illuminate\Http\Request;

class VerificarSubscricao
{
    public function handle(Request $request, Closure $next)
    {
        $empresaId = $request->user()->empresa_id ?? session('empresa_id');

        if (!$empresaId) {
            return response()->json(['message' => 'Empresa não identificada.'], 403);
        }

        $planoService = app(PlanoService::class);
        $subscricao = $planoService->getSubscricaoAtiva($empresaId);

        if (!$subscricao) {
            return response()->json([
                'message' => 'A sua subscrição está inactiva ou expirada. Contacte o suporte para renovar.',
            ], 403);
        }

        // Opcional: colocar a subscrição na request para uso posterior
        $request->merge(['subscricao' => $subscricao]);

        return $next($request);
    }
}