<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApiAuthController extends Controller
{
public function login(Request $request)
{
    $request->validate([
        'email'    => 'required|email',
        'password' => 'required|string',
    ]);

    // Tenta autenticar
    if (!Auth::attempt($request->only('email', 'password'))) {
        return response()->json(['message' => 'Credenciais inválidas'], 401);
    }

    // Pega o usuário autenticado
    $user = Auth::user(); // ou Auth::guard('web')->user()

    // Loga explicitamente na sessão (ESSENCIAL para Sanctum stateful com cookie!)
    Auth::guard('web')->login($user);

    // Regenera a sessão para segurança
    $request->session()->regenerate();

    return response()->json([
        'message' => 'Login realizado com sucesso',
        'user' => [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ],
    ]);
}    

public function logout(Request $request)
{
    Auth::logout();

    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json([
        'message' => 'Logout realizado'
    ]);
}

    public function me(Request $request)
    {
        if (!$request->user()) {
        return response()->json(['message' => 'Não autenticado'], 401);
    }

        return response()->json([
            'user' => [
                'id'    => $request->user()->id,
                'name'  => $request->user()->name,
                'email' => $request->user()->email,
                'role'  => $request->user()->role,
            ],
        ]);
    }
}
