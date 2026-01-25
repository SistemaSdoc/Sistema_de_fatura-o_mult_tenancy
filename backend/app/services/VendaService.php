<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Produto;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;

class VendaService
{
    /**
     * Cria uma venda com itens e controla estoque
     */
    public function criarVenda(array $dados): Venda
    {
        return DB::transaction(function () use ($dados) {

            // 🔐 Usuário autenticado (OBRIGATÓRIO)
            $user = Auth::user();

            if (!$user) {
                throw new Exception('Usuário não autenticado');
            }

            // 🧾 Criação da venda
            $venda = Venda::create([
                'cliente_id' => $dados['cliente_id'],
                'user_id'    => $user->id,   // 👈 vem da sessão
                'data'       => $dados['data'] ?? now(),
                'total'      => 0,
            ]);

            $total = 0;

            // 📦 Itens da venda
            foreach ($dados['itens'] as $item) {

                $produto = Produto::findOrFail($item['produto_id']);

                // (opcional) validar estoque
                if ($produto->estoque_atual < $item['quantidade']) {
                    throw new Exception(
                        "Estoque insuficiente para o produto {$produto->nome}"
                    );
                }

                $subtotal = $produto->preco_venda * $item['quantidade'];

                dd([
    'auth_user' => Auth::user(),
    'auth_id'   => Auth::id(),
    'type'      => gettype(Auth::id()),
]);

                ItemVenda::create([
                    'venda_id'    => $venda->id,
                    'user_id'     => Auth::id(),
                    'produto_id'  => $produto->id,
                    'quantidade'  => $item['quantidade'],
                    'preco_venda' => $produto->preco_venda,
                    'subtotal'    => $subtotal,
                ]);

                // 🔻 Atualiza estoque
                $produto->decrement('estoque_atual', $item['quantidade']);

                $total += $subtotal;
            }

            // 💰 Atualiza total da venda
            $venda->update([
                'total' => $total
            ]);

            return $venda;
        });
    }
}
