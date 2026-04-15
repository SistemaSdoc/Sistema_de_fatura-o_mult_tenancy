<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

/**
 * CategoriaSeeder
 *
 * Cria as categorias padrão do sistema com as taxas de IVA correctas
 * conforme a legislação fiscal angolana (AGT).
 *
 * Taxas de IVA em Angola:
 *  - 0%  → isentos (produtos agrícolas, medicamentos)
 *  - 5%  → cesta básica
 *  - 14% → taxa geral (a maioria dos produtos)
 *
 * Códigos de isenção SAF-T (AO):
 *  - M00 → IVA — Fora do âmbito do imposto
 *  - M01 → IVA — Artigo 12.º do Código do IVA (isenção simples)
 *  - M06 → IVA — Exigibilidade de caixa
 */
class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            // =========================================================
            // TAXA GERAL 14%
            // =========================================================
            [
                'nome'          => 'Informática e Tecnologia',
                'descricao'     => 'Computadores, telemóveis, periféricos, software e equipamentos tecnológicos.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '💻',
            ],
            [
                'nome'          => 'Vestuário e Calçados',
                'descricao'     => 'Roupas, sapatos, acessórios de moda e têxteis em geral.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '👕',
            ],
            [
                'nome'          => 'Casa e Escritório',
                'descricao'     => 'Mobiliário, decoração, artigos domésticos e material de escritório.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🏠',
            ],
            [
                'nome'          => 'Construção e Ferramentas',
                'descricao'     => 'Materiais de construção, ferramentas e equipamentos de obra.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🧱',
            ],
            [
                'nome'          => 'Automóveis e Peças',
                'descricao'     => 'Veículos, peças sobresselentes, acessórios e lubrificantes.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🚗',
            ],
            [
                'nome'          => 'Higiene e Limpeza',
                'descricao'     => 'Produtos de higiene pessoal, cosméticos e artigos de limpeza.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🧴',
            ],
            [
                'nome'          => 'Lazer e Entretenimento',
                'descricao'     => 'Jogos, brinquedos, desporto, música e artigos de entretenimento.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🎮',
            ],
            [
                'nome'          => 'Produtos Industrializados',
                'descricao'     => 'Produtos manufacturados e industrializados em geral.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🏭',
            ],
            [
                'nome'          => 'Outros',
                'descricao'     => 'Produtos que não se enquadram nas categorias acima. Taxa geral aplicada.',
                'taxa_iva'      => 14.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '📦',
            ],

            // =========================================================
            // TAXA REDUZIDA 5% — Cesta Básica
            // =========================================================
            [
                'nome'          => 'Cesta Básica',
                'descricao'     => 'Alimentos essenciais da cesta básica: arroz, feijão, açúcar, óleo, farinha, massas e outros.',
                'taxa_iva'      => 5.00,
                'sujeito_iva'   => true,
                'codigo_isencao' => null,
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🛒',
            ],

            // =========================================================
            // ISENTOS 0%
            // =========================================================
            [
                'nome'          => 'Produtos Agrícolas',
                'descricao'     => 'Produtos agrícolas não processados: frutas, verduras, legumes, cereais e produtos da terra.',
                'taxa_iva'      => 0.00,
                'sujeito_iva'   => false,
                'codigo_isencao' => 'M01', // Isenção simples — Art. 12.º Código IVA AO
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '🌾',
            ],
            [
                'nome'          => 'Medicamentos',
                'descricao'     => 'Medicamentos, produtos farmacêuticos e dispositivos médicos.',
                'taxa_iva'      => 0.00,
                'sujeito_iva'   => false,
                'codigo_isencao' => 'M01', // Isenção simples — Art. 12.º Código IVA AO
                'tipo'          => 'produto',
                'status'        => 'ativo',
                'emoji'         => '💊',
            ],
        ];

        foreach ($categorias as $cat) {
            // Evitar duplicados se o seeder for executado mais de uma vez
            $existe = DB::table('categorias')->where('nome', $cat['nome'])->exists();

            if (! $existe) {
                DB::table('categorias')->insert([
                    'id'             => (string) Str::uuid(),
                    'nome'           => $cat['nome'],
                    'descricao'      => $cat['descricao'],
                    'taxa_iva'       => $cat['taxa_iva'],
                    'sujeito_iva'    => $cat['sujeito_iva'],
                    'codigo_isencao' => $cat['codigo_isencao'],
                    'tipo'           => $cat['tipo'],
                    'status'         => $cat['status'],
                    'user_id'        => null, // categorias do sistema, sem utilizador
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }
        }

        $this->command->info('✅ Categorias padrão criadas com IVA configurado para Angola (AGT).');
    }
}