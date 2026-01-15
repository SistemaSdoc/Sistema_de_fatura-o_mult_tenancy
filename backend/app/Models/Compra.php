<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Compra extends Model
{
    protected $connection = 'tenant';
    protected $table = 'compras';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'fornecedor_id',
        'data',
        'total',
    ];

    protected $casts = [
        'data'  => 'datetime',
        'total' => 'decimal:2',
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

    public function fornecedor()
    {
        return $this->belongsTo(Fornecedor::class);
    }

    public function itens()
    {
        return $this->hasMany(ItemCompra::class, 'compra_id');
    }
}
