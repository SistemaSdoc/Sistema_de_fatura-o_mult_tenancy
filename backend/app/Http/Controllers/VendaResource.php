<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class VendaResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'cliente' => [
                'id' => $this->cliente->id,
                'nome' => $this->cliente->nome,
            ],
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
            'itens' => $this->itens->map(function ($item) {
                return [
                    'produto_id' => $item->produto_id,
                    'produto_nome' => $item->produto->nome,
                    'quantidade' => $item->quantidade,
                    'preco_venda' => $item->preco_venda,
                    'subtotal' => $item->subtotal,
                ];
            }),
            'total' => $this->total,
            'data' => $this->data,
            'fatura' => $this->fatura ? [
                'id' => $this->fatura->id,
                'num_sequencial' => $this->fatura->num_sequencial,
                'status' => $this->fatura->status,
                'total' => $this->fatura->total,
            ] : null,
        ];
    }
}
