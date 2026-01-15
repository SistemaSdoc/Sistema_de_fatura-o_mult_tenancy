<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\TenantUser;

class AuthController extends Controller
{
    /**
     * Mostrar página de login web
     */
    public function showLogin()
    {
        return view('auth.login');
    }

    /**
     * Processa login web do tenant
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Garante que estamos no tenant correto
        $tenant = app('tenant');

        // Busca usuário no tenant atual
        $user = TenantUser::where('email', $request->email)->first();

        if (!$user) {
            return back()->withErrors(['email' => 'Usuário não encontrado no tenant: ' . $tenant->name])->withInput();
        }

        if (!Hash::check($request->password, $user->password)) {
            return back()->withErrors(['password' => 'Senha incorreta'])->withInput();
        }

        // Loga o usuário no guard padrão 'web'
        Auth::login($user);

        // Redireciona para dashboard
        return redirect()->intended('/dashboard');
    }

    /**
     * Logout web
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
