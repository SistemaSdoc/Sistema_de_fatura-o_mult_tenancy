<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use App\Models\Tenant;

class BAISeeder extends Seeder
{
    public function run()
    {
        $databaseName = 'bai_bd';

        DB::statement("CREATE DATABASE IF NOT EXISTS `$databaseName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

        $tenant = Tenant::create([
            'id' => Str::uuid(),
            'nome' => 'BAI',
            'subdomain' => 'bai',
            'email' => 'bai@gmail.com',
            'nif' => '12345678000108',
            'status' => 'ativo',
            'data' => ['database' => $databaseName],
        ]);

        $this->command->info("Tenant '{$tenant->nome}' criado no landlord.");

        config([
            'database.connections.tenant' => [
                'driver' => 'mysql',
                'host' => env('DB_HOST', '127.0.0.1'),
                'port' => env('DB_PORT', '3306'),
                'database' => $databaseName,
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

        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);

        if (!DB::connection('tenant')->getSchemaBuilder()->hasTable('personal_access_tokens')) {
            DB::connection('tenant')->getSchemaBuilder()->create('personal_access_tokens', function ($table) {
                $table->id();
                $table->string('tokenable_id', 36);
                $table->string('tokenable_type');
                $table->index(['tokenable_id', 'tokenable_type']);
                $table->text('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamps();
            });
        }

        // Usuários BAI
        $users = [
            ['name' => 'Diniz', 'email' => 'dinizcabenda@gmail.com', 'role' => 'admin'],
            ['name' => 'Alice', 'email' => 'alicericha507@gmail.com', 'role' => 'operador'],
            ['name' => 'Stefania', 'email' => 'stefania@gmail.com', 'role' => 'caixa'],
        ];

        foreach ($users as $user) {
            DB::connection('tenant')->table('users')->insert([
                'id' => Str::uuid(),
                'name' => $user['name'],
                'email' => $user['email'],
                'password' => Hash::make('123456'),
                'role' => $user['role'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Categorias, produtos, fornecedores e clientes iguais ao BIC
        DB::connection('tenant')->table('categorias')->insert([
            ['id' => Str::uuid(), 'nome' => 'Cosméticos', 'descricao' => 'Produtos de cosmética', 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'nome' => 'Alimentação', 'descricao' => 'Produtos alimentares', 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'nome' => 'Eletrónica', 'descricao' => 'Equipamentos eletrónicos', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $cosmeticos = DB::connection('tenant')->table('categorias')->where('nome', 'Cosméticos')->first();
        $alimentacao = DB::connection('tenant')->table('categorias')->where('nome', 'Alimentação')->first();

        DB::connection('tenant')->table('produtos')->insert([
            [
                'id' => Str::uuid(),
                'categoria_id' => $cosmeticos->id,
                'nome' => 'Creme Facial',
                'descricao' => 'Creme hidratante para rosto',
                'preco_compra' => 5000,
                'preco_venda' => 8000,
                'estoque_atual' => 50,
                'estoque_minimo' => 10,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'categoria_id' => $alimentacao->id,
                'nome' => 'Arroz Premium 5kg',
                'descricao' => 'Arroz importado premium',
                'preco_compra' => 12000,
                'preco_venda' => 15000,
                'estoque_atual' => 100,
                'estoque_minimo' => 20,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::connection('tenant')->table('fornecedores')->insert([
            [
                'id' => Str::uuid(),
                'nome' => 'Fornecedor Cosméticos Ltda',
                'nif' => '123456789',
                'telefone' => '912345678',
                'email' => 'contato@cosmeticos.com',
                'endereco' => 'Av. dos Fornecedores, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'nome' => 'Fornecedor Alimentação SA',
                'nif' => '987654321',
                'telefone' => '923456789',
                'email' => 'contato@alimentacao.com',
                'endereco' => 'Rua Alimentar, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::connection('tenant')->table('clientes')->insert([
            [
                'id' => Str::uuid(),
                'nome' => 'Cliente Final 1',
                'nif' => null,
                'tipo' => 'consumidor_final',
                'telefone' => '911234567',
                'email' => 'cliente1@teste.com',
                'endereco' => 'Bairro Central, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'nome' => 'Empresa XYZ',
                'nif' => '1122334455',
                'tipo' => 'empresa',
                'telefone' => '922334455',
                'email' => 'contato@empresa.xyz',
                'endereco' => 'Zona Industrial, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
