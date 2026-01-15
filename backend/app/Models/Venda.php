<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Venda extends Model
{
    protected $connection = 'tenant';
    protected $table = 'vendas';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'cliente_id',
        'user_id',
        'data',
        'total',
    ];

    protected $casts = [
        'data' => 'datetime',
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

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function user()
    {
        return $this->belongsTo(TenantUser::class, 'user_id');
    }

    public function itens()
    {
        return $this->hasMany(ItemVenda::class, 'venda_id');
    }

    public function fatura()
    {
        return $this->hasOne(Fatura::class);
    }
}
