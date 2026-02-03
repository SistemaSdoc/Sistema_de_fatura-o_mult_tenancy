<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ItemVenda extends Model
{
    protected $table = 'itens_venda';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'venda_id',
        'produto_id',
        'quantidade',
        'descricao',
        'preco_venda',
        'desconto',
        'valor_iva',
        'base_tributavel',
        'valor_retenção',
        'subtotal',
        'created_at',
        'updated_at',

    ];

    protected $casts = [
        'preco_venda' => 'decimal:2',
        'subtotal' => 'decimal:2',
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

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }
}
