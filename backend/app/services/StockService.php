<?php

namespace App\Services;

use App\Models\Produto;
use App\Models\MovimentoStock;

class StockService
{
    public function registrarMovimento(int $produto_id, string $tipo, int $quantidade, string $origem, string $referencia)
    {
        $produto = Produto::findOrFail($produto_id);

        if ($tipo === 'saida') {
            $produto->decrement('estoque_atual', $quantidade);
        } elseif ($tipo === 'entrada') {
            $produto->increment('estoque_atual', $quantidade);
        }

        return MovimentoStock::create([
            'produto_id' => $produto_id,
            'tipo' => $tipo,
            'quantidade' => $quantidade,
            'origem' => $origem,
            'referencia' => $referencia,
            'data' => now(),
        ]);
    }
}