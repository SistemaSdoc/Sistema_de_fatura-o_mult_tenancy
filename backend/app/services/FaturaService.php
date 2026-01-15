<?php

namespace App\Services;

use App\Models\Fatura;
use App\Models\ItemFatura;
use App\Models\Venda;
use Illuminate\Support\Facades\DB;

class FaturaService
{
    public function gerarFatura(Venda $venda)
    {
        return DB::transaction(function () use ($venda) {
            // Gera numeração sequencial (exemplo simples)
            $num_sequencial = Fatura::max('num_sequencial') + 1 ?? 1;

            // Cria fatura
            $fatura = Fatura::create([
                'venda_id' => $venda->id,
                'cliente_id' => $venda->cliente_id,
                'num_sequencial' => $num_sequencial,
                'total' => $venda->total,
                'status' => 'emitida',
                'hash' => $this->gerarHash($venda),
                'data' => now(),
            ]);

            // Cria itens da fatura
            foreach ($venda->itens as $item) {
                ItemFatura::create([
                    'fatura_id' => $fatura->id,
                    'descricao' => $item->produto->nome,
                    'quantidade' => $item->quantidade,
                    'preco_unitario' => $item->preco_venda,
                    'iva' => 0, // depois ajustar para regra fiscal
                    'subtotal' => $item->subtotal,
                ]);
            }

            return $fatura;
        });
    }

    private function gerarHash(Venda $venda)
    {
        // Hash simples exemplo: NIF + total + timestamp
        $string = $venda->cliente->nif . '|' . $venda->total . '|' . now()->timestamp;
        return hash('sha256', $string);
    }
}
