<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\LandlordUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class LandlordAuthController extends Controller
{

    // app/Http/Controllers/LandlordAuthController.php

    public function landlordme(Request $request)
    {
        Log::info('[LANDLORD ME]   Início', [
            'session_id' => $request->session()->getId(),
            'has_user' => Auth::guard('landlord_api')->check(),
            'url' => $request->fullUrl(),
        ]);

        $user = Auth::guard('landlord_api')->user();

        if (!$user) {
            Log::warning('[LANDLORD ME] Não autenticado');
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        Log::info('[LANDLORD ME] me Autenticado', ['user_id' => $user->id]);

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'role'])
        ]);
    }

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
            'id' => (string) Str::uuid(), // ✅ corrigido
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
        Auth::guard('landlord')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['message' => 'Logout efetuado']);
    }

    /* =====================================================================
     | OAUTH2 - GOOGLE
     | ================================================================== */

    /**
     * Redireciona o usuário para o Google
     *
     * ⚠️ IMPORTANTE: a redirect_uri é definida explicitamente aqui a partir
     * do config('services.google.redirect'), que vem do .env
     * (GOOGLE_REDIRECT_URI). Isso garante que a URL enviada ao Google seja
     * SEMPRE idêntica à cadastrada no Google Cloud Console, independente
     * de cache de rotas, nome de rota, ou APP_URL.
     */
    public function redirectToGoogle()
    {
        $redirectUrl = config('services.google.redirect');

        Log::info('[GOOGLE AUTH] Redirecionando para Google', [
            'redirect_uri' => $redirectUrl,
        ]);

        return Socialite::driver('google')
            ->scopes(['email', 'profile'])
            ->redirectUrl($redirectUrl)
            ->redirect();
    }

    /**
     * Processa o callback do Google
     * - Se usuário existe: faz login
     * - Se não existe: cria novo usuário e redireciona para onboarding
     *
     * ⚠️ A mesma redirect_uri usada no redirect precisa ser usada aqui
     * também, pois o Google valida a consistência entre as duas chamadas.
     */
    public function handleGoogleCallback()
    {
        try {
            $redirectUrl = config('services.google.redirect');

            Log::info('[GOOGLE AUTH] Callback recebido - iniciando troca de código', [
                'redirect_uri' => $redirectUrl,
            ]);

            $googleUser = Socialite::driver('google')
                ->redirectUrl($redirectUrl)
                ->user();

            Log::info('[GOOGLE AUTH] Dados do Google obtidos', [
                'google_id' => $googleUser->getId(),
                'email' => $googleUser->getEmail(),
                'name' => $googleUser->getName(),
            ]);

            // 1️⃣ Procura usuário existente por google_id
            $user = LandlordUser::where('google_id', $googleUser->getId())->first();

            // 2️⃣ Se não encontrou por google_id, procura por email
            if (!$user) {
                $user = LandlordUser::where('email', $googleUser->getEmail())->first();
            }

            // 3️⃣ Se usuário não existe, cria novo
            if (!$user) {
                Log::info('[GOOGLE AUTH] Novo usuário via Google', [
                    'email' => $googleUser->getEmail(),
                    'name' => $googleUser->getName(),
                ]);

                $user = LandlordUser::create([
                    'id' => (string) Str::uuid(), // ✅ corrigido: string, não objeto
                    'name' => $googleUser->getName() ?? $googleUser->getEmail(),
                    'email' => $googleUser->getEmail(),
                    'password' => Hash::make(Str::random(32)), // Senha aleatória (não usada)
                    'google_id' => $googleUser->getId(),
                    'google_name' => $googleUser->getName(),
                    'google_avatar' => $googleUser->getAvatar(),
                    'oauth_verified' => true,
                    'ativo' => true,
                    'role' => 'super_admin', // ✅ Novo usuário recebe role super_admin
                ]);

                // ✅ Marca como email verificado automaticamente
                $user->update(['email_verified_at' => now()]);

                Log::info('[GOOGLE AUTH] Novo usuário criado', ['user_id' => $user->id]);
            } else {
                // 4️⃣ Se existe, atualiza dados do Google
                Log::info('[GOOGLE AUTH] Atualizando dados do Google', ['user_id' => $user->id]);

                $user->update([
                    'google_id' => $googleUser->getId(),
                    'google_name' => $googleUser->getName(),
                    'google_avatar' => $googleUser->getAvatar(),
                    'oauth_verified' => true,
                    'email_verified_at' => now(),
                ]);
            }

            // 5️⃣ Faz login do usuário
            Auth::guard('landlord_api')->login($user);
            Auth::guard('landlord')->login($user);
            request()->session()->regenerate(); // ✅ adicionado: evita fixation e força sessão nova

            Log::info('[GOOGLE AUTH] Login realizado', ['user_id' => $user->id]);

            // 6️⃣ Determina para onde redirecionar
            $frontendUrl = env('VITE_FRONTEND_URL', 'http://localhost:3000');

            // ✅ Se novo usuário (sem empresa), vai para configurações
            if (!$user->empresa_id) {
                $redirectFrontend = $frontendUrl . '/onboarding'; // era /dashboard/configuracoes?tab=empresa
                Log::info('[GOOGLE AUTH] Novo usuário -> onboarding', ['user_id' => $user->id]);
            } else {
                // ✅ Usuário existente com empresa -> callback intermediário
                // (o frontend precisa guardar o tenant_id ANTES de chamar /me)
                $empresa = \App\Models\Empresa::on('landlord')->find($user->empresa_id);

                if (!$empresa) {
                    Log::warning('[GOOGLE AUTH] empresa_id existe mas Empresa não encontrada', [
                        'user_id' => $user->id,
                        'empresa_id' => $user->empresa_id,
                    ]);
                    $redirectFrontend = $frontendUrl . '/login?error=empresa_not_found';
                } else {
                    $redirectFrontend = $frontendUrl . '/auth/callback'
                        . '?empresa_id=' . urlencode($empresa->id)
                        . '&subdomain=' . urlencode($empresa->subdomain ?? '');

                    Log::info('[GOOGLE AUTH] Usuário existente -> auth/callback', [
                        'user_id' => $user->id,
                        'empresa_id' => $empresa->id,
                    ]);
                }
            }
            return redirect()->away($redirectFrontend);
        } catch (\Exception $e) {
            Log::error('[GOOGLE AUTH] Erro no callback', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $frontendUrl = env('VITE_FRONTEND_URL', 'http://localhost:3000');
            return redirect()->away($frontendUrl . '/login?error=google_auth_failed');
        }
    }
}