<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Fornecedor extends Model
{
    protected $connection = 'tenant';
    protected $table = 'fornecedores';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'nome',
        'nif',
        'telefone',
        'email',
        'endereco'
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

    public function compras()
    {
        return $this->hasMany(Compra::class, 'fornecedor_id');
    }
}
