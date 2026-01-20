<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiAuthController;

// Controllers Tenant
use App\Http\Controllers\Tenant\ProdutoController;
use App\Http\Controllers\Tenant\CategoriaController;
use App\Http\Controllers\Tenant\FornecedorController;
use App\Http\Controllers\Tenant\CompraController;
use App\Http\Controllers\Tenant\VendaController;
use App\Http\Controllers\Tenant\PagamentoController;
use App\Http\Controllers\Tenant\MovimentoStockController;
use App\Http\Controllers\Tenant\FaturaController;
use App\Http\Controllers\TenantUserController;
use App\Http\Controllers\Tenant\DashboardController;

/*
|--------------------------------------------------------------------------
| LOGIN GLOBAL
|--------------------------------------------------------------------------
*/
Route::post('/login', [ApiAuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| ROTAS DO TENANT
|--------------------------------------------------------------------------
*/
    // Registro opcional
    Route::post('/register', [ApiAuthController::class, 'register']);

    /*
    |--------------------------------------------------------------------------
    | ROTAS PROTEGIDAS
    |--------------------------------------------------------------------------
    */
    Route::middleware(['auth:sanctum', 'tenant.user'])->group(function () {

        // Logout
        Route::post('/logout', [ApiAuthController::class, 'logout']);

        /*
        |--------------------------------------------------------------------------
        | DASHBOARD
        |--------------------------------------------------------------------------
        */
        Route::get('/dashboard', [DashboardController::class, 'index']);

        /*
        |--------------------------------------------------------------------------
        | USERS - somente admin
        |--------------------------------------------------------------------------
        */
        Route::middleware(['role:admin'])->group(function () {
            Route::apiResource('/users', TenantUserController::class);
        });

        /*
        |--------------------------------------------------------------------------
        | PRODUTOS / CATEGORIAS / FORNECEDORES
        |--------------------------------------------------------------------------
        */
        Route::middleware(['role:admin,operador'])->group(function () {
            Route::apiResource('/produtos', ProdutoController::class);
            Route::apiResource('/categorias', CategoriaController::class);
            Route::apiResource('/fornecedores', FornecedorController::class);
            Route::post('/compras', [CompraController::class, 'store']);
            Route::apiResource('/movimentos-stock', MovimentoStockController::class);
        });

        /*
        |--------------------------------------------------------------------------
        | VENDAS / PAGAMENTOS / FATURAS
        |--------------------------------------------------------------------------
        */
        Route::middleware(['role:admin,operador,caixa'])->group(function () {
            Route::get('/vendas', [VendaController::class, 'index']);
            Route::post('/vendas', [VendaController::class, 'store']);
            Route::apiResource('/pagamentos', PagamentoController::class);
            Route::get('/faturas', [FaturaController::class, 'index']);
            Route::post('/faturas/gerar', [FaturaController::class, 'gerarFatura']);
        });
    });
