<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pagamento extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'landlord';

    protected $fillable = [
        'id',
        'subscricao_id',
        'empresa_id',
        'plano_id',
        'valor',
        'data_pagamento',
        'data_vencimento',
        'status',
        'metodo_pagamento',
        'codigo_transacao',
        'comprovativo_path',
        'motivo_rejeicao',
        'created_at',
        'updated_at',
        'descricao',
        'parcelas',
    ];

    protected $casts = [
        'data_pagamento' => 'datetime',
        'data_vencimento' => 'date',
    ];

    // Relacionamento com Subscricao (só existe depois de confirmado o pagamento)
    public function subscricao()
    {
        return $this->belongsTo(Subscricao::class);
    }

    // Empresa dona do pedido de pagamento
    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    // Plano associado ao pedido de pagamento
    public function plano()
    {
        return $this->belongsTo(Plano::class);
    }
}