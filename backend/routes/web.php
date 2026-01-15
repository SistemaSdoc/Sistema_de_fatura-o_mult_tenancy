<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Landlord\TenantAdminController;

/*
|--------------------------------------------------------------------------
| LANDLORD (ADMIN GLOBAL)
|--------------------------------------------------------------------------
|
| Aqui ficam todas as rotas do administrador global (landlord):
| login, registro, logout, gerenciamento de tenants e usuários globais.
|
*/

// Página inicial do Landlord
Route::get('/', function () {
    return view('landlord.welcome');
});

// Login e registro do Landlord
Route::get('/login', [\App\Http\Controllers\TenantAuthController::class, 'showLoginForm'])->name('login');
Route::post('/login', [\App\Http\Controllers\TenantAuthController::class, 'login']);

Route::get('/register', [\App\Http\Controllers\TenantAuthController::class, 'showRegisterForm'])->name('register');
Route::post('/register', [\App\Http\Controllers\TenantAuthController::class, 'register']);

// Rotas protegidas para o Landlord
Route::middleware(['auth:web'])->group(function () {

    // Logout
    Route::post('/logout', [\App\Http\Controllers\TenantAuthController::class, 'logout'])->name('logout');

    // Dashboard do Landlord
    Route::get('/dashboard', function () {
        return view('landlord.dashboard');
    })->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | TENANTS CRUD
    |--------------------------------------------------------------------------
    */
    Route::prefix('tenants')->name('tenants.')->group(function () {

        // Listar todos os tenants
        Route::get('/', [TenantAdminController::class, 'index'])->name('index');

        // Criar novo tenant
        Route::post('/', [TenantAdminController::class, 'store'])->name('store');

        // Adicionar domínio a um tenant
        Route::post('/{tenant}/domains', [TenantAdminController::class, 'addDomain'])->name('addDomain');

        // Criar usuário de um tenant (admin, operador, caixa)
        Route::post('/{tenant}/users', [TenantAdminController::class, 'createTenantUser'])->name('createUser');
    });
});
