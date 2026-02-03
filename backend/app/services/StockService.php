<?php

namespace App\Services;

use App\Models\MovimentoStock;
use App\Models\Produto;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Movimentação genérica (entrada ou saída)
     */
    public function movimentar(
        string $produtoId,
        int $quantidade,
        string $tipo, // entrada ou saida
        string $tipoMovimento, // compra, venda, ajuste, nota_credito
        ?string $referencia = null,
        ?string $observacao = null
    ) {
        $produto = Produto::findOrFail($produtoId);

        // Atualizar stock
        if ($tipo === 'entrada') {
            $produto->stock += $quantidade;
        } else {
            if ($produto->stock < $quantidade) {
                throw new \Exception("Stock insuficiente do produto {$produto->nome}");
            }
            $produto->stock -= $quantidade;
        }

        $produto->save();

        // Registrar movimento
        MovimentoStock::create([
            'id' => Str::uuid(),
            'produto_id' => $produtoId,
            'user_id' => Auth::id(),
            'tipo' => $tipo,
            'tipo_movimento' => $tipoMovimento,
            'quantidade' => $quantidade,
            'custo_medio' => $produto->custo_medio,
            'stock_minimo' => $produto->stock_minimo,
            'referencia' => $referencia,
            'observacao' => $observacao,
        ]);
    }

    /**
     * Entrada de compra com custo médio ponderado
     */
    public function entradaCompra(string $produtoId, int $quantidade, float $preco, ?string $compraId = null)
    {
        return DB::transaction(function () use ($produtoId, $quantidade, $preco, $compraId) {
            $produto = Produto::findOrFail($produtoId);

            $novoStock = $produto->stock + $quantidade;

            // Cálculo do custo médio ponderado
            $novoCusto = (($produto->stock * $produto->custo_medio) + ($quantidade * $preco)) / max($novoStock, 1);

            $produto->stock = $novoStock;
            $produto->custo_medio = round($novoCusto, 2);
            $produto->save();

            $this->movimentar(
                $produtoId,
                $quantidade,
                'entrada',
                'compra',
                $compraId,
                "Entrada de compra com custo médio atualizado"
            );
        });
    }

    /**
     * Saída de venda
     */
    public function saidaVenda(string $produtoId, int $quantidade, ?string $vendaId = null)
    {
        return DB::transaction(function () use ($produtoId, $quantidade, $vendaId) {
            $this->movimentar(
                $produtoId,
                $quantidade,
                'saida',
                'venda',
                $vendaId,
                "Saída de venda"
            );
        });
    }

    /**
     * Ajuste manual de stock
     */
    public function ajusteManual(string $produtoId, int $quantidade, string $tipo, ?string $referencia = null, ?string $observacao = null)
    {
        return DB::transaction(function () use ($produtoId, $quantidade, $tipo, $referencia, $observacao) {
            $this->movimentar(
                $produtoId,
                $quantidade,
                $tipo,
                'ajuste',
                $referencia ?? 'AJUSTE-MANUAL',
                $observacao
            );
        });
    }

    /**
     * Produtos abaixo do stock mínimo
     */
    public function produtosEmRisco()
    {
        return Produto::whereColumn('stock', '<=', 'stock_minimo')->get();
    }

    /**
     * Relatório completo de stock
     */
    public function relatorio()
    {
        return Produto::select(
            'id',
            'nome',
            'stock',
            'stock_minimo',
            'custo_medio',
            'preco_venda'
        )->get();
    }

    /**
     * Dashboard de stock
     */
    public function dashboard()
    {
        $produtosEmRisco = $this->produtosEmRisco();

        return [
            'produtos_total' => Produto::count(),
            'stock_baixo' => $produtosEmRisco->count(),
            'valor_stock' => Produto::sum(DB::raw('stock * custo_medio')),
            'produtos_em_risco' => $produtosEmRisco->pluck('nome')->toArray()
        ];
    }
}
