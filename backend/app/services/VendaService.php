<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Cliente;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;

class VendaService
{
    public function criarVenda(array $dados)
    {
        return DB::transaction(function () use ($dados) {
            // Cria a venda
            $venda = Venda::create([
                'cliente_id' => $dados['cliente_id'],
                'user_id' => $dados['user_id'],
                'data' => $dados['data'] ?? now(),
                'total' => 0, // será atualizado depois
            ]);

            $total = 0;

            // Cria os itens da venda
            foreach ($dados['itens'] as $item) {
                $produto = Produto::findOrFail($item['produto_id']);
                $subtotal = $produto->preco_venda * $item['quantidade'];

                ItemVenda::create([
                    'venda_id' => $venda->id,
                    'produto_id' => $produto->id,
                    'quantidade' => $item['quantidade'],
                    'preco_venda' => $produto->preco_venda,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;

                // Atualiza estoque
                $produto->decrement('estoque_atual', $item['quantidade']);
            }

            // Atualiza total da venda
            $venda->update(['total' => $total]);

            return $venda;
        });
    }
}
