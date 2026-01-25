<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\MovimentoStock;

class StockService
{
    /**
     * Registra movimento de estoque
     *
     * @param int $produto_id
     * @param string $tipo 'entrada' ou 'saida'
     * @param int $quantidade
     * @param string $origem Ex: venda, ajuste, compra
     * @param string $referencia Ex: Venda #12
     * @return MovimentoStock
     */
    public function registrarMovimento(
        string $produto_id,
        string $tipo,
        int $quantidade,
        string $origem,
        string $referencia
    ): MovimentoStock
    {
        $produto = Produto::findOrFail($produto_id);

        if ($tipo === 'saida') {
            if ($produto->estoque_atual < $quantidade) {
                throw new \Exception("Estoque insuficiente para {$produto->nome}");
            }
            $produto->decrement('estoque_atual', $quantidade);
        } elseif ($tipo === 'entrada') {
            $produto->increment('estoque_atual', $quantidade);
        } else {
            throw new \Exception("Tipo de movimento inválido: {$tipo}");
        }

        return MovimentoStock::create([
            'produto_id' => $produto_id,
            'tipo'       => $tipo,
            'quantidade' => $quantidade,
            'origem'     => $origem,
            'referencia' => $referencia,
        ]);
    }
}
