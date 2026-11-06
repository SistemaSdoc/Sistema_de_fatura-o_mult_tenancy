<?php

namespace App\Models\Tenant;

use Illuminate\Support\Str;

class Impressora extends TenantModel
{
    protected $connection = 'tenant';
    protected $table      = 'impressoras';
    public $incrementing  = false;
    protected $keyType    = 'string';

    protected $fillable = [
        'id', 
        'nome', 
        'queue', 
        'tipo', 
        'is_default', 
        'ativo',
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
}