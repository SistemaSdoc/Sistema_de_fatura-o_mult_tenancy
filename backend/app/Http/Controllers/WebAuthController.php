<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Services\AuditLogger;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Tenant\User as TenantUser;
use App\Models\Shared\User as SharedUser;

/**
 * WebAuthController — Login Multi-Tenant
 *
 * Fluxos suportados:
 *   A) POST acme.app.factura-ja.ao/login    → tenant explícito (subdomínio)
 *   B) POST app.factura-ja.ao/login         → cross-tenant search (email)
 *   C) POST acme.app.factura-ja.ao/logout   → logout do tenant + landlord
 *
 * O frontend deve ler `redirect_url` da resposta e fazer:
 *   window.location.href = response.redirect_url;
 *
 * Config necessária em config/app.php:
 *   'domain'          => env('APP_DOMAIN', 'localhost'),
 *   'frontend_scheme' => env('FRONTEND_SCHEME', 'https'),
 *   'frontend_port'   => env('FRONTEND_PORT'),  // null em produção
 */
class WebAuthController extends Controller
{
    /* =====================================================================
     | LOGIN ADAPTATIVO — 2 estratégias
     |   1. Tenant explícito (subdomínio ou header)
     |   2. Cross-tenant search (email-only)
     | ================================================================== */

    public function login(Request $request): JsonResponse
    {
        Log::info('[AUTH] ========== LOGIN INICIADO ==========', [
            'host'         => $request->getHost(),
            'x_tenant_id'  => $request->header('X-Tenant-ID'),
            'x_empresa_id' => $request->header('X-Empresa-ID'),
            'ip'           => $request->ip(),
        ]);

        try {
            $request->validate([
                'email'    => 'required|email',
                'password' => 'required|string|min:6',
            ]);

            $email    = $request->input('email');
            $password = $request->input('password');

            /* ─── Estratégia 1: tenant explícito (subdomínio/header) ─── */
            $empresa = $this->resolverTenant($request);

            if ($empresa) {
                Log::info('[AUTH] Estratégia 1 — Tenant resolvido', [
                    'empresa_id' => $empresa->id,
                    'subdomain'  => $empresa->subdomain,
                    'modo'       => $empresa->modo,
                ]);

                return $this->autenticarNoTenant($request, $empresa, $email, $password);
            }

            /* ─── Estratégia 2: cross-tenant search ─── */
            Log::info('[AUTH] Estratégia 2 — Cross-tenant search', ['email' => $email]);

            $resultado = $this->pesquisarEmailEmTodosTenants($email, $password);

            if ($resultado['success']) {
                Log::info('[AUTH] Estratégia 2 — Encontrado', [
                    'email'   => $email,
                    'tenant'  => $resultado['empresa']->subdomain,
                    'user_id' => $resultado['user']->id,
                ]);

                return $this->finalizarLogin(
                    $request,
                    $resultado['user'],
                    $resultado['empresa'],
                    'auto-discovery',
                    $password
                );
            }

            return response()->json([
                'success' => false,
                'message' => 'Credenciais inválidas ou utilizador não encontrado em nenhuma empresa.',
            ], 401);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dados inválidos',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('[AUTH] ERRO CRÍTICO', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno no servidor.',
            ], 500);
        }
    }

    /* =====================================================================
     | AUTENTICAÇÃO NO TENANT
     | ================================================================== */

    private function autenticarNoTenant(
        Request $request,
        Empresa $empresa,
        string $email,
        string $password
    ): JsonResponse {
        // Garante conexão ao banco do tenant (idempotente — o middleware já ligou)
        $this->conectarBanco($empresa);

        $user = $this->buscarUsuario($empresa, $email);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        if (!Hash::check($password, $user->password)) {
            Log::warning('[AUTH] Password incorreta', ['email' => $email]);
            return response()->json([
                'success' => false,
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        if (!$user->ativo) {
            Log::warning('[AUTH] Utilizador inativo', ['email' => $email]);
            return response()->json([
                'success' => false,
                'message' => 'Utilizador inativo. Contacte o administrador.',
            ], 403);
        }

        return $this->finalizarLogin($request, $user, $empresa, 'explicit', $password);
    }

    /* =====================================================================
     | CROSS-TENANT SEARCH
     | ================================================================== */

    private function pesquisarEmailEmTodosTenants(string $email, string $password): array
    {
        $cacheKey = 'tenant_search:' . md5($email);
        $tenantsVerificados = 0;

        // ─── Cache hit ───
        $cachedTenantId = Cache::get($cacheKey);
        if ($cachedTenantId) {
            $empresa = Empresa::on('landlord')->find($cachedTenantId);
            if ($empresa) {
                $this->conectarBanco($empresa);
                $user = $this->buscarUsuario($empresa, $email);
                if ($user && Hash::check($password, $user->password) && $user->ativo) {
                    return [
                        'success'             => true,
                        'user'                => $user,
                        'empresa'             => $empresa,
                        'tenants_verificados' => 1,
                    ];
                }
            }
            Cache::forget($cacheKey);
        }

        // ─── Dedução por domínio de email ───
        $empresaPorDominio = $this->deduzirPorDominioEmail($email);
        if ($empresaPorDominio) {
            $this->conectarBanco($empresaPorDominio);
            $user = $this->buscarUsuario($empresaPorDominio, $email);
            $tenantsVerificados++;

            if ($user && Hash::check($password, $user->password) && $user->ativo) {
                Cache::put($cacheKey, $empresaPorDominio->id, now()->addMinutes(30));
                return [
                    'success'             => true,
                    'user'                => $user,
                    'empresa'             => $empresaPorDominio,
                    'tenants_verificados' => $tenantsVerificados,
                ];
            }
        }

        // ─── Scan completo ───
        $tenants = Empresa::on('landlord')->where('status', 'ativo')->get();

        foreach ($tenants as $empresa) {
            $tenantsVerificados++;
            try {
                $this->conectarBanco($empresa);
                $user = $this->buscarUsuario($empresa, $email);

                if ($user && Hash::check($password, $user->password) && $user->ativo) {
                    Cache::put($cacheKey, $empresa->id, now()->addMinutes(30));
                    Log::info('[AUTH] Encontrado no scan', [
                        'tenant'              => $empresa->subdomain,
                        'tenants_verificados' => $tenantsVerificados,
                    ]);
                    return [
                        'success'             => true,
                        'user'                => $user,
                        'empresa'             => $empresa,
                        'tenants_verificados' => $tenantsVerificados,
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('[AUTH] Erro ao verificar tenant', [
                    'tenant' => $empresa->subdomain,
                    'error'  => $e->getMessage(),
                ]);
                continue;
            }
        }

        return ['success' => false, 'tenants_verificados' => $tenantsVerificados];
    }

    private function deduzirPorDominioEmail(string $email): ?Empresa
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return null;
        }

        $domain = strtolower($parts[1]);

        $genericDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
            'mail.com', 'protonmail.com', 'live.com', 'aol.com', 'gmx.com',
            'yandex.com', 'zoho.com', 'qq.com', '163.com', '126.com', 'foxmail.com',
        ];

        if (in_array($domain, $genericDomains)) {
            return null;
        }

        $possibleSubdomain = explode('.', $domain)[0];

        return Empresa::on('landlord')
            ->where('subdomain', $possibleSubdomain)
            ->where('status', 'ativo')
            ->first();
    }

    /* =====================================================================
     | CONEXÃO E BUSCA (idempotentes)
     | ================================================================== */

    private function conectarBanco(Empresa $empresa): void
    {
        if ($empresa->modo === 'singular') {
            if (empty($empresa->db_name)) {
                throw new \RuntimeException("Empresa {$empresa->id} sem db_name.");
            }

            // Idempotente: só reconnecta se a DB configurada for diferente
            $current = Config::get('database.connections.tenant.database');
            if ($current !== $empresa->db_name) {
                Config::set('database.connections.tenant.database', $empresa->db_name);
                DB::purge('tenant');
                DB::reconnect('tenant');
            }
            Config::set('database.default', 'tenant');
        } else {
            // Modo colectivo
            Config::set('database.default', 'shared');
            DB::reconnect('shared');
        }
    }

    private function buscarUsuario(Empresa $empresa, string $email): ?object
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
     * Role do utilizador NESTE tenant — mesma fonte usada pelo UserController,
     * para login e /me devolverem sempre o mesmo valor.
     */
    private function resolverRole($user, Empresa $empresa): string
    {
        if (method_exists($user, 'getRoleNoTenant')) {
            return $user->getRoleNoTenant($empresa->id) ?? 'operador';
        }

        return $user->role ?? 'operador';
    }

    /* =====================================================================
     | RESOLUÇÃO DO TENANT (estratégia explícita)
     |   Ordem: host → header → query.
     |   O host manda: um X-Tenant-ID antigo (localStorage) não pode
     |   sobrepor-se ao subdomínio em que o utilizador está.
     | ================================================================== */

    private function resolverTenant(Request $request): ?Empresa
    {
        // 1) Subdomínio do host (principal no modelo app.factura-ja.ao)
        $host = explode(':', $request->getHost())[0];

        if (!$this->isIP($host)) {
            $subdomain = $this->extrairSubdomain($host);

            if ($subdomain && !$this->isReservedSubdomain($subdomain)) {
                $empresa = Empresa::on('landlord')->where('subdomain', $subdomain)->first();
                if ($empresa) {
                    return $empresa;
                }
            }
        }

        // 2) Header X-Tenant-ID / X-Empresa-ID
        $tenantHeader = $request->header('X-Tenant-ID') ?? $request->header('X-Empresa-ID');

        if ($tenantHeader && !$this->isIP($tenantHeader)) {
            if (Str::isUuid($tenantHeader)) {
                $empresa = Empresa::on('landlord')->where('id', $tenantHeader)->first();
                if ($empresa) {
                    return $empresa;
                }
            }

            $empresa = Empresa::on('landlord')->where('subdomain', $tenantHeader)->first();
            if ($empresa) {
                return $empresa;
            }
        }

        // 3) Query param ?tenant=
        if ($tenantParam = $request->get('tenant')) {
            $empresa = Empresa::on('landlord')
                ->where('id', $tenantParam)
                ->orWhere('subdomain', $tenantParam)
                ->first();
            if ($empresa) {
                return $empresa;
            }
        }

        return null;
    }

    /* =====================================================================
     | FINALIZAR LOGIN — cria sessão + devolve redirect_url
     | ================================================================== */

    private function finalizarLogin(
        Request $request,
        $tenantUser,
        Empresa $empresa,
        string $modo,
        string $password
    ): JsonResponse {
        Log::info('[AUTH][FINAL] Finalizando login', [
            'email'   => $tenantUser->email,
            'empresa' => $empresa->subdomain,
            'modo'    => $empresa->modo,
            'via'     => $modo,
        ]);

        $role = $this->resolverRole($tenantUser, $empresa);

        // ─── 1. LandlordUser (espelho) — NUNCA reutilizar contas privilegiadas ───
        //    Um admin de tenant pode criar um utilizador com o email de um
        //    super_admin/suporte. Só se reutiliza uma conta landlord quando
        //    a role é de tenant E (é da mesma empresa OU a password coincide).
        $landlordUser = LandlordUser::on('landlord')
            ->where('email', $tenantUser->email)
            ->first();

        if ($landlordUser) {
            $roleOk       = in_array($landlordUser->role, [LandlordUser::ROLE_ADMIN_EMPRESA, 'user'], true);
            $mesmaEmpresa = !empty($landlordUser->empresa_id) && $landlordUser->empresa_id === $empresa->id;
            $mesmaSenha   = Hash::check($password, $landlordUser->password);

            if (!$roleOk || !($mesmaEmpresa || $mesmaSenha)) {
                Log::warning('[AUTH][FINAL] Conflito de conta landlord — login bloqueado', [
                    'email'         => $tenantUser->email,
                    'empresa_id'    => $empresa->id,
                    'landlord_role' => $landlordUser->role,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Conflito de conta. Contacte o suporte.',
                ], 409);
            }

            if (!$landlordUser->ativo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Conta desativada. Contacte o suporte.',
                ], 403);
            }
        } else {
            $landlordUser = LandlordUser::on('landlord')->create([
                'id'         => (string) Str::uuid(),
                'empresa_id' => $empresa->id,
                'name'       => $tenantUser->name ?? $tenantUser->nome ?? 'Utilizador',
                'email'      => $tenantUser->email,
                'password'   => $tenantUser->password,
                'role'       => $this->mapearRoleParaLandlord($role),
                'ativo'      => true,
            ]);
        }

        // ─── 2. Login nos guards ───
        Auth::guard('tenant')->login($tenantUser);               // legado (auth.tenant usa os guards landlord)
        Auth::guard('landlord')->login($landlordUser);            // usado por auth.tenant e me()
        Auth::guard('landlord_api')->login($landlordUser);        // usado por API JSON

        $request->session()->regenerate();

        // ─── 3. Sessão do tenant ───
        //    auth_tenant_id = empresa onde o utilizador AUTENTICOU. Ao contrário
        //    de tenant_id (reescrito pelo ResolveTenant a cada pedido), não é
        //    alterado por host/header — o AuthTenant compara com ele.
        session([
            'auth_tenant_id'   => $empresa->id,
            'tenant_id'        => $empresa->id,
            'tenant_subdomain' => $empresa->subdomain,
            'tenant_db'        => $empresa->db_name,
            'tenant_nome'      => $empresa->nome,
            'tenant_modo'      => $empresa->modo,
            'user_tenant_id'   => $tenantUser->id,
            'user_email'       => $tenantUser->email,
            'login_modo'       => $modo,
            'login_at'         => now()->toIso8601String(),
            'landlord_user_id' => $landlordUser->id,
        ]);

        // ─── 4. Último login ───
        try {
            $tenantUser->ultimo_login = now();
            $tenantUser->save();
        } catch (\Throwable $e) {
            Log::warning('[AUTH][FINAL] Falha ao atualizar último login', ['error' => $e->getMessage()]);
        }

        // ─── 5. Auditoria ───
        AuditLogger::log('Utilizador Autenticado', '👤', [
            'area'     => 'Autenticação',
            'detalhes' => [
                'usuario_id'    => $tenantUser->id,
                'usuario_email' => $tenantUser->email,
                'empresa_id'    => $empresa->id,
                'empresa_nome'  => $empresa->nome,
                'modo_login'    => $modo,
            ],
        ]);

        // ─── 6. URL de destino para o frontend ───
        $redirectUrl = $this->montarUrl($empresa->subdomain);

        Log::info('[AUTH][FINAL] ========== LOGIN SUCESSO ==========', [
            'user'         => $tenantUser->email,
            'empresa'      => $empresa->subdomain,
            'modo'         => $empresa->modo,
            'redirect_url' => $redirectUrl,
        ]);

        // ─── 7. Resposta ───
        $fmt = fn ($d) => $d ? \Carbon\Carbon::parse($d)->format('Y-m-d H:i:s') : null;

        return response()->json([
            'success'      => true,
            'message'      => 'Login realizado com sucesso',
            'redirect_url' => $redirectUrl,
            'user' => [
                'id'                => $tenantUser->id,
                'name'              => $tenantUser->name ?? $tenantUser->nome,
                'email'             => $tenantUser->email,
                'role'              => $role,
                'ativo'             => (bool) $tenantUser->ativo,
                'ultimo_login'      => $fmt($tenantUser->ultimo_login ?? null),
                'created_at'        => $fmt($tenantUser->created_at ?? null),
                'email_verified_at' => $fmt($tenantUser->email_verified_at ?? null),
            ],
            'empresa' => [
                'id'            => $empresa->id,
                'nome'          => $empresa->nome,
                'nif'           => $empresa->nif,
                'email'         => $empresa->email,
                'telefone'      => $empresa->telefone,
                'endereco'      => $empresa->endereco,
                'subdomain'     => $empresa->subdomain,
                'logo'          => $empresa->logo,
                'regime_fiscal' => $empresa->regime_fiscal ?? 'simplificado',
                'sujeito_iva'   => (bool) $empresa->sujeito_iva,
                'is_seguradora' => (bool) $empresa->is_seguradora,
                'iva_padrao'    => (float) ($empresa->iva_padrao ?? 0),
                'status'        => $empresa->status ?? 'ativo',
                'data_registro' => $fmt($empresa->data_registro ?? null),
                'modo'          => $empresa->modo,
            ],
        ]);
    }

    /* =====================================================================
     | ME — utilizador autenticado (com subscrição)
     | ================================================================== */

    public function me(Request $request): JsonResponse
    {
        $landlordUser = Auth::guard('landlord')->user() ?? Auth::guard('landlord_api')->user();

        if (!$landlordUser) {
            return response()->json([
                'success' => false,
                'message' => 'Não autenticado.',
            ], 401);
        }

        $tenantId = session('tenant_id');

        if (!$tenantId) {
            return response()->json([
                'success' => false,
                'message' => 'Sessão incompleta — tenant não identificado.',
            ], 403);
        }

        $empresa = Empresa::on('landlord')->find($tenantId);

        if (!$empresa) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não encontrada.',
            ], 404);
        }

        if (($empresa->status ?? 'ativo') !== 'ativo') {
            return response()->json([
                'success' => false,
                'message' => 'Empresa suspensa. Contacte o suporte.',
            ], 403);
        }

        // Garantir conexão ao banco do tenant
        $this->conectarBanco($empresa);

        // Subscrição ativa
        $subscricao = $empresa->subscricaoAtiva()
            ->with('plano.features')
            ->first();

        $dadosSubscricao = null;

        if ($subscricao) {
            $planoData = null;

            if ($subscricao->plano) {
                $features = $subscricao->plano->features->map(fn ($f) => [
                    'id'        => $f->id,
                    'nome'      => $f->nome,
                    'descricao' => $f->descricao,
                    'icone'     => $f->icone,
                    'ativo'     => $f->ativo,
                    'pivot'     => [
                        'quantidade' => $f->pivot->quantidade ?? null,
                        'unidade'    => $f->pivot->unidade ?? null,
                    ],
                ])->toArray();

                $planoData = [
                    'id'            => $subscricao->plano->id,
                    'nome'          => $subscricao->plano->nome,
                    'valor_mensal'  => $subscricao->plano->valor_mensal,
                    'valor_anual'   => $subscricao->plano->valor_anual,
                    'duracao_meses' => $subscricao->plano->duracao_meses,
                    'features'      => $features,
                ];
            }

            $dadosSubscricao = [
                'id'                   => $subscricao->id,
                'plano'                => $planoData,
                'data_inicio'          => $subscricao->data_inicio,
                'data_fim'             => $subscricao->data_fim,
                'status'               => $subscricao->status,
                'forma_pagamento'      => $subscricao->forma_pagamento,
                'renovacao_automatica' => $subscricao->renovacao_automatica,
                'cancelado_em'         => $subscricao->cancelado_em,
            ];
        }

        $user = $this->buscarUsuario($empresa, $landlordUser->email);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilizador não encontrado no tenant.',
            ], 404);
        }

        if (!$user->ativo) {
            return response()->json([
                'success' => false,
                'message' => 'Utilizador inativo. Contacte o administrador.',
            ], 403);
        }

        $fmt = fn ($d) => $d ? \Carbon\Carbon::parse($d)->format('Y-m-d H:i:s') : null;

        return response()->json([
            'success' => true,
            'user' => [
                'id'                => $user->id,
                'name'              => $user->name ?? $user->nome,
                'email'             => $user->email,
                'role'              => $this->resolverRole($user, $empresa),
                'ativo'             => (bool) $user->ativo,
                'ultimo_login'      => $fmt($user->ultimo_login ?? null),
                'created_at'        => $fmt($user->created_at ?? null),
                'email_verified_at' => $fmt($user->email_verified_at ?? null),
            ],
            'empresa' => [
                'id'            => $empresa->id,
                'nome'          => $empresa->nome,
                'nif'           => $empresa->nif,
                'email'         => $empresa->email,
                'telefone'      => $empresa->telefone,
                'endereco'      => $empresa->endereco,
                'subdomain'     => $empresa->subdomain,
                'logo'          => $empresa->logo,
                'regime_fiscal' => $empresa->regime_fiscal ?? 'simplificado',
                'sujeito_iva'   => (bool) $empresa->sujeito_iva,
                'is_seguradora' => (bool) $empresa->is_seguradora,
                'iva_padrao'    => (float) ($empresa->iva_padrao ?? 0),
                'status'        => $empresa->status ?? 'ativo',
                'data_registro' => $fmt($empresa->data_registro ?? null),
                'modo'          => $empresa->modo,
                'nome_banco'    => $empresa->nome_banco ?? null,
                'iban'          => $empresa->iban ?? null,
                'numero_conta'  => $empresa->numero_conta ?? null,
                'created_at'    => $fmt($empresa->created_at ?? null),
                'updated_at'    => $fmt($empresa->updated_at ?? null),
                'subscricao'    => $dadosSubscricao,
            ],
        ]);
    }

    /* =====================================================================
     | LOGOUT
     | ================================================================== */

    public function logout(Request $request): JsonResponse
    {
        Log::info('[AUTH] Logout iniciado', [
            'user_id'    => Auth::guard('landlord')->id(),
            'tenant_sub' => session('tenant_subdomain'),
        ]);

        // Logout de TODOS os guards (tenant + landlord + api)
        Auth::guard('tenant')->logout();
        Auth::guard('landlord')->logout();
        Auth::guard('landlord_api')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        Log::info('[AUTH] Logout completo');

        return response()->json([
            'success'      => true,
            'message'      => 'Logout realizado com sucesso',
            'redirect_url' => $this->montarUrl(),   // domínio base
        ]);
    }

    /* =====================================================================
     | HELPERS
     | ================================================================== */

    /**
     * URL absoluto do tenant (ou do domínio base se sem subdomínio).
     * Respeita esquema e porta do frontend (dev: http + :3000).
     */
    private function montarUrl(?string $subdomain = null): string
    {
        $scheme = config('app.frontend_scheme', 'https');
        $port   = config('app.frontend_port');
        $host   = ($subdomain ? "{$subdomain}." : '') . config('app.domain');

        return "{$scheme}://{$host}" . ($port ? ":{$port}" : '') . '/';
    }

    private function mapearRoleParaLandlord(string $roleTenant): string
    {
        // admin do tenant → admin_empresa no landlord; outros → user.
        // NUNCA devolve super_admin.
        return match ($roleTenant) {
            'admin'  => LandlordUser::ROLE_ADMIN_EMPRESA,
            default  => 'user',
        };
    }

    private function extrairSubdomain(string $host): ?string
    {
        $dominioBase = config('app.domain', 'localhost');
        $host = explode(':', $host)[0];

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return null;
        }

        if ($host === $dominioBase || $host === 'www.' . $dominioBase) {
            return null;
        }

        $suffix = '.' . $dominioBase;

        if (str_ends_with($host, $suffix)) {
            $sub = substr($host, 0, -strlen($suffix));
            if ($sub === '' || $sub === 'www' || str_contains($sub, '.')) {
                return null;
            }
            return $sub;
        }

        if (app()->environment('local', 'testing')) {
            $parts = explode('.', $host);
            if (count($parts) >= 2 && $parts[0] !== 'www') {
                return $parts[0];
            }
        }

        return null;
    }

    private function isIP(string $valor): bool
    {
        return filter_var($valor, FILTER_VALIDATE_IP) !== false;
    }

    private function isReservedSubdomain(string $subdomain): bool
    {
        $reserved = [
            'www', 'api', 'app', 'admin', 'login', 'register', 'logout',
            'auth', 'static', 'test', 'dev', 'staging', 'mail',
            'ftp', 'smtp', 'pop', 'imap',
        ];
        return in_array(strtolower($subdomain), $reserved, true);
    }
}