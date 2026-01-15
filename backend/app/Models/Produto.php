<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Produto extends Model
{
    protected $connection = 'tenant';
    protected $table = 'produtos';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'categoria_id',
        'nome',
        'descricao',
        'preco_compra',
        'preco_venda',
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

    // (opcional, para o próximo passo)
    public function movimentosStock()
    {
        return $this->hasMany(MovimentoStock::class);
    }
}
