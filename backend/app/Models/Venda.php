<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Venda extends Model
{
    protected $table = 'vendas';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'cliente_id',
        'user_id',
        'documento_fiscal_id',
        'total',
        'status',
        'estado_pagamento', // ATUALIZADO: pendente, paga, parcial, cancelada
        'hash_fiscal',
        'tipo_documento',
        'hora_venda',
        'data_venda',
        'serie',
        'numero',
        'total_iva',
        'total_retencao',
        'total_pagar',
        'base_tributavel',
    ];

    protected $casts = [
        'data_venda' => 'date',
        'total' => 'decimal:2',
        'total_iva' => 'decimal:2',
        'total_retencao' => 'decimal:2',
        'total_pagar' => 'decimal:2',
        'base_tributavel' => 'decimal:2',
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
        return $this->belongsTo(User::class, 'user_id');
    }

    public function itens()
    {
        return $this->hasMany(ItemVenda::class, 'venda_id');
    }

    /**
     * Documento fiscal associado à venda
     * Apenas FT e FR são vendas válidas
     */
    public function documentoFiscal()
    {
        return $this->hasOne(DocumentoFiscal::class, 'venda_id');
    }

    // ================= ACESSORES =================

    /**
     * Verificar se é uma venda válida (tem FT ou FR)
     */
    public function getEhVendaAttribute(): bool
    {
        if (!$this->documentoFiscal) {
            return false;
        }
        return in_array($this->documentoFiscal->tipo_documento, ['FT', 'FR']);
    }

    /**
     * Verificar se está paga
     */
    public function getEstaPagaAttribute(): bool
    {
        return $this->estado_pagamento === 'paga';
    }

    /**
     * Verificar se pode receber pagamento
     */
    public function getPodeReceberPagamentoAttribute(): bool
    {
        if (!$this->documentoFiscal || $this->documentoFiscal->tipo_documento !== 'FT') {
            return false;
        }
        return in_array($this->estado_pagamento, ['pendente', 'parcial']);
    }
}
