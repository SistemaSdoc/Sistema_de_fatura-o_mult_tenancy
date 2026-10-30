<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FacturaGlobalAnexo extends Model
{
    protected $table = 'factura_global_anexos';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'id',
        'documento_fiscal_id',
        'tenant_id',
        'tipo_anexo',
        'referencia',
        'data_anexo',
        'valor_total',
        'observacoes',
    ];

    protected $casts = [
        'data_anexo'  => 'date',
        'valor_total' => 'decimal:2',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function documentoFiscal()
    {
        return $this->belongsTo(DocumentoFiscal::class, 'documento_fiscal_id');
    }
}