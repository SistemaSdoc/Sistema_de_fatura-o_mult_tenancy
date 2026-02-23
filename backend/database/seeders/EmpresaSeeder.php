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
            ['name' => 'SDOCA', 'email' => 'sdoca@gmail.com', 'role' => 'admin'],
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
        $servicosId = Str::uuid();

        DB::table('categorias')->insert([
            [
                'id' => $cosmeticosId,
                'nome' => 'Cosméticos',
                'descricao' => 'Produtos de cosmética',
                'status' => 'ativo',
                'tipo' => 'produto',
                'user_id' => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $alimentacaoId,
                'nome' => 'Alimentação',
                'descricao' => 'Produtos alimentares',
                'status' => 'ativo',
                'tipo' => 'produto',
                'user_id' => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $servicosId,
                'nome' => 'Serviços',
                'descricao' => 'Serviços diversos',
                'status' => 'ativo',
                'tipo' => 'servico',
                'user_id' => $adminUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        /* ================= PRODUTOS ================= */
        $cremeId = Str::uuid();
        $arrozId = Str::uuid();
        $servicoId = Str::uuid();

        $produtos = [
            [
                'id' => $cremeId,
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
                'tipo' => 'produto',
                'user_id' => $adminUserId,
            ],
            [
                'id' => $arrozId,
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
                'tipo' => 'produto',
                'user_id' => $adminUserId,
            ],
            [
                'id' => $servicoId,
                'categoria_id' => $servicosId,
                'nome' => 'Consultoria',
                'descricao' => 'Serviço de consultoria empresarial',
                'preco_compra' => 0,
                'preco_venda' => 50000,
                'taxa_iva' => 14,
                'estoque_atual' => 0,
                'estoque_minimo' => 0,
                'custo_medio' => 0,
                'status' => 'ativo',
                'tipo' => 'servico',
                'retencao' => 6.5,
                'duracao_estimada' => '01:00',
                'unidade_medida' => 'hora',
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
        $clienteEmpresaId = Str::uuid();

        DB::table('clientes')->insert([
            [
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
            ],
            [
                'id' => $clienteEmpresaId,
                'nome' => 'Empresa Teste Lda',
                'nif' => '5009876543',
                'tipo' => 'empresa',
                'telefone' => '922345678',
                'email' => 'empresa@teste.com',
                'endereco' => 'Av. Empresarial, Luanda',
                'data_registro' => $now->toDateString(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        /* ================= COMPRA ================= */
        $compraId = Str::uuid();
        $totalCompra = 5000 * 10;
        $baseTributavelCompra = round($totalCompra / 1.14, 2);
        $ivaCompra = round($totalCompra - $baseTributavelCompra, 2);

        DB::table('compras')->insert([
            'id' => $compraId,
            'fornecedor_id' => $fornecedorId,
            'user_id' => $adminUserId,
            'data' => $now->toDateString(),
            'tipo_documento' => 'fatura',
            'numero_documento' => 'FC/2024/0001',
            'data_emissao' => $now->toDateString(),
            'base_tributavel' => $baseTributavelCompra,
            'total_iva' => $ivaCompra,
            'total_fatura' => $totalCompra,
            'validado_fiscalmente' => true,
            'total' => $totalCompra,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('itens_compras')->insert([
            'id' => Str::uuid(),
            'compra_id' => $compraId,
            'produto_id' => $cremeId,
            'quantidade' => 10,
            'preco_compra' => 5000,
            'subtotal' => $totalCompra,
            'base_tributavel' => $baseTributavelCompra,
            'valor_iva' => $ivaCompra,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= SÉRIES FISCAIS ================= */
        $seriesFiscais = [
            ['tipo_documento' => 'FT', 'serie' => 'A', 'descricao' => 'Fatura'],
            ['tipo_documento' => 'FR', 'serie' => 'B', 'descricao' => 'Fatura-Recibo'],
            ['tipo_documento' => 'FA', 'serie' => 'F', 'descricao' => 'Fatura de Adiantamento'],
            ['tipo_documento' => 'NC', 'serie' => 'D', 'descricao' => 'Nota de Crédito'],
            ['tipo_documento' => 'ND', 'serie' => 'E', 'descricao' => 'Nota de Débito'],
            ['tipo_documento' => 'RC', 'serie' => 'C', 'descricao' => 'Recibo'],
            ['tipo_documento' => 'FRt', 'serie' => 'R', 'descricao' => 'Fatura de Retificação'],
        ];

        foreach ($seriesFiscais as $serie) {
            DB::table('series_fiscais')->insert([
                'id' => Str::uuid(),
                'user_id' => $adminUserId,
                'tipo_documento' => $serie['tipo_documento'],
                'serie' => $serie['serie'],
                'ano' => date('Y'),
                'ultimo_numero' => 0,
                'ativa' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        /* ================= VENDA 1 - Fatura Normal (FT) ================= */
        $venda1Id = Str::uuid();
        $quantidade1 = 2;
        $precoUnitario1 = 8000;
        $totalBruto1 = $precoUnitario1 * $quantidade1;
        $desconto1 = 0;
        $baseTributavel1 = $totalBruto1 - $desconto1;
        $taxaIva1 = 14;
        $valorIva1 = round($baseTributavel1 * $taxaIva1 / 100, 2);
        $valorRetencao1 = 0;
        $totalLiquido1 = $baseTributavel1 + $valorIva1 - $valorRetencao1;

        DB::table('vendas')->insert([
            'id' => $venda1Id,
            'cliente_id' => $clienteId,
            'user_id' => $adminUserId,
            'documento_fiscal_id' => null,
            'data_venda' => $now->toDateString(),
            'hora_venda' => $now->toTimeString(),
            'total' => $totalLiquido1,
            'status' => 'faturada',
            'estado_pagamento' => 'pendente',
            'tipo_documento' => 'venda',
            'serie' => 'A',
            'numero' => '00001',
            'base_tributavel' => $baseTributavel1,
            'total_iva' => $valorIva1,
            'total_retencao' => $valorRetencao1,
            'total_pagar' => $totalLiquido1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('itens_venda')->insert([
            'id' => Str::uuid(),
            'venda_id' => $venda1Id,
            'produto_id' => $cremeId,
            'descricao' => 'Creme Facial',
            'quantidade' => $quantidade1,
            'preco_venda' => $precoUnitario1,
            'desconto' => $desconto1,
            'base_tributavel' => $baseTributavel1,
            'valor_iva' => $valorIva1,
            'valor_retencao' => $valorRetencao1,
            'subtotal' => $totalLiquido1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Documento Fiscal FT (Fatura)
        $documentoFtId = Str::uuid();
        $numeroFt = 1;
        $numeroDocumentoFt = 'A-' . str_pad($numeroFt, 5, '0', STR_PAD_LEFT);

        DB::table('documentos_fiscais')->insert([
            'id' => $documentoFtId,
            'user_id' => $adminUserId,
            'venda_id' => $venda1Id,
            'cliente_id' => $clienteId,
            'fatura_id' => null,
            'serie' => 'A',
            'numero' => $numeroFt,
            'numero_documento' => $numeroDocumentoFt,
            'tipo_documento' => 'FT',
            'data_emissao' => $now->toDateString(),
            'hora_emissao' => $now->toTimeString(),
            'data_vencimento' => $now->copy()->addDays(30)->toDateString(),
            'data_cancelamento' => null,
            'base_tributavel' => $baseTributavel1,
            'total_iva' => $valorIva1,
            'total_retencao' => $valorRetencao1,
            'total_liquido' => $totalLiquido1,
            'estado' => 'emitido',
            'motivo' => null,
            'motivo_cancelamento' => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento' => null,
            'referencia_pagamento' => null,
            'hash_fiscal' => sha1($numeroDocumentoFt . $now->toDateString() . number_format($totalLiquido1, 2, '.', '')),
            'referencia_externa' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Item do Documento Fiscal FT
        DB::table('itens_documento_fiscal')->insert([
            'id' => Str::uuid(),
            'documento_fiscal_id' => $documentoFtId,
            'produto_id' => $cremeId,
            'item_origem_id' => null,
            'descricao' => 'Creme Facial',
            'referencia' => 'CREME001',
            'quantidade' => $quantidade1,
            'unidade' => 'UN',
            'preco_unitario' => $precoUnitario1,
            'desconto' => $desconto1,
            'base_tributavel' => $baseTributavel1,
            'taxa_iva' => $taxaIva1,
            'valor_iva' => $valorIva1,
            'taxa_retencao' => 0,
            'valor_retencao' => 0,
            'total_linha' => $totalLiquido1,
            'ordem' => 1,
            'motivo_alteracao' => null,
            'observacoes' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Atualizar venda com documento_fiscal_id
        DB::table('vendas')->where('id', $venda1Id)->update([
            'documento_fiscal_id' => $documentoFtId,
        ]);

        // Atualizar série fiscal
        DB::table('series_fiscais')
            ->where('tipo_documento', 'FT')
            ->where('serie', 'A')
            ->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numeroFt]);

        /* ================= VENDA 2 - Fatura-Recibo (FR) ================= */
        $venda2Id = Str::uuid();
        $quantidade2 = 1;
        $precoUnitario2 = 50000;
        $totalBruto2 = $precoUnitario2 * $quantidade2;
        $desconto2 = 0;
        $baseTributavel2 = $totalBruto2 - $desconto2;
        $taxaIva2 = 14;
        $valorIva2 = round($baseTributavel2 * $taxaIva2 / 100, 2);
        $taxaRetencao2 = 6.5;
        $valorRetencao2 = round($baseTributavel2 * $taxaRetencao2 / 100, 2);
        $totalLiquido2 = $baseTributavel2 + $valorIva2 - $valorRetencao2;

        DB::table('vendas')->insert([
            'id' => $venda2Id,
            'cliente_id' => $clienteEmpresaId,
            'user_id' => $adminUserId,
            'documento_fiscal_id' => null,
            'data_venda' => $now->toDateString(),
            'hora_venda' => $now->toTimeString(),
            'total' => $totalLiquido2,
            'status' => 'faturada',
            'estado_pagamento' => 'paga',
            'tipo_documento' => 'venda',
            'serie' => 'B',
            'numero' => '00001',
            'base_tributavel' => $baseTributavel2,
            'total_iva' => $valorIva2,
            'total_retencao' => $valorRetencao2,
            'total_pagar' => $totalLiquido2,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('itens_venda')->insert([
            'id' => Str::uuid(),
            'venda_id' => $venda2Id,
            'produto_id' => $servicoId,
            'descricao' => 'Consultoria Empresarial',
            'quantidade' => $quantidade2,
            'preco_venda' => $precoUnitario2,
            'desconto' => $desconto2,
            'base_tributavel' => $baseTributavel2,
            'valor_iva' => $valorIva2,
            'valor_retencao' => $valorRetencao2,
            'subtotal' => $totalLiquido2,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Documento Fiscal FR (Fatura-Recibo)
        $documentoFrId = Str::uuid();
        $numeroFr = 1;
        $numeroDocumentoFr = 'B-' . str_pad($numeroFr, 5, '0', STR_PAD_LEFT);

        DB::table('documentos_fiscais')->insert([
            'id' => $documentoFrId,
            'user_id' => $adminUserId,
            'venda_id' => $venda2Id,
            'cliente_id' => $clienteEmpresaId,
            'fatura_id' => null,
            'serie' => 'B',
            'numero' => $numeroFr,
            'numero_documento' => $numeroDocumentoFr,
            'tipo_documento' => 'FR',
            'data_emissao' => $now->toDateString(),
            'hora_emissao' => $now->toTimeString(),
            'data_vencimento' => null,
            'data_cancelamento' => null,
            'base_tributavel' => $baseTributavel2,
            'total_iva' => $valorIva2,
            'total_retencao' => $valorRetencao2,
            'total_liquido' => $totalLiquido2,
            'estado' => 'paga',
            'motivo' => null,
            'motivo_cancelamento' => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento' => 'transferencia',
            'referencia_pagamento' => 'REF/2024/001',
            'hash_fiscal' => sha1($numeroDocumentoFr . $now->toDateString() . number_format($totalLiquido2, 2, '.', '')),
            'referencia_externa' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Item do Documento Fiscal FR
        DB::table('itens_documento_fiscal')->insert([
            'id' => Str::uuid(),
            'documento_fiscal_id' => $documentoFrId,
            'produto_id' => $servicoId,
            'item_origem_id' => null,
            'descricao' => 'Consultoria Empresarial',
            'referencia' => 'SERV001',
            'quantidade' => $quantidade2,
            'unidade' => 'HORA',
            'preco_unitario' => $precoUnitario2,
            'desconto' => $desconto2,
            'base_tributavel' => $baseTributavel2,
            'taxa_iva' => $taxaIva2,
            'valor_iva' => $valorIva2,
            'taxa_retencao' => $taxaRetencao2,
            'valor_retencao' => $valorRetencao2,
            'total_linha' => $totalLiquido2,
            'ordem' => 1,
            'motivo_alteracao' => null,
            'observacoes' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Atualizar venda com documento_fiscal_id
        DB::table('vendas')->where('id', $venda2Id)->update([
            'documento_fiscal_id' => $documentoFrId,
        ]);

        // Atualizar série fiscal
        DB::table('series_fiscais')
            ->where('tipo_documento', 'FR')
            ->where('serie', 'B')
            ->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numeroFr]);

        /* ================= RECIBO DO PAGAMENTO DA FT ================= */
        $reciboId = Str::uuid();
        $numeroRc = 1;
        $numeroDocumentoRc = 'C-' . str_pad($numeroRc, 5, '0', STR_PAD_LEFT);

        DB::table('documentos_fiscais')->insert([
            'id' => $reciboId,
            'user_id' => $adminUserId,
            'venda_id' => null,
            'cliente_id' => $clienteId,
            'fatura_id' => $documentoFtId,
            'serie' => 'C',
            'numero' => $numeroRc,
            'numero_documento' => $numeroDocumentoRc,
            'tipo_documento' => 'RC',
            'data_emissao' => $now->copy()->addDays(5)->toDateString(),
            'hora_emissao' => $now->toTimeString(),
            'data_vencimento' => null,
            'data_cancelamento' => null,
            'base_tributavel' => 0,
            'total_iva' => 0,
            'total_retencao' => 0,
            'total_liquido' => $totalLiquido1,
            'estado' => 'paga',
            'motivo' => null,
            'motivo_cancelamento' => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento' => 'dinheiro',
            'referencia_pagamento' => 'Pagamento em espécie',
            'hash_fiscal' => sha1($numeroDocumentoRc . $now->copy()->addDays(5)->toDateString() . number_format($totalLiquido1, 2, '.', '')),
            'referencia_externa' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Atualizar estado da FT para paga após recibo
        DB::table('documentos_fiscais')
            ->where('id', $documentoFtId)
            ->update(['estado' => 'paga']);

        // Atualizar estado de pagamento da venda 1
        DB::table('vendas')
            ->where('id', $venda1Id)
            ->update(['estado_pagamento' => 'paga']);

        // Atualizar série fiscal
        DB::table('series_fiscais')
            ->where('tipo_documento', 'RC')
            ->where('serie', 'C')
            ->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numeroRc]);

        /* ================= VENDA 3 - Fatura de Adiantamento (FA) ================= */
        $venda3Id = Str::uuid();
        $valorAdiantamento = 30000;

        DB::table('vendas')->insert([
            'id' => $venda3Id,
            'cliente_id' => $clienteEmpresaId,
            'user_id' => $adminUserId,
            'documento_fiscal_id' => null,
            'data_venda' => $now->toDateString(),
            'hora_venda' => $now->toTimeString(),
            'total' => $valorAdiantamento,
            'status' => 'faturada',
            'estado_pagamento' => 'paga',
            'tipo_documento' => 'venda', // ← CORRIGIDO: era 'adiantamento', agora é 'venda'
            'serie' => 'F',
            'numero' => '00001',
            'base_tributavel' => $valorAdiantamento,
            'total_iva' => 0,
            'total_retencao' => 0,
            'total_pagar' => $valorAdiantamento,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Documento Fiscal FA (Fatura de Adiantamento)
        $documentoFaId = Str::uuid();
        $numeroFa = 1;
        $numeroDocumentoFa = 'F-' . str_pad($numeroFa, 5, '0', STR_PAD_LEFT);

        DB::table('documentos_fiscais')->insert([
            'id' => $documentoFaId,
            'user_id' => $adminUserId,
            'venda_id' => $venda3Id,
            'cliente_id' => $clienteEmpresaId,
            'fatura_id' => null,
            'serie' => 'F',
            'numero' => $numeroFa,
            'numero_documento' => $numeroDocumentoFa,
            'tipo_documento' => 'FA',
            'data_emissao' => $now->toDateString(),
            'hora_emissao' => $now->toTimeString(),
            'data_vencimento' => $now->copy()->addDays(15)->toDateString(),
            'data_cancelamento' => null,
            'base_tributavel' => $valorAdiantamento,
            'total_iva' => 0,
            'total_retencao' => 0,
            'total_liquido' => $valorAdiantamento,
            'estado' => 'emitido',
            'motivo' => null,
            'motivo_cancelamento' => null,
            'user_cancelamento_id' => null,
            'metodo_pagamento' => 'transferencia',
            'referencia_pagamento' => 'ADIANT/2024/001',
            'hash_fiscal' => sha1($numeroDocumentoFa . $now->toDateString() . number_format($valorAdiantamento, 2, '.', '')),
            'referencia_externa' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Item do Documento Fiscal FA
        DB::table('itens_documento_fiscal')->insert([
            'id' => Str::uuid(),
            'documento_fiscal_id' => $documentoFaId,
            'produto_id' => null,
            'item_origem_id' => null,
            'descricao' => 'Adiantamento para futura aquisição de produtos',
            'referencia' => 'ADIANT',
            'quantidade' => 1,
            'unidade' => 'UN',
            'preco_unitario' => $valorAdiantamento,
            'desconto' => 0,
            'base_tributavel' => $valorAdiantamento,
            'taxa_iva' => 0,
            'valor_iva' => 0,
            'taxa_retencao' => 0,
            'valor_retencao' => 0,
            'total_linha' => $valorAdiantamento,
            'ordem' => 1,
            'motivo_alteracao' => null,
            'observacoes' => 'Válido por 15 dias',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Atualizar venda com documento_fiscal_id
        DB::table('vendas')->where('id', $venda3Id)->update([
            'documento_fiscal_id' => $documentoFaId,
        ]);

        // Atualizar série fiscal
        DB::table('series_fiscais')
            ->where('tipo_documento', 'FA')
            ->where('serie', 'F')
            ->where('ano', date('Y'))
            ->update(['ultimo_numero' => $numeroFa]);

        /* ================= VÍNCULO ADIANTAMENTO -> FATURA ================= */
        DB::table('adiantamento_fatura')->insert([
            'id' => Str::uuid(),
            'adiantamento_id' => $documentoFaId,
            'fatura_id' => $documentoFtId,
            'valor_utilizado' => min($valorAdiantamento, $totalLiquido1),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= MOVIMENTOS DE STOCK ================= */
        DB::table('movimentos_stock')->insert([
            'id' => Str::uuid(),
            'produto_id' => $cremeId,
            'user_id' => $adminUserId,
            'tipo' => 'saida',
            'tipo_movimento' => 'venda',
            'quantidade' => $quantidade1,
            'referencia' => $venda1Id,
            'custo_medio' => 5000,
            'stock_minimo' => 10,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /* ================= LOGS FISCAIS ================= */
        $logsFiscais = [
            ['entidade' => 'documento_fiscal', 'entidade_id' => $documentoFtId, 'acao' => 'emitir', 'detalhe' => 'Fatura FT emitida'],
            ['entidade' => 'documento_fiscal', 'entidade_id' => $documentoFrId, 'acao' => 'emitir', 'detalhe' => 'Fatura-Recibo FR emitida'],
            ['entidade' => 'documento_fiscal', 'entidade_id' => $reciboId, 'acao' => 'emitir', 'detalhe' => 'Recibo RC emitido para pagamento da FT'],
            ['entidade' => 'documento_fiscal', 'entidade_id' => $documentoFaId, 'acao' => 'emitir', 'detalhe' => 'Fatura de Adiantamento FA emitida'],
            // CORRIGIDO: 'vincular' → 'emitir' (ou outra ação válida do seu enum)
            ['entidade' => 'adiantamento_fatura', 'entidade_id' => $documentoFaId, 'acao' => 'emitir', 'detalhe' => 'FA vinculada parcialmente à FT'],
        ];

        foreach ($logsFiscais as $log) {
            DB::table('logs_fiscais')->insert([
                'id' => Str::uuid(),
                'user_id' => $adminUserId,
                'entidade' => $log['entidade'],
                'entidade_id' => $log['entidade_id'],
                'acao' => $log['acao'],
                'data_acao' => $now,
                'detalhe' => $log['detalhe'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        /* ================= APURAMENTO IVA ================= */
        $ivaLiquidado = $valorIva1 + $valorIva2;
        $ivaDedutivel = $ivaCompra;
        $ivaAPagar = $ivaLiquidado - $ivaDedutivel;

        DB::table('apuramento_iva')->insert([
            'id' => Str::uuid(),
            'user_id' => $adminUserId,
            'periodo' => now()->format('m/Y'),
            'iva_liquidado' => $ivaLiquidado,
            'iva_dedutivel' => $ivaDedutivel,
            'iva_a_pagar' => max($ivaAPagar, 0),
            'estado' => 'aberto',
            'data_fecho' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
