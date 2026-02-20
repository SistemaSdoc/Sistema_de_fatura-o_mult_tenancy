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
        'user_id',
        'documento_fiscal_id',
        'total',
        'status',
        'estado_pagamento', // pendente, paga, parcial, cancelada
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
     * FT, FR e RC são os principais documentos de venda
     * FP é proforma (não fiscal), FA é adiantamento (só vira venda com recibo)
     */
    public function documentoFiscal()
    {
        return $this->hasOne(DocumentoFiscal::class, 'venda_id');
    }

    // ================= ESCOPOS =================

    /**
     * Escopo para filtrar apenas documentos de venda válidos (FT, FR, RC)
     */
    public function scopeVendasValidas($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
        });
    }

    /**
     * Escopo para filtrar apenas Faturas (FT)
     */
    public function scopeFaturas($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FT');
        });
    }

    /**
     * Escopo para filtrar apenas Faturas-Recibo (FR)
     */
    public function scopeFaturasRecibo($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FR');
        });
    }

    /**
     * Escopo para filtrar apenas Recibos (RC)
     */
    public function scopeRecibos($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'RC');
        });
    }

    /**
     * Escopo para filtrar apenas Faturas Proforma (FP) - não são vendas fiscais
     */
    public function scopeFaturasProforma($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FP');
        });
    }

    /**
     * Escopo para filtrar apenas Faturas de Adiantamento (FA) - não são vendas até ter recibo
     */
    public function scopeFaturasAdiantamento($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->where('tipo_documento', 'FA');
        });
    }

    /**
     * Escopo para filtrar por estado de pagamento
     */
    public function scopePorEstadoPagamento($query, $estado)
    {
        return $query->where('estado_pagamento', $estado);
    }

    /**
     * Escopo para filtrar vendas pendentes (não pagas)
     */
    public function scopePendentes($query)
    {
        return $query->whereIn('estado_pagamento', ['pendente', 'parcial']);
    }

    /**
     * Escopo para filtrar vendas pagas
     */
    public function scopePagas($query)
    {
        return $query->where('estado_pagamento', 'paga');
    }

    /**
     * Escopo para filtrar vendas canceladas
     */
    public function scopeCanceladas($query)
    {
        return $query->where('estado_pagamento', 'cancelada');
    }

    // ================= ACESSORES =================

    /**
     * Verificar se é um documento de venda válido (FT, FR ou RC)
     */
    public function getEhVendaAttribute(): bool
    {
        if (!$this->documentoFiscal) {
            return false;
        }
        return in_array($this->documentoFiscal->tipo_documento, ['FT', 'FR', 'RC']);
    }

    /**
     * Verificar se é Fatura (FT)
     */
    public function getEhFaturaAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FT';
    }

    /**
     * Verificar se é Fatura-Recibo (FR)
     */
    public function getEhFaturaReciboAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FR';
    }

    /**
     * Verificar se é Recibo (RC)
     */
    public function getEhReciboAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'RC';
    }

    /**
     * Verificar se é Fatura Proforma (FP) - não é venda fiscal
     */
    public function getEhFaturaProformaAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FP';
    }

    /**
     * Verificar se é Fatura de Adiantamento (FA) - só vira venda com recibo
     */
    public function getEhFaturaAdiantamentoAttribute(): bool
    {
        return $this->documentoFiscal && $this->documentoFiscal->tipo_documento === 'FA';
    }

    /**
     * Verificar se está paga
     */
    public function getEstaPagaAttribute(): bool
    {
        return $this->estado_pagamento === 'paga';
    }

    /**
     * Verificar se está pendente
     */
    public function getEstaPendenteAttribute(): bool
    {
        return in_array($this->estado_pagamento, ['pendente', 'parcial']);
    }

    /**
     * Verificar se pode receber pagamento
     * FT e FA podem receber recibo (FA vira venda com recibo)
     */
    public function getPodeReceberPagamentoAttribute(): bool
    {
        if (!$this->documentoFiscal) {
            return false;
        }

        // FT e FA podem receber pagamento via recibo
        if (!in_array($this->documentoFiscal->tipo_documento, ['FT', 'FA'])) {
            return false;
        }

        // Não pode receber pagamento se cancelada
        if ($this->documentoFiscal->estado === 'cancelado') {
            return false;
        }

        return in_array($this->estado_pagamento, ['pendente', 'parcial']);
    }

    /**
     * Verificar se pode ser cancelada
     */
    public function getPodeSerCanceladaAttribute(): bool
    {
        // Se já está cancelada, não pode cancelar novamente
        if ($this->estado_pagamento === 'cancelada') {
            return false;
        }

        // Se está paga, não pode cancelar sem estornar
        if ($this->estado_pagamento === 'paga') {
            return false;
        }

        return true;
    }

    /**
     * Obter o tipo de documento em formato legível
     */
    public function getTipoDocumentoNomeAttribute(): string
    {
        if (!$this->documentoFiscal) {
            return 'Venda';
        }

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

    /**
     * Obter a cor do badge de estado de pagamento
     */
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

    /**
     * Obter a cor do badge do tipo de documento
     */
    public function getTipoDocumentoColorAttribute(): string
    {
        if (!$this->documentoFiscal) {
            return 'gray';
        }

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

    /**
     * Obter o número do documento formatado
     */
    public function getNumeroDocumentoAttribute(): string
    {
        if ($this->documentoFiscal) {
            return $this->documentoFiscal->numero_documento;
        }

        return sprintf('%s-%04d', $this->serie ?? 'A', $this->numero ?? 0);
    }

    /**
     * Obter o valor total pendente
     */
    public function getValorPendenteAttribute(): float
    {
        if (!$this->documentoFiscal) {
            return $this->total_pagar ?? $this->total ?? 0;
        }

        // FP sempre tem valor pendente total
        if ($this->documentoFiscal->tipo_documento === 'FP') {
            return $this->documentoFiscal->total_liquido;
        }

        // FA só tem pendente se não tiver recibos
        if ($this->documentoFiscal->tipo_documento === 'FA') {
            $totalPago = $this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0;
            return max(0, $this->documentoFiscal->total_liquido - $totalPago);
        }

        // FR e RC não têm valor pendente
        if (in_array($this->documentoFiscal->tipo_documento, ['FR', 'RC'])) {
            return 0;
        }

        // FT calcula pendente baseado em recibos
        if ($this->documentoFiscal->tipo_documento === 'FT') {
            $totalPago = $this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0;

            // Considerar adiantamentos vinculados
            $totalAdiantamentos = DB::table('adiantamento_fatura')
                ->where('fatura_id', $this->documentoFiscal->id)
                ->sum('valor_utilizado');

            return max(0, $this->documentoFiscal->total_liquido - $totalPago - $totalAdiantamentos);
        }

        return 0;
    }

    /**
     * Obter o valor já pago
     */
    public function getValorPagoAttribute(): float
    {
        if (!$this->documentoFiscal) {
            return $this->estado_pagamento === 'paga' ? ($this->total_pagar ?? $this->total ?? 0) : 0;
        }

        // FR e RC já estão pagos integralmente
        if (in_array($this->documentoFiscal->tipo_documento, ['FR', 'RC'])) {
            return $this->documentoFiscal->total_liquido;
        }

        // FP nunca tem valor pago
        if ($this->documentoFiscal->tipo_documento === 'FP') {
            return 0;
        }

        // FA pode ter recibos
        if ($this->documentoFiscal->tipo_documento === 'FA') {
            return $this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0;
        }

        // FT calcula baseado em recibos
        if ($this->documentoFiscal->tipo_documento === 'FT') {
            return $this->documentoFiscal->recibos()
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido') ?? 0;
        }

        return 0;
    }

    /**
     * Obter nome do cliente (para cliente avulso, pode ser nulo)
     */
    public function getNomeClienteAttribute(): ?string
    {
        return $this->cliente?->nome;
    }

    /**
     * Verificar se tem cliente cadastrado
     */
    public function getTemClienteCadastradoAttribute(): bool
    {
        return !is_null($this->cliente_id);
    }

    // ================= MUTATORS =================

    /**
     * Definir o estado de pagamento baseado no documento fiscal
     */
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

    /**
     * Calcular estado de pagamento para FA (Fatura de Adiantamento)
     */
    private function calcularEstadoPagamentoFA(): string
    {
        $totalPago = $this->documentoFiscal->recibos()
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido') ?? 0;

        $totalDocumento = $this->documentoFiscal->total_liquido ?? 0;

        if ($totalPago <= 0) {
            return 'pendente';
        }

        if ($totalPago >= $totalDocumento) {
            return 'paga';
        }

        return 'parcial';
    }

    /**
     * Calcular estado de pagamento para FT
     */
    private function calcularEstadoPagamentoFT(): string
    {
        $totalPago = $this->documentoFiscal->recibos()
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido') ?? 0;

        // Considerar adiantamentos vinculados
        $totalAdiantamentos = DB::table('adiantamento_fatura')
            ->where('fatura_id', $this->documentoFiscal->id)
            ->sum('valor_utilizado');

        $totalPago += $totalAdiantamentos;
        $totalDocumento = $this->documentoFiscal->total_liquido ?? $this->total ?? 0;

        if ($totalPago <= 0) {
            return 'pendente';
        }

        if ($totalPago >= $totalDocumento) {
            return 'paga';
        }

        return 'parcial';
    }

    /**
     * Obter resumo da venda para relatórios
     */
    public function getResumoAttribute(): array
    {
        return [
            'id' => $this->id,
            'numero_documento' => $this->numero_documento,
            'tipo_documento' => $this->documentoFiscal?->tipo_documento,
            'tipo_documento_nome' => $this->tipo_documento_nome,
            'cliente' => $this->cliente?->nome ?? 'Cliente Avulso',
            'cliente_nif' => $this->cliente?->nif,
            'data' => $this->data_venda,
            'total' => $this->total,
            'estado_pagamento' => $this->estado_pagamento,
            'estado_pagamento_cor' => $this->estado_pagamento_color,
            'pago' => $this->valor_pago,
            'pendente' => $this->valor_pendente,
            'eh_venda' => $this->eh_venda,
            'pode_receber_pagamento' => $this->pode_receber_pagamento,
        ];
    }
}
