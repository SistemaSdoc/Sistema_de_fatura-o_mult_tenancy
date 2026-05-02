<?php

namespace App\Models\Tenant;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Support\Str;
use App\Models\Tenant\Venda;
use App\Models\Tenant\Pagamento;
use App\Models\Tenant\Produto;
/**
 * TenantUser - Usuário da Empresa
 * 
 * Banco: tenant (empresa_xxxxx)
 * Tabela: users
 */
class User extends Authenticatable implements MustVerifyEmail  //  Extends Authenticatable direto
{
    use HasApiTokens, Notifiable, MustVerifyEmailTrait;

    protected $connection = 'tenant';  //  Conexão tenant
    protected $table = 'users';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'landlord_user_id',     //  Link para LandlordUser
        'name',
        'email',
        'pin',                  // Login rápido no caixa
        'password',
        'role',                 // admin, operador, contablista, suporte
        'permissoes',           // JSON
        'caixa_aberto',
        'caixa_id',
        'ativo',
        'ultimo_login',
        'printer_ip',
        'printer_port',
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

    /**
     * ✅ NOVO: Retorna LandlordUser vinculado
     */
    public function landlordUser(): ?\App\Models\LandlordUser
    {
        if (!$this->landlord_user_id) {
            return null;
        }

        return \App\Models\LandlordUser::on('landlord')
            ->find($this->landlord_user_id);
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