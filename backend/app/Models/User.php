<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable, MustVerifyEmailTrait;

    protected $table = 'users'; // landlord DB
    
    public $incrementing = false;   // importante!
    protected $keyType = 'string';  // chave primária é UUID

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
        'password' => 'hashed',
    ];

        protected function password(): Attribute
    {
        return Attribute::make(
            set: fn ($value) => Hash::make($value),
        );
    }

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
        return $this->hasMany(Venda::class, 'user_id');
    }

    public function pagamentos()
    {
        return $this->hasMany(Pagamento::class, 'user_id');
    }
}
