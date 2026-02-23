<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProdutoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\FornecedorController;
use App\Http\Controllers\CompraController;
use App\Http\Controllers\VendaController;
use App\Http\Controllers\PagamentoController;
use App\Http\Controllers\MovimentoStockController;
use App\Http\Controllers\DocumentoFiscalController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\RelatoriosController;

// Padrão UUID para validação de rotas
$uuidPattern = '[0-9a-fA-F-]{36}';

// ==================== ROTAS PÚBLICAS (sem auth) ====================
// Cadastro de usuários - qualquer um pode acessar
Route::post('/users', [UserController::class, 'store']);

// ==================== ROTAS PROTEGIDAS (com auth:sanctum) ====================
Route::middleware(['auth:sanctum'])->group(function () use ($uuidPattern) {

    // ===== ROTAS DE AUTENTICAÇÃO =====
    Route::get('/me', [UserController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // ===== DASHBOARD =====
    Route::prefix('dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard.index');
        Route::get('/documentos-fiscais', [DashboardController::class, 'resumoDocumentosFiscais'])->name('dashboard.documentos');
        Route::get('/pagamentos', [DashboardController::class, 'estatisticasPagamentos'])->name('dashboard.pagamentos');
        Route::get('/alertas', [DashboardController::class, 'alertasPendentes'])->name('dashboard.alertas');
        Route::get('/evolucao-mensal', [DashboardController::class, 'evolucaoMensal'])->name('dashboard.evolucao');
        Route::get('/alertas-pendentes', [DashboardController::class, 'alertasPendentes'])->name('dashboard.alertas-pendentes');
    });

    // ==================== ADMIN (acesso total) ====================
    Route::middleware('role:admin')->group(function () use ($uuidPattern) {
        // ===== USUÁRIOS =====
        Route::get('/users/create', [UserController::class, 'create']);
        Route::apiResource('/users', UserController::class)->except(['store']);

        // ===== CLIENTES - ADMIN (com soft delete) =====
        Route::prefix('clientes')->group(function () use ($uuidPattern) {
            Route::get('/todos', [ClienteController::class, 'indexWithTrashed'])->name('clientes.todos');
            Route::post('/{id}/restore', [ClienteController::class, 'restore'])->where('id', $uuidPattern)->name('clientes.restore');
            Route::delete('/{id}/force', [ClienteController::class, 'forceDelete'])->where('id', $uuidPattern)->name('clientes.force-delete');
        });
        Route::apiResource('/clientes', ClienteController::class);
    });

    // ==================== ADMIN + OPERADOR ====================
    Route::middleware('role:admin,operador')->group(function () use ($uuidPattern) {

        // ===== PRODUTOS (com soft delete) =====
        Route::prefix('produtos')->group(function () use ($uuidPattern) {
            Route::get('/todos', [ProdutoController::class, 'indexWithTrashed'])->name('produtos.todos');
            Route::get('/trashed', [ProdutoController::class, 'indexOnlyTrashed'])->name('produtos.trashed');
            Route::get('/deletados', [ProdutoController::class, 'indexOnlyTrashed'])->name('produtos.deletados');
            Route::post('/{id}/restore', [ProdutoController::class, 'restore'])->where('id', $uuidPattern)->name('produtos.restore');
            Route::delete('/{id}/force', [ProdutoController::class, 'forceDelete'])->where('id', $uuidPattern)->name('produtos.force-delete');
            Route::patch('/{id}/status', [ProdutoController::class, 'alterarStatus'])->where('id', $uuidPattern)->name('produtos.status');
        });
        Route::apiResource('/produtos', ProdutoController::class);

        // ===== RESUMO DO ESTOQUE =====
        Route::get('/estoque/resumo', [MovimentoStockController::class, 'resumo'])->name('estoque.resumo');
        Route::get('/movimentos-stock/resumo', [MovimentoStockController::class, 'resumo'])->name('movimentos-stock.resumo');

        // ===== CATEGORIAS (com soft delete) =====
        Route::prefix('categorias')->group(function () use ($uuidPattern) {
            Route::get('/todas', [CategoriaController::class, 'indexWithTrashed'])->name('categorias.todas');
            Route::get('/deletadas', [CategoriaController::class, 'indexOnlyTrashed'])->name('categorias.deletadas');
            Route::post('/{id}/restore', [CategoriaController::class, 'restore'])->where('id', $uuidPattern)->name('categorias.restore');
            Route::delete('/{id}/force', [CategoriaController::class, 'forceDelete'])->where('id', $uuidPattern)->name('categorias.force-delete');
        });
        Route::apiResource('/categorias', CategoriaController::class);

        // ===== FORNECEDORES (com soft delete) =====
        Route::prefix('fornecedores')->group(function () use ($uuidPattern) {
            Route::get('/todos', [FornecedorController::class, 'indexWithTrashed'])->name('fornecedores.todos');
            Route::get('/trashed', [FornecedorController::class, 'indexOnlyTrashed'])->name('fornecedores.trashed');
            Route::get('/deletados', [FornecedorController::class, 'indexOnlyTrashed'])->name('fornecedores.deletados');
            Route::post('/{id}/restore', [FornecedorController::class, 'restore'])->where('id', $uuidPattern)->name('fornecedores.restore');
            Route::delete('/{id}/force', [FornecedorController::class, 'forceDelete'])->where('id', $uuidPattern)->name('fornecedores.force-delete');
        });
        Route::apiResource('/fornecedores', FornecedorController::class);

        // ===== CLIENTES (Operador: apenas operações básicas) =====
        Route::apiResource('/clientes', ClienteController::class)->except(['destroy']);
        Route::delete('/clientes/{id}', [ClienteController::class, 'destroy'])->where('id', $uuidPattern)->name('clientes.destroy');

        // ===== COMPRAS =====
        Route::prefix('compras')->group(function () use ($uuidPattern) {
            Route::get('/', [CompraController::class, 'index'])->name('compras.index');
            Route::post('/', [CompraController::class, 'store'])->name('compras.store');
            Route::get('/{id}', [CompraController::class, 'show'])->where('id', $uuidPattern)->name('compras.show');
        });

        // ===== MOVIMENTOS DE STOCK =====
        Route::prefix('movimentos-stock')->group(function () use ($uuidPattern) {
            Route::get('/', [MovimentoStockController::class, 'index'])->name('movimentos-stock.index');
            Route::post('/', [MovimentoStockController::class, 'store'])->name('movimentos-stock.store');
            Route::post('/ajuste', [MovimentoStockController::class, 'ajuste'])->name('movimentos-stock.ajuste');
            Route::get('/{id}', [MovimentoStockController::class, 'show'])->where('id', $uuidPattern)->name('movimentos-stock.show');
        });
    });

    // ==================== ADMIN + OPERADOR + CONTABILISTA ====================
    Route::middleware('role:admin,operador,contabilista')->group(function () use ($uuidPattern) {

        // ===== VENDAS =====
        Route::prefix('vendas')->group(function () use ($uuidPattern) {
            Route::get('/', [VendaController::class, 'index'])->name('vendas.index');
            Route::post('/', [VendaController::class, 'store'])->name('vendas.store');
            Route::get('/create', [VendaController::class, 'create'])->name('vendas.create');
            Route::get('/{venda}', [VendaController::class, 'show'])->where('venda', $uuidPattern)->name('vendas.show');
            Route::post('/{venda}/cancelar', [VendaController::class, 'cancelar'])->where('venda', $uuidPattern)->name('vendas.cancelar');
            Route::post('/{venda}/pagar', [VendaController::class, 'pagar'])->where('venda', $uuidPattern)->name('vendas.pagar');
            Route::post('/{venda}/converter', [VendaController::class, 'converter'])->where('venda', $uuidPattern)->name('vendas.converter');
            Route::post('/{venda}/recibo', [VendaController::class, 'gerarRecibo'])->where('venda', $uuidPattern)->name('vendas.recibo');
        });

        // ===== DOCUMENTOS FISCAIS (Completo) =====
        Route::prefix('documentos-fiscais')->group(function () use ($uuidPattern) {
            // Listagem e consulta
            Route::get('/', [DocumentoFiscalController::class, 'index'])->name('documentos.index');
            Route::get('/{documento}', [DocumentoFiscalController::class, 'show'])->where('documento', $uuidPattern)->name('documentos.show');
            Route::get('/{documento}/recibos', [DocumentoFiscalController::class, 'recibos'])->where('documento', $uuidPattern)->name('documentos.recibos');
            Route::get('/{documento}/estado-at', [DocumentoFiscalController::class, 'consultarEstado'])->where('documento', $uuidPattern)->name('documentos.estado');

            // Operações principais
            Route::post('/emitir', [DocumentoFiscalController::class, 'emitir'])->name('documentos.emitir');
            Route::post('/{documento}/pagar', [DocumentoFiscalController::class, 'pagar'])->where('documento', $uuidPattern)->name('documentos.pagar');
            Route::post('/{documento}/converter', [DocumentoFiscalController::class, 'converter'])->where('documento', $uuidPattern)->name('documentos.converter');
            Route::post('/{documento}/cancelar', [DocumentoFiscalController::class, 'cancelar'])->where('documento', $uuidPattern)->name('documentos.cancelar');
            Route::post('/{documento}/anular', [DocumentoFiscalController::class, 'anular'])->where('documento', $uuidPattern)->name('documentos.anular');

            // Rotas específicas para notas e recibos
            Route::post('/{id}/nota-credito', [DocumentoFiscalController::class, 'criarNotaCredito'])->where('id', $uuidPattern)->name('documentos.nota-credito');
            Route::post('/{id}/nota-debito', [DocumentoFiscalController::class, 'criarNotaDebito'])->where('id', $uuidPattern)->name('documentos.nota-debito');
            Route::post('/{id}/recibo', [DocumentoFiscalController::class, 'gerarRecibo'])->where('id', $uuidPattern)->name('documentos.gerar-recibo');
            Route::post('/{id}/vincular-adiantamento', [DocumentoFiscalController::class, 'vincularAdiantamento'])->where('id', $uuidPattern)->name('documentos.vincular');

            // Rotas para listagens específicas
            Route::get('/{faturaId}/recibos', [DocumentoFiscalController::class, 'listarRecibos'])->where('faturaId', $uuidPattern)->name('documentos.listar-recibos');
            Route::get('/adiantamentos-pendentes', [DocumentoFiscalController::class, 'adiantamentosPendentes'])->name('documentos.adiantamentos-pendentes');
            Route::get('/proformas-pendentes', [DocumentoFiscalController::class, 'proformasPendentes'])->name('documentos.proformas-pendentes');

            // Alertas e processamento
            Route::get('/alertas', [DocumentoFiscalController::class, 'alertas'])->name('documentos.alertas');
            Route::get('/alertas-adiantamentos', [DocumentoFiscalController::class, 'alertasAdiantamentos'])->name('documentos.alertas-adiantamentos');
            Route::post('/processar-expirados', [DocumentoFiscalController::class, 'processarExpirados'])->name('documentos.processar-expirados');

            // Dashboard específico
            Route::get('/dashboard', [DocumentoFiscalController::class, 'dashboard'])->name('documentos.dashboard');
        });

        // ===== PAGAMENTOS (mantido para compatibilidade) =====
        Route::prefix('pagamentos')->group(function () use ($uuidPattern) {
            Route::get('/', [PagamentoController::class, 'index'])->name('pagamentos.index');
            Route::post('/', [PagamentoController::class, 'store'])->name('pagamentos.store');
            Route::get('/{id}', [PagamentoController::class, 'show'])->where('id', $uuidPattern)->name('pagamentos.show');
            Route::put('/{id}', [PagamentoController::class, 'update'])->where('id', $uuidPattern)->name('pagamentos.update');
            Route::delete('/{id}', [PagamentoController::class, 'destroy'])->where('id', $uuidPattern)->name('pagamentos.destroy');
        });

        // ===== RELATÓRIOS =====
        Route::prefix('relatorios')->group(function () {
            Route::get('/dashboard', [RelatoriosController::class, 'dashboard'])->name('relatorios.dashboard');
            Route::get('/vendas', [RelatoriosController::class, 'vendas'])->name('relatorios.vendas');
            Route::get('/compras', [RelatoriosController::class, 'compras'])->name('relatorios.compras');
            Route::get('/faturacao', [RelatoriosController::class, 'faturacao'])->name('relatorios.faturacao');
            Route::get('/stock', [RelatoriosController::class, 'stock'])->name('relatorios.stock');
            Route::get('/documentos-fiscais', [RelatoriosController::class, 'documentosFiscais'])->name('relatorios.documentos-fiscais');
            Route::get('/pagamentos-pendentes', [RelatoriosController::class, 'pagamentosPendentes'])->name('relatorios.pagamentos-pendentes');
            Route::get('/proformas', [RelatoriosController::class, 'proformas'])->name('relatorios.proformas');
        });
    });
});
