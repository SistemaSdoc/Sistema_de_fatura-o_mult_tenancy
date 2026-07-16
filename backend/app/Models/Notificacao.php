<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Notificacao extends Model
{
    use HasUuids;


    public $incrementing = false;
    protected $keyType = 'string';
    protected $connection = 'landlord'; 
    protected $table = 'notificacoes';
    protected $fillable = [
        'titulo',
        'mensagem',
        'tipo',
        'lida',
        'user_id',
    ];

    protected $casts = [
        'lida' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(LandlordUser::class);
    }

    // Escopo para não lidas
    public function scopeNaoLidas($query)
    {
        return $query->where('lida', false);
    }
}