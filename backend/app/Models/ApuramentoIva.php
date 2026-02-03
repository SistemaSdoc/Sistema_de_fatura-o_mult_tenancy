<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ApuramentoIva extends Model
{
    use HasFactory;

    protected $table = 'apuramento_iva';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'periodo',
        'iva_liquidado',
        'iva_dedutivel',
        'iva_a_pagar',
        'estado',
        'data_fecho'
        
    ];
}
