<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\RoleMiddleware;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))

    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )

   ->withMiddleware(function (Middleware $middleware) {

       $middleware->append(
            \Illuminate\Http\Middleware\HandleCors::class
        );

    $middleware->alias([
        'role' => RoleMiddleware::class,
    ]);

    $middleware->group('api', [
        EnsureFrontendRequestsAreStateful::class,           // Sanctum
    ]);
})


    ->withExceptions(function (Exceptions $exceptions) {
        //
    })

    ->create();
