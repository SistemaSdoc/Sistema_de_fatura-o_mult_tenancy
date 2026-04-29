<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\ResolveTenant;           //  ADICIONAR
use App\Http\Middleware\EnsureTenantConnection;    // ADICIONAR

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // CORS primeiro
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        
        // ALIASES DOS MIDDLEWARES TENANCY
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'resolve.tenant' => ResolveTenant::class,
            'tenant.auth' => EnsureTenantConnection::class,
        ]);


        //  ORDEM CORRECTA PARA O GRUPO api:
        // 1º ResolveTenant (define a base de dados do tenant)
        // 2º EnsureFrontendRequestsAreStateful (inicia a sessão já no tenant correcto)
        $middleware->prependToGroup('api', [
            \App\Http\Middleware\ResolveTenant::class,
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);
        
  
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // ... exceptions iguais ...
    })
    ->create();

