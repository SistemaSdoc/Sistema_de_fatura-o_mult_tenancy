<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Tenant extends Model
{
    protected $table = 'empresas';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = [
        'nome',
        'nif',
        'email',
        'logo',
        'status',
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
}
