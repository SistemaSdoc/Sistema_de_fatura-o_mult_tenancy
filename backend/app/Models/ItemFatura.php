<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ItemFatura extends Model
{
    protected $connection = 'tenant';
    protected $table = 'itens_fatura';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'fatura_id',
        'descricao',
        'quantidade',
        'preco_unitario',
        'iva',
        'subtotal'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

    public function fatura()
    {
        return $this->belongsTo(Fatura::class, 'fatura_id');
    }
}
