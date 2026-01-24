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
| ROTAS PROTEGIDAS (auth:sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {


    // Dashboard (todos usuários logados)
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ---------------------- ADMIN ----------------------
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('/users', UserController::class);
    });

    // ---------------------- ADMIN + OPERADOR ----------------------
    Route::middleware('role:admin,operador')->group(function () {
        Route::apiResource('/produtos', ProdutoController::class);
        Route::apiResource('/categorias', CategoriaController::class);
        Route::apiResource('/fornecedores', FornecedorController::class);
        Route::post('/compras', [CompraController::class, 'store']);
        Route::apiResource('/movimentos-stock', MovimentoStockController::class);
    });

    // ---------------------- ADMIN + OPERADOR + CAIXA ----------------------
    Route::middleware('role:admin,operador,caixa')->group(function () {
        Route::get('/vendas/listar', [VendaController::class, 'index']);
        Route::get('/vendas/create-data', [VendaController::class, 'createData']);
        Route::post('/vendas', [VendaController::class, 'store']);
        Route::apiResource('/pagamentos', PagamentoController::class);
        Route::get('/faturas', [FaturaController::class, 'index']);
        Route::post('/faturas/gerar', [FaturaController::class, 'gerarFatura']);
    });

    Route::post('/test', function () {
    return response()->json(['ok' => true]);
});

});
