<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class LogAuditoria extends Model
{
    protected $connection = 'tenant';
    protected $table = 'logs_auditoria';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'acao',          // exemplo: 'criou', 'atualizou', 'deletou'
        'entidade',      // exemplo: 'Produto', 'Venda', 'Fatura'
        'referencia_id', // id da entidade afetada
        'ip',            // endereço IP do usuário
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
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

    public function user()
    {
        return $this->belongsTo(TenantUser::class, 'user_id');
    }
}
