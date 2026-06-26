<?php

namespace App\Models\Shared;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SaftExportLog extends Model
{
    protected $table = 'saft_export_logs';

    public $incrementing = true; // ID auto-incremento
    protected $keyType = 'int';
    protected $connection = 'shared';

    protected $fillable = [
        'empresa_id',
        'tenant_id',
        'ano',
        'mes',
        'exportado_em',
        'user_id',
        'caminho_arquivo',
    ];

    protected $casts = [
        'exportado_em' => 'datetime',
        'ano' => 'integer',
        'mes' => 'integer',
    ];

    /**
     * Relação com a empresa (landlord)
     */


    /**
     * Relação com o utilizador que exportou (opcional)
     * Pode ser guard landlord ou tenant, conforme a sua lógica
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}