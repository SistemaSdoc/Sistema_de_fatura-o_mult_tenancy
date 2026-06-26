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

class ResolveTenant
{
    protected string $dominioBase;
    protected array $publicRoutes;

    public function __construct()
    {
        $this->dominioBase = env('APP_DOMAIN', 'localhost');
        $this->publicRoutes = [
            'landlord/*',
            'api/landlord/*',
            'admin/*',
            'api/empresas',
            'login',
            'register',
            'sanctum/csrf-cookie',
            '_ignition/*',
            'telescope/*',
        ];
    }

    public function handle(Request $request, Closure $next): Response
    {
        // ============================================
        // 1. ROTAS PÚBLICAS (LANDLORD)
        // ============================================
        if ($this->isPublicRoute($request)) {
            Config::set('database.default', 'landlord');
            DB::reconnect('landlord');
            return $next($request);
        }

        // ============================================
        // 2. API LANDLORD (pular lógica de tenant)
        // ============================================
        $path = $request->path();
        if (str_starts_with($path, 'api/landlord/')) {
            Config::set('database.default', 'landlord');
            DB::reconnect('landlord');
            return $next($request);
        }

        // ============================================
        // 3. VERIFICAR SESSION (Tenant já identificado)
        // ============================================
        $tenantId = session('tenant_id');
        if ($tenantId) {
            $empresa = Empresa::on('landlord')->find($tenantId);
            if ($empresa && $empresa->status === 'ativo') {
                $this->conectarTenant($empresa);
                $this->registrarContexto($request, $empresa);
                
                Log::info('ResolveTenant: Tenant da sessão', [
                    'empresa_id' => $empresa->id,
                    'modo' => $empresa->modo,
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
                'subdomain' => $empresa->subdomain,
                'modo' => $empresa->modo,
                'database' => $empresa->modo === 'singular' ? $empresa->db_name : 'shared',
            ]);

        } catch (\Exception $e) {
            Log::error('ResolveTenant: Erro ao conectar tenant', [
                'empresa_id' => $empresa->id,
                'error' => $e->getMessage(),
            ]);
            
            return $this->errorResponse(
                'Erro ao conectar ao banco da empresa.',
                500,
                $request
            );
        }

        // ============================================
        // 11. REESCREVER URL
        // ============================================
        $this->reescreverUrl($request, $empresa);

        Log::info('[AuthTenant] Verificando autenticação', [
            'guard' => 'tenant',
            'user' => auth()->guard('tenant')->user(),
            'path' => $request->path(),
        ]);

        return $next($request);
    }

    // ============================================
    // DETECÇÃO
    // ============================================

    protected function detectarPorSubdomain(Request $request): ?Empresa
    {
        $host = $request->getHost();
        $host = explode(':', $host)[0];
        
        $subdomain = $this->extrairSubdomain($host);
        
        Log::debug('ResolveTenant: Detectando por subdomain', [
            'host' => $host,
            'subdomain' => $subdomain,
        ]);
        
        if (!$subdomain) {
            Log::debug('ResolveTenant: Nenhum subdomain encontrado');
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
        Log::debug('ResolveTenant: Tentando fallback detection');
        
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

        if (in_array($request->getHost(), ['localhost', '127.0.0.1']) || $this->isIP($request->getHost())) {
            return null;
        }
        
        $hostAtual = $request->getHost();
        $hostEsperado = $this->montarHost($empresa->subdomain);

        if ($hostAtual === $hostEsperado) {
            return null;
        }

        if ($this->isDominioBase($hostAtual) && $empresa->subdomain) {
            $novaUrl = $this->montarUrl($request, $empresa->subdomain);
            
            Log::info('ResolveTenant: Redirecionando para subdomain', [
                'de' => $request->fullUrl(),
                'para' => $novaUrl,
            ]);
            
            return Redirect::to($novaUrl, 302);
        }

        if (!$this->isDominioBase($hostAtual)) {
            $novaUrl = $this->montarUrl($request, $empresa->subdomain);
            
            Log::warning('ResolveTenant: Subdomain incorreto, redirecionando', [
                'empresa_id' => $empresa->id,
                'subdomain_esperado' => $empresa->subdomain,
                'host_atual' => $hostAtual,
            ]);
            
            return Redirect::to($novaUrl, 301);
        }

        return null;
    }

    protected function montarUrl(Request $request, string $subdomain): string
    {
        $novoHost = $this->montarHost($subdomain);
        $scheme = $request->getScheme();
        $path = $request->getPathInfo();
        $query = $request->getQueryString();
        
        $url = "{$scheme}://{$novoHost}{$path}";
        
        if ($query) {
            $url .= "?{$query}";
        }
        
        return $url;
    }

    protected function montarHost(string $subdomain): string
    {
        return "{$subdomain}.{$this->dominioBase}";
    }

    // ============================================
    // HELPERS
    // ============================================

    protected function extrairSubdomain(string $host): ?string
    {
        $host = explode(':', $host)[0];
        
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return null;
        }
        
        $parts = explode('.', $host);
        
        if (count($parts) >= 3) {
            if ($parts[0] === 'www') {
                return $parts[1] ?? null;
            }
            return $parts[0];
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

    protected function isPublicRoute(Request $request): bool
    {
        foreach ($this->publicRoutes as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }
        return false;
    }

    // ============================================
    // CONEXÃO E CONTEXTO
    // ============================================

    protected function conectarTenant(Empresa $empresa): void
    {
        // Modo COLECTIVO -> Shared DB
        if ($empresa->modo === 'colectivo') {
            Config::set('database.default', 'shared');
            DB::reconnect('shared');
            
            Log::debug('ResolveTenant: Conectado ao Shared DB (colectivo)', [
                'empresa_id' => $empresa->id,
            ]);
            return;
        }

        // Modo SINGULAR -> Tenant DB dedicado
        if (empty($empresa->db_name)) {
            throw new \Exception("A empresa {$empresa->id} não tem nome de base de dados definido.");
        }

        // ⭐ VALIDAR SE O BANCO EXISTE (apenas em dev)
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
                        'db_name' => $empresa->db_name,
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('ResolveTenant: Erro ao validar banco', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Config::set('database.connections.tenant.database', $empresa->db_name);
        
        // ⭐ SÓ USAR PURGE EM AMBIENTE DE DESENVOLVIMENTO
        if (app()->environment('local', 'testing')) {
            DB::purge('tenant');
            DB::reconnect('tenant');
        } else {
            DB::reconnect('tenant');
        }
        
        Config::set('database.default', 'tenant');

        Log::info('ResolveTenant: Conectado ao Tenant DB (singular)', [
            'empresa_id' => $empresa->id,
            'database' => $empresa->db_name,
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
    }

    protected function reescreverUrl(Request $request, Empresa $empresa): void
    {
        $request->headers->set('X-Current-Empresa-ID', $empresa->id);
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
            'ip' => $request->ip(),
        ]);

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada. Acesse via subdomain ou forneça X-Empresa-ID.',
                'dominio_base' => $this->dominioBase,
                'sugestao' => 'Use um subdomain válido ou o header X-Empresa-ID',
            ], 400);
        }

        return Redirect::to("https://{$this->dominioBase}/selecionar-empresa", 302);
    }

    protected function handleEmpresaSuspensa(Empresa $empresa, Request $request): Response
    {
        Log::warning('ResolveTenant: Empresa suspensa', [
            'empresa_id' => $empresa->id,
            'status' => $empresa->status,
        ]);

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa está suspensa. Entre em contato com o suporte.',
                'empresa' => [
                    'id' => $empresa->id,
                    'nome' => $empresa->nome,
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