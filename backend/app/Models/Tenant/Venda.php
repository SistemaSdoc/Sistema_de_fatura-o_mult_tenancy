<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Tenant\Cliente;
use App\Models\Tenant\DocumentoFiscal;
use App\Models\Tenant\ItemVenda;
use App\Models\Tenant\User;


/**
 * Model Venda
 *
 * Correcções:
 *  - 'tipo_documento' REMOVIDO do $fillable — a coluna não existe na tabela.
 *    O tipo de documento fiscal está em 'tipo_documento_fiscal'.
 *  - 'serie' REMOVIDO do $fillable — a coluna não existe na tabela.
 *  - SoftDeletes adicionado (a migration tem softDeletes()).
 *  - Adicionados campos desconto_global e troco.
 */
class Venda extends TenantModel
{
    use SoftDeletes;

    protected $table = 'vendas';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id',
        'cliente_id',
        'cliente_nome',
        'cliente_nif',
        'user_id',
        'documento_fiscal_id',
        'numero',
        'numero_documento',
        'base_tributavel',
        'total_iva',
        'total_retencao',
        'total_pagar',
        'total',
        'data_venda',
        'hora_venda',
        'status',
        'estado_pagamento',
        'tipo_documento_fiscal',
        'observacoes',
        // NOVOS CAMPOS
        'desconto_global',
        'troco',
    ];

    protected $casts = [
        'data_venda'      => 'date',
        'hora_venda'      => 'string',
        'total'           => 'decimal:2',
        'total_iva'       => 'decimal:2',
        'total_retencao'  => 'decimal:2',
        'total_pagar'     => 'decimal:2',
        'base_tributavel' => 'decimal:2',
        'desconto_global' => 'decimal:2',
        'troco'           => 'decimal:2',
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

    /* =====================================================================
     | RELAÇÕES
     | ================================================================== */

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

    public function documentoFiscal()
    {
        return $this->hasOne(DocumentoFiscal::class, 'venda_id');
    }

    /* =====================================================================
     | SCOPES
     | ================================================================== */

    public function scopeVendasValidas($query)
    {
        return $query->whereHas('documentoFiscal', fn ($q) =>
            $q->whereIn('tipo_documento', ['FT', 'FR', 'RC'])
        );
    }

    public function scopeFaturas($query)
    {
        return $query->whereHas('documentoFiscal', fn ($q) =>
            $q->where('tipo_documento', 'FT')
        );
    }

    public function scopeFaturasRecibo($query)
    {
        return $query->whereHas('documentoFiscal', fn ($q) =>
            $q->where('tipo_documento', 'FR')
        );
    }

    public function scopeFaturasProforma($query)
    {
        return $query->whereHas('documentoFiscal', fn ($q) =>
            $q->where('tipo_documento', 'FP')
        );
    }

    public function scopeFaturasAdiantamento($query)
    {
        return $query->whereHas('documentoFiscal', fn ($q) =>
            $q->where('tipo_documento', 'FA')
        );
    }

    public function scopePorEstadoPagamento($query, string $estado)
    {
        return $query->where('estado_pagamento', $estado);
    }

    public function scopePendentes($query)
    {
        return $query->whereIn('estado_pagamento', ['pendente', 'parcial']);
    }

    public function scopePagas($query)
    {
        return $query->where('estado_pagamento', 'paga');
    }

    public function scopeCanceladas($query)
    {
        return $query->where('status', 'cancelada');
    }

    public function scopeComRetencao($query)
    {
        return $query->where('total_retencao', '>', 0);
    }

    public function scopeDoPeriodo($query, $inicio, $fim)
    {
        return $query->whereBetween('data_venda', [$inicio, $fim]);
    }

    public function scopeDoCliente($query, string $clienteId)
    {
        return $query->where('cliente_id', $clienteId);
    }

    /* =====================================================================
     | ACESSORES
     | ================================================================== */

    /**
     * Número de documento para exibição.
     * Prioridade: número fiscal do DocumentoFiscal > número interno da venda.
     */
    public function getNumeroDocumentoAttribute(): string
    {
        if ($this->documentoFiscal) {
            return $this->documentoFiscal->numero_documento;
        }

        return $this->attributes['numero_documento']
            ?? sprintf('VD-%06d', $this->numero ?? 0);
    }

    /**
     * Tipo de documento para exibição.
     * Lê do DocumentoFiscal se existir, caso contrário usa tipo_documento_fiscal.
     */
    public function getTipoDocumentoAttribute(): string
    {
        return $this->documentoFiscal?->tipo_documento
            ?? $this->tipo_documento_fiscal
            ?? 'venda';
    }

    public function getEhVendaAttribute(): bool
    {
        return $this->documentoFiscal
            && in_array($this->documentoFiscal->tipo_documento, ['FT', 'FR', 'RC']);
    }

    public function getEhFaturaAttribute(): bool
    {
        return $this->documentoFiscal?->tipo_documento === 'FT';
    }

    public function getEhFaturaReciboAttribute(): bool
    {
        return $this->documentoFiscal?->tipo_documento === 'FR';
    }

    public function getEhFaturaProformaAttribute(): bool
    {
        return $this->documentoFiscal?->tipo_documento === 'FP';
    }

    public function getEhFaturaAdiantamentoAttribute(): bool
    {
        return $this->documentoFiscal?->tipo_documento === 'FA';
    }

    public function getEstaPagaAttribute(): bool
    {
        return $this->estado_pagamento === 'paga';
    }

    public function getEstaPendenteAttribute(): bool
    {
        return in_array($this->estado_pagamento, ['pendente', 'parcial']);
    }

    public function getPodeReceberPagamentoAttribute(): bool
    {
        if (! $this->documentoFiscal) return false;
        if (! in_array($this->documentoFiscal->tipo_documento, ['FT', 'FA'])) return false;
        if ($this->documentoFiscal->estado === DocumentoFiscal::ESTADO_CANCELADO) return false;
        return in_array($this->estado_pagamento, ['pendente', 'parcial']);
    }

    public function getPodeSerCanceladaAttribute(): bool
    {
        return ! in_array($this->estado_pagamento, ['cancelada', 'paga']);
    }

    public function getTipoDocumentoNomeAttribute(): string
    {
        return match ($this->documentoFiscal?->tipo_documento ?? $this->tipo_documento_fiscal) {
            'FT'  => 'Fatura',
            'FR'  => 'Fatura-Recibo',
            'RC'  => 'Recibo',
            'FP'  => 'Fatura Proforma',
            'FA'  => 'Fatura de Adiantamento',
            'NC'  => 'Nota de Crédito',
            'ND'  => 'Nota de Débito',
            'FRt' => 'Fatura de Retificação',
            default => 'Venda',
        };
    }

    public function getNomeClienteAttribute(): ?string
    {
        return $this->cliente?->nome ?? $this->attributes['cliente_nome'] ?? null;
    }

    public function getTemClienteCadastradoAttribute(): bool
    {
        return ! is_null($this->cliente_id);
    }

    public function getValorPendenteAttribute(): float
    {
        if (! $this->documentoFiscal) {
            return (float) ($this->total_pagar ?? $this->total ?? 0);
        }

        $df = $this->documentoFiscal;

        return match ($df->tipo_documento) {
            'FR', 'RC' => 0.0,
            'FP'       => (float) $df->total_liquido,
            'FA', 'FT' => max(0.0, (float) $df->total_liquido - $this->getValorPagoAttribute()),
            default    => 0.0,
        };
    }

    public function getValorPagoAttribute(): float
    {
        if (! $this->documentoFiscal) {
            return $this->estado_pagamento === 'paga'
                ? (float) ($this->total_pagar ?? $this->total ?? 0)
                : 0.0;
        }

        $df = $this->documentoFiscal;

        if (in_array($df->tipo_documento, ['FR', 'RC'])) {
            return (float) $df->total_liquido;
        }

        if ($df->tipo_documento === 'FP') return 0.0;

        if ($df->relationLoaded('recibos')) {
            return (float) $df->recibos
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_liquido');
        }

        return (float) $df->recibos()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');
    }

    /* =====================================================================
     | MÉTODOS
     | ================================================================== */

    public function atualizarEstadoPagamento(): void
    {
        if (! $this->documentoFiscal) {
            $this->update(['estado_pagamento' => 'pendente']);
            return;
        }

        $estado = match ($this->documentoFiscal->tipo_documento) {
            'FR', 'RC' => 'paga',
            'FP'       => 'pendente',
            default    => match ($this->documentoFiscal->estado) {
                DocumentoFiscal::ESTADO_PAGA              => 'paga',
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA => 'parcial',
                DocumentoFiscal::ESTADO_CANCELADO         => 'cancelada',
                default                                   => 'pendente',
            },
        };

        if ($estado !== $this->estado_pagamento) {
            $this->update(['estado_pagamento' => $estado]);
        }
    }

    public function getResumoAttribute(): array
    {
        return [
            'id'                     => $this->id,
            'numero_documento'       => $this->numero_documento,
            'tipo_documento'         => $this->tipo_documento,
            'tipo_documento_nome'    => $this->tipo_documento_nome,
            'cliente'                => $this->nome_cliente,
            'cliente_nif'            => $this->cliente?->nif ?? $this->cliente_nif,
            'data'                   => $this->data_venda,
            'total'                  => (float) $this->total,
            'total_retencao'         => (float) $this->total_retencao,
            'estado_pagamento'       => $this->estado_pagamento,
            'pago'                   => $this->valor_pago,
            'pendente'               => $this->valor_pendente,
            'eh_venda'               => $this->eh_venda,
            'pode_receber_pagamento' => $this->pode_receber_pagamento,
            'desconto_global'        => (float) ($this->desconto_global ?? 0),
            'troco'                  => (float) ($this->troco ?? 0),
        ];
    }
}