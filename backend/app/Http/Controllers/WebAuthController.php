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
use App\Models\Empresa;
use App\Models\Tenant\User as TenantUser;
use App\Models\Shared\User as SharedUser;
use App\Models\LandlordUser;

/**
 * WebAuthController - Login Adaptativo Multi-Tenant
 * 
 * Suporte nativo para:
 * - Modo SINGULAR: cada empresa com seu próprio banco (tenant)
 * - Modo COLECTIVO: várias empresas compartilham o banco shared (com tenant_id)
 * 
 * DEBUG LEVEL: MAXIMUM
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
            'host'          => $request->getHost(),
            'x_tenant_id'   => $request->header('X-Tenant-ID'),
            'x_empresa_id'  => $request->header('X-Empresa-ID'),
            'has_email'     => $request->has('email'),
            'ip'            => $request->ip(),
            'user_agent'    => substr($request->userAgent() ?? 'unknown', 0, 50),
        ];

        Log::info('[AUTH] ========== LOGIN ADAPTATIVO INICIADO ==========', $logContext);

        try {
            $request->validate([
                'email'    => 'required|email',
                'password' => 'required|string|min:6',
            ]);

            $email    = $request->input('email');
            $password = $request->input('password');

            Log::debug('[AUTH] Credenciais recebidas', [
                'email'           => $email,
                'password_length' => strlen($password),
            ]);

            // ESTRATÉGIA 1: Header explícito ou Subdomínio
            Log::debug('[AUTH] Tentando Estratégia 1: Tenant explícito');
            $empresa = $this->resolverTenant($request);

            if ($empresa) {
                Log::info('[AUTH] Estratégia 1 SUCESSO - Tenant resolvido', [
                    'modo'           => $empresa->modo,
                    'tenant_id'      => $empresa->id,
                    'tenant_subdomain' => $empresa->subdomain,
                    'tenant_db'      => $empresa->db_name,
                ]);

                return $this->autenticarNoTenant($request, $empresa, $email, $password);
            }

            Log::debug('[AUTH] Estratégia 1 FALHOU - Nenhum tenant explícito');

            // ESTRATÉGIA 2: Email-only (Cross-Tenant Search)
            Log::info('[AUTH] Tentando Estratégia 2: Cross-Tenant Search', ['email' => $email]);

            $resultado = $this->pesquisarEmailEmTodosTenants($email, $password);

            if ($resultado['success']) {
                Log::info('[AUTH] Estratégia 2 SUCESSO - Usuário encontrado', [
                    'email'  => $email,
                    'tenant' => $resultado['empresa']->subdomain,
                    'user_id' => $resultado['user']->id,
                ]);

                return $this->finalizarLogin(
                    $request,
                    $resultado['user'],
                    $resultado['empresa'],
                    'auto-discovery'
                );
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
 * Login apenas com email – sem verificar senha.
 * Faz cross-tenant search e autentica o primeiro utilizador encontrado.
 */
public function loginWithEmailOnly(Request $request): JsonResponse
{
    $request->validate([
        'email' => 'required|email',
    ]);

    $email = $request->input('email');

    Log::info('[AUTH] Login sem senha (email-only)', ['email' => $email]);

    // 1. Encontrar todos os tenants onde o email existe (sem verificar senha)
    $empresas = $this->findTenantsByEmail($email);

    if (empty($empresas)) {
        return response()->json([
            'success' => false,
            'message' => 'Email não encontrado em nenhuma empresa.'
        ], 404);
    }

    // 2. Escolhe o primeiro tenant (ou pode retornar lista para o frontend escolher)
    $empresa = $empresas[0];

    // 3. Conectar e buscar o utilizador
    $this->conectarBanco($empresa);
    $user = $this->buscarUsuario($empresa, $email);

    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'Utilizador não encontrado.'
        ], 404);
    }

    if (!$user->ativo) {
        return response()->json([
            'success' => false,
            'message' => 'Utilizador inativo.'
        ], 403);
    }

    // 4. Finalizar login (reutiliza o método existente)
    return $this->finalizarLogin($request, $user, $empresa, 'email-only');
}



/**
 * Encontra todas as empresas ativas onde o email existe (cross-tenant, sem senha).
 */
private function findTenantsByEmail(string $email): array
{
    $tenants = Empresa::on('landlord')->where('status', 'ativo')->get();
    $found = [];

    foreach ($tenants as $empresa) {
        $this->conectarBanco($empresa);
        $user = $this->buscarUsuario($empresa, $email);
        if ($user) {
            $found[] = $empresa;
        }
    }

    return $found;
}


    /**
     * CONECTA AO BANCO CORRETO CONFORME O MODO DA EMPRESA
     */
    private function conectarBanco(Empresa $empresa): void
    {
        Log::debug('[AUTH][CONN] Configurando conexão', [
            'modo' => $empresa->modo,
            'db_name' => $empresa->db_name,
        ]);

        if ($empresa->modo === 'singular') {
            Config::set('database.connections.tenant.database', $empresa->db_name);
            DB::purge('tenant');
            DB::reconnect('tenant');
            Config::set('database.default', 'tenant');
            Log::debug('[AUTH][CONN] Modo SINGULAR: usando tenant', ['db' => $empresa->db_name]);
        } else {
            // Modo colectivo
            Config::set('database.default', 'shared');
            DB::purge('shared');
            DB::reconnect('shared');
            Log::debug('[AUTH][CONN] Modo COLECTIVO: usando shared', ['db' => config('database.connections.shared.database')]);
        }

        // Testa a conexão
        try {
            DB::connection()->getPdo();
            Log::debug('[AUTH][CONN] Conexão PDO OK');
        } catch (\Exception $e) {
            Log::error('[AUTH][CONN] PDO FALHOU', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * BUSCA USUÁRIO NO BANCO CORRETO (SINGULAR ou COLECTIVO)
     */
    private function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        Log::debug('[AUTH][SEARCH] Buscando usuário', [
            'modo'  => $empresa->modo,
            'email' => $email,
            'tenant_id' => $empresa->id,
        ]);

        if ($empresa->modo === 'singular') {
            $user = TenantUser::on('tenant')->where('email', $email)->first();
            Log::debug('[AUTH][SEARCH] SINGULAR: ' . ($user ? 'encontrado' : 'não encontrado'));
            return $user;
        } else {
            $user = SharedUser::on('shared')
                ->where('email', $email)
                ->where('tenant_id', $empresa->id)
                ->first();
            Log::debug('[AUTH][SEARCH] COLECTIVO: ' . ($user ? 'encontrado' : 'não encontrado'));
            return $user;
        }
    }

    /**
     * AUTENTICA NO TENANT (USANDO O BANCO CORRETO)
     */
    private function autenticarNoTenant(Request $request, Empresa $empresa, string $email, string $password): JsonResponse
    {
        Log::debug('[AUTH][AUTH] Iniciando autenticação no tenant', [
            'empresa' => $empresa->nome,
            'modo'    => $empresa->modo,
            'db'      => $empresa->db_name,
        ]);

        // Conecta ao banco correto
        $this->conectarBanco($empresa);

        // Busca o usuário
        $user = $this->buscarUsuario($empresa, $email);

        if (!$user) {
            Log::warning('[AUTH][AUTH] Usuário não encontrado', ['email' => $email]);
            return response()->json([
                'success' => false,
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        // Verifica senha
        if (!Hash::check($password, $user->password)) {
            Log::warning('[AUTH][AUTH] Senha incorreta', ['email' => $email]);
            return response()->json([
                'success' => false,
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        // Verifica se está ativo
        if (!$user->ativo) {
            Log::warning('[AUTH][AUTH] Usuário inativo', ['email' => $email]);
            return response()->json([
                'success' => false,
                'message' => 'Usuário inativo. Contacte o administrador.',
            ], 403);
        }

        Log::info('[AUTH][AUTH] Autenticação bem-sucedida', [
            'user_id' => $user->id,
            'email'   => $user->email,
        ]);

        // Atualiza último login
        $user->ultimo_login = now();
        $user->save();

        return $this->finalizarLogin($request, $user, $empresa, 'explicit');
    }

    /**
     * PESQUISA EMAIL EM TODOS OS TENANTS (Cross-Tenant Search)
     * Suporta ambos os modos
     */
private function pesquisarEmailEmTodosTenants(string $email, string $password): array
{
    Log::debug('[AUTH][E2] Iniciando cross-tenant search', ['email' => $email]);

    $cacheKey = "tenant_search:" . md5($email);
    $tenantsVerificados = 0;

    // CACHE
    $cachedTenantId = Cache::get($cacheKey);
    if ($cachedTenantId) {
        Log::debug('[AUTH][E2] Cache HIT', ['tenant_id' => $cachedTenantId]);
        $empresa = Empresa::on('landlord')->find($cachedTenantId);
        if ($empresa) {
            // 🔥 CORREÇÃO AQUI
            $this->conectarBanco($empresa);
            $user = $this->buscarUsuario($empresa, $email);
            if ($user && Hash::check($password, $user->password) && $user->ativo) {
                Log::info('[AUTH][E2] Autenticação via cache SUCESSO');
                return ['success' => true, 'user' => $user, 'empresa' => $empresa, 'tenants_verificados' => 1];
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

    // DEDUÇÃO POR DOMÍNIO
    Log::debug('[AUTH][E2] Tentando dedução por domínio de email');
    $empresaPorDominio = $this->deduzirPorDominioEmail($email);
    if ($empresaPorDominio) {
        Log::info('[AUTH][E2] Tenant deduzido por domínio', [
            'email' => $email,
            'tenant' => $empresaPorDominio->subdomain,
            'tenant_id' => $empresaPorDominio->id,
        ]);
        // 🔥 CORREÇÃO AQUI
        $this->conectarBanco($empresaPorDominio);
        $user = $this->buscarUsuario($empresaPorDominio, $email);
        $tenantsVerificados++;
        if ($user && Hash::check($password, $user->password) && $user->ativo) {
            Cache::put($cacheKey, $empresaPorDominio->id, now()->addMinutes(30));
            Log::info('[AUTH][E2] SUCESSO na dedução por domínio');
            return ['success' => true, 'user' => $user, 'empresa' => $empresaPorDominio, 'tenants_verificados' => $tenantsVerificados];
        }
        Log::debug('[AUTH][E2] Falha na dedução por domínio');
    } else {
        Log::debug('[AUTH][E2] Não foi possível deduzir por domínio');
    }

    // SCAN FULL (já estava correto)
    $tenants = Empresa::on('landlord')->where('status', 'ativo')->get();
    Log::info('[AUTH][E2] Iniciando scan FULL em tenants', [
        'email' => $email,
        'total_tenants' => $tenants->count(),
    ]);

    foreach ($tenants as $empresa) {
        $tenantsVerificados++;
        try {
            Log::debug('[AUTH][E2] Verificando tenant', [
                'index'  => $tenantsVerificados,
                'tenant' => $empresa->subdomain,
                'modo'   => $empresa->modo,
                'db'     => $empresa->db_name,
            ]);
            // ✅ Já está correto aqui
            $this->conectarBanco($empresa);
            $user = $this->buscarUsuario($empresa, $email);
            if ($user && Hash::check($password, $user->password) && $user->ativo) {
                Cache::put($cacheKey, $empresa->id, now()->addMinutes(30));
                Log::info('[AUTH][E2] SUCESSO - Usuário encontrado', [
                    'email'  => $email,
                    'tenant' => $empresa->subdomain,
                    'tenant_id' => $empresa->id,
                    'modo'   => $empresa->modo,
                    'tenants_verificados' => $tenantsVerificados,
                ]);
                return ['success' => true, 'user' => $user, 'empresa' => $empresa, 'tenants_verificados' => $tenantsVerificados];
            }
            Log::debug('[AUTH][E2] Usuário não encontrado neste tenant', ['tenant' => $empresa->subdomain]);
        } catch (\Exception $e) {
            Log::warning('[AUTH][E2] Erro ao verificar tenant', [
                'tenant' => $empresa->subdomain,
                'error'  => $e->getMessage(),
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
     * DEDUZ TENANT PELO DOMÍNIO DO EMAIL
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
     * RESOLVE TENANT POR HEADER, SUBDOMÍNIO OU QUERY PARAM
     */
    private function resolverTenant(Request $request): ?Empresa
    {
        Log::debug('[AUTH][E1] Iniciando resolução explícita');

        // Header X-Tenant-ID / X-Empresa-ID
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
     * FINALIZA LOGIN (cria sessão, sincroniza LandlordUser, responde)
     */
    private function finalizarLogin(Request $request, $tenantUser, Empresa $empresa, string $modo): JsonResponse
    {
        Log::debug('[AUTH][FINAL] Finalizando login', [
            'email' => $tenantUser->email,
            'empresa' => $empresa->nome,
            'modo' => $modo,
        ]);

        // Sincroniza com LandlordUser (para guard landlord e sessão)
        $landlordUser = LandlordUser::firstOrCreate(
            ['email' => $tenantUser->email],
            [
                'name' => $tenantUser->name ?? $tenantUser->nome ?? 'Usuário',
                'password' => $tenantUser->password,
            ]
        );

        // Login no guard landlord
        Auth::guard('landlord')->login($landlordUser);
        $request->session()->regenerate();

        // Armazena dados do tenant e usuário na sessão
        session([
            'tenant_id'      => $empresa->id,
            'tenant_db'      => $empresa->db_name,
            'tenant_nome'    => $empresa->nome,
            'tenant_modo'    => $empresa->modo,          // <-- CRUCIAL
            'user_tenant_id' => $tenantUser->id,
            'user_email'     => $tenantUser->email,
            'login_modo'     => $modo,
            'login_at'       => now()->toIso8601String(),
            'landlord_user_id' => $landlordUser->id,
        ]);

        // Atualiza último login no tenant (já foi feito, mas garantimos)
        try {
            $tenantUser->ultimo_login = now();
            $tenantUser->save();
        } catch (\Exception $e) {
            Log::warning('[AUTH][FINAL] Falha ao atualizar último login', ['error' => $e->getMessage()]);
        }

        Log::info('[AUTH][FINAL] ========== LOGIN SUCESSO ==========', [
            'user'      => $tenantUser->email,
            'user_id'   => $tenantUser->id,
            'empresa'   => $empresa->nome,
            'empresa_id'=> $empresa->id,
            'subdomain' => $empresa->subdomain,
            'modo'      => $empresa->modo,
            'ip'        => $request->ip(),
        ]);

        $fmt = fn ($date) => $date ? \Carbon\Carbon::parse($date)->format('Y-m-d H:i:s') : null;

        return response()->json([
            'success' => true,
            'message' => 'Login realizado com sucesso',
            'user' => [
                'id'                => $tenantUser->id,
                'name'              => $tenantUser->name ?? $tenantUser->nome,
                'email'             => $tenantUser->email,
                'role'              => $tenantUser->role ?? 'operador',
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
                'iva_padrao'    => (float) ($empresa->iva_padrao ?? 0),
                'status'        => $empresa->status ?? 'ativo',
                'data_registro' => $fmt($empresa->data_registro ?? null),
                'modo'          => $empresa->modo,
            ],
        ]);
    }

    /**
     * RETORNA O USUÁRIO ATUAL AUTENTICADO
     * (com suporte a ambos os modos)
     */
    public function me(Request $request): JsonResponse
{
    Log::debug('[AUTH][ME] Debug completo', [
        'session_id'                => $request->session()->getId(),
        'session_all'               => session()->all(),
        'auth_guard_landlord_check' => Auth::guard('landlord')->check(),
        'auth_guard_landlord_id'    => Auth::guard('landlord')->id(),
        'database_default'          => Config::get('database.default'),
    ]);

    $landlordUser = Auth::guard('landlord')->user();
    if (!$landlordUser) {
        Log::warning('[AUTH][ME] Usuário não autenticado no guard landlord');
        return response()->json(['success' => false, 'message' => 'Não autenticado.'], 401);
    }

    $tenantId = session('tenant_id');
    if (!$tenantId) {
        return response()->json(['success' => false, 'message' => 'Sessão incompleta — tenant não identificado.'], 403);
    }

    $empresa = Empresa::on('landlord')->find($tenantId);
    if (!$empresa) {
        return response()->json(['success' => false, 'message' => 'Empresa não encontrada.'], 404);
    }

    // ✅ LOG PARA VERIFICAR OS CAMPOS DA EMPRESA
    Log::info('[AUTH][ME] Dados da empresa carregados', [
        'empresa_id' => $empresa->id,
        'nome' => $empresa->nome,
        'campos_bancarios' => [
            'nome_banco' => $empresa->nome_banco ?? 'null',
            'iban' => $empresa->iban ?? 'null',
            'numero_conta' => $empresa->numero_conta ?? 'null',
        ],
        'todos_campos' => array_keys($empresa->getAttributes()),
    ]);

    // Recupera o modo da sessão (garantia)
    $modo = session('tenant_modo', $empresa->modo);
    $empresa->modo = $modo;

    // Busca o usuário no banco correto
    $user = $this->buscarUsuario($empresa, $landlordUser->email);

    if (!$user) {
        Log::warning('[AUTH][ME] Usuário não encontrado no tenant', [
            'email' => $landlordUser->email,
            'tenant' => $empresa->subdomain,
        ]);
        return response()->json(['success' => false, 'message' => 'Utilizador não encontrado no tenant.'], 404);
    }

    Log::info('[AUTH][ME] Sucesso', [
        'user_id'          => $user->id,
        'tenant_id'        => $tenantId,
        'tenant_subdomain' => $empresa->subdomain,
        'modo'             => $empresa->modo,
    ]);

    $fmt = fn ($date) => $date ? \Carbon\Carbon::parse($date)->format('Y-m-d H:i:s') : null;

    return response()->json([
        'success' => true,
        'user' => [
            'id'                => $user->id,
            'name'              => $user->name ?? $user->nome,
            'email'             => $user->email,
            'role'              => $user->role ?? 'operador',
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
            'iva_padrao'    => (float) ($empresa->iva_padrao ?? 0),
            'status'        => $empresa->status ?? 'ativo',
            'data_registro' => $fmt($empresa->data_registro ?? null),
            'modo'          => $empresa->modo,
            // CAMPOS BANCÁRIOS
            'nome_banco'    => $empresa->nome_banco ?? null,
            'iban'          => $empresa->iban ?? null,
            'numero_conta'  => $empresa->numero_conta ?? null,
            'created_at'    => $fmt($empresa->created_at ?? null),
            'updated_at'    => $fmt($empresa->updated_at ?? null),
        ],
    ]);
}

    /**
     * LOGOUT DO USUÁRIO (mantém dados do tenant na sessão)
     */
    public function logout(Request $request): JsonResponse
    {
        Log::info('[AUTH] Logout iniciado', ['user_id' => Auth::guard('landlord')->id()]);

        // Salva tenant_id ANTES de limpar
        $tenantId   = session('tenant_id');
        $tenantDb   = session('tenant_db');
        $tenantNome = session('tenant_nome');
        $tenantModo = session('tenant_modo');

        // Logout do guard landlord
        Auth::guard('landlord')->logout();

        // Limpa apenas dados de autenticação (mantém tenant)
        session()->forget([
            'user_tenant_id',
            'user_email',
            'login_at',
            'login_modo',
        ]);

        // Regenera token CSRF
        $request->session()->regenerateToken();

        // Restaura informações do tenant (para futuras requisições sem login)
        if ($tenantId) {
            session([
                'tenant_id'   => $tenantId,
                'tenant_db'   => $tenantDb,
                'tenant_nome' => $tenantNome,
                'tenant_modo' => $tenantModo,
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

    // ==================== UTILITÁRIOS ====================

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
}
