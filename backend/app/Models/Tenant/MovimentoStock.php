<?php

namespace App\Models\Tenant;

use Illuminate\Support\Str;

/**
 * Model MovimentoStock
 *
 * Representa um movimento de stock (entrada ou saída).
 * Toda a lógica de criação de movimentos está no StockService.
 * Este model é apenas estrutura de dados + relações + scopes + acessores.
 *
 * Tipos de movimento válidos:
 *  - compra               → entrada por compra (actualiza custo médio ponderado)
 *  - venda                → saída por documento fiscal FT/FR
 *  - nota_credito         → entrada por NC (devolução de mercadoria)
 *  - ajuste               → ajuste manual ou por inventário
 *  - venda_cancelada      → entrada por cancelamento de venda (FT/FR cancelada)
 *  - nota_credito_cancelada → saída por cancelamento de NC
 *
 * Campo user_id pode ser null em operações de sistema ou que não têm utilizador responsável.
 *
 * Alterações em conformidade com StockService:
 *  - user_id é nullable (operações de sistema podem não ter utilizador associado)
 *  - Tipos de movimento são validados em StockService antes de chegar aqui
 *  - Acessores melhorados para exibição de tipos
 *  - Relação user() com fallback para null
 */
class MovimentoStock extends TenantModel
{
    protected $table = 'movimentos_stock';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'produto_id',
        'user_id',           // ✅ Nullable para operações de sistema
        'tipo',              // entrada | saida
        'tipo_movimento',    // compra | venda | nota_credito | ajuste | venda_cancelada | nota_credito_cancelada
        'quantidade',        // Valor com sinal (positivo=entrada, negativo=saida)
        'estoque_anterior',
        'estoque_novo',
        'custo_medio',
        'custo_unitario',
        'referencia',        // ID do documento fiscal ou compra associada
        'observacao',
        'stock_minimo',
    ];

    protected $casts = [
        'quantidade'        => 'integer',
        'estoque_anterior'  => 'integer',
        'estoque_novo'      => 'integer',
        'stock_minimo'      => 'integer',
        'custo_medio'       => 'decimal:2',
        'custo_unitario'    => 'decimal:2',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
    ];

    /* =====================================================================
     | BOOT
     | ================================================================== */

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    /* =====================================================================
     | RELAÇÕES
     | ================================================================== */

    /**
     * Relação com Produto (eager loaded com soft deletes).
     * Um movimento sempre tem um produto associado.
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class)->withTrashed();
    }

    /**
     * Relação com User.
     * ✅ user_id pode ser null para operações de sistema.
     * Usar: $movimento->user()->first() ou $movimento->user_id
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /* =====================================================================
     | SCOPES
     | ================================================================== */

    /**
     * Scope: Apenas entradas.
     */
    public function scopeEntradas($query)
    {
        return $query->where('tipo', 'entrada');
    }

    /**
     * Scope: Apenas saídas.
     */
    public function scopeSaidas($query)
    {
        return $query->where('tipo', 'saida');
    }

    /**
     * Scope: Movimentos originados por vendas (FT/FR).
     */
    public function scopeVendas($query)
    {
        return $query->where('tipo_movimento', 'venda');
    }

    /**
     * Scope: Movimentos originados por notas de crédito (NC).
     */
    public function scopeNotasCredito($query)
    {
        return $query->where('tipo_movimento', 'nota_credito');
    }

    /**
     * Scope: Movimentos originados por cancelamento de venda.
     */
    public function scopeVendasCanceladas($query)
    {
        return $query->where('tipo_movimento', 'venda_cancelada');
    }

    /**
     * Scope: Movimentos originados por cancelamento de NC.
     */
    public function scopeNotasCreditoCanceladas($query)
    {
        return $query->where('tipo_movimento', 'nota_credito_cancelada');
    }

    /**
     * Scope: Movimentos originados por documentos fiscais (venda + nota_credito).
     */
    public function scopeDocumentosFiscais($query)
    {
        return $query->whereIn('tipo_movimento', ['venda', 'nota_credito']);
    }

    /**
     * Scope: Movimentos originados por cancelamento de documentos (venda_cancelada + nota_credito_cancelada).
     */
    public function scopeCancelamentos($query)
    {
        return $query->whereIn('tipo_movimento', ['venda_cancelada', 'nota_credito_cancelada']);
    }

    /**
     * Scope: Ajustes manuais e por inventário.
     */
    public function scopeAjustes($query)
    {
        return $query->where('tipo_movimento', 'ajuste');
    }

    /**
     * Scope: Movimentos de compra (entrada com custo médio).
     */
    public function scopeCompras($query)
    {
        return $query->where('tipo_movimento', 'compra');
    }

    /**
     * Scope: Movimentos associados a um documento fiscal ou compra específica.
     *
     * @param $query
     * @param string $referenciaId
     * @return mixed
     */
    public function scopePorReferencia($query, string $referenciaId)
    {
        return $query->where('referencia', $referenciaId);
    }

    /**
     * Scope: Movimentos dentro de um período.
     *
     * @param $query
     * @param $inicio
     * @param $fim
     * @return mixed
     */
    public function scopeDoPeriodo($query, $inicio, $fim)
    {
        return $query->whereBetween('created_at', [$inicio, $fim]);
    }

    /**
     * Scope: Movimentos de um utilizador específico.
     * ✅ Filtra por user_id, excluindo movimentos de sistema (user_id = null).
     *
     * @param $query
     * @param string $userId
     * @return mixed
     */
    public function scopeDoUsuario($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Movimentos sem utilizador responsável (operações de sistema).
     *
     * @param $query
     * @return mixed
     */
    public function scopeSemUsuario($query)
    {
        return $query->whereNull('user_id');
    }

    /* =====================================================================
     | ACESSORES (COMPUTED PROPERTIES)
     | ================================================================== */

    /**
     * Valor total do movimento (quantidade × custo unitário ou médio).
     * Sempre retorna valor absoluto (positivo).
     *
     * @return float
     */
    public function getValorTotalAttribute(): float
    {
        $custo = (float) ($this->custo_unitario ?? $this->custo_medio ?? 0);
        return abs($this->quantidade) * $custo;
    }

    /**
     * Tipo de movimento formatado para exibição (entrada/saída).
     *
     * @return string
     */
    public function getTipoFormatadoAttribute(): string
    {
        return $this->tipo === 'entrada' ? 'Entrada' : 'Saída';
    }

    /**
     * Nome legível e formatado do tipo de movimento.
     * Traduz: compra → Compra, venda → Venda, etc.
     *
     * @return string
     */
    public function getTipoMovimentoNomeAttribute(): string
    {
        return match ($this->tipo_movimento) {
            'compra'                  => 'Compra',
            'venda'                   => 'Venda',
            'nota_credito'            => 'Nota de Crédito',
            'ajuste'                  => 'Ajuste Manual',
            'venda_cancelada'         => 'Cancelamento de Venda',
            'nota_credito_cancelada'  => 'Cancelamento de NC',
            default                   => ucfirst(str_replace('_', ' ', $this->tipo_movimento)),
        };
    }

    /**
     * Ícone associado ao tipo de movimento (para UI).
     * Usado em dashboards e listagens.
     *
     * @return string
     */
    public function getIconeAttribute(): string
    {
        return match ($this->tipo_movimento) {
            'compra'                 => 'shopping-cart',
            'venda'                  => 'arrow-right',
            'nota_credito'           => 'undo',
            'ajuste'                 => 'sliders',
            'venda_cancelada'        => 'x-circle',
            'nota_credito_cancelada' => 'alert-circle',
            default                  => 'file-text',
        };
    }

    /**
     * Indica se este movimento foi originado por um documento fiscal (FT/FR/NC).
     *
     * @return bool
     */
    public function getEhDocumentoFiscalAttribute(): bool
    {
        return in_array($this->tipo_movimento, ['venda', 'nota_credito', 'venda_cancelada', 'nota_credito_cancelada']);
    }

    /**
     * Tipo de documento fiscal associado, se aplicável.
     * Retorna: 'FT/FR', 'NC', null
     *
     * @return string|null
     */
    public function getTipoDocumentoFiscalAttribute(): ?string
    {
        return match ($this->tipo_movimento) {
            'venda', 'venda_cancelada'            => 'FT/FR',
            'nota_credito', 'nota_credito_cancelada' => 'NC',
            default                                => null,
        };
    }

    /**
     * Cor para exibição no frontend (CSS/Tailwind).
     * Verde=entrada, Vermelho=saída, Cinzento=neutro.
     *
     * @return string
     */
    public function getCorAttribute(): string
    {
        return match ($this->tipo) {
            'entrada' => 'green',
            'saida'   => 'red',
            default   => 'gray',
        };
    }

    /**
     * Descrição completa do movimento para UI.
     * Ex: "Venda de 10 unidades em 15/05/2025 por João Silva"
     *
     * @return string
     */
    public function getDescricaoComeletaAttribute(): string
    {
        $tipo = $this->tipo_movimento_nome;
        $qtd  = abs($this->quantidade);
        $user = $this->user ? " por {$this->user->name}" : " (sistema)";
        $data = $this->created_at->format('d/m/Y H:i');

        return "{$tipo} de {$qtd} unidades em {$data}{$user}";
    }

    /**
     * Verifica se este movimento pode ser revertido.
     * Apenas movimentos de documento fiscal ou compra podem ser revertidos via cancelamento.
     *
     * @return bool
     */
    public function getPodeSerRevertidoAttribute(): bool
    {
        return in_array($this->tipo_movimento, ['venda', 'nota_credito', 'compra']);
    }

    /**
     * Saldo de quantidade (com sinal).
     * Entrada: +quantidade, Saída: -quantidade
     *
     * @return int
     */
    public function getSaldoAttribute(): int
    {
        return $this->quantidade;
    }

    /**
     * Variação percentual de stock (para dashboard).
     * Retorna: positivo para entrada, negativo para saída.
     *
     * @return float
     */
    public function getVariacaoPercentualAttribute(): float
    {
        if ($this->estoque_anterior == 0) {
            return 0;
        }

        $variacao = (($this->estoque_novo - $this->estoque_anterior) / $this->estoque_anterior) * 100;
        return round($variacao, 2);
    }
}
