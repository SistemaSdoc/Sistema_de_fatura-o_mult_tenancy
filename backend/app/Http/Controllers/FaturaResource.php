<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class FaturaResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'venda_id' => $this->venda_id,
            'cliente' => [
                'id' => $this->cliente->id,
                'nome' => $this->cliente->nome,
            ],
            'num_sequencial' => $this->num_sequencial,
            'total' => $this->total,
            'status' => $this->status,
            'hash' => $this->hash,
            'data' => $this->data,
            'itens' => $this->itens->map(function ($item) {
                return [
                    'descricao' => $item->descricao,
                    'quantidade' => $item->quantidade,
                    'preco_unitario' => $item->preco_unitario,
                    'iva' => $item->iva,
                    'subtotal' => $item->subtotal,
                ];
            }),
        ];
    }
}
