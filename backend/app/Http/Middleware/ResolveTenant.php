<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Database\Models\Tenant;
use Illuminate\Support\Facades\Log;

class ResolveTenant
{
    public function handle(Request $request, Closure $next)
    {
        // Rotas públicas não precisam de tenant
        if (
            $request->is('sanctum/csrf-cookie') ||
            $request->is('api/login') ||
            $request->is('api/register')
        ) {
            return $next($request);
        }

        // Se o usuário estiver logado, identifica o tenant pelo token
        $token = $request->bearerToken();
        if ($token) {
            foreach (Tenant::all() as $tenant) {
                try {
                    if (empty($tenant->data['database'])) {
                        continue;
                    }

                    config(['database.connections.tenant.database' => $tenant->data['database']]);
                    DB::purge('tenant');
                    DB::reconnect('tenant');

                    tenancy()->initialize($tenant);

                    // Verifica se o token existe nesse tenant
                    $tokenExists = DB::connection('tenant')->table('personal_access_tokens')
                        ->where('token', $token)->exists();

                    if ($tokenExists) {
                        // Tenant encontrado, middleware termina
                        return $next($request);
                    }

                } catch (\Exception $e) {
                    Log::error("Erro ao buscar tenant pelo token: {$tenant->nome}", ['erro' => $e->getMessage()]);
                } finally {
                    tenancy()->end();
                }
            }
        }

        abort(401, 'Tenant não encontrado ou token inválido.');
    }
}
