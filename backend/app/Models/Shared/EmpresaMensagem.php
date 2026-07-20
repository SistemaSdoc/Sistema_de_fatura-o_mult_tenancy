<?php

namespace App\Models\Shared;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class EmpresaMensagem extends Model
{
    use HasUuids;

    protected $connection = 'shared';
    protected $table = 'empresa_mensagens';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'empresa_id',
        'remetente_id',
        'remetente_tipo',
        'remetente_nome',
        'remetente_email',
        'mensagem',
        'lida',
        'lida_em',
        'eliminada_pelo_cliente',
    ];

    protected $casts = [
        'lida' => 'boolean',
        'lida_em' => 'datetime',
        'eliminada_pelo_cliente' => 'boolean',
    ];
}
