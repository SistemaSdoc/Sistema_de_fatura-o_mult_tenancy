<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Empresa extends Model
{
    use HasFactory;

    protected $connection = 'landlord'; // SEMPRE landlord
    protected $table = 'empresas';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 
        'nome', 
        'nif', 
        'email', 
        'telefone', 
        'endereco',
        'db_name', 
        'regime_fiscal', 
        'sujeito_iva', 
        'logo', 
        'status', 
        'data_registro',
        'data_ativacao',
        'data_desativacao',
    ];

    protected $casts = [
        'sujeito_iva' => 'boolean',
        'data_registro' => 'date',
        'data_ativacao' => 'date',
        'data_desativacao' => 'date',
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

    // 🔗 Scope: Apenas ativas
    public function scopeAtivas($query)
    {
        return $query->where('status', 'ativo');
    }

    // 🔗 Scope: Por regime fiscal
    public function scopeRegime($query, string $regime)
    {
        return $query->where('regime_fiscal', $regime);
    }

    /**
     * Configura e retorna conexão do banco desta empresa
     */
    public function conectar(): void
    {
        config(['database.connections.tenant.database' => $this->db_name]);
        DB::purge('tenant');
        DB::reconnect('tenant');
    }

    /**
     * Verifica se banco existe
     */
    public function bancoExiste(): bool
    {
        $result = DB::connection('landlord')
            ->select("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [$this->db_name]);
        
        return !empty($result);
    }
}