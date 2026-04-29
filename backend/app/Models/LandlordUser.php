<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Support\Str;
use App\Models\Empresa;
use App\Models\Tenant\TenantModel;
use App\Models\Tenant\User as TenantUser;


class LandlordUser extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable, MustVerifyEmailTrait;

    protected $connection = 'landlord';
    protected $table = 'users_landlord';

    public $incrementing = false;
    protected $keyType = 'string';

    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_SUPORTE = 'suporte';

    protected $fillable = [
        'id',
        'empresa_id',           // Empresa vinculada (se suporte fixo)
        'empresa_id_atual',     // Modo atendimento atual
        'name',
        'email',
        'password',
        'role',
        'ativo',
        'ultimo_login',
        'email_verified_at',
    ];

    protected $hidden = ['password', 'remember_token'];
    
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'ativo' => 'boolean',
        'ultimo_login' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // ================= RELAÇÕES =================

    public function empresa()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function empresaAtual()
    {
        return $this->belongsTo(Empresa::class, 'empresa_id_atual');
    }

    // ================= VERIFICAÇÕES =================

    public function ehSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function ehSuporte(): bool
    {
        return $this->role === self::ROLE_SUPORTE;
    }

    /**
     * ✅ NOVO: Verifica se pode acessar empresa específica
     */
    public function podeAcessarEmpresa(string $empresaId): bool
    {
        if ($this->ehSuperAdmin()) {
            return true;
        }
        
        // Suporte pode acessar se estiver em modo atendimento
        if ($this->ehSuporte()) {
            return $this->empresa_id_atual === $empresaId;
        }
        
        return false;
    }

    // ================= TENANT =================

    /**
     * ✅ CORRIGIDO: Sincroniza com TenantUser
     */
    public function sincronizarTenantUser(): TenantUser
    {
        $empresaId = $this->empresa_id_atual ?? $this->empresa_id;
        
        if (!$empresaId) {
            throw new \RuntimeException('Nenhuma empresa em atendimento ou vinculada');
        }

        TenantModel::conectarEmpresa($empresaId);

        return TenantUser::firstOrCreate(
            ['landlord_user_id' => $this->id],
            [
                'nome' => $this->ehSuporte() ? '[SUPORTE] ' . $this->name : $this->name,
                'email' => $this->email,
                'role' => $this->ehSuporte() ? 'suporte' : 'admin',
                'ativo' => $this->ativo,
            ]
        );
    }

    public function tenantUser(): ?TenantUser
    {
        $empresaId = $this->empresa_id_atual ?? $this->empresa_id;
        
        if (!$empresaId) {
            return null;
        }

        try {
            TenantModel::conectarEmpresa($empresaId);
            return TenantUser::where('landlord_user_id', $this->id)->first();
        } catch (\Exception $e) {
            return null;
        }
    }
}