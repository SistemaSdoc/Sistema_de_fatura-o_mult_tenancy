<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes; // Import necessário
use Illuminate\Support\Str;

class Cliente extends Model
{
    use HasFactory, SoftDeletes; // Ativando SoftDeletes

    protected $table = 'clientes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'nome',
        'nif',
        'tipo',
        'telefone',
        'email',
        'endereco',
        'data_registro',
    ];

    // Cast para data
    protected $dates = [
        'data_registro',
        'deleted_at', // necessário para SoftDeletes
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

    public function vendas()
    {
        return $this->hasMany(Venda::class, 'cliente_id');
    }

    public function faturas()
    {
        return $this->hasMany(Fatura::class, 'cliente_id');
    }
}
