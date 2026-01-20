<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Tenant;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ApiAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        foreach (Tenant::all() as $tenant) {
            try {
                if (empty($tenant->data['database'])) {
                    continue;
                }

                // Configura conexão dinamicamente
                config(['database.connections.tenant.database' => $tenant->data['database']]);
                DB::purge('tenant');
                DB::reconnect('tenant');

                tenancy()->initialize($tenant);

                // Procura usuário no tenant
                $user = DB::connection('tenant')->table('users')
                    ->where('email', $request->email)
                    ->first();

                if ($user && Hash::check($request->password, $user->password)) {

                    // Cria token
                    $tokenValue = Str::random(64);
                    DB::connection('tenant')->table('personal_access_tokens')->insert([
                        'tokenable_type' => 'App\Models\User',
                        'tokenable_id'   => $user->id,
                        'name'           => 'api-token',
                        'token'          => $tokenValue,
                        'abilities'      => json_encode(['*']),
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);

                    return response()->json([
                        'token' => $tokenValue,
                        'tenant' => [
                            'id'    => $tenant->id,
                            'nome'  => $tenant->nome,
                            'email' => $tenant->email,
                        ],
                        'user' => [
                            'id'    => $user->id,
                            'name'  => $user->name,
                            'email' => $user->email,
                            'role'  => $user->role,
                        ],
                    ]);
                }

            } catch (\Exception $e) {
                Log::error("Erro ao tentar login no tenant {$tenant->nome}", ['erro' => $e->getMessage()]);
            } finally {
                tenancy()->end();
            }
        }

        return response()->json(['message' => 'Credenciais inválidas'], 401);
    }

    public function logout(Request $request)
    {
        $token = $request->bearerToken();
        if ($token) {
            foreach (Tenant::all() as $tenant) {
                try {
                    if (empty($tenant->data['database'])) continue;

                    config(['database.connections.tenant.database' => $tenant->data['database']]);
                    DB::purge('tenant');
                    DB::reconnect('tenant');
                    tenancy()->initialize($tenant);

                    $deleted = DB::connection('tenant')->table('personal_access_tokens')
                        ->where('token', $token)->delete();

                    if ($deleted) {
                        return response()->json(['message' => 'Logout realizado com sucesso']);
                    }

                } finally {
                    tenancy()->end();
                }
            }
        }

        return response()->json(['message' => 'Token inválido'], 401);
    }
}
