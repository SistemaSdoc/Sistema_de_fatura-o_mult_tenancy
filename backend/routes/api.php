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

// Padrão UUID para validação de rotas
$uuidPattern = '[0-9a-fA-F-]{36}';

// ==================== ROTAS PÚBLICAS (sem auth) ====================
// Cadastro de usuários - qualquer um pode acessar
Route::post('/users', [UserController::class, 'store']);

// ==================== ROTAS PROTEGIDAS (com auth:sanctum) ====================
Route::middleware(['auth:sanctum'])->group(function () use ($uuidPattern) {

    // Rotas públicas para usuários autenticados
    Route::get('/me', [UserController::class, 'me']);

    // ===== DASHBOARD =====
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/documentos-fiscais', [DashboardController::class, 'resumoDocumentosFiscais']);
    Route::get('/dashboard/pagamentos', [DashboardController::class, 'estatisticasPagamentos']);
    Route::get('/dashboard/alertas', [DashboardController::class, 'alertasPendentes']);
    Route::get('/dashboard/evolucao-mensal', [DashboardController::class, 'evolucaoMensal']);

    // ==================== ADMIN (acesso total) ====================
    Route::middleware('role:admin')->group(function () use ($uuidPattern) {
        Route::apiResource('/users', UserController::class)->except(['store']);

        // Rota alternativa de create (já tem store pública acima)
        Route::get('/users/create', [UserController::class, 'create']);

        // ===== ROTAS CLIENTES - ADMIN =====
        Route::get('/clientes/todos', [ClienteController::class, 'indexWithTrashed']);
        Route::post('/clientes/{id}/restore', [ClienteController::class, 'restore'])
            ->where('id', $uuidPattern);
        Route::delete('/clientes/{id}/force', [ClienteController::class, 'forceDelete'])
            ->where('id', $uuidPattern);
        Route::apiResource('/clientes', ClienteController::class);
    });

    // ==================== ADMIN + OPERADOR ====================
    Route::middleware('role:admin,operador')->group(function () use ($uuidPattern) {

        // ===== ROTAS PRODUTOS =====
        Route::get('/produtos/todos', [ProdutoController::class, 'indexWithTrashed']);
        Route::get('/produtos/trashed', [ProdutoController::class, 'indexOnlyTrashed']);
        Route::get('/produtos/deletados', [ProdutoController::class, 'indexOnlyTrashed']);
        Route::post('/produtos/{id}/restore', [ProdutoController::class, 'restore'])
            ->where('id', $uuidPattern);
        Route::delete('/produtos/{id}/force', [ProdutoController::class, 'forceDelete'])
            ->where('id', $uuidPattern);
        Route::patch('/produtos/{id}/status', [ProdutoController::class, 'alterarStatus'])
            ->where('id', $uuidPattern);
        Route::apiResource('/produtos', ProdutoController::class);

        // ===== RESUMO DO ESTOQUE =====
        Route::get('/estoque/resumo', [MovimentoStockController::class, 'resumo']);
        Route::get('/movimentos-stock/resumo', [MovimentoStockController::class, 'resumo']);

        // ===== CATEGORIAS =====
        Route::get('/categorias/todas', [CategoriaController::class, 'indexWithTrashed']);
        Route::get('/categorias/deletadas', [CategoriaController::class, 'indexOnlyTrashed']);
        Route::post('/categorias/{id}/restore', [CategoriaController::class, 'restore'])
            ->where('id', $uuidPattern);
        Route::delete('/categorias/{id}/force', [CategoriaController::class, 'forceDelete'])
            ->where('id', $uuidPattern);
        Route::apiResource('/categorias', CategoriaController::class);

        // ===== FORNECEDORES (COM SOFT DELETE) - CORRIGIDO =====
        // Rotas específicas PRIMEIRO (evita conflito com show/{id})
        Route::get('/fornecedores/todos', [FornecedorController::class, 'indexWithTrashed']);
        Route::get('/fornecedores/trashed', [FornecedorController::class, 'indexOnlyTrashed']);
        Route::get('/fornecedores/deletados', [FornecedorController::class, 'indexOnlyTrashed']);

        // IMPORTANTE: restore e forceDelete agora no mesmo middleware das outras operações
        Route::post('/fornecedores/{id}/restore', [FornecedorController::class, 'restore'])
            ->where('id', $uuidPattern);
        Route::delete('/fornecedores/{id}/force', [FornecedorController::class, 'forceDelete'])
            ->where('id', $uuidPattern);

        // Rotas padrão do resource (DEPOIS das específicas)
        // Inclui: GET /fornecedores, POST /fornecedores, GET /fornecedores/{id}, PUT /fornecedores/{id}, DELETE /fornecedores/{id}
        Route::apiResource('/fornecedores', FornecedorController::class);

        // ===== CLIENTES (Operador: apenas visualização) =====
        Route::get('/clientes', [ClienteController::class, 'index']);
        Route::get('/clientes/{id}', [ClienteController::class, 'show'])
            ->where('id', $uuidPattern);
        Route::post('/clientes', [ClienteController::class, 'store']);
        Route::put('/clientes/{id}', [ClienteController::class, 'update'])
            ->where('id', $uuidPattern);
        Route::delete('/clientes/{id}', [ClienteController::class, 'destroy'])
            ->where('id', $uuidPattern);

        // ===== COMPRAS =====
        Route::get('/compras', [CompraController::class, 'index']);
        Route::post('/compras', [CompraController::class, 'store']);
        Route::get('/compras/{id}', [CompraController::class, 'show'])
            ->where('id', $uuidPattern);

        // ===== MOVIMENTOS DE STOCK =====
        Route::get('/movimentos-stock', [MovimentoStockController::class, 'index']);
        Route::post('/movimentos-stock', [MovimentoStockController::class, 'store']);
        Route::post('/movimentos-stock/ajuste', [MovimentoStockController::class, 'ajuste']);
        Route::get('/movimentos-stock/{id}', [MovimentoStockController::class, 'show'])
            ->where('id', $uuidPattern);
    });

    // ==================== ADMIN + OPERADOR + CONTABILISTA ====================
    Route::middleware('role:admin,operador,contabilista')->group(function () use ($uuidPattern) {

        // ===== VENDAS =====
        Route::get('/vendas', [VendaController::class, 'index']);
        Route::post('/vendas', [VendaController::class, 'store']);
        Route::get('/vendas/{venda}', [VendaController::class, 'show'])
            ->where('venda', $uuidPattern);
        Route::post('/vendas/{venda}/cancelar', [VendaController::class, 'cancelar'])
            ->where('venda', $uuidPattern);
        Route::post('/vendas/{venda}/pagar', [VendaController::class, 'pagar'])
            ->where('venda', $uuidPattern);
        Route::post('/vendas/{venda}/converter', [VendaController::class, 'converter'])
            ->where('venda', $uuidPattern);

        // ===== DOCUMENTOS FISCAIS (NOVO - substitui Faturas) =====
        Route::get('/documentos-fiscais', [DocumentoFiscalController::class, 'index']);
        Route::get('/documentos-fiscais/{documento}', [DocumentoFiscalController::class, 'show'])
            ->where('documento', $uuidPattern);
        Route::post('/documentos-fiscais/emitir', [DocumentoFiscalController::class, 'emitir']);
        Route::post('/documentos-fiscais/{documento}/pagar', [DocumentoFiscalController::class, 'pagar'])
            ->where('documento', $uuidPattern);
        Route::post('/documentos-fiscais/{documento}/converter', [DocumentoFiscalController::class, 'converter'])
            ->where('documento', $uuidPattern);
        Route::post('/documentos-fiscais/{documento}/vincular', [DocumentoFiscalController::class, 'vincular'])
            ->where('documento', $uuidPattern);
        Route::post('/documentos-fiscais/{documento}/anular', [DocumentoFiscalController::class, 'anular'])
            ->where('documento', $uuidPattern);
        Route::get('/documentos-fiscais/{documento}/recibos', [DocumentoFiscalController::class, 'recibos'])
            ->where('documento', $uuidPattern);
        Route::get('/documentos-fiscais/{documento}/estado-at', [DocumentoFiscalController::class, 'consultarEstado'])
            ->where('documento', $uuidPattern);

        // ===== ROTAS ESPECÍFICAS PARA NOTAS DE CRÉDITO E DÉBITO =====
        // Rota para criar Nota de Crédito a partir de um documento FT/FR
        Route::post('/documentos-fiscais/{id}/nota-credito', [DocumentoFiscalController::class, 'criarNotaCredito'])
            ->where('id', $uuidPattern);

        // Rota para criar Nota de Débito a partir de um documento FT/FR
        Route::post('/documentos-fiscais/{id}/nota-debito', [DocumentoFiscalController::class, 'criarNotaDebito'])
            ->where('id', $uuidPattern);

        // Rota para gerar recibo para uma fatura FT
        Route::post('/documentos-fiscais/{id}/recibo', [DocumentoFiscalController::class, 'gerarRecibo'])
            ->where('id', $uuidPattern);

        // Rota para vincular adiantamento a fatura
        Route::post('/documentos-fiscais/{id}/vincular-adiantamento', [DocumentoFiscalController::class, 'vincularAdiantamento'])
            ->where('id', $uuidPattern);

        // Rota para cancelar documento fiscal (substitui anular)
        Route::post('/documentos-fiscais/{id}/cancelar', [DocumentoFiscalController::class, 'cancelar'])
            ->where('id', $uuidPattern);

        // ===== ROTAS ADICIONAIS PARA DOCUMENTOS FISCAIS =====
        // Listar recibos de uma fatura
        Route::get('/documentos-fiscais/{faturaId}/recibos', [DocumentoFiscalController::class, 'listarRecibos'])
            ->where('faturaId', $uuidPattern);

        // Listar adiantamentos pendentes de um cliente
        Route::get('/documentos-fiscais/adiantamentos-pendentes', [DocumentoFiscalController::class, 'adiantamentosPendentes']);

        // Alertas de documentos fiscais
        Route::get('/documentos-fiscais/alertas', [DocumentoFiscalController::class, 'alertasAdiantamentos']);

        // Processar adiantamentos expirados (endpoint para cron/job)
        Route::post('/documentos-fiscais/processar-expirados', [DocumentoFiscalController::class, 'processarExpirados']);

        // Dashboard de documentos fiscais
        Route::get('/documentos-fiscais/dashboard', [DocumentoFiscalController::class, 'dashboard']);

        // ===== PAGAMENTOS (mantido para compatibilidade, mas usar documentos-fiscais/{id}/pagar preferencialmente) =====
        Route::get('/pagamentos', [PagamentoController::class, 'index']);
        Route::post('/pagamentos', [PagamentoController::class, 'store']);
        Route::get('/pagamentos/{id}', [PagamentoController::class, 'show'])
            ->where('id', $uuidPattern);
        Route::put('/pagamentos/{id}', [PagamentoController::class, 'update'])
            ->where('id', $uuidPattern);
        Route::delete('/pagamentos/{id}', [PagamentoController::class, 'destroy'])
            ->where('id', $uuidPattern);

        // ===== RELATÓRIOS =====
        Route::get('/relatorios/dashboard', [RelatoriosController::class, 'dashboard']);
        Route::get('/relatorios/vendas', [RelatoriosController::class, 'vendas']);
        Route::get('/relatorios/compras', [RelatoriosController::class, 'compras']);
        Route::get('/relatorios/faturacao', [RelatoriosController::class, 'faturacao']);
        Route::get('/relatorios/stock', [RelatoriosController::class, 'stock']);

        // Novos relatórios de documentos fiscais
        Route::get('/relatorios/documentos-fiscais', [RelatoriosController::class, 'documentosFiscais']);
        Route::get('/relatorios/pagamentos-pendentes', [RelatoriosController::class, 'pagamentosPendentes']);
    });
});
