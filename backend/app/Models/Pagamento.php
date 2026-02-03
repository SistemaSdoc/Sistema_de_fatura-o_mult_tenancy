<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Pagamento extends Model
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

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
