<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
use App\Http\Controllers\TenantAuthController;
use App\Http\Controllers\TenantUserController;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Essas rotas só estarão disponíveis quando um tenant estiver ativo.
| Middleware InitializeTenancyByDomain garante que a conexão
| com o banco de dados do tenant esteja correta.
|
*/

Route::middleware([
    'web',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {

    // Página inicial do tenant
    Route::get('/', function () {
        return view('tenant.dashboard'); // blade do dashboard
    })->name('tenant.dashboard');

    // Rotas de autenticação do tenant
    Route::prefix('auth')->group(function () {
        Route::get('/login', function() { 
            return view('tenant.auth.login'); 
        })->name('tenant.login');

        Route::get('/register', function() { 
            return view('tenant.auth.register'); 
        })->name('tenant.register');

        Route::post('/register', [TenantAuthController::class, 'register']);
        Route::post('/login', [TenantAuthController::class, 'login']);

        Route::middleware('auth:tenant')->post('/logout', [TenantAuthController::class, 'logout']);
    });

    // Rotas protegidas apenas para usuários logados no tenant
    Route::middleware('auth:tenant')->group(function () {
        // CRUD de usuários do tenant
        Route::resource('users', TenantUserController::class);
    });
});
