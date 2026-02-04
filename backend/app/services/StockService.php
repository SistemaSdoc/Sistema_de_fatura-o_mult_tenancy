<?php

namespace App\Services;

use App\Models\MovimentoStock;
use App\Models\Produto;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockService
{
    /**
     * Movimentação genérica de stock (entrada / saída)
     */
    public function movimentar(
        string $produtoId,
        int $quantidade,
        string $tipo, // entrada | saida
        string $tipoMovimento, // compra | venda | ajuste | nota_credito
        ?string $referencia = null,
        ?string $observacao = null
    ): void {
        $produto = Produto::lockForUpdate()->findOrFail($produtoId);

        if ($quantidade <= 0) {
            throw new \Exception('Quantidade inválida para movimentação de stock.');
        }

        // Atualizar estoque
        if ($tipo === 'entrada') {
            $produto->estoque_atual += $quantidade;
        } else {
            if ($produto->estoque_atual < $quantidade) {
                throw new \Exception(
                    "Stock insuficiente do produto {$produto->nome}. Disponível: {$produto->estoque_atual}"
                );
            }

            $produto->estoque_atual -= $quantidade;
        }

        $produto->save();

        // Registrar movimento
        MovimentoStock::create([
            'id' => Str::uuid(),
            'produto_id' => $produto->id,
            'user_id' => Auth::id(),
            'tipo' => $tipo,
            'tipo_movimento' => $tipoMovimento,
            'quantidade' => $quantidade,
            'custo_medio' => $produto->custo_medio,
            'stock_minimo' => $produto->estoque_minimo,
            'referencia' => $referencia,
            'observacao' => $observacao,
        ]);
    }

    /**
     * Entrada de compra com cálculo de custo médio ponderado
     */
    public function entradaCompra(
        string $produtoId,
        int $quantidade,
        float $precoCompra,
        ?string $compraId = null
    ): void {
        DB::transaction(function () use ($produtoId, $quantidade, $precoCompra, $compraId) {
            $produto = Produto::lockForUpdate()->findOrFail($produtoId);

            if ($quantidade <= 0 || $precoCompra <= 0) {
                throw new \Exception('Quantidade ou preço de compra inválidos.');
            }

            $stockAnterior = $produto->estoque_atual;
            $novoStock = $stockAnterior + $quantidade;

            // Custo médio ponderado
            $custoAnterior = $produto->custo_medio ?? 0;
            $novoCustoMedio = (
                ($stockAnterior * $custoAnterior) +
                ($quantidade * $precoCompra)
            ) / max($novoStock, 1);

            $produto->estoque_atual = $novoStock;
            $produto->custo_medio = round($novoCustoMedio, 2);
            $produto->save();

            $this->movimentar(
                $produtoId,
                $quantidade,
                'entrada',
                'compra',
                $compraId,
                'Entrada de compra com custo médio atualizado'
            );
        });
    }

    /**
     * Saída de stock por venda
     */
    public function saidaVenda(
        string $produtoId,
        int $quantidade,
        ?string $vendaId = null
    ): void {
        DB::transaction(function () use ($produtoId, $quantidade, $vendaId) {
            $this->movimentar(
                $produtoId,
                $quantidade,
                'saida',
                'venda',
                $vendaId,
                'Saída de stock por venda'
            );
        });
    }

    /**
     * Ajuste manual de stock
     */
    public function ajusteManual(
        string $produtoId,
        int $quantidade,
        string $tipo, // entrada | saida
        ?string $referencia = null,
        ?string $observacao = null
    ): void {
        DB::transaction(function () use (
            $produtoId,
            $quantidade,
            $tipo,
            $referencia,
            $observacao
        ) {
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
     * Produtos com stock em risco (<= estoque mínimo)
     */
    public function produtosEmRisco()
    {
        return Produto::whereColumn(
            'estoque_atual',
            '<=',
            'estoque_minimo'
        )->get();
    }

    /**
     * Relatório completo de stock
     */
    public function relatorio()
    {
        return Produto::select(
            'id',
            'nome',
            'estoque_atual',
            'estoque_minimo',
            'custo_medio',
            'preco_venda',
            'status'
        )->get();
    }

    /**
     * Dashboard de stock
     */
    public function dashboard(): array
    {
        $produtosEmRisco = $this->produtosEmRisco();

        return [
            'produtos_total' => Produto::count(),
            'stock_baixo' => $produtosEmRisco->count(),
            'valor_stock' => Produto::sum(
                DB::raw('estoque_atual * IFNULL(custo_medio, 0)')
            ),
            'produtos_em_risco' => $produtosEmRisco->pluck('nome')->toArray(),
        ];
    }
}
