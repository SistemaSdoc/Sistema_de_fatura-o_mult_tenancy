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
        'id',
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
        'stock_minimo',
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'estoque_anterior' => 'integer',
        'estoque_novo' => 'integer',
        'stock_minimo' => 'integer',
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

    /**
     * Movimentos de venda (FT, FR)
     */
    public function scopeVendas($query)
    {
        return $query->where('tipo_movimento', 'venda');
    }

    /**
     * Movimentos de nota de crédito (NC)
     */
    public function scopeNotasCredito($query)
    {
        return $query->where('tipo_movimento', 'nota_credito');
    }

    /**
     * Movimentos por documento fiscal
     */
    public function scopePorDocumentoFiscal($query, string $documentoFiscalId)
    {
        return $query->where('referencia', $documentoFiscalId);
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

    /**
     * Verificar se foi gerado por documento fiscal
     */
    public function getEhDocumentoFiscalAttribute(): bool
    {
        return in_array($this->tipo_movimento, ['venda', 'nota_credito']);
    }

    /**
     * Obter tipo de documento fiscal se aplicável
     */
    public function getTipoDocumentoFiscalAttribute(): ?string
    {
        return match($this->tipo_movimento) {
            'venda' => $this->quantidade < 0 ? 'FT/FR' : null,
            'nota_credito' => 'NC',
            default => null,
        };
    }
}
