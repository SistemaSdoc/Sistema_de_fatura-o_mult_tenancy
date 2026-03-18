<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Services\StockService;

/**
 * MovimentoStockController
 *
 * Toda a lógica de movimentação está no StockService.
 * O controller apenas valida o request, chama o service e formata a resposta.
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
        ]);
    }

    /* =====================================================================
     | RESUMO (DASHBOARD)
     | ================================================================== */

    public function resumo()
    {
        $produtos      = Produto::apenasProdutos()->get();
        $produtosAtivos = $produtos->where('status', 'ativo');

        $estoqueBaixo = $produtosAtivos->filter(fn ($p) => $p->estoqueBaixo());
        $semEstoque   = $produtosAtivos->filter(fn ($p) => $p->semEstoque());

        $valorTotal = $produtosAtivos->sum(
            fn ($p) => $p->estoque_atual * ($p->custo_medio > 0 ? $p->custo_medio : ($p->preco_compra ?? 0))
        );

        $movimentacoesHoje = MovimentoStock::whereDate('created_at', today())->count();
        $entradasHoje      = MovimentoStock::whereDate('created_at', today())->where('tipo', 'entrada')->sum('quantidade');
        $saidasHoje        = MovimentoStock::whereDate('created_at', today())->where('tipo', 'saida')->sum(DB::raw('ABS(quantidade)'));

        $saidasPorDocFiscal = MovimentoStock::whereDate('created_at', today())
            ->where('tipo', 'saida')
            ->whereIn('tipo_movimento', ['venda', 'nota_credito'])
            ->count();

        return response()->json([
            'totalProdutos'            => $produtos->count(),
            'produtosAtivos'           => $produtosAtivos->count(),
            'produtosEstoqueBaixo'     => $estoqueBaixo->count(),
            'produtosSemEstoque'       => $semEstoque->count(),
            'valorTotalEstoque'        => round($valorTotal, 2),
            'movimentacoesHoje'        => $movimentacoesHoje,
            'entradasHoje'             => $entradasHoje,
            'saidasHoje'               => $saidasHoje,
            'saidasPorDocumentoFiscal' => $saidasPorDocFiscal,
            'produtos_criticos'        => $estoqueBaixo->values(),
        ]);
    }

    /* =====================================================================
     | HISTÓRICO DE UM PRODUTO
     | ================================================================== */

    public function historicoProduto(string $produtoId)
    {
        $produto    = Produto::withTrashed()->findOrFail($produtoId);
        $movimentos = $produto->movimentosStock()
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
        ]);

        try {
            $produto = Produto::findOrFail($dados['produto_id']);

            if ($produto->isServico()) {
                return response()->json(['message' => 'Serviços não possuem controlo de stock'], 422);
            }

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
                    $dados['motivo']
                );
            }

            if (! $movimento) {
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
     | DETALHE DE UM MOVIMENTO
     | ================================================================== */

    public function show(string $id)
    {
        $movimento = MovimentoStock::with([
            'produto' => fn ($q) => $q->withTrashed()->select('id', 'nome', 'codigo', 'custo_medio'),
            'user'    => fn ($q) => $q->select('id', 'name', 'email'),
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

                'por_documento_fiscal' => MovimentoStock::selectRaw(
                    'tipo_movimento,
                     count(*) as total,
                     ABS(SUM(CASE WHEN tipo = "saida" THEN quantidade ELSE 0 END)) as quantidade_saida'
                )
                    ->whereIn('tipo_movimento', ['venda', 'nota_credito'])
                    ->whereBetween('created_at', [$dataInicio, $dataFim])
                    ->groupBy('tipo_movimento')
                    ->get(),
            ],
        ]);
    }
}