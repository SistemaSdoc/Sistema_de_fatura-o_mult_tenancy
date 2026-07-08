<?php

namespace App\Models\Shared;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Support\Str;
use App\Models\Shared\Venda;
use App\Models\Shared\Pagamento;
use App\Models\Shared\Produto;
/**
 * TenantUser - Usuário da Empresa
 * 
 * Banco: tenant (empresa_xxxxx)
 * Tabela: users
 */
class User extends Authenticatable implements MustVerifyEmail  //  Extends Authenticatable direto
{
    use HasApiTokens, Notifiable, MustVerifyEmailTrait;

    protected $table = 'users';
    protected $connection = 'shared';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'user_id',
        'name',
        'email',           // Login rápido no caixa
        'password',
        'role',        
        'ultimo_login',
    ];

    protected $hidden = ['password', 'pin', 'remember_token'];
    
    protected $casts = [
        'permissoes' => 'array',
        'ativo' => 'boolean',
        'caixa_aberto' => 'boolean',
        'ultimo_login' => 'datetime',
        'email_verified_at' => 'datetime',
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

    /**
     * ✅ RETORNA LandlordUser VINCULADO
     */
    public function landlordUser(): ?\App\Models\LandlordUser
    {
        if (!$this->user_id) {
            return null;
        }

        return \App\Models\LandlordUser::on('landlord')
            ->find($this->user_id);
    }



    /**
     * ✅ OBTÉM A ROLE NO TENANT (MODO COLECTIVO)
     * A role está diretamente no campo 'role' da tabela users
     */
    public function getRoleNoTenant(?string $tenantId): ?string
    {
        // ✅ CORRETO - A role está no próprio usuário
        return $this->role ?? 'operador';
    }
    
    /**
     * ✅ VERIFICA SE TEM ACESSO AO TENANT
     * Verifica se o tenant_id do usuário corresponde ao tenant atual
     */
    public function temAcessoAoTenant(?string $tenantId): bool
    {
        if (!$tenantId) {
            return false;
        }
        
        // ✅ CORRETO - Verifica se o tenant_id do usuário é o mesmo
        return $this->tenant_id === $tenantId;
    }

    /**
     * ✅ OBTÉM O STATUS NO TENANT
     */
    public function getAtivoNoTenant(?string $tenantId): bool
    {
        return (bool) $this->ativo;
    }

    /**
     * ✅ SCOPE PARA TENANT (modo colectivo)
     */
    public function scopeDoTenant($query)
    {
        $tenantId = session('tenant_id');
        if ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        }
        return $query;
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
     public function produto()
    {
        return $this->hasMany(Produto::class, 'user_id');
    }


    // ================= PERMISSÕES =================

    public function temPermissao(string $permissao): bool
    {
        $permissoes = $this->permissoes ?? [];
        
        // Admin tem todas as permissões
        if ($this->role === 'admin') {
            return true;
        }
        
        return in_array($permissao, $permissoes);
    }
}
