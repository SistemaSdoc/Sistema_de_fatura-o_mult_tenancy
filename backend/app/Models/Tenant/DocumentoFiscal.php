<?php

namespace App\Models\Tenant;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

/**
 * Model DocumentoFiscal
 *
 * Alterações AGT:
 *  - $fillable actualizado com os novos campos: rsa_assinatura, rsa_versao_chave,
 *    qr_code, hash_anterior (adicionados pelo DocumentoFiscalService)
 *  - $casts actualizado para os mesmos campos
 *  - Boot: removida a recalculação automática de total_retencao em saved()
 *    (causava queries extras e pode sobrescrever o valor calculado pelo service)
 *  - Acessores: apenas leitura de atributos já carregados, sem queries adicionais
 *  - Métodos de estado: mutações simples, sem lógica de negócio (que está no service)
 *  - retencao renomeada para taxa_retencao nos fillable (consistência com o service)
 */
class DocumentoFiscal extends TenantModel
{
    protected $table = 'documentos_fiscais';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'venda_id',
        'cliente_id',
        'cliente_nome',
        'cliente_nif',
        'fatura_id',
        'serie',
        'numero',
        'numero_documento',
        'tipo_documento',
        'data_emissao',
        'hora_emissao',
        'data_vencimento',
        'data_cancelamento',
        'base_tributavel',
        'total_iva',
        'total_retencao',
        'total_liquido',
        'estado',
        'motivo',
        'motivo_cancelamento',
        // AGT: campos de assinatura e integridade — imutáveis após emissão
        'hash_fiscal',
        'hash_anterior',
        'rsa_assinatura',
        'rsa_versao_chave',
        'qr_code',
        // Outros
        'referencia_externa',
        'metodo_pagamento',
        'referencia_pagamento',
        'user_cancelamento_id',
    ];

    protected $casts = [
        'data_emissao'      => 'date',
        'data_vencimento'   => 'date',
        'data_cancelamento' => 'date',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
        'base_tributavel'   => 'decimal:2',
        'total_iva'         => 'decimal:2',
        'total_retencao'    => 'decimal:2',
        'total_liquido'     => 'decimal:2',
        'rsa_versao_chave'  => 'integer',
    ];

    /* =====================================================================
     | CONSTANTES
     | ================================================================== */

    const TIPO_FATURA              = 'FT';
    const TIPO_FATURA_RECIBO       = 'FR';
    const TIPO_FATURA_PROFORMA     = 'FP';
    const TIPO_FATURA_ADIANTAMENTO = 'FA';
    const TIPO_NOTA_CREDITO        = 'NC';
    const TIPO_NOTA_DEBITO         = 'ND';
    const TIPO_RECIBO              = 'RC';
    const TIPO_FATURA_RETIFICACAO  = 'FRt';

    const ESTADO_EMITIDO           = 'emitido';
    const ESTADO_PAGA              = 'paga';
    const ESTADO_PARCIALMENTE_PAGA = 'parcialmente_paga';
    const ESTADO_CANCELADO         = 'cancelado';
    const ESTADO_EXPIRADO          = 'expirado';

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

        // NOTA: a recalculação automática de total_retencao em saved() foi
        // removida — o DocumentoFiscalService calcula e persiste correctamente
        // os totais na criação. Recalcular no evento saved() causava queries
        // extras e podia sobrescrever o valor já correcto.
    }

    /* =====================================================================
     | RELAÇÕES
     | ================================================================== */

    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function userCancelamento()
    {
        return $this->belongsTo(User::class, 'user_cancelamento_id');
    }

    /** Documento de origem — para NC, ND, RC, FRt */
    public function documentoOrigem()
    {
        return $this->belongsTo(DocumentoFiscal::class, 'fatura_id');
    }

    /** Documentos derivados deste (NC, ND, RC, FRt) */
    public function documentosDerivados()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id');
    }

    /** Itens do documento */
    public function itens()
    {
        return $this->hasMany(ItemDocumentoFiscal::class, 'documento_fiscal_id');
    }

    /** Recibos associados — apenas para FT e FA */
    public function recibos()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id')
            ->where('tipo_documento', self::TIPO_RECIBO);
    }

    /** Notas de crédito associadas */
    public function notasCredito()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id')
            ->where('tipo_documento', self::TIPO_NOTA_CREDITO);
    }

    /** Notas de débito associadas */
    public function notasDebito()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id')
            ->where('tipo_documento', self::TIPO_NOTA_DEBITO);
    }

    /** Faturas de adiantamento vinculadas a esta FT */
    public function faturasAdiantamento()
    {
        return $this->belongsToMany(
            DocumentoFiscal::class,
            'adiantamento_fatura',
            'fatura_id',
            'adiantamento_id'
        )
            ->where('tipo_documento', self::TIPO_FATURA_ADIANTAMENTO)
            ->withPivot('valor_utilizado')
            ->withTimestamps();
    }

    /** Faturas a que esta FA está vinculada */
    public function faturasVinculadas()
    {
        return $this->belongsToMany(
            DocumentoFiscal::class,
            'adiantamento_fatura',
            'adiantamento_id',
            'fatura_id'
        )
            ->whereIn('tipo_documento', [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])
            ->withPivot('valor_utilizado')
            ->withTimestamps();
    }

    /* =====================================================================
     | SCOPES
     | ================================================================== */

    public function scopeDoTipo($query, string $tipo)
    {
        return $query->where('tipo_documento', $tipo);
    }

    public function scopeComEstado($query, string $estado)
    {
        return $query->where('estado', $estado);
    }

    public function scopeEmitidos($query)
    {
        return $query->where('estado', self::ESTADO_EMITIDO);
    }

    public function scopePagas($query)
    {
        return $query->where('estado', self::ESTADO_PAGA);
    }

    public function scopeParcialmentePagas($query)
    {
        return $query->where('estado', self::ESTADO_PARCIALMENTE_PAGA);
    }

    public function scopeCancelados($query)
    {
        return $query->where('estado', self::ESTADO_CANCELADO);
    }

    public function scopeExpirados($query)
    {
        return $query->where('estado', self::ESTADO_EXPIRADO);
    }

    public function scopePendentes($query)
    {
        return $query->whereIn('estado', [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function scopeFaturas($query)
    {
        return $query->whereIn('tipo_documento', [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO]);
    }

    public function scopeVendas($query)
    {
        return $query->whereIn('tipo_documento', [
            self::TIPO_FATURA,
            self::TIPO_FATURA_RECIBO,
            self::TIPO_RECIBO,
        ]);
    }

    public function scopeNaoVendas($query)
    {
        return $query->whereIn('tipo_documento', [
            self::TIPO_FATURA_PROFORMA,
            self::TIPO_FATURA_ADIANTAMENTO,
            self::TIPO_NOTA_CREDITO,
            self::TIPO_NOTA_DEBITO,
            self::TIPO_FATURA_RETIFICACAO,
        ]);
    }

    public function scopeVencidos($query)
    {
        return $query->where('data_vencimento', '<', now())
            ->whereIn('estado', [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function scopeComRetencao($query)
    {
        return $query->where('total_retencao', '>', 0);
    }

    public function scopeSemRetencao($query)
    {
        return $query->where('total_retencao', 0);
    }

    public function scopeAdiantamentosPendentes($query)
    {
        return $query->where('tipo_documento', self::TIPO_FATURA_ADIANTAMENTO)
            ->where('estado', self::ESTADO_EMITIDO);
    }

    public function scopeProformasPendentes($query)
    {
        return $query->where('tipo_documento', self::TIPO_FATURA_PROFORMA)
            ->where('estado', self::ESTADO_EMITIDO);
    }

    /* =====================================================================
     | ACESSORES — leitura de atributos já carregados, sem queries extras
     | ================================================================== */

    public function getTipoDocumentoNomeAttribute(): string
    {
        return [
            self::TIPO_FATURA              => 'Fatura',
            self::TIPO_FATURA_RECIBO       => 'Fatura-Recibo',
            self::TIPO_FATURA_PROFORMA     => 'Fatura Proforma',
            self::TIPO_FATURA_ADIANTAMENTO => 'Fatura de Adiantamento',
            self::TIPO_NOTA_CREDITO        => 'Nota de Crédito',
            self::TIPO_NOTA_DEBITO         => 'Nota de Débito',
            self::TIPO_RECIBO              => 'Recibo',
            self::TIPO_FATURA_RETIFICACAO  => 'Fatura de Retificação',
        ][$this->tipo_documento] ?? 'Desconhecido';
    }

    public function getNomeClienteAttribute(): ?string
    {
        return $this->cliente?->nome ?? $this->cliente_nome;
    }

    public function getNifClienteAttribute(): ?string
    {
        return $this->cliente?->nif ?? $this->cliente_nif;
    }

    public function getTemClienteCadastradoAttribute(): bool
    {
        return ! is_null($this->cliente_id);
    }

    public function getEhVendaAttribute(): bool
    {
        return in_array($this->tipo_documento, [
            self::TIPO_FATURA,
            self::TIPO_FATURA_RECIBO,
            self::TIPO_RECIBO,
        ]);
    }

    public function getEstaPagaAttribute(): bool
    {
        return $this->estado === self::ESTADO_PAGA;
    }

    public function getEstaCanceladoAttribute(): bool
    {
        return $this->estado === self::ESTADO_CANCELADO;
    }

    public function getEstaExpiradoAttribute(): bool
    {
        return $this->estado === self::ESTADO_EXPIRADO;
    }

    public function getPodeSerCanceladoAttribute(): bool
    {
        return ! in_array($this->estado, [self::ESTADO_CANCELADO, self::ESTADO_EXPIRADO]);
    }

    public function getPodeSerPagaAttribute(): bool
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_ADIANTAMENTO])
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getPodeGerarReciboAttribute(): bool
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_ADIANTAMENTO])
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getPodeGerarNotaCreditoAttribute(): bool
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])
            && in_array($this->estado, [
                self::ESTADO_EMITIDO,
                self::ESTADO_PAGA,
                self::ESTADO_PARCIALMENTE_PAGA,
            ]);
    }

    public function getPodeGerarNotaDebitoAttribute(): bool
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])
            && in_array($this->estado, [
                self::ESTADO_EMITIDO,
                self::ESTADO_PAGA,
                self::ESTADO_PARCIALMENTE_PAGA,
            ]);
    }

    public function getPodeVincularAdiantamentoAttribute(): bool
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getCorEstadoAttribute(): string
    {
        return match ($this->estado) {
            self::ESTADO_EMITIDO           => 'blue',
            self::ESTADO_PAGA              => 'green',
            self::ESTADO_PARCIALMENTE_PAGA => 'yellow',
            self::ESTADO_CANCELADO         => 'red',
            self::ESTADO_EXPIRADO          => 'gray',
            default                        => 'gray',
        };
    }

    public function getCorTipoAttribute(): string
    {
        return match ($this->tipo_documento) {
            self::TIPO_FATURA              => 'blue',
            self::TIPO_FATURA_RECIBO       => 'green',
            self::TIPO_FATURA_PROFORMA     => 'orange',
            self::TIPO_FATURA_ADIANTAMENTO => 'purple',
            self::TIPO_NOTA_CREDITO        => 'red',
            self::TIPO_NOTA_DEBITO         => 'amber',
            self::TIPO_RECIBO              => 'teal',
            self::TIPO_FATURA_RETIFICACAO  => 'pink',
            default                        => 'gray',
        };
    }

    /** Percentual médio de retenção — calculado a partir dos valores já persistidos */
    public function getPercentualRetencaoAttribute(): float
    {
        if ((float) $this->base_tributavel <= 0) {
            return 0.0;
        }

        return round(((float) $this->total_retencao / (float) $this->base_tributavel) * 100, 2);
    }

    /** Resumo para relatórios — usa apenas atributos já presentes no modelo */
    public function getResumoAttribute(): array
    {
        return [
            'id'                  => $this->id,
            'numero'              => $this->numero_documento,
            'tipo'                => $this->tipo_documento,
            'tipo_nome'           => $this->tipo_documento_nome,
            'cliente'             => $this->nome_cliente,
            'data'                => $this->data_emissao,
            'total'               => $this->total_liquido,
            'retencao'            => $this->total_retencao,
            'percentual_retencao' => $this->percentual_retencao,
            'estado'              => $this->estado,
            // AGT: campos de auditoria
            'hash_fiscal'         => $this->hash_fiscal,
            'qr_code'             => $this->qr_code,
        ];
    }

    /* =====================================================================
     | MÉTODOS DE ESTADO — mutações simples, sem lógica de negócio
     | A lógica de negócio (validações, derivados, etc.) está no service.
     | ================================================================== */

    public function marcarComoPaga(): void
    {
        $this->update(['estado' => self::ESTADO_PAGA]);
    }

    public function marcarComoParcialmentePaga(): void
    {
        $this->update(['estado' => self::ESTADO_PARCIALMENTE_PAGA]);
    }

    /**
     * AGT: cancelamento lógico — hash_fiscal, rsa_assinatura e qr_code
     * são preservados e NUNCA actualizados após emissão.
     */
    public function marcarComoCancelado(?string $motivo = null, ?string $userId = null): void
    {
        $this->update(array_filter([
            'estado'               => self::ESTADO_CANCELADO,
            'motivo_cancelamento'  => $motivo,
            'user_cancelamento_id' => $userId,
            'data_cancelamento'    => now(),
        ]));
    }

    public function marcarComoExpirado(): void
    {
        $this->update(['estado' => self::ESTADO_EXPIRADO]);
    }

    /* =====================================================================
     | MÉTODOS DE VERIFICAÇÃO — sem queries
     | ================================================================== */

    public function eh(string $tipo): bool
    {
        return $this->tipo_documento === $tipo;
    }

    public function ehFatura(): bool            { return $this->tipo_documento === self::TIPO_FATURA; }
    public function ehFaturaRecibo(): bool       { return $this->tipo_documento === self::TIPO_FATURA_RECIBO; }
    public function ehFaturaProforma(): bool     { return $this->tipo_documento === self::TIPO_FATURA_PROFORMA; }
    public function ehFaturaAdiantamento(): bool { return $this->tipo_documento === self::TIPO_FATURA_ADIANTAMENTO; }
    public function ehNotaCredito(): bool        { return $this->tipo_documento === self::TIPO_NOTA_CREDITO; }
    public function ehNotaDebito(): bool         { return $this->tipo_documento === self::TIPO_NOTA_DEBITO; }
    public function ehRecibo(): bool             { return $this->tipo_documento === self::TIPO_RECIBO; }
    public function ehFaturaRetificacao(): bool  { return $this->tipo_documento === self::TIPO_FATURA_RETIFICACAO; }

    public function ehVenda(): bool
    {
        return in_array($this->tipo_documento, [
            self::TIPO_FATURA,
            self::TIPO_FATURA_RECIBO,
            self::TIPO_RECIBO,
        ]);
    }

    public function afetaStock(): bool
    {
        return in_array($this->tipo_documento, [
            self::TIPO_FATURA,
            self::TIPO_FATURA_RECIBO,
            self::TIPO_NOTA_CREDITO,
        ]);
    }

    public function temRetencaoServicos(): bool
    {
        return (float) $this->total_retencao > 0;
    }

    public function adiantamentoEstaPendente(): bool
    {
        if (! $this->ehFaturaAdiantamento()) {
            return false;
        }

        return $this->estado === self::ESTADO_EMITIDO
            && $this->faturasVinculadas()->count() === 0;
    }

    public function adiantamentoEstaVencido(): bool
    {
        if (! $this->ehFaturaAdiantamento()) {
            return false;
        }

        return $this->data_vencimento && $this->data_vencimento->isPast();
    }

    /* =====================================================================
     | MÉTODOS ESTÁTICOS — agregações para relatórios
     | ================================================================== */

    public static function totalRetencaoNoPeriodo($inicio, $fim): float
    {
        return (float) self::whereBetween('data_emissao', [$inicio, $fim])
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->sum('total_retencao');
    }

    public static function retencaoPorMes(?int $ano = null): \Illuminate\Support\Collection
    {
        $ano = $ano ?? now()->year;

        return self::select(
            DB::raw('MONTH(data_emissao) as mes'),
            DB::raw('SUM(total_retencao) as total')
        )
            ->whereYear('data_emissao', $ano)
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->groupBy(DB::raw('MONTH(data_emissao)'))
            ->orderBy('mes')
            ->get();
    }

    /**
     * Dados para converter uma FP em FT — devolve array para o service usar.
     * A conversão efectiva é feita pelo DocumentoFiscalService::emitirDocumento().
     */
    public function converterParaFatura(?array $dadosPagamento = null): array
    {
        if (! $this->ehFaturaProforma()) {
            throw new \InvalidArgumentException('Apenas Faturas Proforma (FP) podem ser convertidas.');
        }

        if ($this->estado === self::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException('Não é possível converter uma proforma cancelada.');
        }

        return [
            'tipo_documento'  => self::TIPO_FATURA,
            'cliente_id'      => $this->cliente_id,
            'cliente_nome'    => $this->cliente_nome,
            'cliente_nif'     => $this->cliente_nif,
            'itens'           => $this->itens->map(fn ($item) => [
                'produto_id'     => $item->produto_id,
                'descricao'      => $item->descricao,
                'quantidade'     => $item->quantidade,
                'preco_venda'    => $item->preco_unitario,
                'desconto'       => $item->desconto,
                'taxa_iva'       => $item->taxa_iva,
                'codigo_isencao' => $item->codigo_isencao,
            ])->toArray(),
            'dados_pagamento' => $dadosPagamento,
        ];
    }
}