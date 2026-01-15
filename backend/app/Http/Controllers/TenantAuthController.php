<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\Tenant;
use App\Models\TenantUser;

class TenantAuthController extends Controller
{
    /* =====================================================
     | FORMULÁRIOS
     ===================================================== */

    public function showLoginForm()
    {
        return view('tenant.auth.login');
    }

    public function showRegisterForm()
    {
        return view('tenant.auth.register');
    }

    /* =====================================================
     | LOGIN MULTI-TENANT (POR EMAIL)
     ===================================================== */
     public function login(Request $request)
{
    $request->validate([
        'email'    => 'required|email',
        'password' => 'required',
    ]);

    // Descobrir tenant pelo email
    $tenant = Tenant::all()->first(function ($tenant) use ($request) {

        config([
            'database.connections.tenant.database' => $tenant->database_name,
        ]);

        DB::purge('tenant');
        DB::reconnect('tenant');

        return DB::connection('tenant')
            ->table('users')
            ->where('email', $request->email)
            ->exists();
    });

    if (! $tenant) {
        return back()->withErrors([
            'email' => 'Usuário não pertence a nenhuma empresa.',
        ]);
    }

    // Autenticar
    if (! Auth::guard('tenant')->attempt($request->only('email', 'password'))) {
        return back()->withErrors([
            'password' => 'Senha inválida.',
        ]);
    }

    $request->session()->regenerate();


return redirect()->route('tenant.dashboard', [
    'tenant' => $tenant->subdomain,
]);

}




    /* =====================================================
     | REGISTRO (OPCIONAL – USAR QUANDO SUBDOMÍNIO JÁ ESTÁ RESOLVIDO)
     ===================================================== */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email',
            'password' => 'required|min:6|confirmed',
        ]);

        // Assumindo que ResolveTenant já definiu a conexão 'tenant'
        $user = TenantUser::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => 'cliente',
        ]);

        Auth::guard('tenant')->login($user);

        return redirect()->route('tenant.dashboard');
    }

    /* =====================================================
     | LOGOUT
     ===================================================== */
    public function logout(Request $request)
    {
        Auth::guard('tenant')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Redireciona para login global
        return redirect()->route('tenant.login');
    }
}
