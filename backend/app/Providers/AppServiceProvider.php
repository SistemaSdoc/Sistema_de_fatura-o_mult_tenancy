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
        //
        
    }

    /**
     * Bootstrap any application services.
     */
// App\Providers\AppServiceProvider.php
public function boot()
{
    // Se existir tenant na sessão, força a conexão antes de qualquer query
 
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
