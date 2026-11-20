<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Empresa;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redirect;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\URL;

class ResolveTenant
{
    protected string $dominioBase;

    public function __construct()
    {
        // Requer em config/app.php: 'domain' => env('APP_DOMAIN', 'localhost'),
        // Ex.: APP_DOMAIN=app.factura-ja.ao
        $this->dominioBase = rtrim(
            config('app.domain', env('APP_DOMAIN', 'localhost')),
            '.'
        );
    }

    public function handle(Request $request, Closure $next): Response
{
    // ⭐ (Bug 5) limpa defaults de requests anteriores (Octane, queue workers, tests)
    URL::defaults(['tenant' => null]);

    // ⭐ (Bug 4) pré-define tenant pelo subdomínio do host (para rotas públicas)
    $subdomainHost = $this->extrairSubdomain($request->getHost());
    if ($subdomainHost) {
        URL::defaults(['tenant' => $subdomainHost]);
    }

    // ============================================
    // 1. ROTAS PÚBLICAS (LANDLORD)
    // ============================================
    if ($this->isPublicRoute($request)) {
        Config::set('database.default', 'landlord');
        DB::reconnect('landlord');
        return $next($request);
    }

    // ============================================
    // 2. (removido — coberto por isPublicRoute)
    // ============================================

    // ============================================
    // 3. VERIFICAR SESSION (Tenant já identificado)
    //    + ISOLAMENTO: sessão de "acme" não vale em "beta.app..."
    // ============================================
    $tenantId  = session('tenant_id');
    $viaHeader = false;

    if (!$tenantId) {
        $tenantId  = $request->header('X-Empresa-ID') ?: $request->header('X-Tenant-ID');
        $viaHeader = (bool) $tenantId;
    }

    if ($tenantId) {
        $empresa        = Empresa::on('landlord')->find($tenantId);
        $subdomainAtual = $this->extrairSubdomain($request->getHost());

        if (!$viaHeader && $empresa && $subdomainAtual && $subdomainAtual !== $empresa->subdomain) {
            Log::warning('ResolveTenant: Sessão de OUTRO tenant — a limpar', [
                'session_tenant'    => $empresa->subdomain,
                'current_subdomain' => $subdomainAtual,
                'empresa_id'        => $empresa->id,
            ]);

            try {
                auth()->guard('tenant')->logout();
            } catch (\Throwable $e) {
                // guard pode não ter user
            }

            session()->forget(['tenant_id', 'tenant_subdomain']);
            $empresa = null;
        }

        if ($empresa && $empresa->status === 'ativo') {
            session()->put('tenant_id', $empresa->id);
            session()->put('tenant_subdomain', $empresa->subdomain);
            $this->conectarTenant($empresa);
            $this->registrarContexto($request, $empresa);
            $this->reescreverUrl($request, $empresa);   // ⭐ (Bug 1) ADICIONADO

            Log::info('ResolveTenant: Tenant via sessão/header', [
                'empresa_id' => $empresa->id,
                'modo'       => $empresa->modo,
                'via_header' => $viaHeader,
            ]);

            return $next($request);
        }
    }
        // ============================================
        // 4. DETECTAR POR SUBDOMAIN (PRINCIPAL)
        // ============================================
        $empresa = $this->detectarPorSubdomain($request);

        // ============================================
        // 5. FALLBACK: HEADER, QUERY, TOKEN
        // ============================================
        if (!$empresa) {
            $empresa = $this->detectarPorFallback($request);
        }

        // ============================================
        // 6. EMPRESA NÃO ENCONTRADA
        // ============================================
        if (!$empresa) {
            return $this->handleEmpresaNaoEncontrada($request);
        }

        // ============================================
        // 7. VERIFICAR STATUS DA EMPRESA
        // ============================================
        if ($empresa->status !== 'ativo') {
            return $this->handleEmpresaSuspensa($empresa, $request);
        }

        // ============================================
        // 8. REDIRECIONAMENTO (se necessário)
        // ============================================
        $redirecionamento = $this->verificarRedirecionamento($request, $empresa);
        if ($redirecionamento) {
            return $redirecionamento;
        }

        // ============================================
        // 9. SALVAR NA SESSION
        // ============================================
        session()->put('tenant_id', $empresa->id);
        session()->put('tenant_subdomain', $empresa->subdomain);

        // ============================================
        // 10. CONECTAR AO BANCO
        // ============================================
        try {
            $this->conectarTenant($empresa);
            $this->registrarContexto($request, $empresa);

            Log::info('ResolveTenant: Tenant conectado', [
                'empresa_id' => $empresa->id,
                'subdomain'  => $empresa->subdomain,
                'modo'       => $empresa->modo,
                'database'   => $empresa->modo === 'singular' ? $empresa->db_name : 'shared',
            ]);
        } catch (\Exception $e) {
            Log::error('ResolveTenant: Erro ao conectar tenant', [
                'empresa_id' => $empresa->id,
                'error'      => $e->getMessage(),
            ]);

            return $this->errorResponse(
                'Erro ao conectar ao banco da empresa.',
                500,
                $request
            );
        }

        // ============================================
        // 11. REESCREVER HEADERS INTERNOS
        // ============================================
        $this->reescreverUrl($request, $empresa);

        return $next($request);
    }

    // ============================================
    // DETECÇÃO
    // ============================================

    protected function detectarPorSubdomain(Request $request): ?Empresa
    {
        $host      = explode(':', $request->getHost())[0];
        $subdomain = $this->extrairSubdomain($host);

        Log::debug('ResolveTenant: Detectando por subdomain', [
            'host'      => $host,
            'subdomain' => $subdomain,
        ]);

        if (!$subdomain) {
            return null;
        }

        return Cache::remember("empresa_subdomain_{$subdomain}", 3600, function () use ($subdomain) {
            return Empresa::on('landlord')
                ->where('subdomain', $subdomain)
                ->where('status', 'ativo')
                ->first();
        });
    }

    protected function detectarPorFallback(Request $request): ?Empresa
    {
        if ($empresaId = $request->header('X-Empresa-ID')) {
            Log::debug('ResolveTenant: Fallback por header', ['empresa_id' => $empresaId]);
            return Empresa::on('landlord')->find($empresaId);
        }

        if ($empresaId = $request->get('empresa')) {
            Log::debug('ResolveTenant: Fallback por query', ['empresa_id' => $empresaId]);
            return Empresa::on('landlord')->find($empresaId);
        }

        if ($token = $request->bearerToken()) {
            Log::debug('ResolveTenant: Fallback por token');
            return $this->detectarPorToken($token);
        }

        return null;
    }

    protected function detectarPorToken(string $token): ?Empresa
    {
        try {
            $tokenHash = hash('sha256', $token);

            $landlordToken = DB::connection('landlord')
                ->table('personal_access_tokens')
                ->where('token', $tokenHash)
                ->first();

            if ($landlordToken) {
                $user = \App\Models\LandlordUser::on('landlord')
                    ->find($landlordToken->tokenable_id);

                if ($user && $user->empresa_id_atual) {
                    return Empresa::on('landlord')->find($user->empresa_id_atual);
                }
            }
        } catch (\Exception $e) {
            Log::warning('ResolveTenant: Erro ao detectar por token', [
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    // ============================================
    // REDIRECIONAMENTO
    // ============================================

    protected function verificarRedirecionamento(Request $request, Empresa $empresa): ?Response
    {
        if (app()->environment('local')) {
            return null;
        }

        $hostAtual = explode(':', $request->getHost())[0];

        if (in_array($hostAtual, ['localhost', '127.0.0.1']) || $this->isIP($hostAtual)) {
            return null;
        }

        $hostEsperado = $this->montarHost($empresa->subdomain);

        if ($hostAtual === $hostEsperado) {
            return null;
        }

        // Domínio base com sessão de tenant → 302 para o subdomínio
        if ($this->isDominioBase($hostAtual) && $empresa->subdomain) {
            $novaUrl = $this->montarUrl($request, $empresa->subdomain);

            Log::info('ResolveTenant: Redirecionando para subdomain', [
                'de'   => $request->fullUrl(),
                'para' => $novaUrl,
            ]);

            return Redirect::to($novaUrl, 302);
        }

        // Subdomínio errado → 301 permanente
        if (!$this->isDominioBase($hostAtual)) {
            $novaUrl = $this->montarUrl($request, $empresa->subdomain);

            Log::warning('ResolveTenant: Subdomain incorreto, redirecionando', [
                'empresa_id'         => $empresa->id,
                'subdomain_esperado' => $empresa->subdomain,
                'host_atual'         => $hostAtual,
            ]);

            return Redirect::to($novaUrl, 301);
        }

        return null;
    }

    protected function montarUrl(Request $request, string $subdomain): string
    {
        $scheme = $request->getScheme();
        $host   = $this->montarHost($subdomain);
        $path   = $request->getPathInfo();
        $query  = $request->getQueryString();

        return "{$scheme}://{$host}{$path}" . ($query ? "?{$query}" : '');
    }

    protected function montarHost(string $subdomain): string
    {
        return "{$subdomain}.{$this->dominioBase}";
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Extrai o subdomínio do tenant.
     *
     * base = app.factura-ja.ao
     *   acme.app.factura-ja.ao      → "acme" ✓
     *   app.factura-ja.ao           → null   (base)
     *   www.app.factura-ja.ao       → null   (alias do base)
     *   www.acme.app.factura-ja.ao  → null   (sub-subdomínio rejeitado)
     *   a.b.app.factura-ja.ao       → null   (sub-subdomínio rejeitado)
     *   localhost / 127.0.0.1       → null
     *
     * Em local/testing aceita "tenant.localhost" como fallback.
     */
    protected function extrairSubdomain(string $host): ?string
    {
        $host = explode(':', $host)[0];

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return null;
        }

        if ($this->isDominioBase($host)) {
            return null;
        }

        $suffix = '.' . $this->dominioBase;

        if (str_ends_with($host, $suffix)) {
            $subdomain = substr($host, 0, -strlen($suffix));

            if ($subdomain === '' || $subdomain === 'www' || str_contains($subdomain, '.')) {
                return null;
            }

            return $subdomain;
        }

        // Fallback de desenvolvimento: tenant.localhost
        if (app()->environment('local', 'testing')) {
            $parts = explode('.', $host);
            if (count($parts) >= 2 && $parts[0] !== 'www') {
                return $parts[0];
            }
        }

        return null;
    }

    protected function isDominioBase(string $host): bool
    {
        $host = explode(':', $host)[0];
        return $host === $this->dominioBase || $host === 'www.' . $this->dominioBase;
    }

    protected function isIP(string $host): bool
    {
        return filter_var($host, FILTER_VALIDATE_IP) !== false;
    }

    /**
     * Rotas que NÃO resolvem tenant.
     *
     * - Sempre públicas: Sanctum, Ignition, Telescope.
     * - Landlord-only: landlord/*, api/landlord/*, admin/*, api/empresas.
     * - login/register/password/email: públicos SÓ no domínio base.
     *   Em acme.app..., o tenant precisa ser resolvido ANTES do login,
     *   pois o guard `tenant` consulta o DB do tenant.
     */
    protected function isPublicRoute(Request $request): bool
    {
        foreach (['sanctum/csrf-cookie', '_ignition/*', 'telescope/*'] as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }

        foreach (['landlord/*', 'api/landlord/*', 'admin/*', 'api/empresas'] as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }

        $host = explode(':', $request->getHost())[0];
        if ($this->isDominioBase($host)) {
            foreach (['login', 'register', 'password/*', 'email/*'] as $pattern) {
                if ($request->is($pattern)) {
                    return true;
                }
            }
        }

        return false;
    }

    // ============================================
    // CONEXÃO E CONTEXTO
    // ============================================

    protected function conectarTenant(Empresa $empresa): void
    {
        // Modo COLECTIVO → Shared DB
        if ($empresa->modo === 'colectivo') {
            Config::set('database.default', 'shared');
            DB::reconnect('shared');

            Log::debug('ResolveTenant: Conectado ao Shared DB (colectivo)', [
                'empresa_id' => $empresa->id,
            ]);
            return;
        }

        // Modo SINGULAR → DB dedicado
        if (empty($empresa->db_name)) {
            throw new \Exception("A empresa {$empresa->id} não tem nome de base de dados definido.");
        }

        if (app()->environment('local', 'testing')) {
            try {
                $databases = DB::connection('landlord')->select('SHOW DATABASES');
                $exists = false;
                foreach ($databases as $db) {
                    if ($db->Database === $empresa->db_name) {
                        $exists = true;
                        break;
                    }
                }

                if (!$exists) {
                    Log::warning('ResolveTenant: Banco de dados não encontrado', [
                        'empresa_id' => $empresa->id,
                        'db_name'    => $empresa->db_name,
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('ResolveTenant: Erro ao validar banco', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Config::set('database.connections.tenant.database', $empresa->db_name);

        if (app()->environment('local', 'testing')) {
            DB::purge('tenant');
        }
        DB::reconnect('tenant');
        Config::set('database.default', 'tenant');

        Log::info('ResolveTenant: Conectado ao Tenant DB (singular)', [
            'empresa_id' => $empresa->id,
            'database'   => $empresa->db_name,
        ]);
    }

protected function registrarContexto(Request $request, Empresa $empresa): void
{
    $request->attributes->set('current_empresa', $empresa);
    $request->attributes->set('current_tenant', $empresa);

    app()->instance('current.empresa', $empresa);
    app()->instance('current.tenant', $empresa);

    Config::set('app.current_empresa_id', $empresa->id);
    Config::set('app.current_subdomain', $empresa->subdomain);
    Config::set('app.current_modo', $empresa->modo);

    URL::defaults(['tenant' => $empresa->subdomain]); 
    }

    protected function reescreverUrl(Request $request, Empresa $empresa): void
    {
        $request->headers->set('X-Current-Empresa-ID', (string) $empresa->id);
        $request->headers->set('X-Current-Subdomain', $empresa->subdomain);
        $request->headers->set('X-Current-Modo', $empresa->modo);
    }

    // ============================================
    // HANDLERS DE ERRO
    // ============================================

    protected function handleEmpresaNaoEncontrada(Request $request): Response
    {
        Log::warning('ResolveTenant: Empresa não encontrada', [
            'host' => $request->getHost(),
            'path' => $request->path(),
            'ip'   => $request->ip(),
        ]);

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success'      => false,
                'message'      => 'Empresa não identificada. Acesse via subdomain ou forneça X-Empresa-ID.',
                'dominio_base' => $this->dominioBase,
                'sugestao'     => 'Use um subdomain válido ou o header X-Empresa-ID',
            ], 400);
        }

        return Redirect::to("https://{$this->dominioBase}/selecionar-empresa", 302);
    }

    protected function handleEmpresaSuspensa(Empresa $empresa, Request $request): Response
    {
        Log::warning('ResolveTenant: Empresa suspensa', [
            'empresa_id' => $empresa->id,
            'status'     => $empresa->status,
        ]);

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa está suspensa. Entre em contato com o suporte.',
                'empresa' => [
                    'id'     => $empresa->id,
                    'nome'   => $empresa->nome,
                    'status' => $empresa->status,
                ],
            ], 403);
        }

        return response()->view('errors.empresa-suspensa', [
            'empresa' => $empresa,
        ], 403);
    }

    protected function errorResponse(string $message, int $code, Request $request): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => $message,
            ], $code);
        }

        return response($message, $code);
    }
}