<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Cache;
use App\Models\Tenant\User;
use App\Models\LandlordUser;
use Illuminate\Support\Str;
use App\Models\Empresa;

/**
 * WebAuthController - Login Adaptativo Multi-Tenant
 * 
 * DEBUG LEVEL: MAXIMUM
 * Cada passo do fluxo é logado para rastreamento completo.
 */
class WebAuthController extends Controller
{
    /**
     * LOGIN ADAPTATIVO - 3 estratégias:
     * 1. Header X-Tenant-ID (UUID ou subdomain)
     * 2. Subdomínio do hostname
     * 3. Email-only (cross-tenant search em todos os bancos)
     */
public function login(Request $request): JsonResponse
{
    $logContext = [
        'host' => $request->getHost(),
        'x_tenant_id' => $request->header('X-Tenant-ID'),
        'x_empresa_id' => $request->header('X-Empresa-ID'),
        'has_email' => $request->has('email'),
        'ip' => $request->ip(),
        'user_agent' => substr($request->userAgent() ?? 'unknown', 0, 50),
    ];

    Log::info('[AUTH] ========== LOGIN ADAPTATIVO INICIADO ==========', $logContext);

    try {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $email = $request->input('email');
        $password = $request->input('password');

        Log::debug('[AUTH] Credenciais recebidas', [
            'email' => $email,
            'password_length' => strlen($password),
        ]);

        // ESTRATÉGIA 1: Header explícito ou Subdomínio
        Log::debug('[AUTH] Tentando Estratégia 1: Tenant explícito');
        $empresa = $this->resolverTenantExplicito($request);

        if ($empresa) {
            Log::info('[AUTH] Estratégia 1 SUCESSO - Tenant resolvido', [
                'modo' => $request->header('X-Tenant-ID') ? 'header' : 'subdomain',
                'tenant_id' => $empresa->id,
                'tenant_subdomain' => $empresa->subdomain,
                'tenant_db' => $empresa->db_name,
            ]);

            // ⭐ Conectar tenant ANTES de autenticar
            $this->conectarTenant($empresa);


            return $this->tentarAutenticarNoTenant($request, $empresa, $email, $password);
        }

        Log::debug('[AUTH] Estratégia 1 FALHOU - Nenhum tenant explícito');

        // ESTRATÉGIA 2: Email-only (Cross-Tenant Search)
        Log::info('[AUTH] Tentando Estratégia 2: Cross-Tenant Search', ['email' => $email]);

        $resultado = $this->pesquisarEmailEmTodosTenants($email, $password);

        if ($resultado['success']) {
            Log::info('[AUTH] Estratégia 2 SUCESSO - Usuário encontrado', [
                'email' => $email,
                'tenant' => $resultado['empresa']->subdomain,
                'user_id' => $resultado['user']->id,
            ]);


            return $this->finalizarLogin($request, $resultado['user'], $resultado['empresa'], 'auto-discovery');
        }

        Log::warning('[AUTH] Estratégia 2 FALHOU - Usuário não encontrado em nenhum tenant', [
            'email' => $email,
            'tenants_verificados' => $resultado['tenants_verificados'] ?? 0,
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Credenciais inválidas ou usuário não encontrado em nenhuma empresa.',
        ], 401);

    } catch (\Illuminate\Validation\ValidationException $e) {
        Log::warning('[AUTH] Validação falhou', ['errors' => $e->errors()]);
        return response()->json([
            'success' => false,
            'message' => 'Dados inválidos',
            'errors'  => $e->errors(),
        ], 422);

    } catch (\Exception $e) {
        Log::error('[AUTH] ERRO CRÍTICO no login', [
            'message' => $e->getMessage(),
            'file'    => $e->getFile(),
            'line'    => $e->getLine(),
            'trace'   => $e->getTraceAsString(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erro interno no servidor.',
        ], 500);
    }
}


    /**
     * ESTRATÉGIA 1: Resolve tenant por header ou subdomain
     */

    protected function conectarTenant(Empresa $empresa): void
{
    Config::set('database.connections.tenant.database', $empresa->db_name);
    Config::set('database.connections.tenant.host', env('TENANT_DB_HOST', env('DB_HOST')));
    Config::set('database.connections.tenant.port', env('TENANT_DB_PORT', env('DB_PORT')));

    DB::purge('tenant');
    DB::reconnect('tenant');

    Log::debug('CONEXÃO TENANT CONFIGURADA', [
        'db' => Config::get('database.connections.tenant.database'),
        'default' => Config::get('database.default'),
    ]);

    // Define tenant como padrão
    Config::set('database.default', 'tenant');

    Log::error('CONEXÃO TENANT CONFIGURADA', [
        'db' => Config::get('database.connections.tenant.database'),
        'default' => Config::get('database.default'),
    ]);

    try {
        DB::connection('tenant')->getPdo();
    } catch (\Exception $e) {
        Log::error('[TENANT][CONN] PDO FALHOU', ['error' => $e->getMessage()]);
        throw $e;
    }
}



    private function resolverTenantExplicito(Request $request): ?Empresa
    {
        Log::debug('[AUTH][E1] Iniciando resolução explícita');

        // Header X-Tenant-ID ou X-Empresa-ID
        $tenantId = $request->header('X-Tenant-ID') ?? $request->header('X-Empresa-ID');

        if ($tenantId && !$this->isIP($tenantId)) {
            Log::debug('[AUTH][E1] Header encontrado', ['header_value' => $tenantId]);

            if (Str::isUuid($tenantId)) {
                Log::debug('[AUTH][E1] Detectado UUID, buscando por ID');
                $empresa = Empresa::on('landlord')->where('id', $tenantId)->first();
                if ($empresa) {
                    Log::debug('[AUTH][E1] Empresa encontrada por UUID', ['id' => $empresa->id]);
                    return $empresa;
                }
                Log::debug('[AUTH][E1] UUID não encontrado');
            }

            Log::debug('[AUTH][E1] Tentando buscar por subdomain', ['subdomain' => $tenantId]);
            $empresa = Empresa::on('landlord')->where('subdomain', $tenantId)->first();
            if ($empresa) {
                Log::debug('[AUTH][E1] Empresa encontrada por subdomain', ['id' => $empresa->id]);
                return $empresa;
            }
            Log::debug('[AUTH][E1] Subdomain não encontrado');
        } else {
            Log::debug('[AUTH][E1] Nenhum header válido', [
                'has_header' => (bool)$tenantId,
                'is_ip' => $tenantId ? $this->isIP($tenantId) : false,
            ]);
        }

        // Subdomínio do hostname
        $host = $request->getHost();
        $parts = explode('.', $host);

        Log::debug('[AUTH][E1] Analisando hostname', ['host' => $host, 'parts' => $parts]);

        if (count($parts) >= 2 && !$this->isIP($host)) {
            $subdomain = $parts[0] === 'www' ? ($parts[1] ?? null) : $parts[0];

            if ($subdomain && !$this->isReservedSubdomain($subdomain)) {
                Log::debug('[AUTH][E1] Tentando subdomain do hostname', ['subdomain' => $subdomain]);
                $empresa = Empresa::on('landlord')->where('subdomain', $subdomain)->first();
                if ($empresa) {
                    Log::debug('[AUTH][E1] Empresa encontrada por hostname', ['id' => $empresa->id]);
                    return $empresa;
                }
                Log::debug('[AUTH][E1] Subdomain do hostname não encontrado');
            } else {
                Log::debug('[AUTH][E1] Subdomain reservado ou inválido', ['subdomain' => $subdomain]);
            }
        } else {
            Log::debug('[AUTH][E1] Hostname é IP ou não tem subdomain', [
                'is_ip' => $this->isIP($host),
                'parts_count' => count($parts),
            ]);
        }

        // Query param
        if ($tenantId = $request->get('tenant')) {
            Log::debug('[AUTH][E1] Tentando query param', ['tenant' => $tenantId]);
            $empresa = Empresa::on('landlord')
                ->where('id', $tenantId)
                ->orWhere('subdomain', $tenantId)
                ->first();
            if ($empresa) {
                Log::debug('[AUTH][E1] Empresa encontrada por query param');
                return $empresa;
            }
        }

        Log::debug('[AUTH][E1] Nenhum tenant encontrado nas estratégias explícitas');
        return null;
    }

    /**
     * ESTRATÉGIA 2: Pesquisa email em TODOS os tenants (Cross-Tenant Search)
     */
    private function pesquisarEmailEmTodosTenants(string $email, string $password): array
    {
        Log::debug('[AUTH][E2] Iniciando cross-tenant search', ['email' => $email]);

        $cacheKey = "tenant_search:" . md5($email);
        $tenantsVerificados = 0;

        // CACHE: Verifica se já sabe qual tenant tem este email
        $cachedTenantId = Cache::get($cacheKey);

        if ($cachedTenantId) {
            Log::debug('[AUTH][E2] Cache HIT', ['tenant_id' => $cachedTenantId]);

            $empresa = Empresa::on('landlord')->find($cachedTenantId);
            if ($empresa) {
                $resultado = $this->tentarAutenticarNoTenantRaw($empresa, $email, $password);
                if ($resultado['success']) {
                    Log::info('[AUTH][E2] Autenticação via cache SUCESSO');
                    return array_merge($resultado, ['tenants_verificados' => 1]);
                }
                Log::warning('[AUTH][E2] Cache STALE - removendo');
                Cache::forget($cacheKey);
            } else {
                Log::warning('[AUTH][E2] Cache inválido - empresa não existe');
                Cache::forget($cacheKey);
            }
        } else {
            Log::debug('[AUTH][E2] Cache MISS');
        }

        // OTIMIZAÇÃO: Tenta deduzir por domínio do email
        Log::debug('[AUTH][E2] Tentando dedução por domínio de email');
        $empresaPorDominio = $this->deduzirPorDominioEmail($email);

        if ($empresaPorDominio) {
            Log::info('[AUTH][E2] Tenant deduzido por domínio', [
                'email' => $email,
                'tenant' => $empresaPorDominio->subdomain,
                'tenant_id' => $empresaPorDominio->id,
            ]);

            $resultado = $this->tentarAutenticarNoTenantRaw($empresaPorDominio, $email, $password);
            $tenantsVerificados++;

            if ($resultado['success']) {
                Cache::put($cacheKey, $empresaPorDominio->id, now()->addMinutes(30));
                Log::info('[AUTH][E2] SUCESSO na dedução por domínio');
                return array_merge($resultado, ['tenants_verificados' => $tenantsVerificados]);
            }
            Log::debug('[AUTH][E2] Falha na dedução por domínio');
        } else {
            Log::debug('[AUTH][E2] Não foi possível deduzir por domínio (email genérico ou não encontrado)');
        }

        // SCAN em todos os tenants ativos
        $tenants = Empresa::on('landlord')
            ->where('status', 'ativo')
            ->get();

        Log::info('[AUTH][E2] Iniciando scan FULL em tenants', [
            'email' => $email,
            'total_tenants' => $tenants->count(),
        ]);

        foreach ($tenants as $empresa) {
            $tenantsVerificados++;

            try {
                Log::debug('[AUTH][E2] Verificando tenant', [
                    'index' => $tenantsVerificados,
                    'tenant' => $empresa->subdomain,
                    'db_name' => $empresa->db_name,
                ]);

                $resultado = $this->tentarAutenticarNoTenantRaw($empresa, $email, $password);

                if ($resultado['success']) {
                    Cache::put($cacheKey, $empresa->id, now()->addMinutes(30));

                    Log::info('[AUTH][E2] SUCESSO - Usuário encontrado', [
                        'email' => $email,
                        'tenant' => $empresa->subdomain,
                        'tenant_id' => $empresa->id,
                        'tenants_verificados' => $tenantsVerificados,
                    ]);

                    return array_merge($resultado, ['tenants_verificados' => $tenantsVerificados]);
                }

                Log::debug('[AUTH][E2] Usuário não encontrado neste tenant', [
                    'tenant' => $empresa->subdomain,
                ]);

            } catch (\Exception $e) {
                Log::warning('[AUTH][E2] Erro ao verificar tenant', [
                    'tenant' => $empresa->subdomain,
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                continue;
            }
        }

        Log::warning('[AUTH][E2] FALHA TOTAL - Usuário não encontrado em nenhum tenant', [
            'email' => $email,
            'tenants_verificados' => $tenantsVerificados,
        ]);

        return ['success' => false, 'tenants_verificados' => $tenantsVerificados];
    }

    /**
     * Tenta autenticar em um tenant específico (retorna array)
     */
    private function tentarAutenticarNoTenantRaw(Empresa $empresa, string $email, string $password): array
    {
        Log::debug('[AUTH][RAW] Conectando ao tenant', [
            'tenant' => $empresa->subdomain,
            'db_name' => $empresa->db_name,
        ]);

        try {
            // Configura conexão do tenant
            Config::set('database.connections.tenant.database', $empresa->db_name);
            DB::purge('tenant');
            DB::reconnect('tenant');

            // Testa conexão
            DB::connection('tenant')->getPdo();
            Log::debug('[AUTH][RAW] Conexão PDO OK');

        } catch (\Exception $e) {
            Log::error('[AUTH][RAW] ERRO conexão tenant', [
                'tenant' => $empresa->subdomain,
                'db_name' => $empresa->db_name,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false];
        }

        // Verifica se usuário existe
        Log::debug('[AUTH][RAW] Verificando existência do usuário', ['email' => $email]);

        $userExists = DB::connection('tenant')
            ->table('users')
            ->where('email', $email)
            ->exists();

        if (!$userExists) {
            Log::debug('[AUTH][RAW] Usuário NÃO existe neste tenant', ['email' => $email]);
            return ['success' => false];
        }

        Log::debug('[AUTH][RAW] Usuário existe, tentando autenticação');


        if (!Auth::guard('tenant')->attempt(['email' => $email, 'password' => $password])) {
            Log::debug('[AUTH][RAW] Senha incorreta', ['email' => $email]);
            return ['success' => false];
        }

        $user = Auth::guard('tenant')->user();
        Log::debug('[AUTH][RAW] Autenticação bem-sucedida', ['user_id' => $user->id ?? null]);

        if (!$user || !($user->ativo ?? true)) {
            Log::warning('[AUTH][RAW] Usuário inativo', ['user_id' => $user->id ?? null]);
            Auth::guard('tenant')->logout();
            return ['success' => false];
        }

        Log::info('[AUTH][RAW] Autenticação completa', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_nome' => $user->nome ?? $user->name ?? 'N/A',
        ]);

        return [
            'success' => true,
            'user' => $user,
            'empresa' => $empresa,
        ];
    }

    /**
     * Wrapper para Request (quando já tem empresa resolvida)
     */
    private function tentarAutenticarNoTenant(Request $request, Empresa $empresa, string $email, string $password): JsonResponse
    {
        Log::debug('[AUTH][WRAPPER] Autenticação com empresa pré-resolvida', [
            'tenant' => $empresa->subdomain,
        ]);

        $resultado = $this->tentarAutenticarNoTenantRaw($empresa, $email, $password);

        if (!$resultado['success']) {
            Log::warning('[AUTH][WRAPPER] Falha na autenticação', [
                'tenant' => $empresa->subdomain,
                'email' => $email,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        Log::info('[AUTH][WRAPPER] Sucesso, finalizando login');
        return $this->finalizarLogin($request, $resultado['user'], $resultado['empresa'], 'explicit');
    }

    /**
     * Deduz tenant pelo domínio do email
     */
    private function deduzirPorDominioEmail(string $email): ?Empresa
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            Log::debug('[AUTH][DEDUZ] Email inválido', ['email' => $email]);
            return null;
        }

        $domain = strtolower($parts[1]);

        $genericDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'icloud.com', 'mail.com', 'protonmail.com', 'live.com',
            'aol.com', 'gmx.com', 'yandex.com', 'zoho.com', 'qq.com',
            '163.com', '126.com', 'foxmail.com',
        ];

        if (in_array($domain, $genericDomains)) {
            Log::debug('[AUTH][DEDUZ] Domínio genérico, impossível deduzir', ['domain' => $domain]);
            return null;
        }

        $domainParts = explode('.', $domain);
        $possibleSubdomain = $domainParts[0];

        Log::debug('[AUTH][DEDUZ] Tentando match', [
            'domain' => $domain,
            'possible_subdomain' => $possibleSubdomain,
        ]);

        $empresa = Empresa::on('landlord')
            ->where('subdomain', $possibleSubdomain)
            ->where('status', 'ativo')
            ->first();

        if ($empresa) {
            Log::info('[AUTH][DEDUZ] Match encontrado', [
                'domain' => $domain,
                'subdomain' => $possibleSubdomain,
                'empresa_id' => $empresa->id,
            ]);
        } else {
            Log::debug('[AUTH][DEDUZ] Nenhum match', ['subdomain_tested' => $possibleSubdomain]);
        }

        return $empresa;
    }

    /**
     * Finaliza login (sessão, logs, resposta)
     * 
     * CORREÇÃO CRÍTICA: Mantém sessão tenant única + metadados do tenant
     */
private function finalizarLogin(Request $request, $tenantUser, Empresa $empresa, string $modo): JsonResponse
{
      // 1. Login no guard tenant (API e rotas protegidas)
    Auth::guard('tenant')->login($tenantUser);
    Log::info('[FINAL] Login tenant guard: ' . Auth::guard('tenant')->id());

    // 2. Garantir que existe LandlordUser correspondente
    $name = $tenantUser->name ?? $tenantUser->nome ?? explode('@', $tenantUser->email)[0] ?? 'Usuário';
    $landlordUser = LandlordUser::firstOrCreate(
        ['email' => $tenantUser->email],
        ['name' => $name, 'password' => $tenantUser->password]
    );
    
    Auth::guard('landlord')->login($landlordUser);

    // 3. Regenera sessão (segurança)
    $request->session()->regenerate();

    // 4. Salva metadados do tenant na sessão
    session([
        'tenant_id'   => $empresa->id,
        'tenant_db'   => $empresa->db_name,
        'tenant_nome' => $empresa->nome,
        'user_id'     => $landlordUser->id,
        'login_modo'  => $modo,
        'login_at'    => now()->toIso8601String(),
    ]);
    // 5. Atualiza último login no banco tenant
    try {
        DB::connection('tenant')
            ->table('users')
            ->where('id', $tenantUser->id)
            ->update(['ultimo_login' => now()]);
        Log::debug('[AUTH][FINAL] Último login atualizado');
    } catch (\Exception $e) {
        Log::warning('[AUTH][FINAL] Falha ao atualizar último login', [
            'error' => $e->getMessage(),
        ]);
    }

    // 6. Log de sucesso
    Log::info('[AUTH][FINAL] ========== LOGIN SUCESSO ==========', [
        'user' => $tenantUser->email,
        'user_id' => $tenantUser->id,
        'empresa' => $empresa->nome,
        'empresa_id' => $empresa->id,
        'subdomain' => $empresa->subdomain,
        'modo' => $modo,
        'ip' => $request->ip(),
    ]);

    // 7. Resposta JSON
    return response()->json([
        'success' => true,
        'message' => 'Login realizado com sucesso',
        'user' => [
            'id'    => $tenantUser->id,
            'name'  => $tenantUser->nome ?? $tenantUser->name,
            'email' => $tenantUser->email,
            'role'  => $tenantUser->role,
        ],
        'empresa' => [
            'id'        => $empresa->id,
            'nome'      => $empresa->nome,
            'nif'       => $empresa->nif,
            'subdomain' => $empresa->subdomain,
        ],
    ]);
}



    private function isIP(string $valor): bool
    {
        return filter_var($valor, FILTER_VALIDATE_IP) !== false;
    }

    private function isReservedSubdomain(string $subdomain): bool
    {
        $reserved = [
            'www', 'api', 'app', 'admin', 'login', 'register', 
            'logout', 'auth', 'static', 'test', 'dev', 'staging',
            'mail', 'ftp', 'smtp', 'pop', 'imap',
        ];
        return in_array(strtolower($subdomain), $reserved);
    }

    /**
     * Retorna usuário atual autenticado
     * 
     * CORREÇÃO: Usa guard 'tenant' + verifica sessão do tenant
     */
public function me(Request $request): JsonResponse
{
    Log::debug('[AUTH][ME] Debug completo', [
        'session_id' => $request->session()->getId(),
        'session_all' => session()->all(),
        'auth_guard_landlord_check' => Auth::guard('landlord')->check(),
        'auth_guard_landlord_id' => Auth::guard('landlord')->id(),
        'database_default' => Config::get('database.default'),
        'tenant_db' => Config::get('database.connections.tenant.database'),
    ]);

    // 1. Sessão sempre na landlord
    $landlordUser = Auth::guard('landlord')->user();
    if (!$landlordUser) {
        Log::warning('[AUTH][ME] Usuário não autenticado no guard landlord');
        return response()->json([
            'success' => false,
            'message' => 'Não autenticado.',
        ], 401);
    }

    // 2. Tenant da sessão
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

    // 3. Carregar dados do tenant pelo email do landlord
    $tenantUser = User::on('tenant')->where('email', $landlordUser->email)->first();

    Log::info('[AUTH][ME] Sucesso', [
        'user_id' => $landlordUser->id,
        'tenant_id' => $tenantId,
        'tenant_subdomain' => $empresa->subdomain,
    ]);

    // 4. Resposta JSON
    return response()->json([
        'success' => true,
        'user' => [
            'id'    => $tenantUser?->id ?? $landlordUser->id,
            'name'  => $tenantUser?->nome ?? $landlordUser->name,
            'email' => $landlordUser->email,
            'role'  => $tenantUser?->role ?? 'user',
        ],
        'empresa' => [
            'id'        => $empresa->id,
            'nome'      => $empresa->nome,
            'nif'       => $empresa->nif ?? null,
            'subdomain' => $empresa->subdomain,
        ],
    ]);
}
 /**
     * Logout do usuário
     */
public function logout(Request $request): JsonResponse
{
    Log::info('[AUTH] Logout iniciado', ['user_id' => Auth::guard('landlord')->id()]);

    // Salva tenant_id ANTES de limpar
    $tenantId   = session('tenant_id');
    $tenantDb   = session('tenant_db');
    $tenantNome = session('tenant_nome');

    // Logout do guard landlord (sessão global)
    Auth::guard('landlord')->logout();

    // Não usar invalidate() — isso mata toda a sessão
    // $request->session()->invalidate();

    // Limpa apenas dados de autenticação
    session()->forget([
        'user_id',
        'login_at',
        'login_modo',
    ]);

    // Regenera token CSRF
    $request->session()->regenerateToken();

   
    if ($tenantId) {
        session([
            'tenant_id'   => $tenantId,
            'tenant_db'   => $tenantDb,
            'tenant_nome' => $tenantNome,
        ]);
    }

    Log::info('[AUTH] Logout completo', [
        'tenant_id_preserved' => $tenantId,
        'session_id' => $request->session()->getId(),
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Logout realizado',
        'tenant_id' => $tenantId,
    ]);
}

}