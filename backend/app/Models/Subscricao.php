<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscricao extends Model
{
    use HasFactory;

    // Indica que a chave primária não é auto-incremento e é do tipo string (UUID)
    public $incrementing = false;
    protected $keyType = 'string';
    protected $table = 'subscricoes';
    protected $connection = 'landlord'; 

    protected $fillable = [
        'id',
        'empresa_id',
        'plano_id',
        'data_inicio',
        'data_fim',
        'status',
        'forma_pagamento',
        'renovacao_automatica',
        'cancelado_em',
        'criado_por',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_fim' => 'date',
        'cancelado_em' => 'date',
        'renovacao_automatica' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relacionamento com Empresa (pertence a uma empresa)
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    // Relacionamento com Plano
    public function plano(): BelongsTo
    {
        return $this->belongsTo(Plano::class);
    }

    // Relacionamento com o usuário landlord que criou (opcional)
    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(UserLandlord::class, 'criado_por');
    }

    // Relacionamento com Pagamentos (uma assinatura tem muitos pagamentos)
    public function pagamentos(): HasMany
    {
        return $this->hasMany(Pagamento::class);
    }
}