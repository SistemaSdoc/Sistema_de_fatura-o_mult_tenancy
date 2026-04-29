<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Empresa;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Symfony\Component\HttpFoundation\Response;

/**
 * ResolveTenant - Detecta tenant por SUBDOMAIN e redireciona/mantém URL
 */
class ResolveTenant
{
    protected string $dominioBase;

    protected array $publicRoutes = [
        'landlord/*',
        'api/landlord/*',
        'admin/*',
        'login',
        'register',
        'sanctum/csrf-cookie',
        '_ignition/*',
        'telescope/*',
    ];

    public function __construct()
    {
        $this->dominioBase = env('APP_DOMAIN', 'localhost');
    }

    /**
     * @return Response|RedirectResponse  ← Tipos múltiplos
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Verifica se é rota pública (landlord only)
        if ($this->isPublicRoute($request)) {
            Config::set('database.default', 'landlord');
            return $next($request);
        }

         $tenantId = session('tenant_id');
    if ($tenantId) {
        $empresa = Empresa::on('landlord')->find($tenantId);
        if ($empresa && $empresa->status === 'ativo') {
            $this->conectarTenant($empresa);
            $this->registrarContexto($request, $empresa);
            Log::info('ResolveTenant: Tenant da sessão', ['empresa_id' => $empresa->id]);
            return $next($request);
        }
    }

        // 2. Detecta empresa pelo SUBDOMAIN (principal)
        $empresa = $this->detectarPorSubdomain($request);

        // 3. Se não achou por subdomain, tenta outros métodos (fallback)
        if (!$empresa) {
            $empresa = $this->detectarPorFallback($request);
        }

        // 4. Se ainda não achou, retorna erro
        if (!$empresa) {
            return $this->handleEmpresaNaoEncontrada($request);
        }

        // 5. Verifica se empresa está ativa
        if ($empresa->status !== 'ativo') {
            return $this->handleEmpresaSuspensa($empresa, $request);
        }

        // 6. Verifica se precisa redirecionar
        $redirecionamento = $this->verificarRedirecionamento($request, $empresa);
        if ($redirecionamento) {
            return $redirecionamento;
        }

        // 7. Conecta ao tenant
        try {
            $this->conectarTenant($empresa);
            $this->registrarContexto($request, $empresa);
            
            Log::info('ResolveTenant: Tenant conectado', [
                'empresa_id' => $empresa->id,
                'subdomain' => $empresa->subdomain,
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

        // 8. Reescreve URL internamente
        $this->reescreverUrl($request, $empresa);

        return $next($request);
    }

    // ================= DETECÇÃO =================

    protected function detectarPorSubdomain(Request $request): ?Empresa
    {
        $host = $request->getHost();
        $host = explode(':', $host)[0];
        
        $subdomain = $this->extrairSubdomain($host);
        
        if (!$subdomain) {
            return null;
        }

        return Empresa::on('landlord')
            ->where('subdomain', $subdomain)
            ->where('status', 'ativo')
            ->first();
    }

    protected function detectarPorFallback(Request $request): ?Empresa
    {
        if ($empresaId = $request->header('X-Empresa-ID')) {
            return Empresa::on('landlord')->find($empresaId);
        }

        if ($empresaId = $request->get('empresa')) {
            return Empresa::on('landlord')->find($empresaId);
        }

        if ($token = $request->bearerToken()) {
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

    // ================= REDIRECIONAMENTO =================

    /**
     * @return Response|null
     */
    protected function verificarRedirecionamento(Request $request, Empresa $empresa): ?Response
    {
            if (app()->environment('local')) {
        return null;
    }

    // Se for localhost ou IP, também não redireciona
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

    // ================= HELPERS =================

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

    protected function isPublicRoute(Request $request): bool
    {
        foreach ($this->publicRoutes as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }
        return false;
    }

    // ================= CONEXÃO E CONTEXTO =================

    protected function conectarTenant(Empresa $empresa): void
    {
        if (empty($empresa->db_name)) {
            throw new \Exception("A empresa {$empresa->id} não tem nome de base de dados definido.");
        }
        Config::set('database.connections.tenant.database', $empresa->db_name);
        Config::set('database.connections.tenant.host', env('TENANT_DB_HOST', env('DB_HOST')));
        Config::set('database.connections.tenant.port', env('TENANT_DB_PORT', env('DB_PORT')));
        
        DB::purge('tenant');
        DB::reconnect('tenant');


        try {
             DB::connection('tenant')->getPdo();
            Log::info('Conexão tenant estabelecida', ['database' => $empresa->db_name]);
        } catch (\Exception $e) {
            throw new \Exception("Erro ao conectar à base {$empresa->db_name}: " . $e->getMessage());
        }

        Log::info('Conexão tenant configurada', [
        'database' => Config::get('database.connections.tenant.database'),
        'real_db' => DB::connection('tenant')->getDatabaseName(),
    ]);
        Config::set('database.default', 'tenant');
    }

    protected function registrarContexto(Request $request, Empresa $empresa): void
    {
        $request->attributes->set('current_empresa', $empresa);
        $request->attributes->set('current_tenant', $empresa);
        
        app()->instance('current.empresa', $empresa);
        app()->instance('current.tenant', $empresa);
        
        Config::set('app.current_empresa_id', $empresa->id);
        Config::set('app.current_subdomain', $empresa->subdomain);
    }

    protected function reescreverUrl(Request $request, Empresa $empresa): void
    {
        $request->headers->set('X-Current-Empresa-ID', $empresa->id);
        $request->headers->set('X-Current-Subdomain', $empresa->subdomain);
    }

    // ================= HANDLERS DE ERRO =================

    /**
     * Retorna Response compatível (JSON ou Redirect)
     */
    protected function handleEmpresaNaoEncontrada(Request $request): Response
    {
        // API: retorna JSON
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Empresa não identificada. Acesse via subdomain ou forneça X-Empresa-ID.',
                'dominio_base' => $this->dominioBase,
            ], 400);
        }

        // Web: redireciona para seleção
        return Redirect::to("https://{$this->dominioBase}/selecionar-empresa", 302);
    }

    /**
     * Retorna Response compatível
     */
    protected function handleEmpresaSuspensa(Empresa $empresa, Request $request): Response
    {
        Log::warning('ResolveTenant: Empresa suspensa', [
            'empresa_id' => $empresa->id,
            'status' => $empresa->status,
        ]);

        // Sempre retorna JSON para empresas suspensas
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

    /**
     * Helper para respostas de erro consistentes
     */
    protected function errorResponse(string $message, int $code, Request $request): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => $message,
            ], $code);
        }

        // Para web, poderia retornar view de erro
        return response($message, $code);
    }
}