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

            $venda->load(['cliente', 'itens.produto']);

            // numeração sequencial segura
            $ultimo = Fatura::max('numero');
            $numero = $ultimo ? $ultimo + 1 : 1;

            $fatura = Fatura::create([
                'venda_id' => $venda->id,
                'cliente_id' => $venda->cliente_id,
                'numero' => $numero,
                'total' => 0, // inicial, será calculado depois
                'status' => 'emitida',
                'hash' => $this->gerarHash($venda),
            ]);

            $totalFatura = 0;

            foreach ($venda->itens as $item) {
                // Calculando desconto e IVA
                $precoUnitario = $item->preco_venda;
                $quantidade = $item->quantidade;
                $desconto = $item->desconto ?? 0; // desconto informado pelo usuário
                $iva = $item->iva ?? 0;

                // Verifica se o produto é isento de IVA
                if ($item->produto->isento_iva) {
                    $iva = 0;
                }

                // subtotal do item: (preço * quantidade) - desconto + IVA
                $subtotal = ($precoUnitario * $quantidade) - $desconto + $iva;

                ItemFatura::create([
                    'fatura_id' => $fatura->id,
                    'descricao' => $item->produto->nome,
                    'quantidade' => $quantidade,
                    'preco' => $precoUnitario,
                    'desconto' => $desconto,
                    'iva' => $iva,
                    'subtotal' => $subtotal,
                ]);

                $totalFatura += $subtotal;
            }

            // Atualiza total da fatura
            $fatura->update(['total' => $totalFatura]);

            return $fatura;
        });
    }

    private function gerarHash(Venda $venda)
    {
        $venda->loadMissing('cliente');

        $string = $venda->cliente->nif
            . '|' . $venda->total
            . '|' . now()->timestamp;

        return hash('sha256', $string);
    }
}
