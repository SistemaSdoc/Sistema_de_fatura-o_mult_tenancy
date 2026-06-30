<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Tenant\User as TenantUser;
use App\Models\Shared\User as SharedUser;
use Illuminate\Support\Facades\Config;
use App\Mail\TemporaryPasswordMail;

class PasswordResetController extends Controller
{
    /**
     * Gera uma senha temporária e envia por email.
     */
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate([
            'email'     => 'required|email',
            'tenant_id' => 'sometimes|uuid|exists:empresas,id',
        ]);

        $email    = $request->input('email');
        $tenantId = $request->input('tenant_id');

        Log::info('[PASSWORD_RESET] Solicitação de senha temporária', [
            'email'     => $email,
            'tenant_id' => $tenantId
        ]);

        // Se tenant_id for fornecido, tenta apenas nesse tenant
        if ($tenantId) {
            $empresa = Empresa::on('landlord')->find($tenantId);
            if (!$empresa) {
                return $this->sendSuccessResponse();
            }

            $this->conectarBanco($empresa);
            $user = $this->buscarUsuario($empresa, $email);
            if (!$user) {
                return $this->sendSuccessResponse();
            }

            $this->generateAndSendTemporaryPassword($email, $empresa, $user);
            return $this->sendSuccessResponse();
        }

        // Sem tenant_id: cross-tenant search
        $empresas = Empresa::on('landlord')->where('status', 'ativo')->get();
        $found = [];

        foreach ($empresas as $empresa) {
            $this->conectarBanco($empresa);
            $user = $this->buscarUsuario($empresa, $email);
            if ($user) {
                $found[] = ['empresa' => $empresa, 'user' => $user];
            }
        }

        if (empty($found)) {
            return $this->sendSuccessResponse();
        }

        // Envia uma senha para cada tenant onde o email existe
        foreach ($found as $item) {
            $this->generateAndSendTemporaryPassword($email, $item['empresa'], $item['user']);
        }

        Log::info('[PASSWORD_RESET] Senhas temporárias enviadas para múltiplos tenants', [
            'email'   => $email,
            'tenants' => collect($found)->pluck('empresa.subdomain')->toArray()
        ]);

        return $this->sendSuccessResponse();
    }

    /**
     * Gera uma senha temporária, atualiza no banco e envia por email.
     */
    private function generateAndSendTemporaryPassword(string $email, Empresa $empresa, $user): void
    {
        // Gera senha aleatória (12 caracteres, letras + números)
        $temporaryPassword = Str::random(8) . rand(1000, 9999);
        $hashedPassword = Hash::make($temporaryPassword);

        // Atualiza a senha no tenant
        $user->password = $hashedPassword;
        $user->save();

        // Atualiza também o LandlordUser
        $landlordUser = LandlordUser::where('email', $email)->first();
        if ($landlordUser) {
            $landlordUser->password = $hashedPassword;
            $landlordUser->save();
        }

        // Envia email com a senha temporária
        Mail::to($email)->send(new TemporaryPasswordMail(
            $temporaryPassword,
            $empresa->nome,
            config('app.frontend_url', 'http://localhost:3000') . '/login'
        ));

        Log::info('[PASSWORD_RESET] Senha temporária enviada', [
            'email'   => $email,
            'tenant'  => $empresa->subdomain,
        ]);
    }

    // ==================== MÉTODOS AUXILIARES ====================

    /**
     * Conecta ao banco correto conforme o modo da empresa.
     */
    private function conectarBanco(Empresa $empresa): void
    {
        Log::debug('[PASSWORD_RESET][CONN] Configurando conexão', [
            'modo'    => $empresa->modo,
            'db_name' => $empresa->db_name,
        ]);

        if ($empresa->modo === 'singular') {
            Config::set('database.connections.tenant.database', $empresa->db_name);
            DB::purge('tenant');
            DB::reconnect('tenant');
            Config::set('database.default', 'tenant');
        } else {
            Config::set('database.default', 'shared');
            DB::purge('shared');
            DB::reconnect('shared');
        }

        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            Log::error('[PASSWORD_RESET][CONN] PDO FALHOU', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Busca usuário no banco correto (SINGULAR ou COLECTIVO).
     */
    private function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        } else {
            return SharedUser::on('shared')
                ->where('email', $email)
                ->where('tenant_id', $empresa->id)
                ->first();
        }
    }

    /**
     * Resposta padrão para evitar revelar se o email existe ou não.
     */
    private function sendSuccessResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Se o email existir, receberá uma senha temporária no seu e-mail.'
        ]);
    }
}