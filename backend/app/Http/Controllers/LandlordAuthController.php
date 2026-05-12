<?php

namespace App\Http\Controllers;

use App\Models\LandlordUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class LandlordAuthController extends Controller
{


public function login(Request $request)
{
    Log::info('[LOGIN] Início', ['email' => $request->email]);

    $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    $user = LandlordUser::where('email', $request->email)->first();

    if (!$user) {
        Log::warning('[LOGIN] Utilizador não encontrado', ['email' => $request->email]);
        throw ValidationException::withMessages(['email' => ['Credenciais inválidas.']]);
    }

    if (!Hash::check($request->password, $user->password)) {
        Log::warning('[LOGIN] Password inválida', ['email' => $request->email]);
        throw ValidationException::withMessages(['email' => ['Credenciais inválidas.']]);
    }

    if (!$user->ehSuperAdmin()) {
        Log::warning('[LOGIN] Utilizador não é super admin', ['email' => $request->email, 'role' => $user->role]);
        return response()->json(['message' => 'Sem permissão para aceder a esta área.'], 403);
    }

    // Verifica se o utilizador está ativo
    if (!$user->ativo) {
        Log::warning('[LOGIN] Utilizador desativado', ['email' => $request->email]);
        return response()->json(['message' => 'Utilizador desativado.'], 403);
    }

    Auth::guard('landlord_api')->login($user);
    $request->session()->regenerate();

    Log::info('[LOGIN] Sucesso', ['user_id' => $user->id]);

    return response()->json([
        'message' => 'Login realizado com sucesso',
        'user' => $user->only(['id', 'name', 'email', 'role'])
    ]);
}

public function register(Request $request)
{
    $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:landlord.users_landlord,email',
        'password' => 'required|string|min:8|confirmed',
    ]);

    $user = LandlordUser::create([
        'id' => Str::uuid(),
        'name' => $request->name,
        'email' => $request->email,
        'password' => Hash::make($request->password),
        'role' => 'super_admin', // ou 'suporte' conforme necessidade
        'ativo' => true,
    ]);

    // Opcional: fazer login automático
    Auth::guard('landlord_api')->login($user);
    $request->session()->regenerate();

    return response()->json([
        'message' => 'Registo realizado com sucesso',
        'user' => $user->only(['id', 'name', 'email', 'role'])
    ], 201);
}

    public function logout(Request $request)
    {
        Auth::guard('landlord_api')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['message' => 'Logout efetuado']);
    }
}