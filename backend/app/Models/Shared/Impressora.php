<?php

namespace App\Models\Shared;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Impressora extends Model
{
    protected $connection = 'shared';
    protected $table      = 'impressoras';
    public $incrementing  = false;
    protected $keyType    = 'string';

    protected $fillable = [
        'id', 
        'tenant_id', 
        'nome', 
        'queue', 
        'tipo', 
        'is_default', 
        'ativo'
        ];

    protected $casts = [
        'is_default' => 'bool',
        'ativo'      => 'bool',
    ];

    protected static function booted(): void
    {
        static::creating(function ($m) {
            $m->id = $m->id ?: (string) Str::uuid();
        });
    }

    public function scopeDoTenant($query)
    {
        $empresa = app('current.empresa');
        return $empresa
            ? $query->where('tenant_id', $empresa->id)
            : $query->whereNull('tenant_id');
    }
}