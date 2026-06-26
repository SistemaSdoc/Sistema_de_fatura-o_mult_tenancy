<?php

namespace App\Models\Shared;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use App\Models\Shared\Venda;   

class Pagamento extends Model
{
    protected $table = 'pagamentos';
    protected $connection = 'shared';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'fatura_id',
        'tenant_id',
        'metodo',
        'valor_pago',
        'troco',
        'data_pagamento',
        'hora_pagamento',
        'referencia',
        'data',
        'venda_id',
        
    ];

    protected $casts = [
        'data'       => 'datetime',
        'valor_pago' => 'decimal:2',
        'troco'      => 'decimal:2',
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

    public function venda()
    {
        return $this->belongsTo(Venda::class);
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
