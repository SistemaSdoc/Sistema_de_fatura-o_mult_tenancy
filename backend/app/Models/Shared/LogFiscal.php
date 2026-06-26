<?php

namespace App\Models\Shared;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LogFiscal extends Model
{
    use HasFactory;

    protected $table = 'logs_fiscais';
    protected $connection = 'shared';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'entidade',
        'entidade_id',
        'tenant_id',
        'acao',
        'user_id',
        'data_acao',
        'detalhe',
        'created_at',
        
    ];
}
