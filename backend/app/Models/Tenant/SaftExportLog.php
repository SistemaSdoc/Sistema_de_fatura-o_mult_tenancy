<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SaftExportLog extends TenantModel
{
    protected $table = 'saft_export_logs';

    public $incrementing = true; // ID auto-incremento
    protected $keyType = 'int';

    protected $fillable = [
        'empresa_id',
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