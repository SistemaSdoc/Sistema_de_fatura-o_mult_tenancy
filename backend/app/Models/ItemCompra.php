<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ItemCompra extends Model
{
    protected $connection = 'tenant';
    protected $table = 'itens_compra';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'compra_id',
        'produto_id',
        'quantidade',
        'preco_compra',
        'subtotal',
    ];

    protected $casts = [
        'quantidade'   => 'integer',
        'preco_compra' => 'decimal:2',
        'subtotal'     => 'decimal:2',
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

    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }
}
