<?php

namespace App\Http\Routes;

use App\Http\Middleware\ResolveTenant;
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

/*
|--------------------------------------------------------------------------|
| LOGIN GLOBAL
|--------------------------------------------------------------------------|
*/
Route::post('/login', [ApiAuthController::class, 'login']);

/*
|--------------------------------------------------------------------------|
| ROTAS DO TENANT (multi-tenant)
|--------------------------------------------------------------------------|
*/
Route::middleware([ResolveTenant::class])->prefix('tenant')->group(function () {

    // Registro opcional
    Route::post('/register', [ApiAuthController::class, 'register']);

    // Rotas protegidas do tenant
    Route::middleware(['auth:sanctum', 'tenant.user'])->group(function () {

        // Logout
        Route::post('/logout', [ApiAuthController::class, 'logout']);

        /*
        |--------------------------------------------------------------------------|
        | CRUD USERS - somente admins
        |--------------------------------------------------------------------------|
        */
          Route::middleware(['role:admin'])->group(function () {
            Route::apiResource('/users', TenantUserController::class);
        });

        /*
        |--------------------------------------------------------------------------|
        | CRUD PRODUTOS - admin e operador
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador'])->group(function () {
            Route::apiResource('/produtos', ProdutoController::class);
        });

        /*
        |--------------------------------------------------------------------------|
        | CRUD CATEGORIAS - admin e operador
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador'])->group(function () {
            Route::apiResource('/categorias', CategoriaController::class);
        });

        /*
        |--------------------------------------------------------------------------|
        | CRUD FORNECEDORES - admin e operador
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador'])->group(function () {
            Route::apiResource('/fornecedores', FornecedorController::class);
        });

        /*
        |--------------------------------------------------------------------------|
        | COMPRAS - admin e operador
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador'])->post('/compras', [CompraController::class, 'store']);

        /*
        |--------------------------------------------------------------------------|
        | VENDAS - admin, operador e caixa
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador,caixa'])->post('/vendas', [VendaController::class, 'store']);

        /*
        |--------------------------------------------------------------------------|
        | PAGAMENTOS - admin, operador e caixa
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador,caixa'])->group(function () {
            Route::apiResource('/pagamentos', PagamentoController::class);
        });

        /*
        |--------------------------------------------------------------------------|
        | MOVIMENTOS DE STOCK - admin e operador
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador'])->group(function () {
            Route::apiResource('/movimentos-stock', MovimentoStockController::class);
        });

        /*
        |--------------------------------------------------------------------------|
        | FATURAS - admin, operador e caixa
        |--------------------------------------------------------------------------|
        */
        Route::middleware(['role:admin,operador,caixa'])->group(function () {
            Route::get('/faturas', [FaturaController::class, 'index']);
            Route::post('/faturas/gerar', [FaturaController::class, 'gerarFatura']);
        });
    });
});
