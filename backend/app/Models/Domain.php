<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Domain extends Model
{
    protected $table = 'domains';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'domain',
        'tenant_id',
    ];

    protected static function boot(): void
    {
        parent::boot();

        // Gera UUID automaticamente ao criar
        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
