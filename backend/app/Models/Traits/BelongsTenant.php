<?php

namespace App\Models\Traits;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use App\Models\Empresa;

trait BelongsToTenant
{
    /**
     * Conexão padrão para todos os models do tenant
     */
    protected $connection = 'tenant';

    /**
     * ID da empresa atual (para auditoria/relatórios)
     */
    protected static ?string $empresaIdAtual = null;

    /**
     * Boot do trait - garante conexão tenant
     */
    public function initializeBelongsToTenant(): void
    {
        $this->connection = 'tenant';
    }

    /**
     * Define a empresa atual para contexto
     */
    public static function setEmpresaContext(string $empresaId): void
    {
        static::$empresaIdAtual = $empresaId;
    }

    /**
     * Retorna empresa atual do contexto
     */
    public static function getEmpresaContext(): ?string
    {
        return static::$empresaIdAtual;
    }

    /**
     * Conecta dinamicamente ao banco de uma empresa específica
     * Útil para jobs, comandos artisan, relatórios cross-tenant
     */
    public static function conectarEmpresa(string|Empresa $empresa): void
    {
        $empresaModel = $empresa instanceof Empresa 
            ? $empresa 
            : Empresa::on('landlord')->findOrFail($empresa);

        // Configura conexão
        Config::set('database.connections.tenant.database', $empresaModel->db_name);
        
        // Força reconexão
        DB::purge('tenant');
        DB::reconnect('tenant');
        
        // Salva contexto
        static::setEmpresaContext($empresaModel->id);
        
        // Registra no container para acesso global
        app()->instance('current.tenant', $empresaModel);
    }

    /**
     * Desconecta e limpa contexto do tenant
     */
    public static function desconectarTenant(): void
    {
        DB::disconnect('tenant');
        static::$empresaIdAtual = null;
        app()->forgetInstance('current.tenant');
    }

    /**
     * Scope: Executa callback em múltiplos tenants (para relatórios/admin)
     */
    public function scopeAcrossTenants($query, callable $callback, array $empresaIds = [])
    {
        $resultados = [];
        
        $empresas = empty($empresaIds) 
            ? Empresa::on('landlord')->ativas()->get()
            : Empresa::on('landlord')->whereIn('id', $empresaIds)->get();

        foreach ($empresas as $empresa) {
            static::conectarEmpresa($empresa);
            
            $resultados[$empresa->id] = [
                'empresa' => $empresa,
                'dados' => $callback($query->newQuery())
            ];
            
            static::desconectarTenant();
        }

        return $resultados;
    }

    /**
     * Scope: Adiciona empresa_id se necessário (para auditoria)
     * Opcional - apenas se você mantém cópia do ID no tenant
     */
    public function scopeDoTenant($query, ?string $empresaId = null)
    {
        $id = $empresaId ?? static::$empresaIdAtual;
        
        if ($id && $this->hasColumn('empresa_id')) {
            return $query->where('empresa_id', $id);
        }
        
        return $query;
    }

    /**
     * Verifica se coluna existe na tabela
     */
    protected function hasColumn(string $column): bool
    {
        try {
            return DB::connection('tenant')
                ->getSchemaBuilder()
                ->hasColumn($this->getTable(), $column);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Boot: Adiciona empresa_id automaticamente em create (se coluna existir)
     */
    protected static function bootBelongsToTenant(): void
    {
        static::creating(function ($model) {
            // Se tiver coluna empresa_id e contexto definido, preenche automaticamente
            if (static::$empresaIdAtual && $model->hasColumn('empresa_id')) {
                if (empty($model->empresa_id)) {
                    $model->empresa_id = static::$empresaIdAtual;
                }
            }
        });
    }

    /**
     * Retorna instância da empresa atual (do container)
     */
    public function empresaAtual(): ?Empresa
    {
        return app('current.tenant');
    }

    /**
     * Verifica se está conectado a algum tenant
     */
    public static function estaConectado(): bool
    {
        try {
            DB::connection('tenant')->getPdo();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Executa código garantindo conexão tenant
     * Útil para jobs em queue
     */
    public static function executarNoTenant(string|Empresa $empresa, callable $callback)
    {
        $empresaAnterior = static::$empresaIdAtual;
        
        try {
            static::conectarEmpresa($empresa);
            return $callback();
        } finally {
            static::desconectarTenant();
            if ($empresaAnterior) {
                static::conectarEmpresa($empresaAnterior);
            }
        }
    }
}