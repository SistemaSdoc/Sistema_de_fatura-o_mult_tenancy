<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class PlanoFeature extends Pivot
{
    protected $table = 'planos_features';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'landlord'; 

    protected $fillable = [
        'plano_id', 
        'feature_id', 
        'quantidade', 
        'unidade'
        ];
}