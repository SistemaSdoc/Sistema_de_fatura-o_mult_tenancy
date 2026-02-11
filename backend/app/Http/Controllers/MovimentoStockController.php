<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MovimentoStock;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class MovimentoStockController extends Controller
{
    /**
     * Listar todos os movimentos de stock
     */
    public function index(Request $request)
    {
        $query = MovimentoStock::with(['produto' => function ($q) {
            $q->withTrashed()->select('id', 'nome', 'codigo', 'tipo');
        }, 'user' => function ($q) {
            $q->select('id', 'name');
        }])
            ->orderBy('created_at', 'desc');

        // Filtros
        if ($request->has('produto_id')) {
            $query->where('produto_id', $request->produto_id);
        }
        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->has('tipo_movimento')) {
            $query->where('tipo_movimento', $request->tipo_movimento);
        }
        if ($request->has('data_inicio')) {
            $query->whereDate('created_at', '>=', $request->data_inicio);
        }
        if ($request->has('data_fim')) {
            $query->whereDate('created_at', '<=', $request->data_fim);
        }

        $movimentos = $request->boolean('paginar')
            ? $query->paginate($request->get('per_page', 20))
            : $query->get();

        return response()->json([
            'message' => 'Movimentos de stock carregados com sucesso',
            'movimentos' => $movimentos
        ]);
    }

    /**
     * Resumo do estoque (para dashboard)
     */
    public function resumo()
    {
        $produtos = Produto::apenasProdutos()->get();
        $produtosAtivos = $produtos->where('status', 'ativo');

        $estoqueBaixo = $produtosAtivos->filter(function ($p) {
            return $p->estoqueBaixo();
        });

        $semEstoque = $produtosAtivos->filter(function ($p) {
            return $p->semEstoque();
        });

        $valorTotal = $produtosAtivos->sum(function ($p) {
            return $p->estoque_atual * ($p->custo_medio > 0 ? $p->custo_medio : ($p->preco_compra ?? 0));
        });

        $movimentacoesHoje = MovimentoStock::whereDate('created_at', today())->count();

        $entradasHoje = MovimentoStock::whereDate('created_at', today())
            ->where('tipo', 'entrada')
            ->sum('quantidade');

        $saidasHoje = MovimentoStock::whereDate('created_at', today())
            ->where('tipo', 'saida')
            ->sum(DB::raw('ABS(quantidade)'));

        return response()->json([
            'totalProdutos' => $produtos->count(),
            'produtosAtivos' => $produtosAtivos->count(),
            'produtosEstoqueBaixo' => $estoqueBaixo->count(),
            'produtosSemEstoque' => $semEstoque->count(),
            'valorTotalEstoque' => round($valorTotal, 2),
            'movimentacoesHoje' => $movimentacoesHoje,
            'entradasHoje' => $entradasHoje,
            'saidasHoje' => $saidasHoje,
            'produtos_criticos' => $estoqueBaixo->values(),
        ]);
    }

    /**
     * Histórico de movimentos de um produto específico
     */
    public function historicoProduto($produtoId)
    {
        $produto = Produto::withTrashed()->findOrFail($produtoId);

        $movimentos = $produto->movimentosStock()
            ->with(['user' => function ($q) {
                $q->select('id', 'name');
            }])
            ->paginate(20);

        return response()->json([
            'message' => 'Histórico de movimentos carregado',
            'produto' => [
                'id' => $produto->id,
                'nome' => $produto->nome,
                'estoque_atual' => $produto->estoque_atual,
            ],
            'movimentos' => $movimentos
        ]);
    }

    /**
     * Criar novo movimento de stock (entrada/saída)
     */
    public function store(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|uuid|exists:produtos,id',
            'tipo' => 'required|in:entrada,saida',
            'tipo_movimento' => 'required|in:compra,venda,ajuste,nota_credito,devolucao',
            'quantidade' => 'required|integer|min:1',
            'motivo' => 'required|string|max:255',
            'referencia' => 'nullable|string|max:100', // Nº documento, nota, etc.
            'custo_unitario' => 'nullable|numeric|min:0', // Para entradas com novo custo
        ]);

        try {
            DB::beginTransaction();

            $produto = Produto::lockForUpdate()->findOrFail($dados['produto_id']);

            // Validar se é produto físico
            if ($produto->isServico()) {
                return response()->json([
                    'message' => 'Serviços não possuem controle de stock'
                ], 422);
            }

            $quantidadeAnterior = $produto->estoque_atual;

            // Calcular quantidade com sinal
            $quantidadeMovimento = $dados['tipo'] === 'entrada'
                ? abs($dados['quantidade'])
                : -abs($dados['quantidade']);

            $novaQuantidade = $quantidadeAnterior + $quantidadeMovimento;

            // Validar estoque negativo
            if ($novaQuantidade < 0) {
                return response()->json([
                    'message' => 'Estoque insuficiente. Estoque atual: ' . $quantidadeAnterior,
                    'estoque_atual' => $quantidadeAnterior,
                    'tentativa_saida' => abs($quantidadeMovimento)
                ], 422);
            }

            // Calcular novo custo médio se for entrada com custo
            $novoCustoMedio = $produto->custo_medio;
            if ($dados['tipo'] === 'entrada' && isset($dados['custo_unitario']) && $dados['custo_unitario'] > 0) {
                // Fórmula: ((EstoqueAtual * CustoAtual) + (Entrada * CustoNovo)) / (EstoqueAtual + Entrada)
                if ($quantidadeAnterior > 0) {
                    $valorTotalAtual = $quantidadeAnterior * $produto->custo_medio;
                    $valorTotalEntrada = $dados['quantidade'] * $dados['custo_unitario'];
                    $novoCustoMedio = ($valorTotalAtual + $valorTotalEntrada) / ($quantidadeAnterior + $dados['quantidade']);
                } else {
                    $novoCustoMedio = $dados['custo_unitario'];
                }

                // Atualizar custo médio do produto
                $produto->custo_medio = round($novoCustoMedio, 2);
            }

            // Criar movimento
            $movimento = MovimentoStock::create([
                'produto_id' => $dados['produto_id'],
                'user_id' => Auth::id(),
                'tipo' => $dados['tipo'],
                'tipo_movimento' => $dados['tipo_movimento'],
                'quantidade' => $quantidadeMovimento,
                'observacao' => $dados['motivo'],
                'referencia' => $dados['referencia'] ?? null,
                'custo_medio' => $novoCustoMedio,
                'custo_unitario' => $dados['custo_unitario'] ?? null,
                'estoque_anterior' => $quantidadeAnterior,
                'estoque_novo' => $novaQuantidade,
            ]);

            // Atualizar estoque do produto
            $produto->estoque_atual = $novaQuantidade;
            $produto->save();

            DB::commit();

            return response()->json([
                'message' => 'Movimento registrado com sucesso',
                'movimento' => $movimento->load(['produto:id,nome,codigo', 'user:id,name']),
                'estoque_atualizado' => [
                    'anterior' => $quantidadeAnterior,
                    'atual' => $novaQuantidade,
                    'diferenca' => $quantidadeMovimento
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[MOVIMENTO STOCK ERROR]', [
                'error' => $e->getMessage(),
                'dados' => $dados,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'message' => 'Erro ao registrar movimento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ajuste manual de stock (correção de inventário)
     */
    public function ajuste(Request $request)
    {
        $dados = $request->validate([
            'produto_id' => 'required|uuid|exists:produtos,id',
            'quantidade' => 'required|integer|min:0',
            'motivo' => 'required|string|max:255',
            'custo_medio' => 'nullable|numeric|min:0', // Permite atualizar custo médio no ajuste
        ]);

        try {
            DB::beginTransaction();

            $produto = Produto::lockForUpdate()->findOrFail($dados['produto_id']);

            if ($produto->isServico()) {
                return response()->json([
                    'message' => 'Serviços não possuem controle de stock'
                ], 422);
            }

            $quantidadeAnterior = $produto->estoque_atual;
            $quantidadeNova = $dados['quantidade'];
            $diferenca = $quantidadeNova - $quantidadeAnterior;

            // Só cria movimento se houver diferença
            if ($diferenca !== 0) {
                $tipo = $diferenca > 0 ? 'entrada' : 'saida';

                $movimento = MovimentoStock::create([
                    'produto_id' => $dados['produto_id'],
                    'user_id' => Auth::id(),
                    'tipo' => $tipo,
                    'tipo_movimento' => 'ajuste',
                    'quantidade' => $diferenca,
                    'observacao' => $dados['motivo'],
                    'custo_medio' => $dados['custo_medio'] ?? $produto->custo_medio,
                    'estoque_anterior' => $quantidadeAnterior,
                    'estoque_novo' => $quantidadeNova,
                ]);
            }

            // Atualizar produto
            $updateData = ['estoque_atual' => $quantidadeNova];
            if (isset($dados['custo_medio'])) {
                $updateData['custo_medio'] = $dados['custo_medio'];
            }
            $produto->update($updateData);

            DB::commit();

            return response()->json([
                'message' => 'Ajuste realizado com sucesso',
                'movimento' => isset($movimento) ? $movimento->load(['produto:id,nome', 'user:id,name']) : null,
                'ajuste' => [
                    'anterior' => $quantidadeAnterior,
                    'novo' => $quantidadeNova,
                    'diferenca' => $diferenca
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[AJUSTE STOCK ERROR]', [
                'error' => $e->getMessage(),
                'dados' => $dados,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'message' => 'Erro ao realizar ajuste',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Transferência entre produtos (ajuste de um, entrada em outro)
     */
    public function transferencia(Request $request)
    {
        $dados = $request->validate([
            'produto_origem_id' => 'required|uuid|exists:produtos,id',
            'produto_destino_id' => 'required|uuid|exists:produtos,id|different:produto_origem_id',
            'quantidade' => 'required|integer|min:1',
            'motivo' => 'required|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $origem = Produto::lockForUpdate()->findOrFail($dados['produto_origem_id']);
            $destino = Produto::lockForUpdate()->findOrFail($dados['produto_destino_id']);

            // Validar se são produtos físicos
            if ($origem->isServico() || $destino->isServico()) {
                return response()->json([
                    'message' => 'Transferência permitida apenas entre produtos físicos'
                ], 422);
            }

            // Verificar estoque origem
            if ($origem->estoque_atual < $dados['quantidade']) {
                return response()->json([
                    'message' => 'Estoque insuficiente na origem',
                    'estoque_disponivel' => $origem->estoque_atual
                ], 422);
            }

            $estoqueOrigemAnterior = $origem->estoque_atual;
            $estoqueDestinoAnterior = $destino->estoque_atual;

            // Criar movimento de saída na origem
            MovimentoStock::create([
                'produto_id' => $origem->id,
                'user_id' => Auth::id(),
                'tipo' => 'saida',
                'tipo_movimento' => 'ajuste',
                'quantidade' => -$dados['quantidade'],
                'observacao' => 'Transferência para: ' . $destino->nome . ' - ' . $dados['motivo'],
                'custo_medio' => $origem->custo_medio,
                'estoque_anterior' => $estoqueOrigemAnterior,
                'estoque_novo' => $estoqueOrigemAnterior - $dados['quantidade'],
            ]);

            // Criar movimento de entrada no destino
            MovimentoStock::create([
                'produto_id' => $destino->id,
                'user_id' => Auth::id(),
                'tipo' => 'entrada',
                'tipo_movimento' => 'ajuste',
                'quantidade' => $dados['quantidade'],
                'observacao' => 'Transferência de: ' . $origem->nome . ' - ' . $dados['motivo'],
                'custo_medio' => $destino->custo_medio,
                'estoque_anterior' => $estoqueDestinoAnterior,
                'estoque_novo' => $estoqueDestinoAnterior + $dados['quantidade'],
            ]);

            // Atualizar estoques
            $origem->decrement('estoque_atual', $dados['quantidade']);
            $destino->increment('estoque_atual', $dados['quantidade']);

            DB::commit();

            return response()->json([
                'message' => 'Transferência realizada com sucesso',
                'transferencia' => [
                    'origem' => [
                        'id' => $origem->id,
                        'nome' => $origem->nome,
                        'estoque_anterior' => $estoqueOrigemAnterior,
                        'estoque_novo' => $origem->estoque_atual
                    ],
                    'destino' => [
                        'id' => $destino->id,
                        'nome' => $destino->nome,
                        'estoque_anterior' => $estoqueDestinoAnterior,
                        'estoque_novo' => $destino->estoque_atual
                    ],
                    'quantidade' => $dados['quantidade']
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[TRANSFERENCIA STOCK ERROR]', [
                'error' => $e->getMessage(),
                'dados' => $dados
            ]);

            return response()->json([
                'message' => 'Erro ao realizar transferência',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar movimento específico
     */
    public function show($id)
    {
        $movimento = MovimentoStock::with([
            'produto' => function ($q) {
                $q->withTrashed()->select('id', 'nome', 'codigo', 'custo_medio');
            },
            'user' => function ($q) {
                $q->select('id', 'name', 'email');
            }
        ])->findOrFail($id);

        return response()->json([
            'message' => 'Movimento carregado com sucesso',
            'movimento' => $movimento
        ]);
    }

    /**
     * Estatísticas de movimentos (relatório)
     */
    public function estatisticas(Request $request)
    {
        $query = MovimentoStock::query();

        if ($request->has('data_inicio')) {
            $query->whereDate('created_at', '>=', $request->data_inicio);
        }
        if ($request->has('data_fim')) {
            $query->whereDate('created_at', '<=', $request->data_fim);
        }
        if ($request->has('produto_id')) {
            $query->where('produto_id', $request->produto_id);
        }

        $stats = [
            'total_movimentos' => $query->count(),
            'total_entradas' => (clone $query)->where('tipo', 'entrada')->sum('quantidade'),
            'total_saidas' => abs((clone $query)->where('tipo', 'saida')->sum('quantidade')),
            'por_tipo' => MovimentoStock::selectRaw('tipo_movimento, count(*) as total')
                ->whereBetween('created_at', [
                    $request->data_inicio ?? now()->subMonth(),
                    $request->data_fim ?? now()
                ])
                ->groupBy('tipo_movimento')
                ->get(),
            'por_mes' => MovimentoStock::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as mes,
                    sum(case when tipo = "entrada" then quantidade else 0 end) as entradas,
                    abs(sum(case when tipo = "saida" then quantidade else 0 end)) as saidas')
                ->whereBetween('created_at', [
                    $request->data_inicio ?? now()->subMonths(6),
                    $request->data_fim ?? now()
                ])
                ->groupBy('mes')
                ->orderBy('mes')
                ->get()
        ];

        return response()->json([
            'message' => 'Estatísticas carregadas',
            'estatisticas' => $stats
        ]);
    }
}
