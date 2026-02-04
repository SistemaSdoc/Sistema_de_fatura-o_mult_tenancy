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
        $now = now();

        /* ================= EMPRESA ================= */
        $empresaId = Str::uuid();
        DB::table('empresas')->insert([
            'id' => $empresaId,
            'nome' => 'SDOCA',
            'nif' => '5001234507',
            'email' => 'sdoca@gmail.com',
            'logo' => null,
            'status' => 'ativo',
            'regime_fiscal' => 'geral',
            'sujeito_iva' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= USUÁRIOS ================= */
        $users = [
            ['name' => 'Diniz', 'email' => 'dinizcabenda@gmail.com', 'role' => 'admin'],
            ['name' => 'Alice', 'email' => 'alicerocha507@gmail.com', 'role' => 'operador'],
            ['name' => 'Stefania', 'email' => 'estefania@gmail.com', 'role' => 'contablista'],
        ];

        foreach ($users as $user) {
            DB::table('users')->insert([
                'id' => $id = Str::uuid(),
                'empresa_id' => $empresaId,
                'name' => $user['name'],
                'email' => $user['email'],
                'password' => Hash::make('123456'),
                'role' => $user['role'],
                'ativo' => true,
                'ultimo_login' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $adminUserId = DB::table('users')->where('role', 'admin')->first()->id;

        /* ================= CATEGORIAS ================= */
        $cosmeticosId = Str::uuid();
        $alimentacaoId = Str::uuid();
        DB::table('categorias')->insert([
            [
                'id' => $cosmeticosId,
                'nome' => 'Cosméticos',
                'descricao' => 'Produtos de cosmética',
                'status' => 'ativo',
                'tipo' => 'Produto',
                'user_id' => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $alimentacaoId,
                'nome' => 'Alimentação',
                'descricao' => 'Produtos alimentares',
                'status' => 'ativo',
                'tipo' => 'Produto',
                'user_id' => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        /* ================= PRODUTOS ================= */
        $produtos = [
            [
                'id' => $cremeId = Str::uuid(),
                'categoria_id' => $cosmeticosId,
                'nome' => 'Creme Facial',
                'descricao' => 'Creme hidratante para rosto',
                'preco_compra' => 5000,
                'preco_venda' => 8000,
                'taxa_iva' => 14,
                'estoque_atual' => 50,
                'estoque_minimo' => 10,
                'custo_medio' => 5000,
                'status' => 'ativo',
                'user_id' => $adminUserId,
            ],
            [
                'id' => $arrozId = Str::uuid(),
                'categoria_id' => $alimentacaoId,
                'nome' => 'Arroz Premium 5kg',
                'descricao' => 'Arroz importado premium',
                'preco_compra' => 12000,
                'preco_venda' => 15000,
                'taxa_iva' => 14,
                'estoque_atual' => 100,
                'estoque_minimo' => 20,
                'custo_medio' => 12000,
                'status' => 'ativo',
                'user_id' => $adminUserId,
            ],
        ];

        foreach ($produtos as $p) {
            DB::table('produtos')->insert(array_merge($p, [
                'created_at' => $now,
                'updated_at' => $now
            ]));
        }

        /* ================= FORNECEDORES ================= */
        $fornecedorId = Str::uuid();
        DB::table('fornecedores')->insert([
            'id' => $fornecedorId,
            'nome' => 'Fornecedor Cosméticos Ltda',
            'tipo' => 'nacional',
            'nif' => '123456789',
            'telefone' => '912345678',
            'email' => 'cosmeticos@fornecedor.com',
            'endereco' => 'Av. dos Fornecedores, Luanda',
            'user_id' => $adminUserId,
            'status' => 'ativo',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= CLIENTES ================= */
        $clienteId = Str::uuid();
        DB::table('clientes')->insert([
            'id' => $clienteId,
            'nome' => 'Cliente Final',
            'nif' => null,
            'tipo' => 'consumidor_final',
            'telefone' => '911234567',
            'email' => 'cliente@teste.com',
            'endereco' => 'Bairro Central, Luanda',
            'data_registro' => $now->toDateString(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= COMPRA ================= */
        $compraId = Str::uuid();
        DB::table('compras')->insert([
            'id' => $compraId,
            'fornecedor_id' => $fornecedorId,
            'data' => $now->toDateString(),
            'total' => 5000 * 10, // Creme Facial x10
            'created_at' => $now,
            'updated_at' => $now,
            'user_id' => $adminUserId,
            'tipo_documento' => 'fatura',
            'numero_documento' => 'FC/2024/0001',
            'data_emissao' => $now->toDateString(),
            'base_tributavel' => 5000 * 10 / 1.14,
            'total_iva' => (5000 * 10) - (5000 * 10 / 1.14),
            'total_fatura' => 5000 * 10,
            'validado_fiscalmente' => true,
            'total' => 5000 * 10,

        ]);

        DB::table('itens_compras')->insert([
            'id' => Str::uuid(),
            'compra_id' => $compraId,
            'produto_id' => $cremeId,
            'quantidade' => 10,
            'preco_compra' => 5000,
            'subtotal' => 5000*10,
            'base_tributavel' => 5000 * 10 / 1.14,
            'valor_iva' => (5000 * 10) - (5000 * 10 / 1.14),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= VENDAS ================= */
        $vendaId = Str::uuid();
        DB::table('vendas')->insert([
            'id' => $vendaId,
            'cliente_id' => $clienteId,
            'user_id' => $adminUserId,
            'data_venda' => $now->toDateString(),
            'hora_venda' => $now->toTimeString(),
            'total' => 8000*2, // Creme Facial x2
            'status' => 'aberta',
            'tipo_documento' => 'fatura',
            'serie' => 'FT',
            'numero' => '00001',
            'base_tributavel' => (8000*2) / 1.14,
            'total_iva' => (8000*2) - ((8000*2) / 1.14),
            'total_retencao' => ((8000*2) * 0.06), // 6% retenção
            'total_pagar' => (8000*2) - ((8000*2) * 0.06),

            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('itens_venda')->insert([
            'id' => Str::uuid(),
            'venda_id' => $vendaId,
            'produto_id' => $cremeId,
            'quantidade' => 2,
            'preco_venda' => 8000,
            'subtotal' => 8000*2,
            'desconto' => 0,
            'base_tributavel' => (8000*2) / 1.14,
            'valor_iva' => (8000*2) - ((8000*2) / 1.14),
            'valor_retencao' => (8000*2) * 0.06, // 6% retenção
            'descricao' => 'Creme Facial',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= FATURAS ================= */
        $faturaId = Str::uuid();
        $totalBruto = 8000*2;
        $iva = $totalBruto*0.14; // 14%
        $retencao = $totalBruto*0.06; // 6%
        $totalLiquido = $totalBruto + $iva - $retencao;

        DB::table('faturas')->insert([
            'id' => $faturaId,
            'venda_id' => $vendaId,
            'cliente_id' => $clienteId,
            'user_id' => $adminUserId,
            'numero' => 'FT/' . date('Y') . '/00001',
            'tipo_documento' => 'FT',
            'data_emissao' => $now->toDateString(),
            'hora_emissao' => $now->toTimeString(),
            'data_vencimento' => $now->addDays(30)->toDateString(),
            'base_tributavel' => $totalBruto / 1.14,
            'total_iva' => $iva,
            'total_retencao' => $retencao,
            'total_liquido' => $totalLiquido,
            'estado' => 'emitido',
            'hash_fiscal' => sha1(Str::uuid()),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('itens_fatura')->insert([
            'id' => Str::uuid(),
            'fatura_id' => $faturaId,
            'produto_id' => $cremeId,
            'descricao' => 'Creme Facial',
            'quantidade' => 2,
            'preco_unitario' => 8000,
            'taxa_iva' => 14,
            'valor_iva' => $iva,
            'valor_retencao' => $retencao,
            'desconto' => 0,
            'total_linha' => $totalLiquido,
            'base_tributavel' => $totalBruto,    
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= PAGAMENTOS ================= */
        DB::table('pagamentos')->insert([
            'id' => Str::uuid(),
            'fatura_id' => $faturaId,
            'user_id' => $adminUserId,
            'metodo' => 'dinheiro',
            'valor_pago' => $totalLiquido,
            'troco' => 0,
            'data_pagamento' => $now->toDateString(),
            'hora_pagamento' => $now->toTimeString(),
            'referencia' => 'Pagamento Seed',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= MOVIMENTO DE STOCK ================= */
        DB::table('movimentos_stock')->insert([
            'id' => Str::uuid(),
            'produto_id' => $cremeId,
            'user_id' => $adminUserId,
            'tipo' => 'saida',
            'tipo_movimento' => 'venda',
            'quantidade' => 2,
            'referencia' => $vendaId,
            'custo_medio' => 5000,
            'stock_minimo' => 10,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= LOGS FISCAIS ================= */
        DB::table('logs_fiscais')->insert([
            'id' => Str::uuid(),
            'user_id' => $adminUserId,
            'entidade' => 'fatura',
            'entidade_id' => $faturaId,
            'acao' => 'emitir',
            'data_acao' => $now,
            'detalhe' => 'Seed inicial de fatura com IVA e retenção',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= APURAMENTO_IVA ================= */
        DB::table('apuramento_iva')->updateOrInsert(
            ['periodo' => now()->format('m/Y')],
            [
                'id' => Str::uuid(),
                'user_id' => $adminUserId,
                'iva_liquidado' => $iva,
                'iva_dedutivel' => 5000*10*0.14, // Exemplo: compra do creme x10
                'iva_a_pagar' => $iva - (5000*10*0.14),
                'estado' => 'aberto',
                'data_fecho' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        /* ================= SÉRIES FISCAIS ================= */
$serieFiscalId = Str::uuid();
DB::table('series_fiscais')->insert([
    'id' => $serieFiscalId,
    'user_id' => $adminUserId,
    'tipo_documento' => 'FT',  // Fatura
    'serie' => 'A',            // Série padrão
    'ano' => date('Y'),        // Ano corrente
    'ultimo_numero' => 0,      // Começa do 0
    'ativa' => true,           // Série ativa
    'created_at' => $now,
    'updated_at' => $now,
]);

    }
}
