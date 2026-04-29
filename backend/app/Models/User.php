<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'users';

    public $incrementing = false;
    protected $keyType   = 'string';

    protected $fillable = [
        'empresa_id',
        'name',
        'email',
        'password',
        'role',
        'ativo',
        'ultimo_login',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'ultimo_login'      => 'datetime',
        'ativo'             => 'boolean',
        'password'          => 'hashed', // hash único — sem Attribute duplicado
    ];

    // ── UUID automático ──────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // ── Relações ─────────────────────────────────────────────────────────────

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function vendas()
    {
        return $this->hasMany(Venda::class, 'user_id');
    }

    public function pagamentos()
    {
        return $this->hasMany(Pagamento::class, 'user_id');
    }
}