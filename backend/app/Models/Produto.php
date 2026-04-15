<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Model Produto
 *
 * Alterações:
 *  - Para PRODUTOS FÍSICOS: taxa_iva e sujeito_iva são puxados da Categoria 
 *    pelo ProdutoService e salvos no produto. O Model apenas fornece accessors
 *    para leitura do IVA da categoria quando necessário.
 *  - Para SERVIÇOS: taxa_iva e sujeito_iva mantêm-se no modelo do serviço,
 *    pois serviços não têm categoria.
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
        'tipo',            // 'produto' | 'servico'
        'status',
        'descricao',
        'custo_medio',
        'preco_compra',
        'preco_venda',
        // ✅ taxa_iva e sujeito_iva são salvos no banco para ambos os tipos
        // Para produtos: puxados da categoria pelo Service
        // Para serviços: definidos diretamente
        'taxa_iva',
        'sujeito_iva',
        'estoque_atual',
        'estoque_minimo',
        // Campos exclusivos de serviços
        'taxa_retencao',
        'codigo_isencao',
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
        'taxa_iva'       => 0,    // default apenas para novos registros
        'sujeito_iva'    => false, // default apenas para novos registros
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

            if ($model->tipo === 'servico') {
                $model->estoque_atual  = 0;
                $model->estoque_minimo = 0;
                $model->custo_medio    = 0;
                $model->preco_compra   = 0;
                $model->categoria_id   = null;
                $model->fornecedor_id  = null;
                $model->codigo         = null;
            }

            // ✅ REMOVIDO: Não forçar null no IVA de produtos
            // O ProdutoService já puxa o IVA da categoria e passa nos dados
            // Se não vier nada, os defaults ($attributes) serão usados
        });

        static::updating(function ($model) {
            if ($model->isDirty('tipo') && $model->tipo === 'servico') {
                $model->estoque_atual  = 0;
                $model->estoque_minimo = 0;
                $model->custo_medio    = 0;
                $model->preco_compra   = 0;
                $model->categoria_id   = null;
                $model->fornecedor_id  = null;
                $model->codigo         = null;
            }

            // ✅ REMOVIDO: Não forçar null no IVA de produtos
            // O ProdutoService já puxa o IVA da categoria e passa nos dados
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
     | ACCESSORS — IVA EFECTIVO (produto herda da categoria, serviço usa o seu)
     | ================================================================== */

    /**
     * Retorna a taxa de IVA efectiva:
     *  - Produto físico → taxa_iva da Categoria associada (se salvo for null)
     *  - Serviço        → taxa_iva do próprio serviço
     *
     * Use sempre este método em vez de $produto->taxa_iva para cálculos fiscais.
     */
    public function getTaxaIvaEfectivaAttribute(): float
    {
        // Se já tem valor salvo, usa ele
        if ($this->taxa_iva !== null) {
            return (float) $this->taxa_iva;
        }

        // Se não tem, tenta pegar da categoria (fallback)
        if ($this->tipo === 'produto') {
            $categoria = $this->relationLoaded('categoria')
                ? $this->categoria
                : $this->categoria()->first();

            if ($categoria) {
                return (float) $categoria->taxa_iva;
            }
        }

        return 0.0;
    }

    /**
     * Retorna se está sujeito a IVA:
     *  - Produto físico → sujeito_iva da Categoria (se salvo for null)
     *  - Serviço        → sujeito_iva do próprio serviço
     */
    public function getSujeitoIvaEfetivoAttribute(): bool
    {
        // Se já tem valor salvo, usa ele
        if ($this->sujeito_iva !== null) {
            return (bool) $this->sujeito_iva;
        }

        // Se não tem, tenta pegar da categoria (fallback)
        if ($this->tipo === 'produto') {
            $categoria = $this->relationLoaded('categoria')
                ? $this->categoria
                : $this->categoria()->first();

            return $categoria ? (bool) $categoria->sujeito_iva : false;
        }

        return (bool) ($this->sujeito_iva ?? false);
    }

    /**
     * Retorna o código de isenção efectivo:
     *  - Produto físico → codigo_isencao da Categoria (se salvo for null)
     *  - Serviço        → codigo_isencao do próprio serviço
     */
    public function getCodigoIsencaoEfetivoAttribute(): ?string
    {
        // Se já tem valor salvo, usa ele
        if ($this->codigo_isencao !== null) {
            return $this->codigo_isencao;
        }

        // Se não tem, tenta pegar da categoria (fallback)
        if ($this->tipo === 'produto') {
            $categoria = $this->relationLoaded('categoria')
                ? $this->categoria
                : $this->categoria()->first();

            return $categoria?->codigo_isencao;
        }

        return $this->codigo_isencao;
    }

    /**
     * Valor do IVA calculado sobre o preço de venda.
     */
    public function getValorIvaAttribute(): float
    {
        return round($this->preco_venda * ($this->taxa_iva_efectiva / 100), 2);
    }

    /**
     * Preço de venda com IVA incluído.
     */
    public function getPrecoComIvaAttribute(): float
    {
        return round((float) $this->preco_venda + $this->valor_iva, 2);
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

    public function scopeComRetencao($query)
    {
        return $query->where('tipo', 'servico')->where('taxa_retencao', '>', 0);
    }

    public function scopeIsentosIva($query)
    {
        return $query->where('tipo', 'servico')->whereNotNull('codigo_isencao');
    }

    /* =====================================================================
     | MÉTODOS DE VERIFICAÇÃO
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
        if ($this->isServico()) return false;
        return $this->estoque_atual > 0 && $this->estoque_atual <= $this->estoque_minimo;
    }

    public function semEstoque(): bool
    {
        if ($this->isServico()) return false;
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
     * Margem de lucro baseada no custo médio (apenas produtos físicos).
     */
    public function margemLucro(): float
    {
        if ($this->isServico() || (float) $this->custo_medio === 0.0) {
            return 0.0;
        }

        return (($this->preco_venda - $this->custo_medio) / $this->custo_medio) * 100;
    }
}