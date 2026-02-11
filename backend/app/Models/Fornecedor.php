<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Fornecedor extends Model
{
    use SoftDeletes;

    protected $table = 'fornecedores';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'nome',
        'nif',
        'telefone',
        'email',
        'endereco',
        'tipo',
        'status',
    ];

    protected $dates = ['deleted_at'];

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

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
