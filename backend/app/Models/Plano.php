<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plano extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'landlord'; 

    protected $fillable = [
        'id',
        'nome', 
        'descricao', 
        'valor_mensal', 
        'valor_trimestral', 
        'valor_semestral', 
        'valor_anual', 
        'duracao_meses', 
        'ativo'
    ];

    protected $attributes = [
    'duracao_meses' => 1,
];
    // Relacionamento muitos-para-muitos com Features (via tabela pivot planos_features)
    public function features()
    {
        return $this->belongsToMany(Feature::class, 'planos_features')
                    ->withPivot('quantidade', 'unidade')
                    ->withTimestamps();
    }

    // Uma plano tem várias assinaturas
    public function subscricoes()
    {
        return $this->hasMany(Subscricao::class);
    }

        public function Pagamento()
    {
        return $this->hasMany(Pagamento::class);
    }
    
}