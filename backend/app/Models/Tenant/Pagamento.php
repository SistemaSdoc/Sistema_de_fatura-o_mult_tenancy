<?php

namespace App\Models\Tenant;

use Illuminate\Support\Str;
use App\Models\Tenant\Venda;   

class Pagamento extends TenantModel
{
    protected $table = 'pagamentos';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'fatura_id',
        'metodo',
        'valor_pago',
        'troco',
        'data_pagamento',
        'hora_pagamento',
        'referencia',
        'data',
        'venda_id',
        
    ];

    protected $casts = [
        'data'       => 'datetime',
        'valor_pago' => 'decimal:2',
        'troco'      => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // ================= RELAÇÕES =================

    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }
}
