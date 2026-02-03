<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MovimentoStock extends Model
{
    protected $table = 'movimentos_stock';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'produto_id',
        'tipo',        // entrada | saida | ajuste
        'quantidade',      // compra | venda | nota_credito | ajuste_manual
        'referencia',  // id da compra/venda/fatura
        'user_id',     // quem executou
        'tipo_movimento', // compra | venda | ajuste | nota_credito
        'custo_medio',
        'stock_minimo',
        'tipo_movimento',
        'observacao',
        

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
        return $this->belongsTo(User::class, 'user_id');
    }
}
