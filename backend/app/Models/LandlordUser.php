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
use Illuminate\Support\Facades\DB;


class LandlordUser extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable, MustVerifyEmailTrait;

    protected $connection = 'landlord';
    protected $table = 'users_landlord';

    public $incrementing = false;
    protected $keyType = 'string';

    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_ADMIN_EMPRESA = 'admin_empresa';

    protected $fillable = [
        'id',
        'empresa_id',           // Empresa vinculada (se admin_empresa fixo)
        'empresa_id_atual',     // Modo atendimento atual
        'name',
        'email',
        'password',
        'role',
        'ativo',
        'ultimo_login',
        'email_verified_at',
        'google_id',            // OAuth2 Google
        'google_name',          // Nome do Google
        'google_avatar',        // Avatar do Google
        'oauth_verified',       // Flag de OAuth2
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'ativo' => 'boolean',
        'oauth_verified' => 'boolean',
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

    public function ehAdminEmpresa(): bool
    {
        return $this->role === self::ROLE_ADMIN_EMPRESA;
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
        if ($this->ROLE_ADMIN_EMPRESA === $this->role && $this->empresa_id_atual) {
            return true;
        }

        if ($this->ehAdminEmpresa()) {
            return $this->empresa_id_atual === $empresaId;
        }

        return false;
    }

    // ================= TENANT =================

public function sincronizarTenantUser()
{
    if (!$this->empresa_id) {
        return;
    }

    $empresa = Empresa::on('landlord')->find($this->empresa_id);
    if (!$empresa) {
        return;
    }

    // Conecta à base do tenant
    $database = $empresa->db_name;
    config(['database.connections.tenant.database' => $database]);
    DB::purge('tenant');
    DB::reconnect('tenant');

    // Usa um modelo concreto (ex: User) – não uma classe abstrata
    $tenantUserModel = new \App\Models\Tenant\User(); // ou o nome correto do teu modelo
    $tenantUserModel->setConnection('tenant');

    $tenantUser = $tenantUserModel->where('email', $this->email)->first();

    if ($tenantUser) {
        // Atualiza existente
        $tenantUser->update([
            'name' => $this->name,
            'ativo' => $this->ativo,
            'landlord_user_id' => $this->id,
        ]);
    } else {
        // Cria novo
        $tenantUserModel->create([
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password, // ou gera uma nova
            'ativo' => $this->ativo,
            'role' => 'admin', // ou a role que desejas
            'landlord_user_id' => $this->id, 
        ]);
    }
}

public function tenantUser(): ?TenantUser
{
    $empresaId = $this->empresa_id_atual ?? $this->empresa_id;

    if (!$empresaId) {
        return null;
    }

    $empresa = Empresa::on('landlord')->find($empresaId);
    if (!$empresa) {
        return null;
    }

    $database = $empresa->db_name;
    config(['database.connections.tenant.database' => $database]);
    DB::purge('tenant');
    DB::reconnect('tenant');

    $tenantUserModel = new \App\Models\Tenant\User();
    $tenantUserModel->setConnection('tenant');

    // Usa o email como chave de ligação, pois é o campo comum
    return $tenantUserModel->where('email', $this->email)->first();
}
}
