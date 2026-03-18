<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Model MovimentoStock
 *
 * Representa um movimento de stock (entrada ou saída).
 * Toda a lógica de criação de movimentos está no StockService.
 * Este model é apenas estrutura de dados + relações + scopes + acessores.
 *
 * Tipos de movimento válidos:
 *  compra        — entrada por compra (actualiza custo médio ponderado)
 *  venda         — saída por documento fiscal FT/FR
 *  nota_credito  — entrada por NC (devolução de mercadoria)
 *  ajuste        — ajuste manual ou por cancelamento
 *  venda_cancelada — entrada por cancelamento de venda
 *  devolucao     — devolução avulsa
 */
class MovimentoStock extends Model
{
    protected $table = 'movimentos_stock';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id',
        'produto_id',
        'user_id',
        'tipo',           // entrada | saida
        'tipo_movimento', // compra | venda | nota_credito | ajuste | venda_cancelada | devolucao
        'quantidade',
        'estoque_anterior',
        'estoque_novo',
        'custo_medio',
        'custo_unitario',
        'referencia',     // ID do documento fiscal ou compra associada
        'observacao',
        'stock_minimo',
    ];

    protected $casts = [
        'quantidade'       => 'integer',
        'estoque_anterior' => 'integer',
        'estoque_novo'     => 'integer',
        'stock_minimo'     => 'integer',
        'custo_medio'      => 'decimal:2',
        'custo_unitario'   => 'decimal:2',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    /* =====================================================================
     | BOOT
     | ================================================================== */

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /* =====================================================================
     | RELAÇÕES
     | ================================================================== */

    public function produto()
    {
        return $this->belongsTo(Produto::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /* =====================================================================
     | SCOPES
     | ================================================================== */

    public function scopeEntradas($query)
    {
        return $query->where('tipo', 'entrada');
    }

    public function scopeSaidas($query)
    {
        return $query->where('tipo', 'saida');
    }

    /** Movimentos originados por vendas (FT/FR) */
    public function scopeVendas($query)
    {
        return $query->where('tipo_movimento', 'venda');
    }

    /** Movimentos originados por notas de crédito (NC) */
    public function scopeNotasCredito($query)
    {
        return $query->where('tipo_movimento', 'nota_credito');
    }

    /** Movimentos originados por documentos fiscais (venda + nota_credito) */
    public function scopeDocumentosFiscais($query)
    {
        return $query->whereIn('tipo_movimento', ['venda', 'nota_credito']);
    }

    /** Ajustes manuais e por cancelamento */
    public function scopeAjustes($query)
    {
        return $query->whereIn('tipo_movimento', ['ajuste', 'venda_cancelada', 'devolucao']);
    }

    /** Movimentos associados a um documento fiscal ou compra específica */
    public function scopePorReferencia($query, string $referenciaId)
    {
        return $query->where('referencia', $referenciaId);
    }

    public function scopeDoPeriodo($query, $inicio, $fim)
    {
        return $query->whereBetween('created_at', [$inicio, $fim]);
    }

    /* =====================================================================
     | ACESSORES
     | ================================================================== */

    /** Valor total do movimento (quantidade × custo) */
    public function getValorTotalAttribute(): float
    {
        return abs($this->quantidade) * ((float) ($this->custo_unitario ?? $this->custo_medio ?? 0));
    }

    /** Tipo formatado para exibição */
    public function getTipoFormatadoAttribute(): string
    {
        return $this->tipo === 'entrada' ? 'Entrada' : 'Saída';
    }

    /** Nome legível do tipo de movimento */
    public function getTipoMovimentoNomeAttribute(): string
    {
        return match ($this->tipo_movimento) {
            'compra'          => 'Compra',
            'venda'           => 'Venda',
            'nota_credito'    => 'Nota de Crédito',
            'ajuste'          => 'Ajuste Manual',
            'venda_cancelada' => 'Cancelamento de Venda',
            'devolucao'       => 'Devolução',
            default           => ucfirst($this->tipo_movimento),
        };
    }

    /** Indica se este movimento foi originado por um documento fiscal */
    public function getEhDocumentoFiscalAttribute(): bool
    {
        return in_array($this->tipo_movimento, ['venda', 'nota_credito']);
    }

    /** Tipo de documento fiscal associado, se aplicável */
    public function getTipoDocumentoFiscalAttribute(): ?string
    {
        return match ($this->tipo_movimento) {
            'venda'        => 'FT/FR',
            'nota_credito' => 'NC',
            default        => null,
        };
    }

    /** Cor para exibição no frontend */
    public function getCorAttribute(): string
    {
        return match ($this->tipo) {
            'entrada' => 'green',
            'saida'   => 'red',
            default   => 'gray',
        };
    }
}