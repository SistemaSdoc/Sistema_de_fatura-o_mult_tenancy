<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

class TenantService
{
    public function criarTenantDatabase($tenant)
    {
        $dbName = $tenant->database;

        // 1️⃣ Criar banco
        DB::statement("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // 2️⃣ Configurar conexão dinâmica
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
            ],
        ]);

        DB::purge('tenant');
        DB::reconnect('tenant');

        // 3️⃣ Rodar migrations
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true
        ]);

        // 4️⃣ Rodar seeder inicial se existir
        if (class_exists('TenantInitialSeeder')) {
            Artisan::call('db:seed', [
                '--database' => 'tenant',
                '--class' => 'TenantInitialSeeder',
                '--force' => true
            ]);
        }

        return ['success' => true, 'message' => 'Banco do tenant criado com sucesso'];
    }

    public function deletarTenantDatabase($tenant)
    {
        $dbName = $tenant->database;

        DB::statement("DROP DATABASE IF EXISTS `$dbName`");

        return ['success' => true, 'message' => 'Banco do tenant deletado com sucesso'];
    }
}
