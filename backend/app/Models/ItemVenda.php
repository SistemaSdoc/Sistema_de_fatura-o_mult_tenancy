<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ItemVenda extends Model
{
    protected $connection = 'tenant';
    protected $table = 'itens_venda';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'venda_id',
        'produto_id',
        'quantidade',
        'preco_venda',
        'subtotal',
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
