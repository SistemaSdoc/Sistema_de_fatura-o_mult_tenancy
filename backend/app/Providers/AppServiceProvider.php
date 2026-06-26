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
}