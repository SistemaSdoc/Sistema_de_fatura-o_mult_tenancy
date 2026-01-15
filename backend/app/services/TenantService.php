<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

class TenantService
{
    /**
     * Cria um banco de dados para o tenant e roda as migrations.
     */
    public function criarTenantDatabase($tenant)
    {
        $dbName = $tenant->database;

        // 1. Criar banco de dados
        DB::statement("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // 2. Configurar conexão dinâmica
        config([
            'database.connections.tenant' => [
                'driver' => 'mysql',
                'host' => env('DB_HOST', '127.0.0.1'),
                'port' => env('DB_PORT', '3306'),
                'database' => $dbName,
                'username' => env('DB_USERNAME', 'root'),
                'password' => env('DB_PASSWORD', ''),
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'strict' => true,
                'engine' => null,
            ],
        ]);

        // 3. Rodar migrations do tenant
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => '/database/migrations/tenant', // coloque suas migrations do tenant aqui
            '--force' => true
        ]);

         Artisan::call('db:seed', [
            '--database' => 'tenant',
            '--class' => 'TenantInitialSeeder',
            '--force' => true
        ]);
        
        return true;
    }
}
