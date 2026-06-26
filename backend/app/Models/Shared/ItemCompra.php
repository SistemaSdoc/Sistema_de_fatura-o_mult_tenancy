<?php

namespace App\Models\Shared;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class ItemCompra extends Model
{
    protected $table = 'itens_compra';

    public $incrementing = false;
    protected $connection = 'shared';
    protected $keyType = 'string';

    protected $fillable = [
        'compra_id',
        'produto_id',
        'tenant_id',
        'quantidade',
        'preco_compra',
        'subtotal',
        'base_tributavel',
        'valor_iva',
        'created_at',
        'updated_at',
        
    ];

    protected $casts = [
        'quantidade'   => 'integer',
        'preco_compra' => 'decimal:2',
        'subtotal'     => 'decimal:2',
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

    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

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
}
