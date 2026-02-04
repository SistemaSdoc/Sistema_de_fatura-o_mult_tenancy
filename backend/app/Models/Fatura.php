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
        'id',
        'user_id',
        'venda_id',
        'cliente_id',

        'serie',
        'sequencial',
        'numero',
        'tipo_documento',

        'data_emissao',
        'hora_emissao',
        'data_vencimento',

        'base_tributavel',
        'total_iva',
        'total_retencao',
        'total_liquido',

        'estado',
        'motivo_anulacao',

        'hash_fiscal',
    ];

    protected $casts = [
        'data_emissao' => 'date',
        'data_vencimento' => 'date',
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

    /* ================= RELACOES ================= */

    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function itens()
    {
        return $this->hasMany(ItemFatura::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
