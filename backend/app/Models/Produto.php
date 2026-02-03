<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\MovimentoStock;

class Produto extends Model
{
    protected $table = 'produtos';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'categoria_id',
        'user_id',
        'nome',
        'codigo',
        'status',
        'descricao',
        'custo_medio',
        'preco_compra',
        'preco_venda',
        'taxa_iva',
        'estoque_atual',
        'estoque_minimo',
    ];

    protected $casts = [
        'preco_compra'   => 'decimal:2',
        'preco_venda'    => 'decimal:2',
        'estoque_atual'  => 'integer',
        'estoque_minimo' => 'integer',
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
    public function margemLucro()
{
    if ($this->custo_medio == 0) return 0;

    return (($this->preco_venda - $this->custo_medio) / $this->custo_medio) * 100;
}


    // ================= RELAÇÕES =================

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
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
    return $this->belongsTo(Fornecedor::class, 'fornecedor_id'); // ou o campo correto
}

}
