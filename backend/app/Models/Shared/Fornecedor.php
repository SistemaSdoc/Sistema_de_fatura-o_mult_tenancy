<?php

namespace App\Models\Shared;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class Fornecedor extends Model
{
    use SoftDeletes;

    protected $table = 'fornecedores';
    protected $connection = 'shared';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'tenant_id',
        'nome',
        'nif',
        'telefone',
        'email',
        'endereco',
        'tipo',
        'status',
    ];

    protected $dates = ['deleted_at'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function compras()
    {
        return $this->hasMany(Compra::class, 'fornecedor_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
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
