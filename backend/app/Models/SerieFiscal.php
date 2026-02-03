<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SerieFiscal extends Model
{
    use HasFactory;

    protected $table = 'series_fiscais';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'tipo_documento',
        'serie',
        'ano',
        'ultimo_numero'
        
    ];
}
