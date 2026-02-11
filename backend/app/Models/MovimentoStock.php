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
        'user_id',
        'tipo',
        'tipo_movimento',
        'quantidade',
        'estoque_anterior',
        'estoque_novo',
        'custo_medio',
        'custo_unitario',
        'referencia',
        'observacao',
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'estoque_anterior' => 'integer',
        'estoque_novo' => 'integer',
        'custo_medio' => 'decimal:2',
        'custo_unitario' => 'decimal:2',
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

    // Relações
    public function produto()
    {
        return $this->belongsTo(Produto::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeEntradas($query)
    {
        return $query->where('tipo', 'entrada');
    }

    public function scopeSaidas($query)
    {
        return $query->where('tipo', 'saida');
    }

    // Acessors
    public function getValorTotalAttribute()
    {
        return abs($this->quantidade) * ($this->custo_unitario ?? $this->custo_medio ?? 0);
    }

    public function getTipoFormatadoAttribute()
    {
        return $this->tipo === 'entrada' ? 'Entrada' : 'Saída';
    }
}
