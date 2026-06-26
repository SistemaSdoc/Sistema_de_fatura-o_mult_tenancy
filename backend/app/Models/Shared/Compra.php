<?php

namespace App\Models\Shared;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class Compra extends Model
{
    protected $table = 'compras';
    protected $connection = 'shared';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'fornecedor_id',
        'data',
        'total',
        'tenant_id',
        'status',
        'user_id',
        'data_registro',
        'produto_id',
        'quantidade',
        'preco_compra',
        'subtotal',
        'base_tributavel',
        'valor_iva',
        

    ];

    protected $casts = [
        'data'  => 'datetime',
        'total' => 'decimal:2',
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

    public function scopeDoTenant($query)
    {
        $empresa = app('current.empresa');
        
        if ($empresa) {
            return $query->where('tenant_id', $empresa->id);
        }
        
        // Se não tiver tenant, retorna vazio (segurança)
        // Isso evita vazamento de dados
        return $query->whereRaw('1 = 0');
    }

        public function scopeDoTenantEspecifico($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }
    public function fornecedor()
    {
        return $this->belongsTo(Fornecedor::class);
    }

    public function itens()
    {
        return $this->hasMany(ItemCompra::class, 'compra_id');
    }
}
