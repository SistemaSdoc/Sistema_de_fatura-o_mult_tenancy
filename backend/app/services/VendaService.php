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
    protected StockService $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Cria uma venda com itens e registra movimento de estoque
     */
    public function criarVenda(array $dados): Venda
    {
        return DB::transaction(function () use ($dados) {

            // 🔐 Usuário autenticado
            $user = Auth::user();
            if (!$user) {
                throw new Exception('Usuário não autenticado');
            }

            // 🧾 Criação da venda
            $venda = Venda::create([
                'cliente_id' => $dados['cliente_id'],
                'user_id'    => $user->id,
                'data'       => $dados['data'] ?? now(),
                'total'      => 0,
            ]);

            $total = 0;

            // 📦 Itens da venda
            foreach ($dados['itens'] as $item) {

                $produto = Produto::findOrFail($item['produto_id']);

                // Validar estoque
                if ($produto->estoque_atual < $item['quantidade']) {
                    throw new Exception(
                        "Estoque insuficiente para o produto {$produto->nome}"
                    );
                }

                $subtotal = $produto->preco_venda * $item['quantidade'];

                // Criar item da venda
                ItemVenda::create([
                    'venda_id'    => $venda->id,
                    'user_id'     => $user->id,
                    'produto_id'  => $produto->id,
                    'quantidade'  => $item['quantidade'],
                    'preco_venda' => $produto->preco_venda,
                    'subtotal'    => $subtotal,
                ]);

                // Registrar saída de estoque
                $this->stockService->registrarMovimento(
                    produto_id: $produto->id,
                    tipo: 'saida',
                    quantidade: $item['quantidade'],
                    origem: 'venda',
                    referencia: 'Venda #' . $venda->id
                );

                $total += $subtotal;
            }

            // Atualizar total da venda
            $venda->update(['total' => $total]);

            return $venda;
        });
    }
}
