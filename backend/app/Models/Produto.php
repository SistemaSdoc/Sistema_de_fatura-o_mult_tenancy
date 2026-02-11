<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\MovimentoStock;

class Produto extends Model
{
    use SoftDeletes;

    protected $table = 'produtos';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'categoria_id',
        'user_id',
        'fornecedor_id',
        'nome',
        'codigo',
        'tipo', // 'produto' ou 'servico'
        'status',
        'descricao',
        'custo_medio',
        'preco_compra',
        'preco_venda',
        'taxa_iva',
        'sujeito_iva',
        'estoque_atual',
        'estoque_minimo',
        // Campos específicos para serviços
        'retencao',
        'duracao_estimada',
        'unidade_medida',
    ];

    protected $casts = [
        'preco_compra'   => 'decimal:2',
        'preco_venda'    => 'decimal:2',
        'custo_medio'    => 'decimal:2',
        'estoque_atual'  => 'integer',
        'estoque_minimo' => 'integer',
        'taxa_iva'       => 'decimal:2',
        'sujeito_iva'    => 'boolean',
        'retencao'       => 'decimal:2',
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

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }

            // Garantir valores padrão para serviços
            if ($model->tipo === 'servico') {
                $model->estoque_atual = 0;
                $model->estoque_minimo = 0;
                $model->custo_medio = 0;
                $model->preco_compra = 0;
                $model->categoria_id = null;
            }
        });

        static::updating(function ($model) {
            // Se mudar para serviço, zerar campos de estoque
            if ($model->isDirty('tipo') && $model->tipo === 'servico') {
                $model->estoque_atual = 0;
                $model->estoque_minimo = 0;
                $model->custo_medio = 0;
                $model->preco_compra = 0;
            }
        });
    }

    /**
     * Verifica se o produto está deletado (soft delete)
     */
    public function estaDeletado(): bool
    {
        return $this->trashed();
    }

    /**
     * Data de exclusão formatada
     */
    public function dataExclusao(): ?string
    {
        return $this->deleted_at ? $this->deleted_at->format('d/m/Y H:i') : null;
    }

    /**
     * Calcula margem de lucro baseada no custo médio
     */
    public function margemLucro(): float
    {
        if ($this->custo_medio == 0) return 0;

        return (($this->preco_venda - $this->custo_medio) / $this->custo_medio) * 100;
    }

    /**
     * Verifica se é serviço
     */
    public function isServico(): bool
    {
        return $this->tipo === 'servico';
    }

    /**
     * Verifica se é produto físico
     */
    public function isProduto(): bool
    {
        return $this->tipo === 'produto';
    }

    /**
     * Verifica se estoque está baixo
     */
    public function estoqueBaixo(): bool
    {
        if ($this->isServico()) return false;
        return $this->estoque_atual > 0 && $this->estoque_atual <= $this->estoque_minimo;
    }

    /**
     * Verifica se está sem estoque
     */
    public function semEstoque(): bool
    {
        if ($this->isServico()) return false;
        return $this->estoque_atual === 0;
    }

    // ================= RELAÇÕES =================

    public function categoria()
    {
        return $this->belongsTo(Categoria::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function itensCompra()
    {
        return $this->hasMany(ItemCompra::class, 'produto_id');
    }

    public function itensVenda()
    {
        return $this->hasMany(ItemVenda::class, 'produto_id');
    }

    public function fornecedor()
    {
        return $this->belongsTo(Fornecedor::class, 'fornecedor_id')->withTrashed();
    }

    public function movimentosStock()
    {
        return $this->hasMany(MovimentoStock::class, 'produto_id')->orderBy('created_at', 'desc');
    }

    // ================= SCOPES =================

    /**
     * Scope para produtos ativos e não deletados
     */
    public function scopeAtivos($query)
    {
        return $query->where('status', 'ativo')->whereNull('deleted_at');
    }

    /**
     * Scope para produtos inativos
     */
    public function scopeInativos($query)
    {
        return $query->where('status', 'inativo')->whereNull('deleted_at');
    }

    /**
     * Scope para produtos na lixeira
     */
    public function scopeLixeira($query)
    {
        return $query->onlyTrashed();
    }

    /**
     * Scope para buscar incluindo deletados
     */
    public function scopeComDeletados($query)
    {
        return $query->withTrashed();
    }

    /**
     * Scope apenas produtos (não serviços)
     */
    public function scopeApenasProdutos($query)
    {
        return $query->where('tipo', 'produto');
    }

    /**
     * Scope apenas serviços
     */
    public function scopeApenasServicos($query)
    {
        return $query->where('tipo', 'servico');
    }

    /**
     * Scope estoque baixo
     */
    public function scopeEstoqueBaixo($query)
    {
        return $query->where('tipo', 'produto')
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->where('estoque_atual', '>', 0);
    }

    /**
     * Scope sem estoque
     */
    public function scopeSemEstoque($query)
    {
        return $query->where('tipo', 'produto')->where('estoque_atual', 0);
    }
}
