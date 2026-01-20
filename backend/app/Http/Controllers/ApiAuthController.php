<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Tenant;
use App\Models\TenantUser;

class ApiAuthController extends Controller
{
    /**
     * LOGIN DO USUÁRIO NO TENANT
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        foreach (Tenant::all() as $tenant) {

            // Conecta ao banco do tenant para buscar o usuário
            config(['database.connections.tenant.database' => $tenant->database]);
            DB::purge('tenant');
            DB::reconnect('tenant');

            $user = TenantUser::where('email', $request->email)->first();

            if ($user && Hash::check($request->password, $user->password)) {

                // 🔹 Criar token no banco principal, não no tenant
                $token = $user->setConnection('mysql')->createToken('api-token')->plainTextToken;

                return response()->json([
                    'token' => $token,

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
        }

        return response()->json([
            'message' => 'Credenciais inválidas'
        ], 401);
    }

    /**
     * REGISTRO DE USUÁRIO NO TENANT
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6|confirmed',
        ]);

        $user = TenantUser::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => $request->password,
        ]);

        return response()->json([
            'message' => 'Usuário criado com sucesso',
            'user'    => $user->only(['id', 'name', 'email', 'role']),
        ], 201);
    }

    /**
     * LOGOUT
     */
    public function logout(Request $request)
    {
        // 🔹 Deletar token no banco principal
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout realizado com sucesso'
        ]);
    }
}
