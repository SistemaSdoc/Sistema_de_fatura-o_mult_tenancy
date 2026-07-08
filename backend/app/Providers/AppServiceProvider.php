<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use App\Models\Empresa;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Registra o binding 'current.empresa' para resolver a empresa a partir da sessão
        $this->app->bind('current.empresa', function ($app) {
            $tenantId = session('tenant_id');
            if ($tenantId) {
                return Empresa::on('landlord')->find($tenantId);
            }
            return null;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Evita reaplicar tenant em rotas públicas do landlord.
        // Isso impede que uma sessão antiga "contamine" login/Google/onboarding.
        if ($this->isPublicLandlordRequest()) {
            return;
        }

        // Se existir tenant na sessão, configura a conexão tenant automaticamente
        if (session()->has('tenant_id')) {
            $tenantId = session('tenant_id');
            $empresa = Empresa::on('landlord')->find($tenantId);
            if ($empresa && $empresa->status === 'ativo') {
                Config::set('database.connections.tenant.database', $empresa->db_name);
                DB::purge('tenant');
                DB::reconnect('tenant');
                Config::set('database.default', 'tenant');
            }
        }
    }

    private function isPublicLandlordRequest(): bool
    {
        if (!app()->bound('request')) {
            return false;
        }

        $request = request();
        $path = $request->path();

        return str_starts_with($path, 'api/landlord/')
            || in_array($path, [
                'login',
                'register',
                'sanctum/csrf-cookie',
                'auth/callback',
                'onboarding',
                'freelancer/onboarding',
            ], true);
    }
}
