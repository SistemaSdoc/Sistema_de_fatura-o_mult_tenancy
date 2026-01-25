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
                'total' => $venda->total,
                'status' => 'emitida',
                'hash' => $this->gerarHash($venda),
            ]);

            foreach ($venda->itens as $item) {
                ItemFatura::create([
                    'fatura_id' => $fatura->id,
                    'descricao' => $item->produto->nome,
                    'quantidade' => $item->quantidade,
                    'preco' => $item->preco_venda,
                    'iva' => 0,
                    'subtotal' => $item->subtotal,
                ]);
            }

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
