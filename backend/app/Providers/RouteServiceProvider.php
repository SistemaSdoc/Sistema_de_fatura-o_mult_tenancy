<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * Namespace para os controllers.
     */
    protected $namespace = 'App\\Http\\Controllers';

    /**
     * Caminho para a página inicial (home) do Laravel.
     */
    public const HOME = '/home';

    /**
     * Registrar rotas e configurar rate limiters.
     */
    public function boot(): void
    {
 
        parent::boot();

        $this->mapApiRoutes();
        $this->mapWebRoutes();
    }


    /**
     * Rotas web (blade, session cookies, etc.)
     */
    protected function mapWebRoutes(): void
    {
        Route::middleware('web')
            ->namespace($this->namespace)
            ->group(base_path('routes/web.php'));
    }

    /**
     * Rotas API (JSON, sem estado de sessão)
     */
    protected function mapApiRoutes(): void
    {
        Route::prefix('api')
            ->middleware('api')
            ->namespace($this->namespace)
            ->group(base_path('routes/api.php'));
    }
}
