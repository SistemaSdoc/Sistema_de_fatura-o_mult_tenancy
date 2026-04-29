<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class LogFiscal extends TenantModel
{
    use HasFactory;

    protected $table = 'logs_fiscais';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'entidade',
        'entidade_id',
        'acao',
        'user_id',
        'data_acao',
        'detalhe',
        'created_at',
        
    ];
}
