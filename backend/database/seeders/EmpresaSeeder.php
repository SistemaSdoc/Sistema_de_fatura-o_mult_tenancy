<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmpresaSeeder extends Seeder
{
    public function run(): void
    {
        /* ================= EMPRESA ================= */
        $empresaId = Str::uuid();

        DB::table('empresas')->insert([
            'id' => $empresaId,
            'nome' => 'SDOCA',
            'nif' => '5001234567',
            'email' => 'sdoca@gmail.com',
            'logo' => null,
            'status' => 'ativo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /* ================= USUÁRIOS ================= */
        $users = [
            ['name' => 'Diniz', 'email' => 'dinizcabenda@gmail.com', 'role' => 'admin'],
            ['name' => 'Alice', 'email' => 'alicericha507@gmail.com', 'role' => 'operador'],
            ['name' => 'Stefania', 'email' => 'stefania@gmail.com', 'role' => 'caixa'],
        ];

        foreach ($users as $user) {
            DB::table('users')->insert([
                'id' => Str::uuid(),
                'name' => $user['name'],
                'email' => $user['email'],
                'password' => Hash::make('123456'),
                'role' => $user['role'],
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        /* ================= CATEGORIAS ================= */
        $cosmeticosId = Str::uuid();
        $alimentacaoId = Str::uuid();

        DB::table('categorias')->insert([
            [
                'id' => $cosmeticosId,
                'nome' => 'Cosméticos',
                'descricao' => 'Produtos de cosmética',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $alimentacaoId,
                'nome' => 'Alimentação',
                'descricao' => 'Produtos alimentares',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        /* ================= PRODUTOS ================= */
        DB::table('produtos')->insert([
            [
                'id' => Str::uuid(),
                'categoria_id' => $cosmeticosId,
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
                'categoria_id' => $alimentacaoId,
                'nome' => 'Arroz Premium 5kg',
                'descricao' => 'Arroz importado premium',
                'preco_compra' => 12000,
                'preco_venda' => 15000,
                'estoque_atual' => 100,
                'estoque_minimo' => 20,
                'created_at' => now(),
                'updated_at' => now(),
            ],
                        [
                'id' => Str::uuid(),
                'categoria_id' => $alimentacaoId,
                'nome' => 'Batata Doce 5kg',
                'descricao' => 'Batata doce importada',
                'preco_compra' => 2000,
                'preco_venda' => 5000,
                'estoque_atual' => 100,
                'estoque_minimo' => 20,
                'created_at' => now(),
                'updated_at' => now(),
            ],
                        [
                'id' => Str::uuid(),
                'categoria_id' => $alimentacaoId,
                'nome' => 'Cenoura 5kg',
                'descricao' => 'Cenoura importada',
                'preco_compra' => 500,
                'preco_venda' => 1000,
                'estoque_atual' => 100,
                'estoque_minimo' => 20,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        /* ================= FORNECEDORES ================= */
        DB::table('fornecedores')->insert([
            [
                'id' => Str::uuid(),
                'nome' => 'Fornecedor Cosméticos Ltda',
                'nif' => '123456789',
                'telefone' => '912345678',
                'email' => 'cosmeticos@fornecedor.com',
                'endereco' => 'Av. dos Fornecedores, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'nome' => 'Fornecedor Alimentação SA',
                'nif' => '987654321',
                'telefone' => '923456789',
                'email' => 'alimentacao@fornecedor.com',
                'endereco' => 'Rua Alimentar, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        /* ================= CLIENTES ================= */
        DB::table('clientes')->insert([
            [
                'id' => Str::uuid(),
                'nome' => 'Cliente Final',
                'nif' => null,
                'tipo' => 'consumidor_final',
                'telefone' => '911234567',
                'email' => 'cliente@teste.com',
                'endereco' => 'Bairro Central, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'nome' => 'BAI',
                'nif' => '1122334499',
                'tipo' => 'empresa',
                'telefone' => '922334455',
                'email' => 'bai@gmail.com',
                'endereco' => 'Zona Contablidade, Icolo e Bengo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'nome' => 'Empresa XYZ',
                'nif' => '1122334455',
                'tipo' => 'empresa',
                'telefone' => '922334455',
                'email' => 'empresa@xyz.com',
                'endereco' => 'Zona Industrial, Luanda',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
