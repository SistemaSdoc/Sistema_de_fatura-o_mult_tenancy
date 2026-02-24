<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ItemVenda extends Model
{
    protected $table = 'itens_venda';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'venda_id',
        'produto_id',
        'descricao',
        'quantidade',
        'preco_venda',
        'desconto',
        'base_tributavel',
        'valor_iva',
        'taxa_iva',
        'valor_retencao',
        'taxa_retencao',
        'subtotal',
        'codigo_produto',
        'unidade',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'preco_venda' => 'decimal:2',
        'desconto' => 'decimal:2',
        'base_tributavel' => 'decimal:2',
        'valor_iva' => 'decimal:2',
        'taxa_iva' => 'decimal:2',
        'valor_retencao' => 'decimal:2',
        'taxa_retencao' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }

            // ✅ Calcular retenção automaticamente se for serviço
            if ($model->produto && $model->produto->isServico()) {
                $model->taxa_retencao = $model->taxa_retencao ?? ($model->produto->retencao ?? 6.5);
                $model->valor_retencao = round(($model->base_tributavel * $model->taxa_retencao) / 100, 2);
                $model->subtotal = $model->base_tributavel + $model->valor_iva - $model->valor_retencao;
            }
        });

        static::updating(function ($model) {
            // ✅ Recalcular retenção se base tributável mudar e for serviço
            if ($model->isDirty('base_tributavel') && $model->produto && $model->produto->isServico()) {
                $model->valor_retencao = round(($model->base_tributavel * $model->taxa_retencao) / 100, 2);
                $model->subtotal = $model->base_tributavel + $model->valor_iva - $model->valor_retencao;
            }
        });
    }

    // ================= RELAÇÕES =================

    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    // ================= ACESSORES =================

    public function getEhServicoAttribute(): bool
    {
        return $this->produto && $this->produto->tipo === 'servico';
    }

    public function getEhProdutoAttribute(): bool
    {
        return $this->produto && $this->produto->tipo === 'produto';
    }

    public function getTemRetencaoAttribute(): bool
    {
        return $this->valor_retencao > 0;
    }

    public function getTemDescontoAttribute(): bool
    {
        return $this->desconto > 0;
    }

    public function getPrecoTotalBrutoAttribute(): float
    {
        return $this->quantidade * $this->preco_venda;
    }

    public function getDescontoPercentualAttribute(): float
    {
        $precoTotal = $this->preco_total_bruto;
        return $precoTotal > 0 ? ($this->desconto / $precoTotal) * 100 : 0;
    }

    /**
     * ✅ NOVO: Valor após retenção
     */
    public function getValorAposRetencaoAttribute(): float
    {
        return $this->base_tributavel + $this->valor_iva - $this->valor_retencao;
    }

    /**
     * ✅ NOVO: Taxa de retenção efetiva
     */
    public function getTaxaRetencaoEfetivaAttribute(): float
    {
        if ($this->base_tributavel <= 0) return 0;
        return round(($this->valor_retencao / $this->base_tributavel) * 100, 2);
    }

    /**
     * ✅ NOVO: Nome do produto com indicação de serviço
     */
    public function getNomeComTipoAttribute(): string
    {
        if ($this->eh_servico) {
            return $this->descricao . ' (Serviço)';
        }
        return $this->descricao;
    }

    // ================= SCOPES =================

    public function scopeDaVenda($query, $vendaId)
    {
        return $query->where('venda_id', $vendaId);
    }

    public function scopeDoProduto($query, $produtoId)
    {
        return $query->where('produto_id', $produtoId);
    }

    /**
     * Apenas serviços
     */
    public function scopeApenasServicos($query)
    {
        return $query->whereHas('produto', function($q) {
            $q->where('tipo', 'servico');
        });
    }

    /**
     * Apenas produtos
     */
    public function scopeApenasProdutos($query)
    {
        return $query->whereHas('produto', function($q) {
            $q->where('tipo', 'produto');
        });
    }

    public function scopeComRetencao($query)
    {
        return $query->where('valor_retencao', '>', 0);
    }

    public function scopeComDesconto($query)
    {
        return $query->where('desconto', '>', 0);
    }

    // ================= MÉTODOS =================

    /**
     * Calcular totais do item
     */
    public function calcularTotais()
    {
        $precoTotal = $this->quantidade * $this->preco_venda;
        $this->base_tributavel = max($precoTotal - $this->desconto, 0);
        $this->valor_iva = round(($this->base_tributavel * $this->taxa_iva) / 100, 2);

        // ✅ Calcular retenção (especialmente para serviços)
        if ($this->taxa_retencao > 0) {
            $this->valor_retencao = round(($this->base_tributavel * $this->taxa_retencao) / 100, 2);
        }

        $this->subtotal = $this->base_tributavel + $this->valor_iva - $this->valor_retencao;

        return $this;
    }

    /**
     * ✅ NOVO: Aplicar retenção padrão para serviço
     */
    public function aplicarRetencaoServico(): void
    {
        if (!$this->eh_servico) {
            return;
        }

        if ($this->produto && $this->produto->retencao > 0) {
            $this->taxa_retencao = $this->produto->retencao;
            $this->valor_retencao = round(($this->base_tributavel * $this->taxa_retencao) / 100, 2);
            $this->subtotal = $this->base_tributavel + $this->valor_iva - $this->valor_retencao;
        }
    }
}
