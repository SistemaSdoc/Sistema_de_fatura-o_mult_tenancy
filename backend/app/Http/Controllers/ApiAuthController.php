<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApiAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // Procura usuário direto no banco padrão
        $user = DB::table('users')->where('email', $request->email)->first();

        if ($user && Hash::check($request->password, $user->password)) {

            // Cria token
            $tokenValue = Str::random(64);
            DB::table('personal_access_tokens')->insert([
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
                'user' => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ],
            ]);
        }

        return response()->json(['message' => 'Credenciais inválidas'], 401);
    }

    public function logout(Request $request)
    {
        $token = $request->bearerToken();

        if ($token) {
            $deleted = DB::table('personal_access_tokens')
                ->where('token', $token)
                ->delete();

            if ($deleted) {
                return response()->json(['message' => 'Logout realizado com sucesso']);
            }
        }

        return response()->json(['message' => 'Token inválido'], 401);
    }
}
