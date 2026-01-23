<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiAuthController;
use App\Http\Controllers\ProdutoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\FornecedorController;
use App\Http\Controllers\CompraController;
use App\Http\Controllers\VendaController;
use App\Http\Controllers\PagamentoController;
use App\Http\Controllers\MovimentoStockController;
use App\Http\Controllers\FaturaController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DashboardController;


/*
|--------------------------------------------------------------------------
| ROTAS PROTEGIDAS
|--------------------------------------------------------------------------
*/
 Route::middleware(['auth:sanctum'])->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::middleware(['role:admin'])->group(function () {
        Route::apiResource('/users', UserController::class);
    });

    Route::middleware(['role:admin,operador'])->group(function () {
        Route::apiResource('/produtos', ProdutoController::class);
        Route::apiResource('/categorias', CategoriaController::class);
        Route::apiResource('/fornecedores', FornecedorController::class);
        Route::post('/compras', [CompraController::class, 'store']);
        Route::apiResource('/movimentos-stock', MovimentoStockController::class);
    });

    Route::middleware(['role:admin,operador,caixa'])->group(function () {
        Route::get('/vendas', [VendaController::class, 'index']);
        Route::post('/vendas', [VendaController::class, 'store']);
        Route::apiResource('/pagamentos', PagamentoController::class);
        Route::get('/faturas', [FaturaController::class, 'index']);
        Route::post('/faturas/gerar', [FaturaController::class, 'gerarFatura']);
    });
});
