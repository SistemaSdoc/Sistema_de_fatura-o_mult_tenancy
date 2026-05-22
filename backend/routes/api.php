<?php

use Illuminate\Support\Facades\Route;
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
use App\Http\Controllers\LandlordAuthController;
use App\Http\Controllers\EmpresaController;

$uuidPattern = '[0-9a-fA-F-]{36}';

// ==================== ROTAS PÚBLICAS ====================
Route::withoutMiddleware(['resolve.tenant', 'auth.tenant'])->group(function () {
    // Rota de upload temporário de logo
    Route::post('/upload-temp-logo', [EmpresaController::class, 'uploadTempLogo'])->name('upload.temp.logo');

    // Rota de registo de empresa
    Route::post('/empresas', [EmpresaController::class, 'store'])->name('empresas.store');
});

// ==================== ROTAS PROTEGIDAS (Tenant) ====================
Route::middleware(['resolve.tenant', 'auth.tenant'])->group(function () use ($uuidPattern) {

    Route::get('/me', [UserController::class, 'me']);

    // ===== DASHBOARD =====
    Route::prefix('dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard.index');
        Route::get('/resumo-documentos-fiscais', [DashboardController::class, 'resumoDocumentosFiscais'])->name('dashboard.resumo-documentos');
        Route::get('/estatisticas-pagamentos', [DashboardController::class, 'estatisticasPagamentos'])->name('dashboard.estatisticas-pagamentos');
        Route::get('/alertas', [DashboardController::class, 'alertasPendentes'])->name('dashboard.alertas');
        Route::get('/evolucao-mensal', [DashboardController::class, 'evolucaoMensal'])->name('dashboard.evolucao');
    });

    // ==================== ADMIN apenas ====================
    Route::middleware('role:admin')->group(function () use ($uuidPattern) {
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/relatorios/exportar-saft', [RelatoriosController::class, 'exportarSaft']);
        Route::get('/saft/alertas', [RelatoriosController::class, 'alertas']);
        Route::get('/users/create', [UserController::class, 'create']);
        Route::apiResource('/users', UserController::class)->except(['store']);
        Route::patch('/empresa/toggle-status', [EmpresaController::class, 'toggleSelfStatus'])->name('empresa.toggle-status');

        Route::prefix('clientes')->group(function () use ($uuidPattern) {
            Route::get('/todos', [ClienteController::class, 'indexWithTrashed'])->name('clientes.todos');
            Route::post('/{id}/restore', [ClienteController::class, 'restore'])->where('id', $uuidPattern)->name('clientes.restore');
            Route::delete('/{id}/force', [ClienteController::class, 'forceDelete'])->where('id', $uuidPattern)->name('clientes.force-delete');
            Route::post('/{id}/ativar', [ClienteController::class, 'ativar'])->where('id', $uuidPattern)->name('clientes.ativar');
            Route::post('/{id}/inativar', [ClienteController::class, 'inativar'])->where('id', $uuidPattern)->name('clientes.inativar');
        });
    });

    // ==================== ADMIN + OPERADOR ====================
    Route::middleware('role:admin,operador,gestor,contabilista')->group(function () use ($uuidPattern) {

        // ---------- PRODUTOS ----------
        Route::prefix('produtos')->group(function () use ($uuidPattern) {
            Route::get('/', [ProdutoController::class, 'index'])->name('produtos.index');
            Route::get('/todos', [ProdutoController::class, 'todos'])->name('produtos.todos');
            Route::get('/trashed', [ProdutoController::class, 'trashed'])->name('produtos.trashed');
            Route::post('/{id}/restore', [ProdutoController::class, 'restore'])->where('id', $uuidPattern)->name('produtos.restore');
            Route::delete('/{id}/force', [ProdutoController::class, 'forceDelete'])->where('id', $uuidPattern)->name('produtos.force-delete');
            Route::post('/{id}/status', [ProdutoController::class, 'alterarStatus'])->where('id', $uuidPattern)->name('produtos.status');
            Route::get('/{id}', [ProdutoController::class, 'show'])->where('id', $uuidPattern)->name('produtos.show');
            Route::post('/', [ProdutoController::class, 'store'])->name('produtos.store');
            Route::put('/{id}', [ProdutoController::class, 'update'])->where('id', $uuidPattern)->name('produtos.update');
            Route::delete('/{id}', [ProdutoController::class, 'destroy'])->where('id', $uuidPattern)->name('produtos.destroy');
        });

        // ---------- CATEGORIAS (COMPLETO) ----------
        Route::prefix('categorias')->group(function () use ($uuidPattern) {
            // ✅ Listagens
            Route::get('/', [CategoriaController::class, 'index'])->name('categorias.index');                           // Apenas ativas
            Route::get('/todas', [CategoriaController::class, 'indexTodas'])->name('categorias.todas');                 // Todas (inclui inativas)
            Route::get('/deletadas', [CategoriaController::class, 'indexDeletadas'])->name('categorias.deletadas');     // Apenas deletadas (soft delete)

            // ✅ Select para dropdowns
            Route::get('/select', [CategoriaController::class, 'paraSelectProdutos'])->name('categorias.select');

            // ✅ CRUD básico
            Route::post('/', [CategoriaController::class, 'store'])->name('categorias.store');
            Route::get('/{id}', [CategoriaController::class, 'show'])->where('id', $uuidPattern)->name('categorias.show');
            Route::put('/{id}', [CategoriaController::class, 'update'])->where('id', $uuidPattern)->name('categorias.update');
            Route::delete('/{id}', [CategoriaController::class, 'destroy'])->where('id', $uuidPattern)->name('categorias.destroy');

            // ✅ Soft Delete - Restaurar e Forçar Delete
            Route::post('/{id}/restore', [CategoriaController::class, 'restore'])->where('id', $uuidPattern)->name('categorias.restore');
            Route::delete('/{id}/force', [CategoriaController::class, 'forceDelete'])->where('id', $uuidPattern)->name('categorias.force-delete');
        });

        // ---------- FORNECEDORES ----------
        Route::prefix('fornecedores')->group(function () use ($uuidPattern) {
            Route::get('/todos', [FornecedorController::class, 'indexWithTrashed'])->name('fornecedores.todos');
            Route::get('/trashed', [FornecedorController::class, 'indexOnlyTrashed'])->name('fornecedores.trashed');
            Route::get('/deletados', [FornecedorController::class, 'indexOnlyTrashed'])->name('fornecedores.deletados');
            Route::post('/{id}/restore', [FornecedorController::class, 'restore'])->where('id', $uuidPattern)->name('fornecedores.restore');
            Route::delete('/{id}/force', [FornecedorController::class, 'forceDelete'])->where('id', $uuidPattern)->name('fornecedores.force-delete');
            Route::get('/', [FornecedorController::class, 'index'])->name('fornecedores.index');
            Route::post('/', [FornecedorController::class, 'store'])->name('fornecedores.store');
            Route::get('/{id}', [FornecedorController::class, 'show'])->where('id', $uuidPattern)->name('fornecedores.show');
            Route::put('/{id}', [FornecedorController::class, 'update'])->where('id', $uuidPattern)->name('fornecedores.update');
            Route::delete('/{id}', [FornecedorController::class, 'destroy'])->where('id', $uuidPattern)->name('fornecedores.destroy');
        });

        // ---------- CLIENTES ----------
        Route::apiResource('/clientes', ClienteController::class)->except(['destroy']);
        Route::delete('/clientes/{id}', [ClienteController::class, 'destroy'])->where('id', $uuidPattern)->name('clientes.destroy');
        Route::post('/clientes/{id}/ativar', [ClienteController::class, 'ativar'])->where('id', $uuidPattern)->name('clientes.ativar');
        Route::post('/clientes/{id}/inativar', [ClienteController::class, 'inativar'])->where('id', $uuidPattern)->name('clientes.inativar');

        // ---------- COMPRAS ----------
        Route::prefix('compras')->group(function () use ($uuidPattern) {
            Route::get('/', [CompraController::class, 'index'])->name('compras.index');
            Route::post('/', [CompraController::class, 'store'])->name('compras.store');
            Route::get('/{id}', [CompraController::class, 'show'])->where('id', $uuidPattern)->name('compras.show');
        });

        // ---------- MOVIMENTOS DE STOCK ----------
        Route::prefix('movimentos-stock')->group(function () use ($uuidPattern) {
            Route::get('/', [MovimentoStockController::class, 'index'])->name('movimentos-stock.index');
            Route::post('/', [MovimentoStockController::class, 'store'])->name('movimentos-stock.store');
            Route::post('/ajuste', [MovimentoStockController::class, 'ajuste'])->name('movimentos-stock.ajuste');
            Route::get('/{id}', [MovimentoStockController::class, 'show'])->where('id', $uuidPattern)->name('movimentos-stock.show');
        });

        Route::get('/estoque/resumo', [MovimentoStockController::class, 'resumo'])->name('estoque.resumo');
        Route::get('/movimentos-stock/resumo', [MovimentoStockController::class, 'resumo'])->name('movimentos-stock.resumo');

        // ---------- VENDAS ----------
        Route::prefix('vendas')->group(function () use ($uuidPattern) {
            Route::get('/', [VendaController::class, 'index'])->name('vendas.index');
            Route::post('/', [VendaController::class, 'store'])->name('vendas.store');
            Route::get('/{venda}', [VendaController::class, 'show'])->where('venda', $uuidPattern)->name('vendas.show');
            Route::post('/{venda}/cancelar', [VendaController::class, 'cancelar'])->where('venda', $uuidPattern)->name('vendas.cancelar');
            Route::post('/{venda}/recibo', [VendaController::class, 'gerarRecibo'])->where('venda', $uuidPattern)->name('vendas.recibo');
        });

        // ---------- DOCUMENTOS FISCAIS ----------
        Route::prefix('documentos-fiscais')->group(function () use ($uuidPattern) {
            Route::get('/exportar-excel', [DocumentoFiscalController::class, 'exportarExcel'])->name('documentos.exportar-excel');
            Route::get('/adiantamentos-pendentes', [DocumentoFiscalController::class, 'adiantamentosPendentes'])->name('documentos.adiantamentos-pendentes');
            Route::get('/proformas-pendentes', [DocumentoFiscalController::class, 'proformasPendentes'])->name('documentos.proformas-pendentes');
            Route::get('/alertas', [DocumentoFiscalController::class, 'alertas'])->name('documentos.alertas');
            Route::get('/dashboard', [DocumentoFiscalController::class, 'dashboard'])->name('documentos.dashboard');
            Route::post('/processar-expirados', [DocumentoFiscalController::class, 'processarExpirados'])->name('documentos.processar-expirados');
            Route::post('/emitir', [DocumentoFiscalController::class, 'emitir'])->name('documentos.emitir');
            Route::get('/', [DocumentoFiscalController::class, 'index'])->name('documentos.index');
            Route::get('/{documento}', [DocumentoFiscalController::class, 'show'])->where('documento', $uuidPattern)->name('documentos.show');
            Route::get('/{id}/pdf/download', [DocumentoFiscalController::class, 'downloadPdf'])->where('id', $uuidPattern)->name('documentos.pdf-download');
            Route::get('/{id}/pdf-viewer', [DocumentoFiscalController::class, 'pdfViewer'])->where('id', $uuidPattern)->name('documentos.pdf-viewer');
            Route::get('/{id}/imprimir-termica', [DocumentoFiscalController::class, 'imprimirTermica'])->where('id', $uuidPattern)->name('documentos.imprimir-termica');
            Route::get('/{id}/print-view', [DocumentoFiscalController::class, 'printView'])->where('id', $uuidPattern)->name('documentos.print');
            Route::get('/{documento}/recibos', [DocumentoFiscalController::class, 'listarRecibos'])->where('documento', $uuidPattern)->name('documentos.recibos');
            Route::post('/{id}/recibo', [DocumentoFiscalController::class, 'gerarRecibo'])->where('id', $uuidPattern)->name('documentos.gerar-recibo');
            Route::post('/{documento}/cancelar', [DocumentoFiscalController::class, 'cancelar'])->where('documento', $uuidPattern)->name('documentos.cancelar');
            Route::post('/{id}/nota-credito', [DocumentoFiscalController::class, 'criarNotaCredito'])->where('id', $uuidPattern)->name('documentos.nota-credito');
            Route::post('/{id}/nota-debito', [DocumentoFiscalController::class, 'criarNotaDebito'])->where('id', $uuidPattern)->name('documentos.nota-debito');
            Route::post('/{id}/vincular-adiantamento', [DocumentoFiscalController::class, 'vincularAdiantamento'])->where('id', $uuidPattern)->name('documentos.vincular');
        });

        // ---------- PAGAMENTOS ----------
        Route::prefix('pagamentos')->group(function () use ($uuidPattern) {
            Route::get('/', [PagamentoController::class, 'index'])->name('pagamentos.index');
            Route::post('/', [PagamentoController::class, 'store'])->name('pagamentos.store');
            Route::get('/{id}', [PagamentoController::class, 'show'])->where('id', $uuidPattern)->name('pagamentos.show');
            Route::put('/{id}', [PagamentoController::class, 'update'])->where('id', $uuidPattern)->name('pagamentos.update');
            Route::delete('/{id}', [PagamentoController::class, 'destroy'])->where('id', $uuidPattern)->name('pagamentos.destroy');
        });

        // ---------- RELATÓRIOS ----------
        Route::prefix('relatorios')->group(function () {
            Route::get('/dashboard', [RelatoriosController::class, 'dashboard'])->name('relatorios.dashboard');
            Route::get('/vendas', [RelatoriosController::class, 'vendas'])->name('relatorios.vendas');
            Route::get('/compras', [RelatoriosController::class, 'compras'])->name('relatorios.compras');
            Route::get('/faturacao', [RelatoriosController::class, 'faturacao'])->name('relatorios.faturacao');
            Route::get('/stock', [RelatoriosController::class, 'stock'])->name('relatorios.stock');
            Route::get('/documentos-fiscais', [RelatoriosController::class, 'documentosFiscais'])->name('relatorios.documentos-fiscais');
            Route::get('/pagamentos-pendentes', [RelatoriosController::class, 'pagamentosPendentes'])->name('relatorios.pagamentos-pendentes');
            Route::get('/movimentos-stock', [RelatoriosController::class, 'movimentosStock']);
            Route::get('/proformas', [RelatoriosController::class, 'proformas'])->name('relatorios.proformas');
        });
    });
});

// ==================== ROTAS DO LANDLORD ====================
Route::prefix('landlord')->group(function () {
    Route::post('/login', [LandlordAuthController::class, 'login']);
    Route::post('/register', [LandlordAuthController::class, 'register']);

    Route::middleware(['auth:landlord_api'])->group(function () {
        Route::get('/me', function () {
            return response()->json(['user' => auth('landlord_api')->user()]);
        });
        Route::post('/logout', [LandlordAuthController::class, 'logout']);

        Route::get('/empresas', [EmpresaController::class, 'index']);
        Route::post('/empresas', [EmpresaController::class, 'store']);
        Route::get('/empresas/{empresa}', [EmpresaController::class, 'show']);
        Route::put('/empresas/{empresa}', [EmpresaController::class, 'update']);
        Route::patch('/empresas/{empresa}/toggle-status', [EmpresaController::class, 'toggleStatusLandlord']);
    });
});
