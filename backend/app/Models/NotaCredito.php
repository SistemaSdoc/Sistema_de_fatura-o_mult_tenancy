<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NotaCredito extends Model
{
    protected $connection = 'tenant';
    protected $table = 'notas_credito';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'fatura_id',
        'num_sequencial',
        'motivo',
        'valor',
        'data',
        'user_id', // quem emitiu
    ];

    protected $casts = [
        'data'  => 'datetime',
        'valor' => 'decimal:2',
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

    // ================= RELAÇÕES =================

    public function fatura()
    {
        return $this->belongsTo(Fatura::class);
    }

    public function user()
    {
        return $this->belongsTo(TenantUser::class, 'user_id');
    }
}
