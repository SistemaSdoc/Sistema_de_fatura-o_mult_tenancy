<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class Venda extends Model
{
    protected $table = 'vendas';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'cliente_id',
        'cliente_nome',
        'cliente_nif',
        'user_id',
        'documento_fiscal_id',
        'tipo_documento',
        'serie',
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
    ];

    protected $casts = [
        'data_venda' => 'date',
        'hora_venda' => 'string',
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

    public function documentoFiscal()
    {
        return $this->hasOne(DocumentoFiscal::class, 'venda_id');
    }

    // ================= ESCOPOS =================

    public function scopeVendasValidas($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
        });
    }

    public function scopeFaturas($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FT');
        });
    }

    public function scopeFaturasRecibo($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FR');
        });
    }

    public function scopeFaturasProforma($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FP');
        });
    }

    public function scopeFaturasAdiantamento($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FA');
        });
    }

    public function scopePorEstadoPagamento($query, $estado)
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
        return $query->where('estado_pagamento', 'cancelada');
    }

    public function scopeComRetencao($query)
    {
        return $query->where('total_retencao', '>', 0);
    }

    public function scopeDoPeriodo($query, $inicio, $fim)
    {
        return $query->whereBetween('data_venda', [$inicio, $fim]);
    }

    public function scopeDoCliente($query, $clienteId)
    {
        return $query->where('cliente_id', $clienteId);
    }

    // ================= ACESSORES =================

    public function getEhVendaAttribute(): bool
    {
        if (!$this->documentoFiscal) return false;
        return in_array($this->documentoFiscal->tipo_documento, ['FT', 'FR', 'RC']);
    }

    public function getEhFaturaAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FT';
    }

    public function getEhFaturaReciboAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FR';
    }

    public function getEhFaturaProformaAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FP';
    }

    public function getEhFaturaAdiantamentoAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FA';
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
        if (!$this->documentoFiscal) return false;
        if (!in_array($this->documentoFiscal->tipo_documento, ['FT', 'FA'])) return false;
        if ($this->documentoFiscal->estado === 'cancelado') return false;
        return in_array($this->estado_pagamento, ['pendente', 'parcial']);
    }

    public function getPodeSerCanceladaAttribute(): bool
    {
        if ($this->estado_pagamento === 'cancelada') return false;
        if ($this->estado_pagamento === 'paga') return false;
        return true;
    }

    public function getTipoDocumentoNomeAttribute(): string
    {
        if (!$this->documentoFiscal) return 'Venda';

        return match($this->documentoFiscal->tipo_documento) {
            'FT' => 'Fatura',
            'FR' => 'Fatura-Recibo',
            'RC' => 'Recibo',
            'FP' => 'Fatura Proforma',
            'FA' => 'Fatura de Adiantamento',
            'NC' => 'Nota de Crédito',
            'ND' => 'Nota de Débito',
            'FRt' => 'Fatura de Retificação',
            default => 'Documento',
        };
    }

    public function getTipoDocumentoColorAttribute(): string
    {
        if (!$this->documentoFiscal) return 'gray';

        return match($this->documentoFiscal->tipo_documento) {
            'FT' => 'blue',
            'FR' => 'green',
            'RC' => 'purple',
            'FP' => 'orange',
            'FA' => 'teal',
            'NC' => 'red',
            'ND' => 'amber',
            'FRt' => 'pink',
            default => 'gray',
        };
    }

    public function getEstadoPagamentoColorAttribute(): string
    {
        return match($this->estado_pagamento) {
            'paga' => 'green',
            'parcial' => 'blue',
            'pendente' => 'yellow',
            'cancelada' => 'red',
            default => 'gray',
        };
    }

    public function getNumeroDocumentoAttribute(): string
    {
        if ($this->documentoFiscal) {
            return $this->documentoFiscal->numero_documento;
        }
        return $this->attributes['numero_documento'] ?? sprintf('%s-%04d', $this->serie ?? 'A', $this->numero ?? 0);
    }

    public function getValorPendenteAttribute(): float
    {
        if (!$this->documentoFiscal) {
            return (float) ($this->total_pagar ?? $this->total ?? 0);
        }

        if ($this->documentoFiscal->tipo_documento === 'FP') {
            return (float) $this->documentoFiscal->total_liquido;
        }

        if ($this->documentoFiscal->tipo_documento === 'FA') {
            $totalPago = $this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0;
            return max(0, (float) $this->documentoFiscal->total_liquido - $totalPago);
        }

        if (in_array($this->documentoFiscal->tipo_documento, ['FR', 'RC'])) {
            return 0;
        }

        if ($this->documentoFiscal->tipo_documento === 'FT') {
            $totalPago = $this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0;

            $totalAdiantamentos = DB::table('adiantamento_fatura')
                ->where('fatura_id', $this->documentoFiscal->id)
                ->sum('valor_utilizado');

            return max(0, (float) $this->documentoFiscal->total_liquido - $totalPago - $totalAdiantamentos);
        }

        return 0;
    }

    public function getValorPagoAttribute(): float
    {
        if (!$this->documentoFiscal) {
            return $this->estado_pagamento === 'paga' ? (float) ($this->total_pagar ?? $this->total ?? 0) : 0;
        }

        if (in_array($this->documentoFiscal->tipo_documento, ['FR', 'RC'])) {
            return (float) $this->documentoFiscal->total_liquido;
        }

        if ($this->documentoFiscal->tipo_documento === 'FP') {
            return 0;
        }

        if ($this->documentoFiscal->tipo_documento === 'FA') {
            return (float) ($this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0);
        }

        if ($this->documentoFiscal->tipo_documento === 'FT') {
            return (float) ($this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0);
        }

        return 0;
    }

    public function getNomeClienteAttribute(): ?string
    {
        return $this->cliente?->nome ?? $this->attributes['cliente_nome'] ?? null;
    }

    public function getTemClienteCadastradoAttribute(): bool
    {
        return !is_null($this->cliente_id);
    }

    // ================= MÉTODOS =================

    public function atualizarEstadoPagamento(): void
    {
        if (!$this->documentoFiscal) {
            $this->estado_pagamento = 'pendente';
            $this->save();
            return;
        }

        $estado = match($this->documentoFiscal->tipo_documento) {
            'FR' => 'paga',
            'RC' => 'paga',
            'FP' => 'pendente',
            'FA' => $this->calcularEstadoPagamentoFA(),
            'FT' => $this->calcularEstadoPagamentoFT(),
            default => $this->estado_pagamento,
        };

        if ($estado !== $this->estado_pagamento) {
            $this->estado_pagamento = $estado;
            $this->save();
        }
    }

    private function calcularEstadoPagamentoFA(): string
    {
        $totalPago = $this->documentoFiscal->recibos()
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido') ?? 0;

        $totalDocumento = (float) ($this->documentoFiscal->total_liquido ?? 0);

        if ($totalPago <= 0) return 'pendente';
        if ($totalPago >= $totalDocumento) return 'paga';
        return 'parcial';
    }

    private function calcularEstadoPagamentoFT(): string
    {
        $totalPago = $this->documentoFiscal->recibos()
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido') ?? 0;

        $totalAdiantamentos = DB::table('adiantamento_fatura')
            ->where('fatura_id', $this->documentoFiscal->id)
            ->sum('valor_utilizado');

        $totalPago += $totalAdiantamentos;
        $totalDocumento = (float) ($this->documentoFiscal->total_liquido ?? $this->total ?? 0);

        if ($totalPago <= 0) return 'pendente';
        if ($totalPago >= $totalDocumento) return 'paga';
        return 'parcial';
    }

    public function getResumoAttribute(): array
    {
        return [
            'id' => $this->id,
            'numero_documento' => $this->numero_documento,
            'tipo_documento' => $this->documentoFiscal?->tipo_documento,
            'tipo_documento_nome' => $this->tipo_documento_nome,
            'cliente' => $this->nome_cliente,
            'cliente_nif' => $this->cliente?->nif,
            'data' => $this->data_venda,
            'total' => (float) $this->total,
            'estado_pagamento' => $this->estado_pagamento,
            'estado_pagamento_cor' => $this->estado_pagamento_color,
            'pago' => $this->valor_pago,
            'pendente' => $this->valor_pendente,
            'eh_venda' => $this->eh_venda,
            'pode_receber_pagamento' => $this->pode_receber_pagamento,
        ];
    }
}
