<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Tenant\MovimentoStock;
use App\Models\Tenant\Produto;
use App\Models\Tenant\DocumentoFiscal;
use App\Services\StockService;

/**
 * MovimentoStockController
 *
 * Toda a lógica de movimentação está no StockService.
 * O controller apenas valida o request, chama o service e formata a resposta.
 * 
 * REGRAS DE MOVIMENTAÇÃO DE STOCK (Angola):
 * 
 * 1. Nota de Crédito (NC):
 *    - MOVIMENTA STOCK como ENTRADA (devolução)
 *    - Tipo: 'nota_credito'
 *    - Aumenta o stock do produto
 * 
 * 2. Nota de Débito (ND):
 *    - NÃO MOVIMENTA STOCK
 *    - Apenas ajuste financeiro (serviços, juros, multas)
 *    - Não afeta produtos físicos
 * 
 * 3. Fatura (FT) e Fatura-Recibo (FR):
 *    - MOVIMENTA STOCK como SAÍDA (venda)
 *    - Tipo: 'venda'
 *    - Diminui o stock do produto
 */
class MovimentoStockController extends Controller
{
    public function __construct(protected StockService $stockService) {}

    /* =====================================================================
     | LISTAGEM
     | ================================================================== */

    public function index(Request $request)
    {
        $query = MovimentoStock::with([
            'produto' => fn ($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'tipo'),
            'user'    => fn ($q) => $q->select('id', 'name'),
            'documentoFiscal' => fn ($q) => $q->select('id', 'numero_documento', 'tipo_documento'),
        ])->orderBy('created_at', 'desc');

        if ($request->filled('produto_id')) {
            $query->where('produto_id', $request->produto_id);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('tipo_movimento')) {
            $query->where('tipo_movimento', $request->tipo_movimento);
        }
        if ($request->filled('documento_fiscal_id')) {
            $query->where('documento_fiscal_id', $request->documento_fiscal_id);
        }
        if ($request->filled('data_inicio')) {
            $query->whereDate('created_at', '>=', $request->data_inicio);
        }
        if ($request->filled('data_fim')) {
            $query->whereDate('created_at', '<=', $request->data_fim);
        }

        $movimentos = $request->boolean('paginar')
            ? $query->paginate($request->get('per_page', 20))
            : $query->get();

        return response()->json([
            'message'    => 'Movimentos de stock carregados com sucesso',
            'movimentos' => $movimentos,
        ]);
    }

    /* =====================================================================
     | RESUMO (DASHBOARD)
     | ================================================================== */

    public function resumo()
    {
        Log::info('[DASHBOARD] Verificação de autenticação', [
            'tenant_check' => Auth::guard('tenant')->check(),
            'landlord_check' => Auth::guard('landlord')->check(),
            'tenant_user_id' => Auth::guard('tenant')->id(),
            'landlord_user_id' => Auth::guard('landlord')->id(),
            'session_id' => session()->getId(),
            'session_tenant_id' => session('tenant_id'),
        ]);

        $user = Auth::guard('tenant')->user();
        
        Log::info('[DASHBOARD] Utilizador autenticado (tenant)', [
            'user_id' => $user?->id ?? 'null',
            'user_email' => $user?->email ?? 'null',
            'user_role' => $user?->role ?? 'indefinido',
            'user_nome' => $user?->nome ?? $user?->name ?? 'null',
            'tenant_db' => config('database.connections.tenant.database'),
        ]);
        
        $hoje = now()->toDateString();

        // =========================
        // PRODUTOS (APENAS SQL)
        // =========================
        $totalProdutos = Produto::apenasProdutos()->count();

        $produtosAtivos = Produto::apenasProdutos()
            ->where('status', 'ativo')
            ->count();

        $produtosEstoqueBaixo = Produto::apenasProdutos()
            ->where('status', 'ativo')
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->count();

        $produtosSemEstoque = Produto::apenasProdutos()
            ->where('status', 'ativo')
            ->where('estoque_atual', 0)
            ->count();

        // =========================
        // VALOR TOTAL (SQL direto)
        // =========================
        $valorTotal = Produto::apenasProdutos()
            ->where('status', 'ativo')
            ->selectRaw('SUM(estoque_atual * COALESCE(custo_medio, preco_compra, 0)) as total')
            ->value('total');

        // =========================
        // MOVIMENTOS HOJE (1 QUERY BASE)
        // =========================
        $movimentosBase = MovimentoStock::whereDate('created_at', $hoje);

        $movimentacoesHoje = (clone $movimentosBase)->count();

        $entradasHoje = (clone $movimentosBase)
            ->where('tipo', 'entrada')
            ->sum('quantidade');

        $saidasHoje = (clone $movimentosBase)
            ->where('tipo', 'saida')
            ->sum(DB::raw('ABS(quantidade)'));

        // =========================
        // SAÍDAS POR DOCUMENTO FISCAL (CORRIGIDO)
        // =========================
        // FT/FR = venda (saída de stock)
        // NC = nota_credito (entrada de stock - devolução)
        // ND = NÃO movimenta stock
        // =========================
        $saidasPorVenda = (clone $movimentosBase)
            ->where('tipo', 'saida')
            ->where('tipo_movimento', 'venda')
            ->count();

        $entradasPorNotaCredito = (clone $movimentosBase)
            ->where('tipo', 'entrada')
            ->where('tipo_movimento', 'nota_credito')
            ->count();

        // =========================
        // MOVIMENTOS POR TIPO (DETALHADO)
        // =========================
        $movimentosPorTipo = (clone $movimentosBase)
            ->select('tipo_movimento', DB::raw('COUNT(*) as total'), DB::raw('SUM(quantidade) as quantidade_total'))
            ->groupBy('tipo_movimento')
            ->get();

        // =========================
        // PRODUTOS CRÍTICOS (LIMITADO)
        // =========================
        $produtosCriticos = Produto::apenasProdutos()
            ->where('status', 'ativo')
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->select('id', 'nome', 'estoque_atual', 'estoque_minimo')
            ->limit(20)
            ->get();

        return response()->json([
            'totalProdutos'            => $totalProdutos,
            'produtosAtivos'           => $produtosAtivos,
            'produtosEstoqueBaixo'     => $produtosEstoqueBaixo,
            'produtosSemEstoque'       => $produtosSemEstoque,
            'valorTotalEstoque'        => round($valorTotal ?? 0, 2),

            'movimentacoesHoje'        => $movimentacoesHoje,
            'entradasHoje'             => $entradasHoje,
            'saidasHoje'               => $saidasHoje,
            
            // CORRIGIDO: separado por tipo de documento
            'saidasPorVenda'           => $saidasPorVenda,
            'entradasPorNotaCredito'   => $entradasPorNotaCredito,
            'movimentosPorTipo'        => $movimentosPorTipo,

            'produtos_criticos'        => $produtosCriticos,
        ]);
    }

    /* =====================================================================
     | HISTÓRICO DE UM PRODUTO
     | ================================================================== */

    public function historicoProduto(string $produtoId)
    {
        $produto    = Produto::withTrashed()->findOrFail($produtoId);
        $movimentos = $produto->movimentosStock()
            ->with([
                'user' => fn ($q) => $q->select('id', 'name'),
                'documentoFiscal' => fn ($q) => $q->select('id', 'numero_documento', 'tipo_documento'),
            ])
            ->paginate(20);

        return response()->json([
            'message'   => 'Histórico de movimentos carregado',
            'produto'   => [
                'id'           => $produto->id,
                'nome'         => $produto->nome,
                'estoque_atual' => $produto->estoque_atual,
            ],
            'movimentos' => $movimentos,
        ]);
    }

    /* =====================================================================
     | CRIAR MOVIMENTO MANUAL
     | ================================================================== */

    public function store(Request $request)
    {
        $dados = $request->validate([
            'produto_id'    => 'required|uuid|exists:produtos,id',
            'tipo'          => 'required|in:entrada,saida',
            'tipo_movimento' => 'required|in:compra,venda,ajuste,nota_credito,devolucao',
            'quantidade'    => 'required|integer|min:1',
            'motivo'        => 'required|string|max:255',
            'referencia'    => 'nullable|string|max:100',
            'custo_unitario' => 'nullable|numeric|min:0',
            'documento_fiscal_id' => 'nullable|uuid|exists:documentos_fiscais,id',
        ]);

        try {
            $produto = Produto::findOrFail($dados['produto_id']);

            if ($produto->isServico()) {
                return response()->json(['message' => 'Serviços não possuem controlo de stock'], 422);
            }

            // Verificar se o tipo_movimento é válido para o tipo
            $this->validarMovimentoStock($dados['tipo'], $dados['tipo_movimento']);

            // Entradas de compra usam o método dedicado (actualiza custo médio)
            if ($dados['tipo'] === 'entrada' && $dados['tipo_movimento'] === 'compra' && isset($dados['custo_unitario'])) {
                $movimento = $this->stockService->entradaCompra(
                    $dados['produto_id'],
                    $dados['quantidade'],
                    (float) $dados['custo_unitario'],
                    $dados['referencia'] ?? null
                );
            } else {
                $movimento = $this->stockService->movimentar(
                    $dados['produto_id'],
                    $dados['quantidade'],
                    $dados['tipo'],
                    $dados['tipo_movimento'],
                    $dados['referencia'] ?? null,
                    $dados['motivo'],
                    $dados['documento_fiscal_id'] ?? null
                );
            }

            if (! $movimento) {
                return response()->json(['message' => 'Movimento não registado'], 422);
            }

            $produto->refresh();

            return response()->json([
                'message'            => 'Movimento registado com sucesso',
                'movimento'          => $movimento->load(['produto:id,nome,codigo', 'user:id,name', 'documentoFiscal:id,numero_documento,tipo_documento']),
                'estoque_atualizado' => [
                    'anterior' => $movimento->estoque_anterior,
                    'atual'    => $movimento->estoque_novo,
                    'diferenca' => $movimento->quantidade,
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('[MOVIMENTO STOCK ERROR]', [
                'error'   => $e->getMessage(),
                'dados'   => $dados,
                'user_id' => Auth::id(),
            ]);

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Valida se o tipo_movimento é compatível com o tipo (entrada/saída)
     */
    private function validarMovimentoStock(string $tipo, string $tipoMovimento): void
    {
        $mapa = [
            'entrada' => ['compra', 'ajuste', 'devolucao', 'nota_credito'],
            'saida'   => ['venda', 'ajuste', 'nota_credito'],
        ];

        if (! in_array($tipoMovimento, $mapa[$tipo] ?? [])) {
            throw new \InvalidArgumentException(
                "Tipo de movimento '{$tipoMovimento}' não é válido para '{$tipo}'. " .
                "Entrada: " . implode(', ', $mapa['entrada']) . ". " .
                "Saída: " . implode(', ', $mapa['saida']) . "."
            );
        }
    }

    /* =====================================================================
     | AJUSTE MANUAL (INVENTÁRIO)
     | ================================================================== */

    public function ajuste(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|uuid|exists:produtos,id',
            'quantidade' => 'required|integer|min:0',
            'motivo'     => 'required|string|max:255',
            'custo_medio' => 'nullable|numeric|min:0',
        ]);

        try {
            $produto = Produto::findOrFail($dados['produto_id']);

            if ($produto->isServico()) {
                return response()->json(['message' => 'Serviços não possuem controlo de stock'], 422);
            }

            $anterior = $produto->estoque_atual;
            $novo     = $dados['quantidade'];
            $diferenca = $novo - $anterior;

            $movimento = null;

            if ($diferenca !== 0) {
                $tipo = $diferenca > 0 ? 'entrada' : 'saida';
                $movimento = $this->stockService->ajusteManual(
                    $dados['produto_id'],
                    abs($diferenca),
                    $tipo,
                    null,
                    $dados['motivo']
                );

                // Actualizar custo médio se fornecido
                if (isset($dados['custo_medio'])) {
                    $produto->update(['custo_medio' => $dados['custo_medio']]);
                }
            }

            return response()->json([
                'message'  => 'Ajuste realizado com sucesso',
                'movimento' => $movimento?->load(['produto:id,nome', 'user:id,name']),
                'ajuste'   => [
                    'anterior'  => $anterior,
                    'novo'      => $novo,
                    'diferenca' => $diferenca,
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('[AJUSTE STOCK ERROR]', ['error' => $e->getMessage(), 'dados' => $dados]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /* =====================================================================
     | TRANSFERÊNCIA ENTRE PRODUTOS
     | ================================================================== */

    public function transferencia(Request $request)
    {
        $dados = $request->validate([
            'produto_origem_id'  => 'required|uuid|exists:produtos,id',
            'produto_destino_id' => 'required|uuid|exists:produtos,id|different:produto_origem_id',
            'quantidade'         => 'required|integer|min:1',
            'motivo'             => 'required|string|max:255',
        ]);

        try {
            $origem  = Produto::findOrFail($dados['produto_origem_id']);
            $destino = Produto::findOrFail($dados['produto_destino_id']);

            if ($origem->isServico() || $destino->isServico()) {
                return response()->json(['message' => 'Transferência permitida apenas entre produtos físicos'], 422);
            }

            if (! $this->stockService->verificarDisponibilidade($dados['produto_origem_id'], $dados['quantidade'])) {
                return response()->json([
                    'message'             => 'Stock insuficiente na origem',
                    'estoque_disponivel'  => $origem->estoque_atual,
                ], 422);
            }

            $estoqueOrigemAnt  = $origem->estoque_atual;
            $estoqueDestinoAnt = $destino->estoque_atual;

            // Saída na origem
            $this->stockService->ajusteManual(
                $origem->id,
                $dados['quantidade'],
                'saida',
                null,
                'Transferência para: ' . $destino->nome . ' — ' . $dados['motivo']
            );

            // Entrada no destino
            $this->stockService->ajusteManual(
                $destino->id,
                $dados['quantidade'],
                'entrada',
                null,
                'Transferência de: ' . $origem->nome . ' — ' . $dados['motivo']
            );

            return response()->json([
                'message'       => 'Transferência realizada com sucesso',
                'transferencia' => [
                    'origem'  => [
                        'id'               => $origem->id,
                        'nome'             => $origem->nome,
                        'estoque_anterior' => $estoqueOrigemAnt,
                        'estoque_novo'     => $origem->fresh()->estoque_atual,
                    ],
                    'destino' => [
                        'id'               => $destino->id,
                        'nome'             => $destino->nome,
                        'estoque_anterior' => $estoqueDestinoAnt,
                        'estoque_novo'     => $destino->fresh()->estoque_atual,
                    ],
                    'quantidade' => $dados['quantidade'],
                ],
            ], 201);

        } catch (\Exception $e) {
            Log::error('[TRANSFERENCIA STOCK ERROR]', ['error' => $e->getMessage(), 'dados' => $dados]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /* =====================================================================
     | PROCESSAR DOCUMENTO FISCAL (NOVO MÉTODO)
     | ================================================================== */

    /**
     * Processa a movimentação de stock a partir de um documento fiscal
     * 
     * REGRAS:
     * - FT/FR → Saída de stock (venda)
     * - NC → Entrada de stock (devolução)
     * - ND → NÃO movimenta stock
     * - FP → NÃO movimenta stock (apenas orçamento)
     * - FA → NÃO movimenta stock (apenas adiantamento)
     * - RC → NÃO movimenta stock (apenas recibo)
     * 
     * @param DocumentoFiscal $documento
     * @return MovimentoStock|null
     */
    public function processarDocumentoFiscal(DocumentoFiscal $documento): ?MovimentoStock
    {
        // Validar se o documento afeta stock
        if (! $this->documentoAfetaStock($documento)) {
            Log::info('[STOCK] Documento não afeta stock', [
                'documento_id' => $documento->id,
                'tipo' => $documento->tipo_documento,
                'numero' => $documento->numero_documento
            ]);
            return null;
        }

        // Determinar tipo e direção do movimento
        $tipoMovimento = $this->determinarTipoMovimento($documento);
        $tipo = $this->determinarDirecao($documento);

        Log::info('[STOCK] Processando documento fiscal', [
            'documento_id' => $documento->id,
            'tipo_documento' => $documento->tipo_documento,
            'tipo_movimento' => $tipoMovimento,
            'tipo' => $tipo,
            'itens_count' => $documento->itens->count()
        ]);

        // Processar cada item do documento
        $movimentos = [];
        foreach ($documento->itens as $item) {
            if (!$item->produto_id) {
                Log::warning('[STOCK] Item sem produto_id', [
                    'item_id' => $item->id,
                    'descricao' => $item->descricao
                ]);
                continue;
            }

            $produto = Produto::find($item->produto_id);
            
            if (!$produto) {
                Log::warning('[STOCK] Produto não encontrado', [
                    'produto_id' => $item->produto_id
                ]);
                continue;
            }

            if ($produto->isServico()) {
                Log::info('[STOCK] Produto é serviço, ignorando', [
                    'produto_id' => $produto->id,
                    'nome' => $produto->nome
                ]);
                continue;
            }

            // Para NC, usar quantidade positiva (entrada)
            // Para FT/FR, usar quantidade negativa (saída)
            $quantidade = $tipo === 'entrada' 
                ? $item->quantidade 
                : -$item->quantidade;

            try {
                $movimento = $this->stockService->movimentar(
                    $produto->id,
                    abs($quantidade),
                    $tipo,
                    $tipoMovimento,
                    $documento->id,
                    "Movimento gerado por {$documento->tipo_documento} - {$documento->numero_documento}"
                );

                if ($movimento) {
                    $movimentos[] = $movimento;
                    Log::info('[STOCK] Movimento registado', [
                        'produto_id' => $produto->id,
                        'quantidade' => $quantidade,
                        'estoque_novo' => $movimento->estoque_novo
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('[STOCK] Erro ao processar movimento', [
                    'documento_id' => $documento->id,
                    'produto_id' => $produto->id,
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }
        }

        Log::info('[STOCK] Documento fiscal processado', [
            'documento_id' => $documento->id,
            'movimentos_criados' => count($movimentos)
        ]);

        return $movimentos[0] ?? null;
    }

    /**
     * Verifica se o documento fiscal afeta o stock
     */
    private function documentoAfetaStock(DocumentoFiscal $documento): bool
    {
        $tiposQueAfetamStock = ['FT', 'FR', 'NC'];
        
        return in_array($documento->tipo_documento, $tiposQueAfetamStock);
    }

    /**
     * Determina o tipo de movimento
     */
    private function determinarTipoMovimento(DocumentoFiscal $documento): string
    {
        $mapa = [
            'FT' => 'venda',
            'FR' => 'venda',
            'NC' => 'nota_credito',
        ];

        return $mapa[$documento->tipo_documento] ?? 'ajuste';
    }

    /**
     * Determina a direção do movimento (entrada/saída)
     */
    private function determinarDirecao(DocumentoFiscal $documento): string
    {
        if ($documento->tipo_documento === 'NC') {
            return 'entrada';  // Devolução = entrada de stock
        }
        
        if (in_array($documento->tipo_documento, ['FT', 'FR'])) {
            return 'saida';    // Venda = saída de stock
        }

        return 'ajuste';
    }

    /* =====================================================================
     | DETALHE DE UM MOVIMENTO
     | ================================================================== */

    public function show(string $id)
    {
        $movimento = MovimentoStock::with([
            'produto' => fn ($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'custo_medio'),
            'user'    => fn ($q) => $q->select('id', 'name', 'email'),
            'documentoFiscal' => fn ($q) => $q->select('id', 'numero_documento', 'tipo_documento'),
        ])->findOrFail($id);

        return response()->json([
            'message'   => 'Movimento carregado com sucesso',
            'movimento' => $movimento,
        ]);
    }

    /* =====================================================================
     | ESTATÍSTICAS (RELATÓRIO)
     | ================================================================== */

    public function estatisticas(Request $request)
    {
        $dataInicio = $request->data_inicio ?? now()->subMonth()->toDateString();
        $dataFim    = $request->data_fim    ?? now()->toDateString();

        $base = MovimentoStock::query();

        if ($request->filled('data_inicio')) {
            $base->whereDate('created_at', '>=', $request->data_inicio);
        }
        if ($request->filled('data_fim')) {
            $base->whereDate('created_at', '<=', $request->data_fim);
        }
        if ($request->filled('produto_id')) {
            $base->where('produto_id', $request->produto_id);
        }

        return response()->json([
            'message'      => 'Estatísticas carregadas',
            'estatisticas' => [
                'total_movimentos' => (clone $base)->count(),
                'total_entradas'   => (clone $base)->where('tipo', 'entrada')->sum('quantidade'),
                'total_saidas'     => abs((clone $base)->where('tipo', 'saida')->sum('quantidade')),

                'por_tipo' => MovimentoStock::selectRaw('tipo_movimento, count(*) as total')
                    ->whereBetween('created_at', [$dataInicio, $dataFim])
                    ->groupBy('tipo_movimento')
                    ->get(),

                'por_mes' => MovimentoStock::selectRaw(
                    'DATE_FORMAT(created_at, "%Y-%m") as mes,
                     SUM(CASE WHEN tipo = "entrada" THEN quantidade ELSE 0 END) as entradas,
                     ABS(SUM(CASE WHEN tipo = "saida" THEN quantidade ELSE 0 END)) as saidas'
                )
                    ->whereBetween('created_at', [$request->data_inicio ?? now()->subMonths(6), $dataFim])
                    ->groupBy('mes')
                    ->orderBy('mes')
                    ->get(),

                // CORRIGIDO: separado por tipo de documento fiscal
                'por_documento_fiscal' => MovimentoStock::selectRaw(
                    'tipo_movimento,
                     count(*) as total,
                     SUM(CASE WHEN tipo = "entrada" THEN quantidade ELSE 0 END) as quantidade_entrada,
                     ABS(SUM(CASE WHEN tipo = "saida" THEN quantidade ELSE 0 END)) as quantidade_saida'
                )
                    ->whereIn('tipo_movimento', ['venda', 'nota_credito'])
                    ->whereBetween('created_at', [$dataInicio, $dataFim])
                    ->groupBy('tipo_movimento')
                    ->get(),

                // NOVO: resumo por documento fiscal
                'por_documento' => MovimentoStock::selectRaw(
                    'documento_fiscal_id,
                     tipo_movimento,
                     count(*) as total,
                     SUM(CASE WHEN tipo = "entrada" THEN quantidade ELSE 0 END) as entrada_total,
                     ABS(SUM(CASE WHEN tipo = "saida" THEN quantidade ELSE 0 END)) as saida_total'
                )
                    ->whereNotNull('documento_fiscal_id')
                    ->whereBetween('created_at', [$dataInicio, $dataFim])
                    ->groupBy('documento_fiscal_id', 'tipo_movimento')
                    ->with('documentoFiscal:id,numero_documento,tipo_documento')
                    ->get(),
            ],
        ]);
    }

    /* =====================================================================
     | REVERTER MOVIMENTO DE DOCUMENTO FISCAL (NOVO MÉTODO)
     | ================================================================== */

    /**
     * Reverte os movimentos de stock de um documento fiscal
     * 
     * Usado quando um documento é cancelado
     */
    public function reverterDocumentoFiscal(DocumentoFiscal $documento): int
    {
        // Buscar todos os movimentos associados ao documento
        $movimentos = MovimentoStock::where('documento_fiscal_id', $documento->id)->get();

        if ($movimentos->isEmpty()) {
            Log::info('[STOCK] Nenhum movimento para reverter', [
                'documento_id' => $documento->id
            ]);
            return 0;
        }

        $count = 0;
        foreach ($movimentos as $movimento) {
            try {
                // Reverter o movimento (inverter a direção)
                $tipoReversao = $movimento->tipo === 'entrada' ? 'saida' : 'entrada';
                
                $this->stockService->movimentar(
                    $movimento->produto_id,
                    $movimento->quantidade,
                    $tipoReversao,
                    'ajuste',
                    null,
                    "Reversão do movimento #{$movimento->id} - Cancelamento do documento {$documento->numero_documento}",
                    $documento->id
                );

                $count++;
                Log::info('[STOCK] Movimento revertido', [
                    'movimento_id' => $movimento->id,
                    'tipo_original' => $movimento->tipo,
                    'tipo_reversao' => $tipoReversao
                ]);
            } catch (\Exception $e) {
                Log::error('[STOCK] Erro ao reverter movimento', [
                    'movimento_id' => $movimento->id,
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }
        }

        Log::info('[STOCK] Documento fiscal revertido', [
            'documento_id' => $documento->id,
            'movimentos_revertidos' => $count
        ]);

        return $count;
    }
}