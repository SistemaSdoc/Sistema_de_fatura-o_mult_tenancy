<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ItemDocumentoFiscal extends Model
{
    protected $table = 'itens_documento_fiscal';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'documento_fiscal_id',
        'produto_id',
        'item_origem_id',

        'descricao',
        'referencia',

        'quantidade',
        'unidade',

        'preco_unitario',
        'desconto',
        'base_tributavel',

        'taxa_iva',
        'valor_iva',

        'taxa_retencao',
        'valor_retencao',

        'total_linha',

        'ordem',

        'motivo_alteracao',
        'observacoes',
    ];

    protected $casts = [
        'quantidade' => 'decimal:4',
        'preco_unitario' => 'decimal:4',
        'desconto' => 'decimal:2',
        'base_tributavel' => 'decimal:2',
        'taxa_iva' => 'decimal:2',
        'valor_iva' => 'decimal:2',
        'taxa_retencao' => 'decimal:2',
        'valor_retencao' => 'decimal:2',
        'total_linha' => 'decimal:2',
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

    /* ================= RELACOES ================= */

    public function documentoFiscal()
    {
        return $this->belongsTo(DocumentoFiscal::class, 'documento_fiscal_id');
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }

    /**
     * Item original no documento de origem (para NC, ND, FRt)
     */
    public function itemOrigem()
    {
        return $this->belongsTo(ItemDocumentoFiscal::class, 'item_origem_id');
    }

    /**
     * Itens derivados deste (notas de crédito/débito que referenciam este item)
     */
    public function itensDerivados()
    {
        return $this->hasMany(ItemDocumentoFiscal::class, 'item_origem_id');
    }

    /* ================= ACESSORES ================= */

    public function getPrecoTotalAttribute()
    {
        return $this->quantidade * $this->preco_unitario;
    }

    public function getDescontoPercentualAttribute()
    {
        $precoTotal = $this->preco_total;
        return $precoTotal > 0 ? ($this->desconto / $precoTotal) * 100 : 0;
    }

    public function getValorLiquidoAttribute()
    {
        return $this->base_tributavel + $this->valor_iva - $this->valor_retencao;
    }

    public function getTemRetencaoAttribute()
    {
        return $this->valor_retencao > 0;
    }

    public function getTemDescontoAttribute()
    {
        return $this->desconto > 0;
    }

    public function getEhServicoAttribute()
    {
        return $this->produto && $this->produto->tipo === 'servico';
    }

    /**
     * Verificar se item afeta stock (apenas FT, FR, NC)
     */
    public function getAfetaStockAttribute(): bool
    {
        if (!$this->documentoFiscal) {
            return false;
        }

        return $this->documentoFiscal->afetaStock();
    }

    /**
     * Verificar se é entrada de stock (NC) ou saída (FT, FR)
     */
    public function getTipoMovimentoStockAttribute(): ?string
    {
        if (!$this->afeta_stock) {
            return null;
        }

        return $this->documentoFiscal->tipo_documento === 'NC' ? 'entrada' : 'saida';
    }

    /* ================= SCOPES ================= */

    public function scopeDoDocumento($query, $documentoId)
    {
        return $query->where('documento_fiscal_id', $documentoId);
    }

    public function scopePorOrdem($query)
    {
        return $query->orderBy('ordem', 'asc');
    }

    public function scopeComRetencao($query)
    {
        return $query->where('valor_retencao', '>', 0);
    }

    public function scopeComDesconto($query)
    {
        return $query->where('desconto', '>', 0);
    }

    public function scopeDoProduto($query, $produtoId)
    {
        return $query->where('produto_id', $produtoId);
    }

    /**
     * Itens que afetam stock (FT, FR, NC)
     */
    public function scopeAfetamStock($query)
    {
        return $query->whereHas('documentoFiscal', function($q) {
            $q->whereIn('tipo_documento', ['FT', 'FR', 'NC'])
              ->where('estado', '!=', 'cancelado');
        });
    }

    /* ================= MÉTODOS ================= */

    /**
     * Calcular totais do item baseado nos valores base
     */
    public function calcularTotais()
    {
        $precoTotal = $this->quantidade * $this->preco_unitario;
        $this->base_tributavel = max($precoTotal - $this->desconto, 0);
        $this->valor_iva = round(($this->base_tributavel * $this->taxa_iva) / 100, 2);
        $this->valor_retencao = round(($this->base_tributavel * $this->taxa_retencao) / 100, 2);
        $this->total_linha = $this->base_tributavel + $this->valor_iva - $this->valor_retencao;

        return $this;
    }

    /**
     * Duplicar item para novo documento (usado em NC, ND, conversões)
     */
    public function duplicar(array $override = [])
    {
        $dados = [
            'produto_id' => $this->produto_id,
            'descricao' => $this->descricao,
            'referencia' => $this->referencia,
            'quantidade' => $this->quantidade,
            'unidade' => $this->unidade,
            'preco_unitario' => $this->preco_unitario,
            'desconto' => $this->desconto,
            'base_tributavel' => $this->base_tributavel,
            'taxa_iva' => $this->taxa_iva,
            'valor_iva' => $this->valor_iva,
            'taxa_retencao' => $this->taxa_retencao,
            'valor_retencao' => $this->valor_retencao,
            'total_linha' => $this->total_linha,
            'item_origem_id' => $this->id,
        ];

        return new self(array_merge($dados, $override));
    }

    /**
     * Inverter valores (usado em notas de crédito)
     */
    public function inverterValores()
    {
        $this->quantidade = -abs($this->quantidade);
        $this->base_tributavel = -abs($this->base_tributavel);
        $this->valor_iva = -abs($this->valor_iva);
        $this->valor_retencao = -abs($this->valor_retencao);
        $this->total_linha = -abs($this->total_linha);

        return $this;
    }

    /**
     * Processar movimento de stock após criar/salvar item
     * ATUALIZADO: Integração com StockService
     */
    public function processarStock(): void
    {
        if (!$this->afeta_stock || !$this->produto_id) {
            return;
        }

        $tipo = $this->tipo_movimento_stock;
        if (!$tipo) {
            return;
        }

        // Não processar serviços
        if ($this->eh_servico) {
            return;
        }

        // Verificar se documento está cancelado
        if ($this->documentoFiscal->estado === 'cancelado') {
            return;
        }

        $quantidade = abs($this->quantidade);

        // Usar StockService para movimentação
        app(StockService::class)->movimentar(
            $this->produto_id,
            $quantidade,
            $tipo,
            match($this->documentoFiscal->tipo_documento) {
                'FT' => 'venda',
                'FR' => 'venda',
                'NC' => 'nota_credito',
                default => 'ajuste'
            },
            $this->documentoFiscal->id,
            "Documento: {$this->documentoFiscal->numero_documento}"
        );
    }
}
