<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\ItemCompra;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;
use App\Services\StockService;
use Illuminate\Support\Facades\Auth;

class CompraService
{
    protected StockService $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    public function criarCompra(array $dados)
    {
        return DB::transaction(function () use ($dados) {

            // Criar compra
            $compra = Compra::create([
                'fornecedor_id' => $dados['fornecedor_id'],
                'data' => $dados['data'] ?? now(),
                'total' => 0,
            ]);

            $total = 0;

            foreach ($dados['itens'] as $item) {
                $produto = Produto::findOrFail($item['produto_id']);
                $subtotal = $produto->preco_compra * $item['quantidade'];

                // Criar item da compra
                ItemCompra::create([
                    'compra_id' => $compra->id,
                    'produto_id' => $produto->id,
                    'quantidade' => $item['quantidade'],
                    'preco_compra' => $produto->preco_compra,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;

                // Registrar entrada de estoque via StockService
                $this->stockService->registrarMovimento(
                    produto_id: $produto->id,
                    tipo: 'entrada',
                    quantidade: $item['quantidade'],
                    origem: 'compra',
                    referencia: 'Compra #' . $compra->id
                );
            }

            // Atualiza total da compra
            $compra->update(['total' => $total]);

            return $compra;
        });
    }
}
