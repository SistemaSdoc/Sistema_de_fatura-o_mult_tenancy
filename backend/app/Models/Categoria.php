<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class Categoria extends Model
{
    use HasFactory;

    protected $connection = 'tenant';
    protected $table = 'categorias';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'nome',
        'descricao'
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

    public function produtos()
    {
        return $this->hasMany(Produto::class, 'categoria_id');
    }
}
