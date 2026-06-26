<?php

namespace App\Models\Shared;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApuramentoIva extends Model
{
    use HasFactory;

    protected $table = 'apuramento_iva';
    protected $connection = 'shared';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'tenant_id',
        'periodo',
        'iva_liquidado',
        'iva_dedutivel',
        'iva_a_pagar',
        'estado',
        'data_fecho'
        
    ];
}
