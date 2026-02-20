<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DocumentoFiscal extends Model
{
    protected $table = 'documentos_fiscais';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'venda_id',
        'cliente_id',
        'fatura_id', // Documento de origem (para NC, ND, RC, FRt)

        'serie',
        'numero',
        'numero_documento',

        'tipo_documento', // FT, FR, FA, NC, ND, RC, FRt

        'data_emissao',
        'hora_emissao',
        'data_vencimento',
        'data_cancelamento',

        'base_tributavel',
        'total_iva',
        'total_retencao',
        'total_liquido',

        'estado', // emitido, paga, parcialmente_paga, cancelado, expirado
        'motivo', // Motivo de NC, ND, FRt ou cancelamento
        'motivo_cancelamento',

        'hash_fiscal',
        'referencia_externa',

        // Campos específicos de recibo
        'metodo_pagamento', // transferencia, multibanco, dinheiro, cheque, cartao
        'referencia_pagamento',

        'user_cancelamento_id',
    ];

    protected $casts = [
        'data_emissao' => 'date',
        'data_vencimento' => 'date',
        'data_cancelamento' => 'date',
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

    /* ================= CONSTANTES ================= */

    // Tipos de documento
    const TIPO_FATURA = 'FT';
    const TIPO_FATURA_RECIBO = 'FR';
    const TIPO_FATURA_ADIANTAMENTO = 'FA';
    const TIPO_NOTA_CREDITO = 'NC';
    const TIPO_NOTA_DEBITO = 'ND';
    const TIPO_RECIBO = 'RC';
    const TIPO_FATURA_RETIFICACAO = 'FRt';

    // Estados
    const ESTADO_EMITIDO = 'emitido';
    const ESTADO_PAGA = 'paga';
    const ESTADO_PARCIALMENTE_PAGA = 'parcialmente_paga';
    const ESTADO_CANCELADO = 'cancelado';
    const ESTADO_EXPIRADO = 'expirado';

    /* ================= RELACOES ================= */

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

    /**
     * Documento de origem (para NC, ND, RC, FRt)
     */
    public function documentoOrigem()
    {
        return $this->belongsTo(DocumentoFiscal::class, 'fatura_id');
    }

    /**
     * Documentos derivados deste (notas de crédito, recibos, etc.)
     */
    public function documentosDerivados()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id');
    }

    /**
     * Itens do documento
     */
    public function itens()
    {
        return $this->hasMany(ItemDocumentoFiscal::class, 'documento_fiscal_id');
    }

    /**
     * Recibos associados (para FT)
     */
    public function recibos()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id')
            ->where('tipo_documento', self::TIPO_RECIBO);
    }

    /**
     * Notas de crédito associadas
     */
    public function notasCredito()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id')
            ->where('tipo_documento', self::TIPO_NOTA_CREDITO);
    }

    /**
     * Notas de débito associadas
     */
    public function notasDebito()
    {
        return $this->hasMany(DocumentoFiscal::class, 'fatura_id')
            ->where('tipo_documento', self::TIPO_NOTA_DEBITO);
    }

    /**
     * Faturas de adiantamento associadas (para FT/FR)
     */
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

    /**
     * Faturas a que esta FA está vinculada
     */
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

    /* ================= SCOPES ================= */

    public function scopeDoTipo($query, $tipo)
    {
        return $query->where('tipo_documento', $tipo);
    }

    public function scopeComEstado($query, $estado)
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

    public function scopeVencidos($query)
    {
        return $query->where('data_vencimento', '<', now())
            ->whereIn('estado', [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    /**
     * Faturas de adiantamento pendentes de utilização
     */
    public function scopeAdiantamentosPendentes($query)
    {
        return $query->where('tipo_documento', self::TIPO_FATURA_ADIANTAMENTO)
            ->where('estado', self::ESTADO_EMITIDO);
    }

    /* ================= ACESSORES ================= */

    public function getTipoDocumentoNomeAttribute()
    {
        $nomes = [
            self::TIPO_FATURA => 'Fatura',
            self::TIPO_FATURA_RECIBO => 'Fatura-Recibo',
            self::TIPO_FATURA_ADIANTAMENTO => 'Fatura de Adiantamento',
            self::TIPO_NOTA_CREDITO => 'Nota de Crédito',
            self::TIPO_NOTA_DEBITO => 'Nota de Débito',
            self::TIPO_RECIBO => 'Recibo',
            self::TIPO_FATURA_RETIFICACAO => 'Fatura de Retificação',
        ];

        return $nomes[$this->tipo_documento] ?? 'Desconhecido';
    }

    public function getValorPendenteAttribute()
    {
        if (!in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])) {
            return 0;
        }

        $totalPago = $this->recibos()
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->sum('total_liquido');

        return max(0, $this->total_liquido - $totalPago);
    }

    public function getEstaPagaAttribute()
    {
        return $this->estado === self::ESTADO_PAGA;
    }

    public function getEstaCanceladoAttribute()
    {
        return $this->estado === self::ESTADO_CANCELADO;
    }

    public function getEstaExpiradoAttribute()
    {
        return $this->estado === self::ESTADO_EXPIRADO;
    }

    public function getPodeSerCanceladoAttribute()
    {
        return !in_array($this->estado, [self::ESTADO_CANCELADO, self::ESTADO_EXPIRADO]);
    }

    public function getPodeSerPagaAttribute()
    {
        return $this->tipo_documento === self::TIPO_FATURA
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getPodeGerarReciboAttribute()
    {
        return $this->tipo_documento === self::TIPO_FATURA
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getPodeGerarNotaCreditoAttribute()
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PAGA, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getPodeGerarNotaDebitoAttribute()
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PAGA, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getPodeVincularAdiantamentoAttribute()
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO])
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    /* ================= MÉTODOS ================= */

    /**
     * Verificar se documento é de determinado tipo
     */
    public function eh($tipo)
    {
        return $this->tipo_documento === $tipo;
    }

    /**
     * Verificar se é fatura (FT)
     */
    public function ehFatura()
    {
        return $this->tipo_documento === self::TIPO_FATURA;
    }

    /**
     * Verificar se é fatura-recibo (FR)
     */
    public function ehFaturaRecibo()
    {
        return $this->tipo_documento === self::TIPO_FATURA_RECIBO;
    }

    /**
     * Verificar se é fatura de adiantamento (FA)
     */
    public function ehFaturaAdiantamento()
    {
        return $this->tipo_documento === self::TIPO_FATURA_ADIANTAMENTO;
    }

    /**
     * Verificar se é nota de crédito
     */
    public function ehNotaCredito()
    {
        return $this->tipo_documento === self::TIPO_NOTA_CREDITO;
    }

    /**
     * Verificar se é nota de débito
     */
    public function ehNotaDebito()
    {
        return $this->tipo_documento === self::TIPO_NOTA_DEBITO;
    }

    /**
     * Verificar se é recibo
     */
    public function ehRecibo()
    {
        return $this->tipo_documento === self::TIPO_RECIBO;
    }

    /**
     * Verificar se afeta stock
     */
    public function afetaStock()
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO, self::TIPO_NOTA_CREDITO]);
    }

    /**
     * Verificar se é venda (gera receita)
     */
    public function ehVenda()
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO]);
    }

    /**
     * Marcar como paga
     */
    public function marcarComoPaga()
    {
        $this->update(['estado' => self::ESTADO_PAGA]);
    }

    /**
     * Marcar como parcialmente paga
     */
    public function marcarComoParcialmentePaga()
    {
        $this->update(['estado' => self::ESTADO_PARCIALMENTE_PAGA]);
    }

    /**
     * Marcar como cancelado
     */
    public function marcarComoCancelado($motivo = null, $userId = null)
    {
        $dados = ['estado' => self::ESTADO_CANCELADO];

        if ($motivo) {
            $dados['motivo_cancelamento'] = $motivo;
        }

        if ($userId) {
            $dados['user_cancelamento_id'] = $userId;
        }

        $dados['data_cancelamento'] = now();

        $this->update($dados);
    }

    /**
     * Marcar como expirado
     */
    public function marcarComoExpirado()
    {
        $this->update(['estado' => self::ESTADO_EXPIRADO]);
    }

    /**
     * Verificar se FA está pendente (produtos não entregues e não vinculada)
     */
    public function adiantamentoEstaPendente()
    {
        if (!$this->ehFaturaAdiantamento()) {
            return false;
        }

        return $this->estado === self::ESTADO_EMITIDO
            && $this->faturasVinculadas()->count() === 0;
    }

    /**
     * Verificar se FA está vencida (data de entrega expirada)
     */
    public function adiantamentoEstaVencido()
    {
        if (!$this->ehFaturaAdiantamento()) {
            return false;
        }

        return $this->data_vencimento && $this->data_vencimento->isPast();
    }
}
