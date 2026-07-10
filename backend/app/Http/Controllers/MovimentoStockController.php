<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Shared\MovimentoStock as SharedMovimentoStock;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Tenant\MovimentoStock as TenantMovimentoStock;
use App\Models\Tenant\Produto as TenantProduto;
use App\Services\StockService;

/**
 * MovimentoStockController
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 */
class MovimentoStockController extends Controller
{
    protected StockService $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
        
        // ✅ CORRETO - Obtém o modo do service
        Log::info('[MovimentoStockController] Inicializado', [
            'modo' => $this->stockService->getModo(),
        ]);
    }

    /* =====================================================================
     | HELPERS (obtêm dados do service dinamicamente)
     | ================================================================== */

    protected function getModo(): string
    {
        return $this->stockService->getModo();
    }

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    protected function getEmpresa()
    {
        return $this->stockService->getEmpresa();
    }

    protected function getUserId(): ?string
    {
        $user = $this->stockService->getUser();
        return $user?->id ?? null;
    }

    /**
     * Query com scope para movimentos de stock (apenas colectivo)
     */
    protected function queryMovimentosStock()
    {
        if ($this->isColectivo()) {
            return SharedMovimentoStock::doTenant();
        }
        return TenantMovimentoStock::query();
    }

    /**
     * Query com scope para produtos (apenas colectivo)
     */
    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    /**
     * Query com scope para produtos (apenas produtos físicos)
     */
    protected function queryProdutosFisicos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('tipo', 'produto');
        }
        return TenantProduto::where('tipo', 'produto');
    }

    /**
     * Busca produto com scope
     */
    protected function buscarProduto(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedProduto::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->first();
        }

        if ($comTrashed) {
            return TenantProduto::withTrashed()->where('id', $id)->first();
        }
        return TenantProduto::where('id', $id)->first();
    }

    /**
     * Busca produto com scope e lança exceção
     */
    protected function buscarProdutoOrFail(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedProduto::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->firstOrFail();
        }

        if ($comTrashed) {
            return TenantProduto::withTrashed()->where('id', $id)->firstOrFail();
        }
        return TenantProduto::where('id', $id)->firstOrFail();
    }

    /* =====================================================================
     | MÉTODOS DO CONTROLLER
     | ================================================================== */

    public function index(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::index] Listando movimentos', [
            'modo' => $modo,
        ]);

        try {
            $query = $this->queryMovimentosStock()->with([
                'produto' => fn ($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'tipo'),
                'user'    => fn ($q) => $q->select('id', 'name'),
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
                'modo'       => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[MovimentoStockController::index] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao listar movimentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function resumo()
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::resumo] Gerando resumo', [
            'modo' => $modo,
        ]);

        try {
            // ✅ O service já cuida da verificação de acesso
            $dados = $this->stockService->dashboard();

            return response()->json([
                'message' => 'Resumo de stock carregado com sucesso',
                'data'    => $dados,
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 500;
            if ($code < 100 || $code >= 600) {
                $code = 500;
            }
            Log::error('[MovimentoStockController::resumo] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
                'code' => $code,
            ]);
            return response()->json([
                'message' => 'Erro ao gerar resumo',
                'error' => $e->getMessage()
            ], $code);
        }
    }

    public function historicoProduto(string $produtoId)
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::historicoProduto] Buscando histórico', [
            'produto_id' => $produtoId,
            'modo' => $modo,
        ]);

        try {
            $produto = $this->buscarProdutoOrFail($produtoId, true);

            $movimentos = $this->queryMovimentosStock()
                ->where('produto_id', $produtoId)
                ->with(['user' => fn ($q) => $q->select('id', 'name')])
                ->paginate(20);

            return response()->json([
                'message'   => 'Histórico de movimentos carregado',
                'produto'   => [
                    'id'           => $produto->id,
                    'nome'         => $produto->nome,
                    'estoque_atual' => $produto->estoque_atual,
                ],
                'movimentos' => $movimentos,
                'modo'       => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Produto não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[MovimentoStockController::historicoProduto] Erro', [
                'produto_id' => $produtoId,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao buscar histórico',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::store] Criando movimento manual', [
            'modo' => $modo,
        ]); 

        try {
            $dados = $request->validate([
                'produto_id'    => 'required|uuid|exists:produtos,id',
                'tipo'          => 'required|in:entrada,saida',
                'tipo_movimento' => 'required|in:compra,venda,ajuste,nota_credito,devolucao',
                'quantidade'    => 'required|integer|min:1',
                'motivo'        => 'required|string|max:255',
                'referencia'    => 'nullable|string|max:100',
                'custo_unitario' => 'nullable|numeric|min:0',
            ]);

            $produto = $this->buscarProdutoOrFail($dados['produto_id']);

            if ($produto->tipo === 'servico') {
                return response()->json(['message' => 'Serviços não possuem controlo de stock'], 422);
            }

            $userId = $this->getUserId();

            if ($dados['tipo'] === 'entrada' && $dados['tipo_movimento'] === 'compra' && isset($dados['custo_unitario'])) {
                $movimento = $this->stockService->entradaCompra(
                    $dados['produto_id'],
                    $dados['quantidade'],
                    (float) $dados['custo_unitario'],
                    $dados['referencia'] ?? null,
                    $userId
                );
            } else {
                $movimento = $this->stockService->movimentar(
                    $dados['produto_id'],
                    $dados['quantidade'],
                    $dados['tipo'],
                    $dados['tipo_movimento'],
                    $dados['referencia'] ?? null,
                    $dados['motivo'],
                    $userId
                );
            }

            if (!$movimento) {
                return response()->json(['message' => 'Movimento não registado'], 422);
            }

 $produto->refresh();

            return response()->json([
                'message'            => 'Movimento registado com sucesso',
                'movimento'          => $movimento->load(['produto:id,nome,codigo', 'user:id,name']),
                'estoque_atualizado' => [
                    'anterior' => $movimento->estoque_anterior,
                    'atual'    => $movimento->estoque_novo,
                    'diferenca' => $movimento->quantidade,
                ],
                'modo' => $modo,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[MovimentoStockController::store] Erro', [
                'error' => $e->getMessage(),
                'dados' => $dados ?? [],
                'modo' => $modo,
            ]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function ajuste(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::ajuste] Realizando ajuste', [
            'modo' => $modo,
        ]);

        try {
            $dados = $request->validate([
                'produto_id' => 'required|uuid|exists:produtos,id',
                'quantidade' => 'required|integer|min:0',
                'motivo'     => 'required|string|max:255',
                'custo_medio' => 'nullable|numeric|min:0',
            ]);

            $produto = $this->buscarProdutoOrFail($dados['produto_id']);

            if ($produto->tipo === 'servico') {
                return response()->json(['message' => 'Serviços não possuem controlo de stock'], 422);
            }

 $anterior = $produto->estoque_atual;
 $novo = $dados['quantidade'];
 $diferenca = $novo - $anterior;

            $movimento = null;
            $userId = $this->getUserId();

            if ($diferenca !== 0) {
                $tipo = $diferenca > 0 ? 'entrada' : 'saida';
                $movimento = $this->stockService->ajusteManual(
                    $dados['produto_id'],
                    abs($diferenca),
                    $tipo,
                    null,
                    $dados['motivo'],
                    $userId
                );

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
                'modo' => $modo,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[MovimentoStockController::ajuste] Erro', [
                'error' => $e->getMessage(),
                'dados' => $dados ?? [],
                'modo' => $modo,
            ]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function transferencia(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::transferencia] Realizando transferência', [
            'modo' => $modo,
        ]);

        try {
            $dados = $request->validate([
                'produto_origem_id'  => 'required|uuid|exists:produtos,id',
                'produto_destino_id' => 'required|uuid|exists:produtos,id|different:produto_origem_id',
                'quantidade'         => 'required|integer|min:1',
                'motivo'             => 'required|string|max:255',
            ]);

            $origem = $this->buscarProdutoOrFail($dados['produto_origem_id']);
            $destino = $this->buscarProdutoOrFail($dados['produto_destino_id']);

            if ($origem->tipo === 'servico' || $destino->tipo === 'servico') {
                return response()->json(['message' => 'Transferência permitida apenas entre produtos físicos'], 422);
            }

            if (!$this->stockService->verificarDisponibilidade($dados['produto_origem_id'], $dados['quantidade'])) {
                return response()->json([
                    'message'             => 'Stock insuficiente na origem',
                    'estoque_disponivel'  => $origem->estoque_atual,
                ], 422);
            }

            $userId = $this->getUserId();
            $estoqueOrigemAnt = $origem->estoque_atual;
            $estoqueDestinoAnt = $destino->estoque_atual;

            $this->stockService->ajusteManual(
                $origem->id,
                $dados['quantidade'],
                'saida',
                null,
                'Transferência para: ' . $destino->nome . ' — ' . $dados['motivo'],
                $userId
            );

            $this->stockService->ajusteManual(
                $destino->id,
                $dados['quantidade'],
                'entrada',
                null,
                'Transferência de: ' . $origem->nome . ' — ' . $dados['motivo'],
                $userId
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
                'modo' => $modo,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[MovimentoStockController::transferencia] Erro', [
                'error' => $e->getMessage(),
                'dados' => $dados ?? [],
                'modo' => $modo,
            ]);
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(string $id)
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::show] Buscando movimento', [
            'movimento_id' => $id,
            'modo' => $modo,
        ]);

        try {
            if ($this->isColectivo()) {
                $movimento = SharedMovimentoStock::doTenant()
                    ->with([
                        'produto' => fn ($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'custo_medio'),
                        'user'    => fn ($q) => $q->select('id', 'name', 'email'),
                    ])
                    ->where('id', $id)
                    ->firstOrFail();
            } else {
                $movimento = TenantMovimentoStock::with([
                    'produto' => fn ($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'custo_medio'),
                    'user'    => fn ($q) => $q->select('id', 'name', 'email'),
                ])->where('id', $id)->firstOrFail();
            }

            return response()->json([
                'message'   => 'Movimento carregado com sucesso',
                'movimento' => $movimento,
                'modo'      => $modo,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Movimento não encontrado',
                'error' => 'not_found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('[MovimentoStockController::show] Erro', [
                'movimento_id' => $id,
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao buscar movimento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function estatisticas(Request $request)
    {
        $modo = $this->getModo();
        Log::info('[MovimentoStockController::estatisticas] Gerando estatísticas', [
            'modo' => $modo,
        ]);

        try {
            $dataInicio = $request->data_inicio ?? now()->subMonth()->toDateString();
            $dataFim    = $request->data_fim    ?? now()->toDateString();

            $query = $this->queryMovimentosStock();

            if ($request->filled('data_inicio')) {
                $query->whereDate('created_at', '>=', $request->data_inicio);
            }
            if ($request->filled('data_fim')) {
                $query->whereDate('created_at', '<=', $request->data_fim);
            }
            if ($request->filled('produto_id')) {
                $query->where('produto_id', $request->produto_id);
            }

            $porTipo = (clone $query)
                ->selectRaw('tipo_movimento, count(*) as total')
                ->whereBetween('created_at', [$dataInicio, $dataFim])
                ->groupBy('tipo_movimento')
                ->get();

            $porMes = (clone $query)
                ->selectRaw(
                    'DATE_FORMAT(created_at, "%Y-%m") as mes,
                     SUM(CASE WHEN tipo = "entrada" THEN quantidade ELSE 0 END) as entradas,
                     ABS(SUM(CASE WHEN tipo = "saida" THEN quantidade ELSE 0 END)) as saidas'
                )
                ->whereBetween('created_at', [$request->data_inicio ?? now()->subMonths(6), $dataFim])
                ->groupBy('mes')
                ->orderBy('mes')
                ->get();

            $porDocumentoFiscal = (clone $query)
                ->selectRaw(
                    'tipo_movimento,
                     count(*) as total,
                     ABS(SUM(CASE WHEN tipo = "saida" THEN quantidade ELSE 0 END)) as quantidade_saida'
                )
                ->whereIn('tipo_movimento', ['venda', 'nota_credito'])
                ->whereBetween('created_at', [$dataInicio, $dataFim])
                ->groupBy('tipo_movimento')
                ->get();

            return response()->json([
                'message'      => 'Estatísticas carregadas',
                'estatisticas' => [
                    'total_movimentos' => (clone $query)->count(),
                    'total_entradas'   => (clone $query)->where('tipo', 'entrada')->sum('quantidade'),
                    'total_saidas'     => abs((clone $query)->where('tipo', 'saida')->sum('quantidade')),
                    'por_tipo'         => $porTipo,
                    'por_mes'          => $porMes,
                    'por_documento_fiscal' => $porDocumentoFiscal,
                ],
                'modo' => $modo,
            ]);

        } catch (\Exception $e) {
            Log::error('[MovimentoStockController::estatisticas] Erro', [
                'error' => $e->getMessage(),
                'modo' => $modo,
            ]);
            return response()->json([
                'message' => 'Erro ao gerar estatísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}