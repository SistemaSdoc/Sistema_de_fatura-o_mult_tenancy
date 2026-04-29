<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Session\Middleware\StartSession;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\EnsureTenantConnection;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'resolve.tenant' => ResolveTenant::class,
            'tenant.auth' => EnsureTenantConnection::class,
        ]);

        // Web: tenant primeiro, sessão depois
        $middleware->prependToGroup('web', [
            'resolve.tenant',
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
        ]);

        // API: tenant primeiro, depois Sanctum
        $middleware->prependToGroup('api', [
            'resolve.tenant',
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // suas exceptions
    })
    ->create();