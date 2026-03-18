<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Model Produto
 *
 * Alterações:
 *  - Campo 'retencao' renomeado para 'taxa_retencao' (consistência com
 *    ProdutoService, DocumentoFiscalService e VendaService)
 *  - Campo 'codigo_isencao' adicionado ao $fillable e $casts
 *    (necessário para SAF-T e cálculo de IVA nos services)
 *  - Boot: simplificado; lógica de negócio (cálculo de custo médio,
 *    movimentações) permanece no ProdutoService e StockService
 */
class Produto extends Model
{
    use SoftDeletes;

    protected $table = 'produtos';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id',
        'categoria_id',
        'user_id',
        'fornecedor_id',
        'nome',
        'codigo',
        'tipo',           // 'produto' | 'servico'
        'status',
        'descricao',
        'custo_medio',
        'preco_compra',
        'preco_venda',
        'taxa_iva',
        'sujeito_iva',
        'estoque_atual',
        'estoque_minimo',
        // Campos exclusivos de serviços
        'taxa_retencao',   // renomeado de 'retencao' — AGT: configurável por serviço
        'codigo_isencao',  // SAF-T: TaxExemptionCode (M00–M99)
        'duracao_estimada',
        'unidade_medida',
    ];

    protected $casts = [
        'preco_compra'   => 'decimal:2',
        'preco_venda'    => 'decimal:2',
        'custo_medio'    => 'decimal:2',
        'taxa_iva'       => 'decimal:2',
        'taxa_retencao'  => 'decimal:2',
        'sujeito_iva'    => 'boolean',
        'estoque_atual'  => 'integer',
        'estoque_minimo' => 'integer',
        'deleted_at'     => 'datetime',
    ];

    protected $attributes = [
        'tipo'           => 'produto',
        'status'         => 'ativo',
        'estoque_atual'  => 0,
        'estoque_minimo' => 5,
        'taxa_iva'       => 14.00,
        'sujeito_iva'    => true,
        'custo_medio'    => 0.00,
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

            // Garantir valores nulos nos campos inapropriados por tipo
            if ($model->tipo === 'servico') {
                $model->estoque_atual  = 0;
                $model->estoque_minimo = 0;
                $model->custo_medio    = 0;
                $model->preco_compra   = 0;
                $model->categoria_id   = null;
                $model->fornecedor_id  = null;
                $model->codigo         = null;
            }
        });

        static::updating(function ($model) {
            // Se mudar de produto para serviço, limpar campos de stock
            if ($model->isDirty('tipo') && $model->tipo === 'servico') {
                $model->estoque_atual  = 0;
                $model->estoque_minimo = 0;
                $model->custo_medio    = 0;
                $model->preco_compra   = 0;
                $model->categoria_id   = null;
                $model->fornecedor_id  = null;
                $model->codigo         = null;
            }
        });
    }

    /* =====================================================================
     | RELAÇÕES
     | ================================================================== */

    public function categoria()
    {
        return $this->belongsTo(Categoria::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function fornecedor()
    {
        return $this->belongsTo(Fornecedor::class, 'fornecedor_id')->withTrashed();
    }

    public function itensVenda()
    {
        return $this->hasMany(ItemVenda::class, 'produto_id');
    }

    public function itensCompra()
    {
        return $this->hasMany(ItemCompra::class, 'produto_id');
    }

    public function movimentosStock()
    {
        return $this->hasMany(MovimentoStock::class, 'produto_id')->orderBy('created_at', 'desc');
    }

    /* =====================================================================
     | SCOPES
     | ================================================================== */

    public function scopeAtivos($query)
    {
        return $query->where('status', 'ativo')->whereNull('deleted_at');
    }

    public function scopeInativos($query)
    {
        return $query->where('status', 'inativo')->whereNull('deleted_at');
    }

    public function scopeLixeira($query)
    {
        return $query->onlyTrashed();
    }

    public function scopeComDeletados($query)
    {
        return $query->withTrashed();
    }

    public function scopeApenasProdutos($query)
    {
        return $query->where('tipo', 'produto');
    }

    public function scopeApenasServicos($query)
    {
        return $query->where('tipo', 'servico');
    }

    public function scopeEstoqueBaixo($query)
    {
        return $query->where('tipo', 'produto')
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->where('estoque_atual', '>', 0);
    }

    public function scopeSemEstoque($query)
    {
        return $query->where('tipo', 'produto')->where('estoque_atual', 0);
    }

    /** Serviços com retenção na fonte configurada */
    public function scopeComRetencao($query)
    {
        return $query->where('tipo', 'servico')->where('taxa_retencao', '>', 0);
    }

    /** Serviços isentos de IVA (com código de isenção) */
    public function scopeIsentosIva($query)
    {
        return $query->where('tipo', 'servico')->whereNotNull('codigo_isencao');
    }

    /* =====================================================================
     | MÉTODOS DE VERIFICAÇÃO — sem queries
     | ================================================================== */

    public function isServico(): bool
    {
        return $this->tipo === 'servico';
    }

    public function isProduto(): bool
    {
        return $this->tipo === 'produto';
    }

    public function estoqueBaixo(): bool
    {
        if ($this->isServico()) {
            return false;
        }

        return $this->estoque_atual > 0 && $this->estoque_atual <= $this->estoque_minimo;
    }

    public function semEstoque(): bool
    {
        if ($this->isServico()) {
            return false;
        }

        return $this->estoque_atual === 0;
    }

    public function estaDeletado(): bool
    {
        return $this->trashed();
    }

    public function dataExclusao(): ?string
    {
        return $this->deleted_at?->format('d/m/Y H:i');
    }

    /**
     * Margem de lucro baseada no custo médio.
     * Apenas para produtos físicos.
     */
    public function margemLucro(): float
    {
        if ($this->isServico() || (float) $this->custo_medio === 0.0) {
            return 0.0;
        }

        return (($this->preco_venda - $this->custo_medio) / $this->custo_medio) * 100;
    }
}