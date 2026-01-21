<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Stancl\Tenancy\Database\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ResolveTenant
{
    public function handle(Request $request, Closure $next)
    {
        // Rotas públicas que não precisam de tenant
        $publicRoutes = [
            'sanctum/csrf-cookie',
            'api/login',
            'api/register',
        ];

        foreach ($publicRoutes as $route) {
            if ($request->is($route)) {
                return $next($request);
            }
        }

        $token = $request->bearerToken();

        if (!$token) {
            Log::warning("ResolveTenant: Token não fornecido", ['url' => $request->url()]);
            abort(401, 'Token não fornecido.');
        }

        // --- Consulta direta pelo tenant_id no token ---
        $tenantId = DB::table('personal_access_tokens')
            ->where('token', $token)
            ->value('tenant_id');

        if (!$tenantId) {
            Log::warning("ResolveTenant: Token inválido ou não encontrado", ['token' => $token]);
            abort(401, 'Tenant não encontrado ou token inválido.');
        }

        $tenant = Tenant::find($tenantId);

        if (!$tenant) {
            Log::warning("ResolveTenant: Tenant não encontrado para token", ['token' => $token, 'tenant_id' => $tenantId]);
            abort(401, 'Tenant não encontrado.');
        }

        // --- Inicializa o tenant ---
        try {
            tenancy()->initialize($tenant);
            Log::info("ResolveTenant: Tenant inicializado", ['tenant_id' => $tenant->id]);
        } catch (\Exception $e) {
            Log::error("ResolveTenant: Erro ao inicializar tenant", [
                'tenant' => $tenant->id,
                'erro' => $e->getMessage()
            ]);
            abort(500, 'Erro ao inicializar tenant.');
        }

        return $next($request);
    }
}
