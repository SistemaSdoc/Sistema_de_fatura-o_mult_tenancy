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
        
        
    }

    /**
     * Bootstrap any application services.
     */
// App\Providers\AppServiceProvider.php
public function boot()
{
    // Se existir tenant na sessão, força a conexão antes de qualquer query

}
}
