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

        // CORS tem de ser o PRIMEIRO middleware — antes do tenancy e de tudo o resto
        $middleware->prepend(
            \Illuminate\Http\Middleware\HandleCors::class
        );

        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        // Adiciona o Sanctum no INÍCIO do grupo api sem substituir os defaults do Laravel
        // (throttle:api, SubstituteBindings, etc. são preservados)
        $middleware->prependToGroup('api', [
            EnsureFrontendRequestsAreStateful::class,
        ]);
    })

    ->withExceptions(function (Exceptions $exceptions) {

        // Retorna 401 JSON em vez de redirecionar para route('login')
        // Evita o erro "Route [login] not defined" nas rotas API
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Não autenticado. Por favor faça login.',
                ], 401);
            }
        });

        // Retorna 403 JSON para erros de autorização (role middleware)
        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado. Não tem permissão para esta acção.',
                ], 403);
            }
        });

        // Retorna 404 JSON para rotas/modelos não encontrados
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Recurso não encontrado.',
                ], 404);
            }
        });

    })

    ->create();