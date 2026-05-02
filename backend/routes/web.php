<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\WebAuthController;
/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Rota pública para CSRF (necessária para Sanctum stateful)
Route::get('/sanctum/csrf-cookie', function () {
    return response()->json(['message' => 'CSRF cookie set']);
})->middleware('web');

// Grupo com resolução de tenant + web
Route::middleware(['web', 'resolve.tenant'])->group(function () {
    
    // Login (público) – resolve tenant mas não exige autenticação
    Route::post('/login', [WebAuthController::class, 'login']);
    
    // Rotas protegidas por autenticação (guard tenant com sessão)
    Route::middleware('auth.tenant')->group(function () {
        Route::post('/logout', [WebAuthController::class, 'logout']);
        Route::get('/me', [WebAuthController::class, 'me']);
    });
});

Route::get('/teste-auth', function () {
    return response()->json([
        'authenticated' => auth()->guard('tenant')->check(),
        'user' => auth()->guard('tenant')->user(),
        'session_id' => session()->getId(),
    ]);
})->middleware(['resolve.tenant']);

// Fallback para rotas não encontradas (útil para SPA)
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'Rota não encontrada.'
    ], 404);
});