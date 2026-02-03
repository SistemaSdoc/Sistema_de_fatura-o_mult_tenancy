<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Fatura extends Model
{
    protected $table = 'faturas';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'venda_id',
        'cliente_id',
        'numero',
        'status',
        'hash',
        'tipo_documento',
        'hora_emissao',
        'total_bruto',
        'total_iva',
        'total_liquido',
        'motivo_anulacao',
        'data_emissao',
        'hora_emissao',
        'total_redencao',

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

    public function venda()
    {
        return $this->belongsTo(Venda::class, 'venda_id');
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    public function itens()
    {
        return $this->hasMany(ItemFatura::class, 'fatura_id');
    }
}
