<?php

namespace App\Traits;

use App\Models\Empresa;
use App\Models\Tenant\User as TenantUser;
use App\Models\Shared\User as SharedUser;
use App\Models\LandlordUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Lógica compartilhada de resolução de tenant e login unificado
 * (guard 'landlord' + sessão manual de tenant_id/tenant_db/tenant_modo).
 *
 * Extraído do WebAuthController para reuso no GoogleController.
 */
trait ResolvesTenantAuth
{
    /**
     * Conecta ao banco correto conforme o modo da empresa.
     */
    protected function conectarBanco(Empresa $empresa): void
    {
        Log::debug('[TENANT_AUTH][CONN] Configurando conexão', [
            'modo' => $empresa->modo,
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
            Log::error('[TENANT_AUTH][CONN] PDO FALHOU', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Busca o usuário no banco correto (singular ou colectivo).
     */
    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }

        return SharedUser::on('shared')
            ->where('email', $email)
            ->where('tenant_id', $empresa->id)
            ->first();
    }

    /**
     * Encontra todas as empresas ativas onde o email existe (cross-tenant).
     */
    protected function findTenantsByEmail(string $email): array
    {
        $tenants = Empresa::on('landlord')->where('status', 'ativo')->get();
        $found = [];

        foreach ($tenants as $empresa) {
            try {
                $this->conectarBanco($empresa);
                $user = $this->buscarUsuario($empresa, $email);
                if ($user) {
                    $found[] = $empresa;
                }
            } catch (\Exception $e) {
                Log::warning('[TENANT_AUTH] Erro ao verificar tenant', [
                    'tenant' => $empresa->subdomain,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }
        }

        return $found;
    }

    /**
     * Finaliza login: sincroniza LandlordUser, autentica guard 'landlord',
     * grava sessão com dados do tenant.
     */
    protected function finalizarLoginTenant(Request $request, $tenantUser, Empresa $empresa, string $modo): array
    {
        Log::debug('[TENANT_AUTH][FINAL] Finalizando login', [
            'email' => $tenantUser->email,
            'empresa' => $empresa->nome,
            'modo' => $modo,
        ]);

        $landlordUser = LandlordUser::firstOrCreate(
            ['email' => $tenantUser->email],
            [
                'name' => $tenantUser->name ?? $tenantUser->nome ?? 'Usuário',
                'password' => $tenantUser->password,
            ]
        );

        Auth::guard('landlord')->login($landlordUser);
        $request->session()->regenerate();

        session([
            'tenant_id'         => $empresa->id,
            'tenant_db'         => $empresa->db_name,
            'tenant_nome'       => $empresa->nome,
            'tenant_modo'       => $empresa->modo,
            'user_tenant_id'    => $tenantUser->id,
            'user_email'        => $tenantUser->email,
            'login_modo'        => $modo,
            'login_at'          => now()->toIso8601String(),
            'landlord_user_id'  => $landlordUser->id,
        ]);

        try {
            $tenantUser->ultimo_login = now();
            $tenantUser->save();
        } catch (\Exception $e) {
            Log::warning('[TENANT_AUTH][FINAL] Falha ao atualizar último login', ['error' => $e->getMessage()]);
        }

        Log::info('[TENANT_AUTH][FINAL] Login sincronizado com sucesso', [
            'user' => $tenantUser->email,
            'empresa_id' => $empresa->id,
            'modo' => $empresa->modo,
        ]);

        return [
            'landlordUser' => $landlordUser,
            'tenantUser'   => $tenantUser,
            'empresa'      => $empresa,
        ];
    }
}