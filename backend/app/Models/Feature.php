<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Feature extends Model
{
    use HasFactory;

    
    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'landlord'; 
    protected $fillable = [
        'id',
        'nome', 
        'descricao', 
        'icone', 
        'ativo'
        ];

    // Relacionamento inverso com Planos
    public function planos()
    {
        return $this->belongsToMany(Plano::class, 'planos_features')
                    ->withPivot('quantidade', 'unidade')
                    ->withTimestamps();
    }
}