<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\EnsureTenantUser;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))

    // -----------------------------
    // Rotas Web / API / Console
    // -----------------------------
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )

    // -----------------------------
    // Middlewares
    // -----------------------------
    ->withMiddleware(function (Middleware $middleware) {

        // 🔹 Middleware GLOBAL → resolve o tenant antes de tudo
        $middleware->append(ResolveTenant::class);

        // 🔹 Middleware de ROTA (alias)
        $middleware->alias([
            'tenant.user'   => EnsureTenantUser::class,                 // Verifica se user pertence ao tenant
            'auth:sanctum'  => EnsureFrontendRequestsAreStateful::class // Protege API com token
        ]);
    })

    // -----------------------------
    // Tratamento de Exceções
    // -----------------------------
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })

    ->create();
