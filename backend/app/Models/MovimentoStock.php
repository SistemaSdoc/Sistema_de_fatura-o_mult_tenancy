<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MovimentoStock extends Model
{
    protected $connection = 'tenant';
    protected $table = 'movimentos_stock';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'produto_id',
        'tipo',        // entrada | saida | ajuste
        'quantidade',
        'origem',      // compra | venda | nota_credito | ajuste_manual
        'referencia',  // id da compra/venda/fatura
        'data',
        'user_id',     // quem executou
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'data'       => 'datetime',
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

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    public function user()
    {
        return $this->belongsTo(TenantUser::class, 'user_id');
    }
}
