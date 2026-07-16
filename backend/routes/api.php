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
use App\Http\Controllers\LandlordUserController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\AuditoriaController;
use App\Http\Controllers\FreelancerController;
use App\Http\Controllers\PlanoController;
use App\Http\Controllers\FeatureController;
use App\Http\Controllers\SubscricaoController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\PagamentoLandlordController;
use App\Http\Controllers\LandlordNotificacaoController;


$uuidPattern = '[0-9a-fA-F-]{36}';

// ================================================================
// 1. ROTAS PÚBLICAS (sem middleware)
// ================================================================
Route::post('/password/email', [PasswordResetController::class, 'sendResetLink'])
    ->middleware('throttle:5,10');

Route::post('/upload-temp-logo', [EmpresaController::class, 'uploadTempLogo'])->name('upload.temp.logo');
Route::post('/empresas', [EmpresaController::class, 'store'])->name('empresas.store');

// Planos e features – públicos (landing page, checkout)
Route::get('/planos-ativos', [PlanoController::class, 'ativos']);
Route::get('/features', [FeatureController::class, 'index']); // ?ativo=1
Route::get('/features-ativas', [FeatureController::class, 'ativas']);

// Gestão de planos (apenas leitura pública) – necessário para checkout
Route::get('/planos/{plano}', [PlanoController::class, 'show']);

// ================================================================
// 2. ROTAS DO LANDLORD (Administração)
// ================================================================


Route::prefix('landlord')->group(function () {
    Route::post('/login', [LandlordAuthController::class, 'login']);
    Route::post('/register', [LandlordAuthController::class, 'register']);
    Route::get('/auth/google', [LandlordAuthController::class, 'redirectToGoogle'])->name('landlord.google.redirect');
    Route::get('/auth/google/callback', [LandlordAuthController::class, 'handleGoogleCallback'])->name('landlord.google.callback');

    Route::get('/notificacoes', [LandlordNotificacaoController::class, 'index']);
    Route::post('/notificacoes/{id}/marcar-lida', [LandlordNotificacaoController::class, 'marcarLida']);
    Route::post('/notificacoes/marcar-todas-lidas', [LandlordNotificacaoController::class, 'marcarTodasLidas']);

    Route::middleware(['auth:landlord_api'])->group(function () {
        Route::post('/logout', [LandlordAuthController::class, 'logout']);
        Route::get('/landlordme', [LandlordAuthController::class, 'landlordme']);
        Route::get('/analytics/resumo', [AnalyticsController::class, 'resumo']);

        // ✅ removido o "/landlord" duplicado
        Route::put('/perfil', [LandlordUserController::class, 'atualizarPerfil']);
        Route::put('/perfil/senha', [LandlordUserController::class, 'alterarSenhaPropria']);

        // ✅ prefix sem duplicar "landlord"
Route::prefix('usuarios')->group(function () {
    Route::get('/', [LandlordUserController::class, 'index']);
    Route::post('/', [LandlordUserController::class, 'store']);
    Route::get('/tenant-users', [LandlordUserController::class, 'listarTenantUsers']);
    Route::get('/shared-users', [LandlordUserController::class, 'listarSharedUsers']);
    Route::get('/{landlordUser}', [LandlordUserController::class, 'show']);
    Route::put('/{landlordUser}', [LandlordUserController::class, 'update']);
    Route::delete('/{landlordUser}', [LandlordUserController::class, 'destroy']);
    Route::patch('/{landlordUser}/toggle-status', [LandlordUserController::class, 'toggleStatus']);
    Route::post('/{landlordUser}/reset-password', [LandlordUserController::class, 'resetPassword']);
    Route::post('/{landlordUser}/vincular-empresa', [LandlordUserController::class, 'vincularEmpresa']);
    Route::delete('/{landlordUser}/desvincular-empresa', [LandlordUserController::class, 'desvincularEmpresa']);
});

        // ✅ NOVO: CRUD completo de planos, dentro do landlord
        Route::prefix('planos')->group(function () {
            Route::get('/', [PlanoController::class, 'index']);
            Route::post('/', [PlanoController::class, 'store']);
            Route::get('/{plano}', [PlanoController::class, 'show']);
            Route::put('/{plano}', [PlanoController::class, 'update']);
            Route::delete('/{plano}', [PlanoController::class, 'destroy']);
            Route::post('/{plano}/features', [PlanoController::class, 'attachFeature']);
            Route::delete('/{plano}/features/{feature}', [PlanoController::class, 'detachFeature']);
        });

        // ✅ NOVO: gestão de features pelo landlord (create/update/delete)
        Route::prefix('features')->group(function () {
            Route::get('/', [FeatureController::class, 'index']);
            Route::post('/', [FeatureController::class, 'store']);
            Route::get('/{feature}', [FeatureController::class, 'show']);
            Route::put('/{feature}', [FeatureController::class, 'update']);
            Route::delete('/{feature}', [FeatureController::class, 'destroy']);
        });

        // Freelancer
        Route::post('/freelancer/empresa', [FreelancerController::class, 'criarEmpresaSingular']);
        Route::get('/freelancer/onboarding', [FreelancerController::class, 'obterStatusOnboarding']);
        Route::put('/freelancer/empresa', [FreelancerController::class, 'atualizarDadosEmpresa']);

        // Empresas (landlord)
        Route::get('/empresas', [EmpresaController::class, 'index']);
        Route::post('/empresas', [EmpresaController::class, 'store']);
        Route::get('/empresas/{empresa}', [EmpresaController::class, 'show']);
        Route::put('/empresas/{empresa}', [EmpresaController::class, 'update']);
        Route::patch('/empresas/{empresa}/toggle-status', [EmpresaController::class, 'toggleStatusLandlord']);
        Route::post('/minha-empresa', [EmpresaController::class, 'storeParaLandlordAutenticado']);

        Route::prefix('pagamentos-plano')->group(function () {
    Route::get('/', [PagamentoLandlordController::class, 'index']);
    Route::get('/pendentes', [PagamentoLandlordController::class, 'pendentes']);
    Route::get('/{id}', [PagamentoLandlordController::class, 'show']);
    Route::post('{id}/confirmar', [PagamentoLandlordController::class, 'confirmarPagamento']);
    Route::post('{id}/rejeitar', [PagamentoLandlordController::class, 'rejeitarPagamento']);
    Route::delete('{id}', [PagamentoLandlordController::class, 'destroy']);
});
    });
});

// ================================================================
// 3. ROTAS TENANT SEM AUTENTICAÇÃO (apenas resolve.tenant)
// ================================================================
Route::middleware(['resolve.tenant'])->group(function () use ($uuidPattern) {
    Route::get('/documentos-fiscais/{id}/prova', [DocumentoFiscalController::class, 'publicProof'])
        ->where('id', $uuidPattern)
        ->name('documentos.public-proof');
});

// ================================================================
// 4. ROTAS PROTEGIDAS (TENANT AUTENTICADO)
// ================================================================
Route::middleware(['resolve.tenant', 'auth.tenant'])->group(function () use ($uuidPattern) {

    // ============================================================
    // GESTÃO DE PLANOS E FEATURES (escrita)
    // ============================================================
    Route::post('planos/{plano}/attach-feature', [PlanoController::class, 'attachFeature']);
    Route::delete('planos/{plano}/detach-feature/{feature}', [PlanoController::class, 'detachFeature']);
    Route::apiResource('features', FeatureController::class)->except(['index']);

    // ============================================================
    // SUBSCRIÇÕES – A ORDEM IMPORTA: 'me' ANTES DE {id}
    // ============================================================
    Route::get('subscricoes/me', [SubscricaoController::class, 'me']);
    Route::get('subscricoes', [SubscricaoController::class, 'index']);
    Route::post('subscricoes', [SubscricaoController::class, 'store']);
    Route::get('subscricoes/{id}', [SubscricaoController::class, 'show']);
    Route::put('subscricoes/{id}', [SubscricaoController::class, 'update']);
    Route::patch('subscricoes/{id}/cancel', [SubscricaoController::class, 'cancel']);
    Route::post('subscricoes/{id}/renovar', [SubscricaoController::class, 'renovar']);
    Route::post('subscricoes/verificar-feature', [SubscricaoController::class, 'verificarFeature']);

    // ============================================================
    // PAGAMENTOS DE PLANOS (EMPRESA)
    // ============================================================
    Route::prefix('pagamentos-plano')->group(function () {
        Route::get('/', [PagamentoLandlordController::class, 'index']);
        Route::post('/', [PagamentoLandlordController::class, 'store']);
        Route::get('{id}', [PagamentoLandlordController::class, 'show']);
        Route::post('{id}/upload-comprovativo', [PagamentoLandlordController::class, 'uploadComprovativo']);
    });

    // ============================================================
    // EMPRESA (TENANT)
    // ============================================================
    Route::prefix('empresa')->group(function () {
        Route::get('/', [EmpresaController::class, 'showSelf']);
        Route::put('/', [EmpresaController::class, 'updateTenant']);
        Route::post('/logo', [EmpresaController::class, 'uploadLogo']);
        Route::get('/configuracoes-fiscais', [EmpresaController::class, 'configuracoesFiscais']);
        Route::put('/configuracoes-fiscais', [EmpresaController::class, 'atualizarConfiguracoesFiscais']);
    });

    // ============================================================
    // UTILIZADORES
    // ============================================================
    Route::get('/me', [UserController::class, 'me']);
    Route::apiResource('/users', UserController::class);

    // ============================================================
    // DASHBOARD
    // ============================================================
    Route::prefix('dashboard')->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->middleware('log.panel')->name('dashboard.index');
        Route::get('/resumo-documentos-fiscais', [DashboardController::class, 'resumoDocumentosFiscais'])->name('dashboard.resumo-documentos');
        Route::get('/estatisticas-pagamentos', [DashboardController::class, 'estatisticasPagamentos'])->name('dashboard.estatisticas-pagamentos');
        Route::get('/alertas', [DashboardController::class, 'alertasPendentes'])->name('dashboard.alertas');
        Route::get('/evolucao-mensal', [DashboardController::class, 'evolucaoMensal'])->name('dashboard.evolucao');
    });

    // ============================================================
    // ADMIN + GESTOR (rotas com permissões especiais)
    // ============================================================
    Route::middleware('role:admin,gestor')->group(function () use ($uuidPattern) {
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/create', [UserController::class, 'create']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);

        Route::patch('/empresa/toggle-status', [EmpresaController::class, 'toggleSelfStatus']);

        Route::get('/relatorios/exportar-saft', [RelatoriosController::class, 'exportarSaft']);
        Route::get('/saft/alertas', [RelatoriosController::class, 'alertas']);

        Route::prefix('clientes')->group(function () use ($uuidPattern) {
            Route::get('/todos', [ClienteController::class, 'indexWithTrashed'])->name('clientes.todos');
            Route::post('/{id}/restore', [ClienteController::class, 'restore'])->where('id', $uuidPattern)->name('clientes.restore');
            Route::delete('/{id}/force', [ClienteController::class, 'forceDelete'])->where('id', $uuidPattern)->name('clientes.force-delete');
            Route::post('/{id}/ativar', [ClienteController::class, 'ativar'])->where('id', $uuidPattern)->name('clientes.ativar');
            Route::post('/clientes/importar', [ClienteController::class, 'importar']);
            Route::post('/{id}/inativar', [ClienteController::class, 'inativar'])->where('id', $uuidPattern)->name('clientes.inativar');
        });

        // Auditoria (admin/gestor)
        Route::prefix('auditoria')->group(function () {
            Route::get('/logs', [AuditoriaController::class, 'index'])->name('auditoria.logs');
            Route::get('/datas', [AuditoriaController::class, 'datasDisponiveis'])->name('auditoria.datas');
        });
    });

    // Auditoria – todos os utilizadores autenticados
    Route::prefix('auditoria')->group(function () {
        Route::post('/eventos', [AuditoriaController::class, 'storeEvento'])->name('auditoria.eventos');
    });

    // ============================================================
    // ADMIN + GESTOR + CONTABLISTA + OPERADOR
    // ============================================================
    Route::middleware('role:admin,gestor,contablista,operador')->group(function () use ($uuidPattern) {

        // ---------- PRODUTOS ----------
        Route::prefix('produtos')->group(function () use ($uuidPattern) {
            Route::post('importar', [ProdutoController::class, 'importar']);
            Route::get('/', [ProdutoController::class, 'index'])->middleware('log.panel')->name('produtos.index');
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

        // ---------- CATEGORIAS ----------
        Route::prefix('categorias')->group(function () use ($uuidPattern) {
            Route::get('/', [CategoriaController::class, 'index'])->middleware('log.panel')->name('categorias.index');
            Route::get('/todas', [CategoriaController::class, 'indexTodas'])->name('categorias.todas');
            Route::get('/deletadas', [CategoriaController::class, 'indexDeletadas'])->name('categorias.deletadas');
            Route::get('/select', [CategoriaController::class, 'paraSelectProdutos'])->name('categorias.select');
            Route::post('/', [CategoriaController::class, 'store'])->name('categorias.store');
            Route::get('/{id}', [CategoriaController::class, 'show'])->where('id', $uuidPattern)->name('categorias.show');
            Route::put('/{id}', [CategoriaController::class, 'update'])->where('id', $uuidPattern)->name('categorias.update');
            Route::delete('/{id}', [CategoriaController::class, 'destroy'])->where('id', $uuidPattern)->name('categorias.destroy');
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
            Route::get('/', [FornecedorController::class, 'index'])->middleware('log.panel')->name('fornecedores.index');
            Route::post('/', [FornecedorController::class, 'store'])->name('fornecedores.store');
            Route::get('/{id}', [FornecedorController::class, 'show'])->where('id', $uuidPattern)->name('fornecedores.show');
            Route::put('/{id}', [FornecedorController::class, 'update'])->where('id', $uuidPattern)->name('fornecedores.update');
            Route::delete('/{id}', [FornecedorController::class, 'destroy'])->where('id', $uuidPattern)->name('fornecedores.destroy');
        });

        // ---------- CLIENTES ----------
        Route::get('/clientes', [ClienteController::class, 'index'])->middleware('log.panel')->name('clientes.index');
        Route::apiResource('/clientes', ClienteController::class)->except(['destroy', 'index']);
        Route::delete('/clientes/{id}', [ClienteController::class, 'destroy'])->where('id', $uuidPattern)->name('clientes.destroy');
        Route::post('/clientes/{id}/ativar', [ClienteController::class, 'ativar'])->where('id', $uuidPattern)->name('clientes.ativar');
        Route::post('/clientes/{id}/inativar', [ClienteController::class, 'inativar'])->where('id', $uuidPattern)->name('clientes.inativar');
        Route::post('/clientes/importar', [ClienteController::class, 'importar']);

        // ---------- COMPRAS ----------
        Route::prefix('compras')->group(function () use ($uuidPattern) {
            Route::get('/', [CompraController::class, 'index'])->middleware('log.panel')->name('compras.index');
            Route::post('/', [CompraController::class, 'store'])->name('compras.store');
            Route::get('/{id}', [CompraController::class, 'show'])->where('id', $uuidPattern)->name('compras.show');
        });

        // ---------- MOVIMENTOS DE STOCK ----------
        Route::prefix('movimentos-stock')->group(function () use ($uuidPattern) {
            Route::get('/', [MovimentoStockController::class, 'index'])->middleware('log.panel')->name('movimentos-stock.index');
            Route::post('/', [MovimentoStockController::class, 'store'])->name('movimentos-stock.store');
            Route::post('/ajuste', [MovimentoStockController::class, 'ajuste'])->name('movimentos-stock.ajuste');
            Route::get('/resumo', [MovimentoStockController::class, 'resumo'])->name('estoque.resumo');
            Route::get('/{id}', [MovimentoStockController::class, 'show'])->where('id', $uuidPattern)->name('movimentos-stock.show');
        });

        // ---------- VENDAS ----------
        Route::prefix('vendas')->group(function () use ($uuidPattern) {
            Route::get('/', [VendaController::class, 'index'])->middleware('log.panel')->name('vendas.index');
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

            Route::get('/', [DocumentoFiscalController::class, 'index'])->middleware('log.panel')->name('documentos.index');
            Route::get('/{documento}', [DocumentoFiscalController::class, 'show'])->where('documento', $uuidPattern)->name('documentos.show');

            // PDF e impressão
            Route::get('/{id}/pdf/download', [DocumentoFiscalController::class, 'downloadPdf'])->where('id', $uuidPattern)->name('documentos.pdf-download');
            Route::get('/{id}/pdf-viewer', [DocumentoFiscalController::class, 'pdfViewer'])->where('id', $uuidPattern)->name('documentos.pdf-viewer');
            Route::get('/{id}/imprimir-termica', [DocumentoFiscalController::class, 'imprimirTermica'])->where('id', $uuidPattern)->name('documentos.imprimir-termica');
            Route::get('/{id}/print-view', [DocumentoFiscalController::class, 'printView'])->where('id', $uuidPattern)->name('documentos.print');
            Route::get('/{id}/print-a4', [DocumentoFiscalController::class, 'printA4'])->where('id', $uuidPattern)->name('documentos.print-view');

            // Notas de Crédito e Débito
            Route::post('/{id}/nota-credito', [DocumentoFiscalController::class, 'criarNotaCredito'])->where('id', $uuidPattern)->name('documentos.nota-credito');
            Route::post('/{id}/nota-debito', [DocumentoFiscalController::class, 'criarNotaDebito'])->where('id', $uuidPattern)->name('documentos.nota-debito');
            Route::get('/{id}/Ver_NC_ND', [DocumentoFiscalController::class, 'show'])->where('id', $uuidPattern)->name('documentos.ver-nc-nd');
            Route::post('/{id}/converter-proforma', [DocumentoFiscalController::class, 'converterProforma'])->where('id', $uuidPattern)->name('documentos.converter-proforma');

            // Recibos
            Route::get('/{documento}/recibos', [DocumentoFiscalController::class, 'listarRecibos'])->where('documento', $uuidPattern)->name('documentos.recibos');
            Route::post('/{id}/recibo', [DocumentoFiscalController::class, 'gerarRecibo'])->where('id', $uuidPattern)->name('documentos.gerar-recibo');

            // Cancelamento e vinculação
            Route::post('/{documento}/cancelar', [DocumentoFiscalController::class, 'cancelar'])->where('documento', $uuidPattern)->name('documentos.cancelar');
            Route::post('/{id}/vincular-adiantamento', [DocumentoFiscalController::class, 'vincularAdiantamento'])->where('id', $uuidPattern)->name('documentos.vincular');
        });

        // ---------- PAGAMENTOS (DE FATURAS) ----------
        Route::prefix('pagamentos')->group(function () use ($uuidPattern) {
            Route::get('/', [PagamentoController::class, 'index'])->middleware('log.panel')->name('pagamentos.index');
            Route::post('/', [PagamentoController::class, 'store'])->name('pagamentos.store');
            Route::get('/{id}', [PagamentoController::class, 'show'])->where('id', $uuidPattern)->name('pagamentos.show');
            Route::put('/{id}', [PagamentoController::class, 'update'])->where('id', $uuidPattern)->name('pagamentos.update');
            Route::delete('/{id}', [PagamentoController::class, 'destroy'])->where('id', $uuidPattern)->name('pagamentos.destroy');
        });

        // ---------- RELATÓRIOS ----------
        Route::prefix('relatorios')->group(function () {
            Route::get('/debug', [RelatoriosController::class, 'debug'])->name('relatorios.debug');
            Route::get('/dashboard', [RelatoriosController::class, 'dashboard'])->middleware('log.panel')->name('relatorios.dashboard');
            Route::get('/vendas', [RelatoriosController::class, 'vendas'])->name('relatorios.vendas');
            Route::get('/compras', [RelatoriosController::class, 'compras'])->name('relatorios.compras');
            Route::get('/faturacao', [RelatoriosController::class, 'faturacao'])->name('relatorios.faturacao');
            Route::get('/stock', [RelatoriosController::class, 'stock'])->name('relatorios.stock');
            Route::get('/movimentos-stock', [RelatoriosController::class, 'movimentosStock'])->name('relatorios.movimentos-stock');
            Route::get('/servicos', [RelatoriosController::class, 'servicos'])->name('relatorios.servicos');
            Route::get('/retencoes', [RelatoriosController::class, 'retencoes'])->name('relatorios.retencoes');
            Route::get('/documentos-fiscais', [RelatoriosController::class, 'documentosFiscais'])->name('relatorios.documentos-fiscais');
            Route::get('/proformas', [RelatoriosController::class, 'proformas'])->name('relatorios.proformas');
            Route::get('/notas-correcao', [RelatoriosController::class, 'notasCorrecao'])->name('relatorios.notas-correcao');

            Route::middleware('role:admin,gestor')->group(function () {
                Route::get('/pagamentos-pendentes', [RelatoriosController::class, 'pagamentosPendentes'])->name('relatorios.pagamentos-pendentes');
                Route::get('/exportar-saft', [RelatoriosController::class, 'exportarSaft'])->name('relatorios.exportar-saft');
                Route::get('/saft-alertas', [RelatoriosController::class, 'saftAlertas'])->name('relatorios.saft-alertas');
            });
        });
    });
});