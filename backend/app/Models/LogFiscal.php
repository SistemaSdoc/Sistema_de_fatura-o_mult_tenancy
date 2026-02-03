<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LogFiscal extends Model
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
