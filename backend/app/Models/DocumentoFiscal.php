<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

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
        'cliente_nome', // Para cliente avulso
        'cliente_nif',  // Para cliente avulso
        'fatura_id', // Documento de origem (para NC, ND, RC, FRt)

        'serie',
        'numero',
        'numero_documento',

        'tipo_documento', // FT, FR, FP, FA, NC, ND, RC, FRt

        'data_emissao',
        'hora_emissao',
        'data_vencimento',
        'data_cancelamento',

        'base_tributavel',
        'total_iva',
        'total_retencao', // Soma das retenções de serviços
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
        'base_tributavel' => 'decimal:2',
        'total_iva' => 'decimal:2',
        'total_retencao' => 'decimal:2',
        'total_liquido' => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });

        // ✅ NOVO: Atualizar total_retencao quando itens são salvos
        static::saved(function ($model) {
            if ($model->itens()->exists()) {
                $retencaoTotal = $model->itens->sum('valor_retencao');
                if ($retencaoTotal != $model->total_retencao) {
                    $model->updateQuietly(['total_retencao' => $retencaoTotal]);
                }
            }
        });
    }

    /* ================= CONSTANTES ================= */

    // Tipos de documento
    const TIPO_FATURA = 'FT';
    const TIPO_FATURA_RECIBO = 'FR';
    const TIPO_FATURA_PROFORMA = 'FP';
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
     * Recibos associados (para FT e FA)
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

    public function scopeVendas($query)
    {
        return $query->whereIn('tipo_documento', [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO, self::TIPO_RECIBO]);
    }

    public function scopeNaoVendas($query)
    {
        return $query->whereIn('tipo_documento', [
            self::TIPO_FATURA_PROFORMA,
            self::TIPO_FATURA_ADIANTAMENTO,
            self::TIPO_NOTA_CREDITO,
            self::TIPO_NOTA_DEBITO,
            self::TIPO_FATURA_RETIFICACAO
        ]);
    }

    public function scopeVencidos($query)
    {
        return $query->where('data_vencimento', '<', now())
            ->whereIn('estado', [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    /**
     * ✅ NOVO: Documentos com retenção de serviços
     */
    public function scopeComRetencao($query)
    {
        return $query->where('total_retencao', '>', 0);
    }

    /**
     * ✅ NOVO: Documentos sem retenção
     */
    public function scopeSemRetencao($query)
    {
        return $query->where('total_retencao', 0);
    }

    /**
     * Faturas de adiantamento pendentes de utilização
     */
    public function scopeAdiantamentosPendentes($query)
    {
        return $query->where('tipo_documento', self::TIPO_FATURA_ADIANTAMENTO)
            ->where('estado', self::ESTADO_EMITIDO);
    }

    /**
     * Faturas proforma pendentes
     */
    public function scopeProformasPendentes($query)
    {
        return $query->where('tipo_documento', self::TIPO_FATURA_PROFORMA)
            ->where('estado', self::ESTADO_EMITIDO);
    }

    /* ================= ACESSORES ================= */

    public function getTipoDocumentoNomeAttribute()
    {
        $nomes = [
            self::TIPO_FATURA => 'Fatura',
            self::TIPO_FATURA_RECIBO => 'Fatura-Recibo',
            self::TIPO_FATURA_PROFORMA => 'Fatura Proforma',
            self::TIPO_FATURA_ADIANTAMENTO => 'Fatura de Adiantamento',
            self::TIPO_NOTA_CREDITO => 'Nota de Crédito',
            self::TIPO_NOTA_DEBITO => 'Nota de Débito',
            self::TIPO_RECIBO => 'Recibo',
            self::TIPO_FATURA_RETIFICACAO => 'Fatura de Retificação',
        ];

        return $nomes[$this->tipo_documento] ?? 'Desconhecido';
    }

    public function getNomeClienteAttribute(): ?string
    {
        if ($this->cliente) {
            return $this->cliente->nome;
        }
        return $this->cliente_nome;
    }

    public function getNifClienteAttribute(): ?string
    {
        if ($this->cliente) {
            return $this->cliente->nif;
        }
        return $this->cliente_nif;
    }

    public function getTemClienteCadastradoAttribute(): bool
    {
        return !is_null($this->cliente_id);
    }

    /**
     * ✅ Calcular retenção total (soma das retenções dos serviços)
     */
    public function getTotalRetencaoCalculadoAttribute(): float
    {
        return $this->itens->sum(function ($item) {
            if ($item->produto && $item->produto->isServico()) {
                return $item->valor_retencao ?? 0;
            }
            return 0;
        });
    }

    /**
     * ✅ Verificar se documento tem serviços com retenção
     */
    public function getTemServicosComRetencaoAttribute(): bool
    {
        return $this->itens->contains(function ($item) {
            return $item->produto &&
                   $item->produto->isServico() &&
                   ($item->valor_retencao ?? 0) > 0;
        });
    }

    /**
     * ✅ Listar serviços com retenção
     */
    public function getServicosComRetencaoAttribute()
    {
        return $this->itens->filter(function ($item) {
            return $item->produto &&
                   $item->produto->isServico() &&
                   ($item->valor_retencao ?? 0) > 0;
        })->values();
    }

    /**
     * ✅ Total líquido após retenções (já é o total_liquido)
     */
    public function getTotalLiquidoAposRetencoesAttribute(): float
    {
        return $this->total_liquido;
    }

    /**
     * ✅ Valor base antes do IVA e retenções
     */
    public function getBaseTributavelLiquidaAttribute(): float
    {
        return $this->base_tributavel;
    }

    /**
     * ✅ Percentual médio de retenção do documento
     */
    public function getPercentualRetencaoAttribute(): float
    {
        if ($this->base_tributavel <= 0) return 0;
        return round(($this->total_retencao / $this->base_tributavel) * 100, 2);
    }

    /**
     * ✅ Resumo para relatórios
     */
    public function getResumoAttribute(): array
    {
        return [
            'id' => $this->id,
            'numero' => $this->numero_documento,
            'tipo' => $this->tipo_documento,
            'tipo_nome' => $this->tipo_documento_nome,
            'cliente' => $this->nome_cliente,
            'data' => $this->data_emissao,
            'total' => $this->total_liquido,
            'retencao' => $this->total_retencao,
            'percentual_retencao' => $this->percentual_retencao,
            'tem_servicos' => $this->tem_servicos_com_retencao,
            'estado' => $this->estado,
        ];
    }

    public function getValorPendenteAttribute()
    {
        if (!in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_ADIANTAMENTO])) {
            return 0;
        }

        $totalPago = $this->recibos()
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->sum('total_liquido');

        if ($this->tipo_documento === self::TIPO_FATURA) {
            $totalAdiantamentos = DB::table('adiantamento_fatura')
                ->where('fatura_id', $this->id)
                ->sum('valor_utilizado');
            return max(0, $this->total_liquido - $totalPago - $totalAdiantamentos);
        }

        return max(0, $this->total_liquido - $totalPago);
    }

    public function getValorPagoAttribute()
    {
        if (in_array($this->tipo_documento, [self::TIPO_FATURA_RECIBO, self::TIPO_RECIBO])) {
            return $this->total_liquido;
        }

        if ($this->tipo_documento === self::TIPO_FATURA_PROFORMA) {
            return 0;
        }

        return $this->recibos()
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->sum('total_liquido');
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
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_ADIANTAMENTO])
            && in_array($this->estado, [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
    }

    public function getPodeGerarReciboAttribute()
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_ADIANTAMENTO])
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

    public function getEhVendaAttribute(): bool
    {
        return in_array($this->tipo_documento, [self::TIPO_FATURA, self::TIPO_FATURA_RECIBO, self::TIPO_RECIBO]);
    }

    public function getCorEstadoAttribute(): string
    {
        return match($this->estado) {
            self::ESTADO_EMITIDO => 'blue',
            self::ESTADO_PAGA => 'green',
            self::ESTADO_PARCIALMENTE_PAGA => 'yellow',
            self::ESTADO_CANCELADO => 'red',
            self::ESTADO_EXPIRADO => 'gray',
            default => 'gray',
        };
    }

    public function getCorTipoAttribute(): string
    {
        return match($this->tipo_documento) {
            self::TIPO_FATURA => 'blue',
            self::TIPO_FATURA_RECIBO => 'green',
            self::TIPO_FATURA_PROFORMA => 'orange',
            self::TIPO_FATURA_ADIANTAMENTO => 'purple',
            self::TIPO_NOTA_CREDITO => 'red',
            self::TIPO_NOTA_DEBITO => 'amber',
            self::TIPO_RECIBO => 'teal',
            self::TIPO_FATURA_RETIFICACAO => 'pink',
            default => 'gray',
        };
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
     * Verificar se é fatura proforma (FP)
     */
    public function ehFaturaProforma()
    {
        return $this->tipo_documento === self::TIPO_FATURA_PROFORMA;
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
     * Verificar se é fatura de retificação
     */
    public function ehFaturaRetificacao()
    {
        return $this->tipo_documento === self::TIPO_FATURA_RETIFICACAO;
    }

    /**
     * Verificar se afeta stock
     * ATUALIZADO: FP não afeta stock (proforma)
     */
    public function afetaStock()
    {
        return in_array($this->tipo_documento, [
            self::TIPO_FATURA,
            self::TIPO_FATURA_RECIBO,
            self::TIPO_NOTA_CREDITO
        ]);
    }

    /**
     * Verificar se tem retenção de serviços
     */
    public function temRetencaoServicos(): bool
    {
        return $this->total_retencao > 0;
    }

    /**
     * Calcular base tributável excluindo retenções
     */
    public function calcularBaseTributavelLiquida(): float
    {
        return $this->base_tributavel;
    }

    /**
     * Verificar se é venda (gera receita)
     */
    public function ehVenda()
    {
        return in_array($this->tipo_documento, [
            self::TIPO_FATURA,
            self::TIPO_FATURA_RECIBO,
            self::TIPO_RECIBO
        ]);
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

    /**
     * ✅ NOVO: Obter total de retenção por período
     */
    public static function totalRetencaoNoPeriodo($inicio, $fim): float
    {
        return self::whereBetween('data_emissao', [$inicio, $fim])
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->sum('total_retencao');
    }

    /**
     * ✅ NOVO: Agrupar retenções por mês
     */
    public static function retencaoPorMes($ano = null)
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
     * Converter FP para FT (gerar nova fatura)
     */
    public function converterParaFatura(array $dadosPagamento = null)
    {
        if (!$this->ehFaturaProforma()) {
            throw new \Exception("Apenas Faturas Proforma (FP) podem ser convertidas.");
        }

        if ($this->estado === self::ESTADO_CANCELADO) {
            throw new \Exception("Não é possível converter uma proforma cancelada.");
        }

        // Retorna dados para criar a FT
        return [
            'cliente_id' => $this->cliente_id,
            'cliente_nome' => $this->cliente_nome,
            'cliente_nif' => $this->cliente_nif,
            'itens' => $this->itens->map(function ($item) {
                return [
                    'produto_id' => $item->produto_id,
                    'descricao' => $item->descricao,
                    'quantidade' => $item->quantidade,
                    'preco_venda' => $item->preco_unitario,
                    'desconto' => $item->desconto,
                    'taxa_iva' => $item->taxa_iva,
                ];
            })->toArray(),
            'dados_pagamento' => $dadosPagamento,
        ];
    }
}
