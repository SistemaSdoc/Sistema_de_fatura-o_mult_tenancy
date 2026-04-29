<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EmpresaSeeder extends Seeder
{
    protected array $empresas = [
        [
            'nome'              => 'MWAMBA-COMERCIAL, COMERCIO A RETALHO',
            'nif'               => '2484011121',
            'email'             => 'mwamba@gmail.com',
            'telefone'          => '+244 938 747 267',
            'endereco'          => 'Rua do Paiol, Bairro Gameke, (Proximo da Farmacia Pedrito), Provincia de Luanda',
            'db_name'           => 'mwamba_db',
            'subdomain'         => 'mwamba',
            'regime_fiscal'     => 'simplificado',
            'sujeito_iva'       => true,
            'logo'              => '/public/images/mwamba.jpeg',
            'users' => [
                [
                    'name'       => 'Mwamba Admin',
                    'email'      => 'mwamba@gmail.com',
                    'role'       => 'admin',
                    'printer_ip' => '192.168.1.100',
                    'password'   => '123456',
                ],
                [
                    'name'       => 'mwanba1',
                    'email'      => 'mwamba1@gmail.com',
                    'role'       => 'operador',
                    'printer_ip' => null,
                    'password'   => '123456',
                ],
            ],
        ],
        [
            'nome'              => 'CONTAI - SERVIÇOS & MANUTENÇÃO',
            'nif'               => '5123456789',
            'email'             => 'contai@gmail.com',
            'telefone'          => '+244 923 456 789',
            'endereco'          => 'Rua da Sede, 10, Luanda',
            'db_name'           => 'contai_db',
            'subdomain'         => 'contai',
            'regime_fiscal'     => 'geral',
            'sujeito_iva'       => true,
            'logo'              => '/public/images/contai.png',
            'users' => [
                [
                    'name'       => 'Contai Admin',
                    'email'      => 'contai@gmail.com',
                    'role'       => 'admin',
                    'printer_ip' => '192.168.1.101',
                    'password'   => '123456',
                ],
                [
                    'name'       => 'Contai Operador',
                    'email'      => 'contai1@gmail.com',
                    'role'       => 'operador',
                    'printer_ip' => null,
                    'password'   => '123456',
                ],
            ],
        ],
    ];

    public function run(): void
    {
        foreach ($this->empresas as $dadosEmpresa) {
            // Verifica se empresa já existe (por email ou subdomain)
            $existente = DB::table('empresas')->where('email', $dadosEmpresa['email'])->first();
            if ($existente) {
                $this->command->warn("Empresa {$dadosEmpresa['nome']} já existe. Pulando...");
                continue;
            }

            // 1. Insere a empresa na landlord
            $empresaId = (string) Str::uuid();
            DB::table('empresas')->insert([
                'id'                => $empresaId,
                'nome'              => $dadosEmpresa['nome'],
                'nif'               => $dadosEmpresa['nif'],
                'email'             => $dadosEmpresa['email'],
                'telefone'          => $dadosEmpresa['telefone'],
                'endereco'          => $dadosEmpresa['endereco'],
                'db_name'           => $dadosEmpresa['db_name'],
                'subdomain'         => $dadosEmpresa['subdomain'],
                'regime_fiscal'     => $dadosEmpresa['regime_fiscal'],
                'sujeito_iva'       => $dadosEmpresa['sujeito_iva'],
                'logo'              => $dadosEmpresa['logo'] ?? null,
                'status'            => 'ativo',
                'data_registro'     => now()->toDateString(),
                'data_ativacao'     => now()->toDateString(),
                'data_desativacao'  => null,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            // 2. Criar base de dados do tenant
            $this->criarBaseTenant($dadosEmpresa['db_name']);

            // 3. Executar migrations tenant (inclui criação da tabela users)
            $this->executarMigrationsTenant($dadosEmpresa['db_name']);

            // 4. Inserir utilizadores diretamente na base tenant (usando conexão tenant)
            $this->inserirUsersTenant($dadosEmpresa['db_name'], $empresaId, $dadosEmpresa['users']);

            $this->command->info("Empresa {$dadosEmpresa['nome']} criada com sucesso!");
        }

        $this->command->info('Todos os tenants foram criados e as migrations executadas.');
    }

    protected function criarBaseTenant(string $dbName): void
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");

        if ($driver === 'mysql') {
            DB::statement("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $this->command->info("Base '{$dbName}' verificada/criada.");
        } elseif ($driver === 'pgsql') {
            DB::statement("CREATE DATABASE IF NOT EXISTS {$dbName}");
        } else {
            $this->command->warn("Driver {$driver} não suportado. Crie a base '{$dbName}' manualmente.");
        }
    }

    protected function executarMigrationsTenant(string $dbName): void
    {
        // Guardar configuração original da conexão 'tenant'
        $originalConfig = config('database.connections.tenant');

        // Apontar a conexão 'tenant' para a nova base
        config([
            'database.connections.tenant' => array_merge($originalConfig, [
                'database' => $dbName,
            ]),
        ]);

        DB::purge('tenant');

        $exitCode = Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path'     => 'database/migrations/tenant',
            '--force'    => true,
        ]);

        if ($exitCode === 0) {
            $this->command->info("Migrations executadas para base '{$dbName}'.");
        } else {
            $this->command->error("Falha nas migrations para base '{$dbName}'.");
        }

        // Restaurar configuração original
        config(['database.connections.tenant' => $originalConfig]);
        DB::purge('tenant');
    }

    /**
     * Insere os utilizadores diretamente na base tenant.
     */
    protected function inserirUsersTenant(string $dbName, string $empresaId, array $users): void
    {
        // Configura temporariamente a conexão 'tenant' para a base correta
        $originalConfig = config('database.connections.tenant');
        config([
            'database.connections.tenant' => array_merge($originalConfig, [
                'database' => $dbName,
            ]),
        ]);
        DB::purge('tenant');

        foreach ($users as $user) {
            DB::connection('tenant')->table('users')->insert([
                'id'            => (string) Str::uuid(),
                'name'          => $user['name'],
                'email'         => $user['email'],
                'password'      => Hash::make($user['password']),
                'role'          => $user['role'],
                'ativo'         => true,
                'ultimo_login'  => null,
                'printer_ip'    => $user['printer_ip'] ?? null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        // Restaurar configuração original
        config(['database.connections.tenant' => $originalConfig]);
        DB::purge('tenant');

        $this->command->info("Inseridos " . count($users) . " utilizadores na base '{$dbName}'.");
    }
}