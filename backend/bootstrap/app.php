<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\EnsureTenantUser;
use App\Http\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))

    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )

    ->withMiddleware(function (Middleware $middleware) {

        // 🔹 Resolve tenant antes de tudo
        $middleware->append(ResolveTenant::class);

        // 🔹 Middlewares de rota
        $middleware->alias([
            'tenant.user' => EnsureTenantUser::class,
            'role'        => RoleMiddleware::class,
            'auth:sanctum'=> \Laravel\Sanctum\Http\Middleware\Authenticate::class,
        ]);
    })

    ->withExceptions(function (Exceptions $exceptions) {
        //
    })

    ->create();
