<?php

use Illuminate\Support\Facades\Route;
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
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\RelatoriosController;

/*
|--------------------------------------------------------------------------
| ROTAS PROTEGIDAS (auth:sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {

    // ---------------------- DASHBOARD ----------------------
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ---------------------- ADMIN ----------------------
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('/users', UserController::class);
        Route::apiResource('/clientes', ClienteController::class);
    });

    // ---------------------- ADMIN + OPERADOR ----------------------
    Route::middleware('role:admin,operador')->group(function () {
        Route::apiResource('/produtos', ProdutoController::class);
        Route::apiResource('/categorias', CategoriaController::class);
        Route::apiResource('/fornecedores', FornecedorController::class);

        // Compras
        Route::apiResource('/compras', CompraController::class)->only(['index', 'show', 'store']);

        // Movimentos de stock
        Route::apiResource('/movimentos-stock', MovimentoStockController::class);
        Route::post('/movimentos-stock/ajuste', [MovimentoStockController::class, 'ajuste']);
    });

    // ---------------------- ADMIN + OPERADOR + CONTABILISTA ----------------------
    Route::middleware('role:admin,operador,contabilista')->group(function () {

        // Vendas
        Route::get('/vendas', [VendaController::class, 'index']);
        Route::get('/vendas/create', [VendaController::class, 'create']);
        Route::post('/vendas', [VendaController::class, 'store']);
        Route::get('/vendas/{venda}', [VendaController::class, 'show']);
        Route::post('/vendas/{venda}/cancelar', [VendaController::class, 'cancelar']);

        // Pagamentos
        Route::apiResource('/pagamentos', PagamentoController::class);

        // Faturas
        Route::get('/faturas', [FaturaController::class, 'index']);
        Route::get('/faturas/{fatura}', [FaturaController::class, 'show']);
        Route::post('/faturas/gerar', [FaturaController::class, 'gerarFatura']);

        // Relatórios
        Route::get('/relatorios/vendas', [RelatoriosController::class, 'vendas']);
        Route::get('/relatorios/compras', [RelatoriosController::class, 'compras']);
        Route::get('/relatorios/faturamento', [RelatoriosController::class, 'faturamento']);
        Route::get('/relatorios/stock', [RelatoriosController::class, 'stock']);
    });
});
