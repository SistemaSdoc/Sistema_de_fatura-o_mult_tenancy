<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\ItemCompra;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;

class CompraService
{
    public function criarCompra(array $dados)
    {
        return DB::transaction(function () use ($dados) {
            $compra = Compra::create([
                'fornecedor_id' => $dados['fornecedor_id'],
                'data' => $dados['data'] ?? now(),
                'total' => 0,
            ]);

            $total = 0;

            foreach ($dados['itens'] as $item) {
                $produto = Produto::findOrFail($item['produto_id']);
                $subtotal = $produto->preco_compra * $item['quantidade'];

                ItemCompra::create([
                    'compra_id' => $compra->id,
                    'produto_id' => $produto->id,
                    'quantidade' => $item['quantidade'],
                    'preco_compra' => $produto->preco_compra,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;

                // Atualiza estoque
                $produto->increment('estoque_atual', $item['quantidade']);
            }

            $compra->update(['total' => $total]);

            return $compra;
        });
    }
}
