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

        /* ══════════════ EMPRESA ══════════════ */
        $empresaId = (string) Str::uuid();
        DB::table('empresas')->insert([
            'id'            => $empresaId,
            'nome'          => 'SDOCA',
            'nif'           => '5001234507',
            'email'         => 'sdoca@gmail.com',
            'logo'          => '/public/images/logo.jpg',
            'status'        => 'ativo',
            'regime_fiscal' => 'geral',
            'sujeito_iva'   => true,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        /* ══════════════ UTILIZADORES ══════════════ */
        $users = [
            ['name' => 'SDOCA',    'email' => 'sdoca@gmail.com',          'role' => 'admin'],
            ['name' => 'Diniz',    'email' => 'dinizcabenda@gmail.com',    'role' => 'admin'],
            ['name' => 'Alice',    'email' => 'alicerocha507@gmail.com',   'role' => 'operador'],
            ['name' => 'Stefania', 'email' => 'estefania@gmail.com',       'role' => 'contablista'],
        ];

        foreach ($users as $user) {
            DB::table('users')->insert([
                'id'           => (string) Str::uuid(),
                'empresa_id'   => $empresaId,
                'name'         => $user['name'],
                'email'        => $user['email'],
                'password'     => Hash::make('123456'),
                'role'         => $user['role'],
                'ativo'        => true,
                'ultimo_login' => null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }

        $adminUserId = DB::table('users')->where('role', 'admin')->value('id');

        /* ══════════════ CATEGORIAS ══════════════ */
        $cosmeticosId  = (string) Str::uuid();
        $alimentacaoId = (string) Str::uuid();
        $servicosId    = (string) Str::uuid();

        DB::table('categorias')->insert([
            [
                'id'         => $cosmeticosId,
                'nome'       => 'Cosméticos',
                'descricao'  => 'Produtos de cosmética',
                'status'     => 'ativo',
                'tipo'       => 'produto',
                'user_id'    => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id'         => $alimentacaoId,
                'nome'       => 'Alimentação',
                'descricao'  => 'Produtos alimentares',
                'status'     => 'ativo',
                'tipo'       => 'produto',
                'user_id'    => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id'         => $servicosId,
                'nome'       => 'Serviços Profissionais',
                'descricao'  => 'Serviços técnicos e de consultoria',
                'status'     => 'ativo',
                'tipo'       => 'servico',
                'user_id'    => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        /* ══════════════ FORNECEDORES ══════════════ */
        $fornecedorId = (string) Str::uuid();
        DB::table('fornecedores')->insert([
            'id'         => $fornecedorId,
            'nome'       => 'Fornecedor Cosméticos Ltda',
            'tipo'       => 'nacional',
            'nif'        => '123456789',
            'telefone'   => '912345678',
            'email'      => 'cosmeticos@fornecedor.com',
            'endereco'   => 'Av. dos Fornecedores, Luanda',
            'user_id'    => $adminUserId,
            'status'     => 'ativo',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ══════════════ PRODUTOS E SERVIÇOS ══════════════ */
        $cremeId       = (string) Str::uuid();
        $arrozId       = (string) Str::uuid();
        $consultoriaId = (string) Str::uuid();
        $manutencaoId  = (string) Str::uuid();
        $instalacaoId  = (string) Str::uuid();

        $produtos = [
            [
                'id'               => $cremeId,
                'categoria_id'     => $cosmeticosId,
                'fornecedor_id'    => $fornecedorId,
                'nome'             => 'Creme Facial',
                'descricao'        => 'Creme hidratante para rosto',
                'preco_compra'     => 5000,
                'preco_venda'      => 8000,
                'taxa_iva'         => 14,
                'sujeito_iva'      => true,
                'estoque_atual'    => 50,
                'estoque_minimo'   => 10,
                'custo_medio'      => 5000,
                'status'           => 'ativo',
                'tipo'             => 'produto',
                'user_id'          => $adminUserId,
                'taxa_retencao'    => null,
                'codigo_isencao'   => null,
                'duracao_estimada' => null,
                'unidade_medida'   => null,
            ],
            [
                'id'               => $arrozId,
                'categoria_id'     => $alimentacaoId,
                'fornecedor_id'    => null,
                'nome'             => 'Arroz Premium 5kg',
                'descricao'        => 'Arroz importado premium',
                'preco_compra'     => 12000,
                'preco_venda'      => 15000,
                'taxa_iva'         => 5,
                'sujeito_iva'      => true,
                'estoque_atual'    => 100,
                'estoque_minimo'   => 20,
                'custo_medio'      => 12000,
                'status'           => 'ativo',
                'tipo'             => 'produto',
                'user_id'          => $adminUserId,
                'taxa_retencao'    => null,
                'codigo_isencao'   => null,
                'duracao_estimada' => null,
                'unidade_medida'   => null,
            ],
            [
                'id'               => $consultoriaId,
                'categoria_id'     => $servicosId,
                'fornecedor_id'    => null,
                'nome'             => 'Consultoria Fiscal',
                'descricao'        => 'Consultoria em legislação fiscal angolana',
                'preco_compra'     => 0,
                'preco_venda'      => 75000,
                'taxa_iva'         => 14,
                'sujeito_iva'      => true,
                'estoque_atual'    => 0,
                'estoque_minimo'   => 0,
                'custo_medio'      => 0,
                'status'           => 'ativo',
                'tipo'             => 'servico',
                'user_id'          => $adminUserId,
                'taxa_retencao'    => 6.5,
                'codigo_isencao'   => null,
                'duracao_estimada' => '4 horas',
                'unidade_medida'   => 'hora',
            ],
            [
                'id'               => $manutencaoId,
                'categoria_id'     => $servicosId,
                'fornecedor_id'    => null,
                'nome'             => 'Manutenção de Software',
                'descricao'        => 'Manutenção mensal do sistema',
                'preco_compra'     => 0,
                'preco_venda'      => 35000,
                'taxa_iva'         => 14,
                'sujeito_iva'      => true,
                'estoque_atual'    => 0,
                'estoque_minimo'   => 0,
                'custo_medio'      => 0,
                'status'           => 'ativo',
                'tipo'             => 'servico',
                'user_id'          => $adminUserId,
                'taxa_retencao'    => 6.5,
                'codigo_isencao'   => null,
                'duracao_estimada' => '1 mês',
                'unidade_medida'   => 'mes',
            ],
            [
                'id'               => $instalacaoId,
                'categoria_id'     => $servicosId,
                'fornecedor_id'    => null,
                'nome'             => 'Instalação de Equipamento',
                'descricao'        => 'Instalação técnica no local',
                'preco_compra'     => 0,
                'preco_venda'      => 25000,
                'taxa_iva'         => 14,
                'sujeito_iva'      => true,
                'estoque_atual'    => 0,
                'estoque_minimo'   => 0,
                'custo_medio'      => 0,
                'status'           => 'ativo',
                'tipo'             => 'servico',
                'user_id'          => $adminUserId,
                'taxa_retencao'    => 6.5,
                'codigo_isencao'   => null,
                'duracao_estimada' => '2 horas',
                'unidade_medida'   => 'hora',
            ],
        ];

        foreach ($produtos as $produto) {
            DB::table('produtos')->insert(array_merge($produto, [
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        /* ══════════════ CLIENTES ══════════════ */
        $clienteId        = (string) Str::uuid();
        $clienteEmpresaId = (string) Str::uuid();

        DB::table('clientes')->insert([
            [
                'id'            => $clienteId,
                'nome'          => 'Consumidor Final',
                'nif'           => null,
                'tipo'          => 'consumidor_final',
                'status'        => 'ativo',
                'telefone'      => '911234567',
                'email'         => 'cliente@teste.com',
                'endereco'      => 'Bairro Central, Luanda',
                'data_registro' => $now->toDateString(),
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
            [
                'id'            => $clienteEmpresaId,
                'nome'          => 'Empresa Teste Lda',
                'nif'           => '5009876543',
                'tipo'          => 'empresa',
                'status'        => 'ativo',
                'telefone'      => '922345678',
                'email'         => 'empresa@teste.com',
                'endereco'      => 'Av. Empresarial, Luanda',
                'data_registro' => $now->toDateString(),
                'created_at'    => $now,
                'updated_at'    => $now,
            ],
        ]);

        /* ══════════════ COMPRA ══════════════ */
        $compraId             = (string) Str::uuid();
        $totalCompra          = 5000 * 10;
        $baseTributavelCompra = round($totalCompra / 1.14, 2);
        $ivaCompra            = round($totalCompra - $baseTributavelCompra, 2);

        DB::table('compras')->insert([
            'id'                   => $compraId,
            'fornecedor_id'        => $fornecedorId,
            'user_id'              => $adminUserId,
            'data'                 => $now->toDateString(),
            'tipo_documento'       => 'fatura',
            'numero_documento'     => 'FC/2024/0001',
            'data_emissao'         => $now->toDateString(),
            'base_tributavel'      => $baseTributavelCompra,
            'total_iva'            => $ivaCompra,
            'total_fatura'         => $totalCompra,
            'validado_fiscalmente' => true,
            'total'                => $totalCompra,
            'created_at'           => $now,
            'updated_at'           => $now,
        ]);

        DB::table('itens_compras')->insert([
            'id'              => (string) Str::uuid(),
            'compra_id'       => $compraId,
            'produto_id'      => $cremeId,
            'quantidade'      => 10,
            'preco_compra'    => 5000,
            'subtotal'        => $totalCompra,
            'base_tributavel' => $baseTributavelCompra,
            'valor_iva'       => $ivaCompra,
            'created_at'      => $now,
            'updated_at'      => $now,
        ]);

        /* ══════════════ VENDA 1 — FT ══════════════ */
        $venda1Id = (string) Str::uuid();
        $qtd1     = 2;
        $preco1   = 8000;
        $base1    = $qtd1 * $preco1;
        $iva1     = round($base1 * 14 / 100, 2);
        $liquido1 = $base1 + $iva1;

        DB::table('vendas')->insert([
            'id'                    => $venda1Id,
            'cliente_id'            => $clienteId,
            'user_id'               => $adminUserId,
            'documento_fiscal_id'   => null,
            'numero'                => 1,
            'numero_documento'      => 'VD-000001',
            'data_venda'            => $now->toDateString(),
            'hora_venda'            => $now->toTimeString(),
            'base_tributavel'       => $base1,
            'total_iva'             => $iva1,
            'total_retencao'        => 0,
            'total_pagar'           => $liquido1,
            'total'                 => $liquido1,
            'status'                => 'faturada',
            'estado_pagamento'      => 'pendente',
            'tipo_documento_fiscal' => 'FT',
            'created_at'            => $now,
            'updated_at'            => $now,
        ]);

        DB::table('itens_venda')->insert([
            'id'              => (string) Str::uuid(),
            'venda_id'        => $venda1Id,
            'produto_id'      => $cremeId,
            'descricao'       => 'Creme Facial',
            'quantidade'      => $qtd1,
            'preco_venda'     => $preco1,
            'desconto'        => 0,
            'base_tributavel' => $base1,
            'taxa_iva'        => 14,
            'valor_iva'       => $iva1,
            'taxa_retencao'   => 0,
            'valor_retencao'  => 0,
            'subtotal'        => $liquido1,
            'created_at'      => $now,
            'updated_at'      => $now,
        ]);

        $docFtId  = (string) Str::uuid();
        $numFt    = 1;
        $numDocFt = 'B-' . str_pad($numFt, 5, '0', STR_PAD_LEFT);
        $hashFt   = hash('sha256', "{$numDocFt}|{$now->toDateString()}|" . number_format($liquido1, 2, '.', '') . '|CF');

        DB::table('documentos_fiscais')->insert([
            'id'                   => $docFtId,
            'user_id'              => $adminUserId,
            'venda_id'             => $venda1Id,
            'cliente_id'           => $clienteId,
            'fatura_id'            => null,
            'serie'                => 'B',
            'numero'               => $numFt,
            'numero_documento'     => $numDocFt,
            'tipo_documento'       => 'FT',
            'data_emissao'         => $now->toDateString(),
            'hora_emissao'         => $now->toTimeString(),
            'data_vencimento'      => $now->copy()->addDays(30)->toDateString(),
            'data_cancelamento'    => null,
            'base_tributavel'      => $base1,
            'total_iva'            => $iva1,
            'total_retencao'       => 0,
            'total_liquido'        => $liquido1,
            'estado'               => 'emitido',
            'motivo'               => null,
            'motivo_cancelamento'  => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento'     => null,
            'referencia_pagamento' => null,
            'hash_fiscal'          => $hashFt,
            'hash_anterior'        => '0',
            'rsa_assinatura'       => null,
            'rsa_versao_chave'     => null,
            'qr_code'              => null,
            'referencia_externa'   => null,
            'created_at'           => $now,
            'updated_at'           => $now,
        ]);

        DB::table('itens_documento_fiscal')->insert([
            'id'                  => (string) Str::uuid(),
            'documento_fiscal_id' => $docFtId,
            'produto_id'          => $cremeId,
            'item_origem_id'      => null,
            'descricao'           => 'Creme Facial',
            'referencia'          => null,
            'quantidade'          => $qtd1,
            'unidade'             => 'UN',
            'preco_unitario'      => $preco1,
            'desconto'            => 0,
            'base_tributavel'     => $base1,
            'taxa_iva'            => 14,
            'valor_iva'           => $iva1,
            'codigo_isencao'      => null,
            'motivo_isencao'      => null,
            'taxa_retencao'       => 0,
            'valor_retencao'      => 0,
            'total_linha'         => $liquido1,
            'ordem'               => 1,
            'motivo_alteracao'    => null,
            'observacoes'         => null,
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);

        DB::table('vendas')->where('id', $venda1Id)->update(['documento_fiscal_id' => $docFtId]);

        DB::table('series_fiscais')
            ->where('tipo_documento', 'FT')->where('serie', 'B')->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numFt]);

        /* ══════════════ VENDA 2 — FR ══════════════ */
        $venda2Id  = (string) Str::uuid();
        $qtd2      = 1;
        $preco2    = 75000;
        $base2     = $qtd2 * $preco2;
        $iva2      = round($base2 * 14 / 100, 2);
        $retencao2 = round($base2 * 6.5 / 100, 2);
        $liquido2  = $base2 + $iva2 - $retencao2;

        DB::table('vendas')->insert([
            'id'                    => $venda2Id,
            'cliente_id'            => $clienteEmpresaId,
            'user_id'               => $adminUserId,
            'documento_fiscal_id'   => null,
            'numero'                => 2,
            'numero_documento'      => 'VD-000002',
            'data_venda'            => $now->toDateString(),
            'hora_venda'            => $now->toTimeString(),
            'base_tributavel'       => $base2,
            'total_iva'             => $iva2,
            'total_retencao'        => $retencao2,
            'total_pagar'           => $liquido2,
            'total'                 => $liquido2,
            'status'                => 'faturada',
            'estado_pagamento'      => 'paga',
            'tipo_documento_fiscal' => 'FR',
            'created_at'            => $now,
            'updated_at'            => $now,
        ]);

        DB::table('itens_venda')->insert([
            'id'              => (string) Str::uuid(),
            'venda_id'        => $venda2Id,
            'produto_id'      => $consultoriaId,
            'descricao'       => 'Consultoria Fiscal',
            'quantidade'      => $qtd2,
            'preco_venda'     => $preco2,
            'desconto'        => 0,
            'base_tributavel' => $base2,
            'taxa_iva'        => 14,
            'valor_iva'       => $iva2,
            'taxa_retencao'   => 6.5,
            'valor_retencao'  => $retencao2,
            'subtotal'        => $liquido2,
            'created_at'      => $now,
            'updated_at'      => $now,
        ]);

        $docFrId  = (string) Str::uuid();
        $numFr    = 1;
        $numDocFr = 'R-' . str_pad($numFr, 5, '0', STR_PAD_LEFT);
        $hashFr   = hash('sha256', "{$numDocFr}|{$now->toDateString()}|" . number_format($liquido2, 2, '.', '') . '|' . $clienteEmpresaId);

        DB::table('documentos_fiscais')->insert([
            'id'                   => $docFrId,
            'user_id'              => $adminUserId,
            'venda_id'             => $venda2Id,
            'cliente_id'           => $clienteEmpresaId,
            'fatura_id'            => null,
            'serie'                => 'R',
            'numero'               => $numFr,
            'numero_documento'     => $numDocFr,
            'tipo_documento'       => 'FR',
            'data_emissao'         => $now->toDateString(),
            'hora_emissao'         => $now->toTimeString(),
            'data_vencimento'      => null,
            'data_cancelamento'    => null,
            'base_tributavel'      => $base2,
            'total_iva'            => $iva2,
            'total_retencao'       => $retencao2,
            'total_liquido'        => $liquido2,
            'estado'               => 'paga',
            'motivo'               => null,
            'motivo_cancelamento'  => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento'     => 'transferencia',
            'referencia_pagamento' => 'REF/2024/001',
            'hash_fiscal'          => $hashFr,
            'hash_anterior'        => '0',
            'rsa_assinatura'       => null,
            'rsa_versao_chave'     => null,
            'qr_code'              => null,
            'referencia_externa'   => null,
            'created_at'           => $now,
            'updated_at'           => $now,
        ]);

        DB::table('itens_documento_fiscal')->insert([
            'id'                  => (string) Str::uuid(),
            'documento_fiscal_id' => $docFrId,
            'produto_id'          => $consultoriaId,
            'item_origem_id'      => null,
            'descricao'           => 'Consultoria Fiscal',
            'referencia'          => null,
            'quantidade'          => $qtd2,
            'unidade'             => 'hora',
            'preco_unitario'      => $preco2,
            'desconto'            => 0,
            'base_tributavel'     => $base2,
            'taxa_iva'            => 14,
            'valor_iva'           => $iva2,
            'codigo_isencao'      => null,
            'motivo_isencao'      => null,
            'taxa_retencao'       => 6.5,
            'valor_retencao'      => $retencao2,
            'total_linha'         => $liquido2,
            'ordem'               => 1,
            'motivo_alteracao'    => null,
            'observacoes'         => null,
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);

        DB::table('vendas')->where('id', $venda2Id)->update(['documento_fiscal_id' => $docFrId]);

        DB::table('series_fiscais')
            ->where('tipo_documento', 'FR')->where('serie', 'R')->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numFr]);

        /* ══════════════ RECIBO ══════════════ */
        $reciboId = (string) Str::uuid();
        $numRc    = 1;
        $numDocRc = 'RC-' . str_pad($numRc, 5, '0', STR_PAD_LEFT);
        $hashRc   = hash('sha256', "{$numDocRc}|{$now->copy()->addDays(5)->toDateString()}|" . number_format($liquido1, 2, '.', '') . '|CF');

        DB::table('documentos_fiscais')->insert([
            'id'                   => $reciboId,
            'user_id'              => $adminUserId,
            'venda_id'             => null,
            'cliente_id'           => $clienteId,
            'fatura_id'            => $docFtId,
            'serie'                => 'RC',
            'numero'               => $numRc,
            'numero_documento'     => $numDocRc,
            'tipo_documento'       => 'RC',
            'data_emissao'         => $now->copy()->addDays(5)->toDateString(),
            'hora_emissao'         => $now->toTimeString(),
            'data_vencimento'      => null,
            'data_cancelamento'    => null,
            'base_tributavel'      => 0,
            'total_iva'            => 0,
            'total_retencao'       => 0,
            'total_liquido'        => $liquido1,
            'estado'               => 'paga',
            'motivo'               => null,
            'motivo_cancelamento'  => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento'     => 'dinheiro',
            'referencia_pagamento' => 'Pagamento em espécie',
            'hash_fiscal'          => $hashRc,
            'hash_anterior'        => '0',
            'rsa_assinatura'       => null,
            'rsa_versao_chave'     => null,
            'qr_code'              => null,
            'referencia_externa'   => null,
            'created_at'           => $now,
            'updated_at'           => $now,
        ]);

        DB::table('documentos_fiscais')->where('id', $docFtId)->update(['estado' => 'paga']);
        DB::table('vendas')->where('id', $venda1Id)->update(['estado_pagamento' => 'paga']);

        DB::table('series_fiscais')
            ->where('tipo_documento', 'RC')->where('serie', 'RC')->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numRc]);

        /* ══════════════ VENDA 3 — FA ══════════════ */
        $venda3Id          = (string) Str::uuid();
        $valorAdiantamento = 30000;

        DB::table('vendas')->insert([
            'id'                    => $venda3Id,
            'cliente_id'            => $clienteEmpresaId,
            'user_id'               => $adminUserId,
            'documento_fiscal_id'   => null,
            'numero'                => 3,
            'numero_documento'      => 'VD-000003',
            'data_venda'            => $now->toDateString(),
            'hora_venda'            => $now->toTimeString(),
            'base_tributavel'       => $valorAdiantamento,
            'total_iva'             => 0,
            'total_retencao'        => 0,
            'total_pagar'           => $valorAdiantamento,
            'total'                 => $valorAdiantamento,
            'status'                => 'faturada',
            'estado_pagamento'      => 'pendente',
            'tipo_documento_fiscal' => 'FA',
            'created_at'            => $now,
            'updated_at'            => $now,
        ]);

        $docFaId  = (string) Str::uuid();
        $numFa    = 1;
        $numDocFa = 'A-' . str_pad($numFa, 5, '0', STR_PAD_LEFT);
        $hashFa   = hash('sha256', "{$numDocFa}|{$now->toDateString()}|" . number_format($valorAdiantamento, 2, '.', '') . '|' . $clienteEmpresaId);

        DB::table('documentos_fiscais')->insert([
            'id'                   => $docFaId,
            'user_id'              => $adminUserId,
            'venda_id'             => $venda3Id,
            'cliente_id'           => $clienteEmpresaId,
            'fatura_id'            => null,
            'serie'                => 'A',
            'numero'               => $numFa,
            'numero_documento'     => $numDocFa,
            'tipo_documento'       => 'FA',
            'data_emissao'         => $now->toDateString(),
            'hora_emissao'         => $now->toTimeString(),
            'data_vencimento'      => $now->copy()->addDays(15)->toDateString(),
            'data_cancelamento'    => null,
            'base_tributavel'      => $valorAdiantamento,
            'total_iva'            => 0,
            'total_retencao'       => 0,
            'total_liquido'        => $valorAdiantamento,
            'estado'               => 'emitido',
            'motivo'               => null,
            'motivo_cancelamento'  => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento'     => 'transferencia',
            'referencia_pagamento' => 'ADIANT/2024/001',
            'hash_fiscal'          => $hashFa,
            'hash_anterior'        => '0',
            'rsa_assinatura'       => null,
            'rsa_versao_chave'     => null,
            'qr_code'              => null,
            'referencia_externa'   => null,
            'created_at'           => $now,
            'updated_at'           => $now,
        ]);

        DB::table('itens_documento_fiscal')->insert([
            'id'                  => (string) Str::uuid(),
            'documento_fiscal_id' => $docFaId,
            'produto_id'          => null,
            'item_origem_id'      => null,
            'descricao'           => 'Adiantamento para futura aquisição de produtos',
            'referencia'          => 'ADIANT',
            'quantidade'          => 1,
            'unidade'             => 'UN',
            'preco_unitario'      => $valorAdiantamento,
            'desconto'            => 0,
            'base_tributavel'     => $valorAdiantamento,
            'taxa_iva'            => 0,
            'valor_iva'           => 0,
            'codigo_isencao'      => 'M00',
            'motivo_isencao'      => 'Não sujeito / não tributado',
            'taxa_retencao'       => 0,
            'valor_retencao'      => 0,
            'total_linha'         => $valorAdiantamento,
            'ordem'               => 1,
            'motivo_alteracao'    => null,
            'observacoes'         => 'Válido por 15 dias',
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);

        DB::table('vendas')->where('id', $venda3Id)->update(['documento_fiscal_id' => $docFaId]);

        DB::table('series_fiscais')
            ->where('tipo_documento', 'FA')->where('serie', 'A')->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numFa]);

        /* ══════════════ VÍNCULO ADIANTAMENTO → FATURA ══════════════ */
        DB::table('adiantamento_fatura')->insert([
            'id'              => (string) Str::uuid(),
            'adiantamento_id' => $docFaId,
            'fatura_id'       => $docFtId,
            'valor_utilizado' => min($valorAdiantamento, $liquido1),
            'created_at'      => $now,
            'updated_at'      => $now,
        ]);

        /* ══════════════ MOVIMENTO DE STOCK ══════════════ */
        DB::table('movimentos_stock')->insert([
            'id'               => (string) Str::uuid(),
            'produto_id'       => $cremeId,
            'user_id'          => $adminUserId,
            'tipo'             => 'saida',
            'tipo_movimento'   => 'venda',
            'quantidade'       => -$qtd1,
            'estoque_anterior' => 50,
            'estoque_novo'     => 50 - $qtd1,
            'custo_medio'      => 5000,
            'stock_minimo'     => 10,
            'referencia'       => $docFtId,
            'observacao'       => "Documento: {$numDocFt} | Item: Creme Facial",
            'created_at'       => $now,
            'updated_at'       => $now,
        ]);

        DB::table('produtos')->where('id', $cremeId)->update(['estoque_atual' => 50 - $qtd1]);

        /* ══════════════ APURAMENTO IVA ══════════════ */
        DB::table('apuramento_iva')->insert([
            'id'            => (string) Str::uuid(),
            'user_id'       => $adminUserId,
            'periodo'       => now()->format('m/Y'),
            'iva_liquidado' => $iva1 + $iva2,
            'iva_dedutivel' => $ivaCompra,
            'iva_a_pagar'   => max(($iva1 + $iva2) - $ivaCompra, 0),
            'estado'        => 'aberto',
            'data_fecho'    => null,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);
    }
}
