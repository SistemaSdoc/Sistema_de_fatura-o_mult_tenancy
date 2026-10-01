<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Notificacao extends Model
{
    use HasUuids;

    protected $connection = 'landlord';
    protected $table = 'notificacoes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'titulo',
        'mensagem',
        'tipo',
        'tipo_evento',         
        'lida',
        'lida_em',            
        'user_id',
        'empresa_id',          
        'dados',               
        'url',                 
        'enviada_email',       
        'enviada_email_em',    
        'email_erro',          
    ];

    protected $casts = [
        'lida' => 'boolean',
        'enviada_email' => 'boolean',
        'dados' => 'array',
        'lida_em' => 'datetime',
        'enviada_email_em' => 'datetime',
    ];

    /* ─── Relações ─────────────────────────────────────── */

    public function user()
    {
        return $this->belongsTo(LandlordUser::class, 'user_id');
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    /* ─── Scopes ───────────────────────────────────────── */

    public function scopeNaoLidas($query)
    {
        return $query->where('lida', false);
    }

    public function scopeDoUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }
}