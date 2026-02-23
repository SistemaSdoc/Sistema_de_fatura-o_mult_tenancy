<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use App\Models\User;

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
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return back()->withErrors(['email' => 'Usuário não encontrado no tenant: ' . $tenant->name])->withInput();
        }

        if (!Hash::check($request->password, $user->password)) {
            return back()->withErrors(['password' => 'Senha incorreta'])->withInput();
        }

        // Loga o usuário no guard padrão 'web'
        Auth::login($user, $request->has('remember'));

        // Se "lembrar-me" estiver marcado, criar cookie de remember_token
        if ($request->has('remember')) {
            $rememberToken = bin2hex(random_bytes(60));
            $user->remember_token = $rememberToken;
            $user->save();

            Cookie::queue(Cookie::make('remember_token', $rememberToken, 43200)); // 30 dias
        }

        // Redireciona para dashboard
        return redirect()->intended('/dashboard');
    }

    /**
     * Logout web - com limpeza completa de cookies e sessão
     */
    public function logout(Request $request)
    {
        // Verificar se é uma requisição web ou API
        if ($request->expectsJson() || $request->is('api/*')) {
            return $this->apiLogout($request);
        }

        // Logout web
        Auth::logout();

        // Limpar o remember_token do banco de dados se existir
        if ($user = $request->user()) {
            $user->remember_token = null;
            $user->save();
        }

        // Invalidar a sessão completamente
        $request->session()->invalidate();
        $request->session()->flush(); // Força limpeza de todos os dados da sessão
        $request->session()->regenerateToken();

        // Limpar TODOS os cookies relacionados à autenticação
        $this->clearAuthCookies();

        // Retornar resposta com headers para limpar cache
        $response = redirect('/login');

        // Adicionar headers para limpar cache
        $response->header('Cache-Control', 'no-cache, no-store, must-revalidate, private');
        $response->header('Pragma', 'no-cache');
        $response->header('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');

        return $response;
    }

    /**
     * Logout via API (para aplicações SPA/mobile com Sanctum)
     */
    public function apiLogout(Request $request)
    {
        // Verificar se o usuário está autenticado via API (token)
        if ($request->user()) {
            // Para Sanctum: revogar o token atual
            if (method_exists($request->user(), 'currentAccessToken')) {
                $request->user()->currentAccessToken()->delete();
            }

            // Opcional: revogar todos os tokens do usuário
            // if (method_exists($request->user(), 'tokens')) {
            //     $request->user()->tokens()->delete();
            // }

            // Limpar remember_token
            $request->user()->remember_token = null;
            $request->user()->save();
        }

        // Fazer logout do guard web se estiver autenticado
        if (Auth::check()) {
            Auth::logout();
        }

        // Invalidar sessão se existir
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        // Limpar cookies de autenticação
        $this->clearAuthCookies();

        return response()->json([
            'success' => true,
            'message' => 'Logout realizado com sucesso'
        ])->withHeaders([
            'Cache-Control' => 'no-cache, no-store, must-revalidate, private',
            'Pragma' => 'no-cache',
            'Expires' => 'Thu, 01 Jan 1970 00:00:00 GMT'
        ]);
    }

    /**
     * Limpar todos os cookies de autenticação
     */
    private function clearAuthCookies()
    {
        $cookies = [
            'remember_token',
            'laravel_session',
            'XSRF-TOKEN',
            Auth::getRecallerName(), // Nome do cookie de remember do Auth
        ];

        foreach ($cookies as $cookie) {
            Cookie::queue(Cookie::forget($cookie));
        }

        // Limpar todos os cookies do navegador (abordagem alternativa via header)
        if (isset($_SERVER['HTTP_COOKIE'])) {
            $cookies = explode(';', $_SERVER['HTTP_COOKIE']);
            foreach($cookies as $cookie) {
                $parts = explode('=', $cookie);
                $name = trim($parts[0]);
                // Expirar cada cookie
                setcookie($name, '', time() - 3600, '/');
                setcookie($name, '', time() - 3600, '/', $_SERVER['SERVER_NAME'] ?? '');
            }
        }
    }

    /**
     * Verificar status da autenticação (para SPA)
     */
    public function check(Request $request)
    {
        if ($request->user()) {
            return response()->json([
                'authenticated' => true,
                'user' => $request->user()
            ]);
        }

        return response()->json([
            'authenticated' => false
        ], 401);
    }
}
