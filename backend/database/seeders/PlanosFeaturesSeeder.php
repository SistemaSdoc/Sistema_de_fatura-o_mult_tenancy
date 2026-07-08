<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Plano;
use App\Models\Feature;
use Illuminate\Support\Str;

class PlanosFeaturesSeeder extends Seeder
{
    public function run()
    {
        // ==========================================
        // 1. FEATURES – Funcionalidades reais
        // ==========================================
        $features = [
            [
                'nome'      => 'Gestão de Clientes',
                'descricao' => 'Cadastre e gerencie todos os seus clientes',
                'icone'     => 'fa-users',
            ],
            [
                'nome'      => 'Gestão de Produtos',
                'descricao' => 'Gerencie produtos e serviços com controlo de stock',
                'icone'     => 'fa-boxes',
            ],
            [
                'nome'      => 'Documentos/mês',
                'descricao' => 'Número de documentos fiscais que pode emitir por mês',
                'icone'     => 'fa-file-invoice',
            ],
            [
                'nome'      => 'Utilizadores',
                'descricao' => 'Número de utilizadores activos na sua empresa',
                'icone'     => 'fa-user-plus',
            ],
            [
                'nome'      => 'Suporte Técnico',
                'descricao' => 'Atendimento prioritário e suporte especializado',
                'icone'     => 'fa-headset',
            ],
            [
                'nome'      => 'Envio por Email',
                'descricao' => 'Envie documentos fiscais directamente por email',
                'icone'     => 'fa-envelope',
            ],
            [
                'nome'      => 'Versão Mobile',
                'descricao' => 'Aceda à plataforma em dispositivos móveis',
                'icone'     => 'fa-mobile-alt',
            ],
            [
                'nome'      => 'API',
                'descricao' => 'Integre o FaturaJá com outros sistemas via API',
                'icone'     => 'fa-code',
            ],
            [
                'nome'      => 'Logótipo',
                'descricao' => 'Personalize os seus documentos com o logótipo da empresa',
                'icone'     => 'fa-image',
            ],
            [
                'nome'      => 'Moeda Estrangeira',
                'descricao' => 'Emita documentos em moeda estrangeira',
                'icone'     => 'fa-dollar-sign',
            ],
            [
                'nome'      => 'Impressão em Talões',
                'descricao' => 'Imprima documentos em impressoras térmicas (talões)',
                'icone'     => 'fa-print',
            ],
            [
                'nome'      => 'Relatórios Financeiros',
                'descricao' => 'Acompanhe vendas, faturação e desempenho com relatórios',
                'icone'     => 'fa-chart-line',
            ],
            [
                'nome'      => 'Assinatura Digital',
                'descricao' => 'Assine digitalmente os seus documentos fiscais',
                'icone'     => 'fa-file-signature',
            ],
            [
                'nome'      => 'Exportação SAFT‑AO',
                'descricao' => 'Exporte o ficheiro SAFT‑AO para a Autoridade Tributária',
                'icone'     => 'fa-file-export',
            ],
        ];

        // Criar as features
        $featureIds = [];
        foreach ($features as $f) {
            $feature = Feature::create([
                'id'          => (string) Str::uuid(),
                'nome'        => $f['nome'],
                'descricao'   => $f['descricao'],
                'icone'       => $f['icone'],
                'ativo'       => true,
            ]);
            $featureIds[$f['nome']] = $feature->id;
        }

        // ==========================================
        // 2. PLANOS
        // ==========================================
        $planos = [
            // ─── EXPERIMENTAL (Grátis) ────────────────────────────
            [
                'nome'            => 'Experimental',
                'descricao'       => 'Plano gratuito para experimentar a plataforma durante 30 dias.',
                'valor_mensal'    => 0,
                'valor_trimestral'=> 0,
                'valor_semestral' => 0,
                'valor_anual'     => 0,
                'duracao_meses'   => 1,
                'features'        => [
                    ['nome' => 'Gestão de Clientes',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Gestão de Produtos',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Documentos/mês',      'quantidade' => 20, 'unidade' => 'documentos'],
                    ['nome' => 'Utilizadores',        'quantidade' => 1, 'unidade' => 'utilizador'],
                    ['nome' => 'Suporte Técnico',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Envio por Email',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Versão Mobile',       'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'API',                 'quantidade' => 0, 'unidade' => null],
                    ['nome' => 'Logótipo',            'quantidade' => 0, 'unidade' => null],
                    ['nome' => 'Moeda Estrangeira',   'quantidade' => 0, 'unidade' => null],
                    ['nome' => 'Impressão em Talões', 'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Relatórios Financeiros','quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Assinatura Digital',  'quantidade' => 0, 'unidade' => null],
                    ['nome' => 'Exportação SAFT‑AO',  'quantidade' => 0, 'unidade' => null],
                ]
            ],

            // ─── MINI ──────────────────────────────────────────────
            [
                'nome'            => 'Mini',
                'descricao'       => 'Ideal para pequenos negócios que estão a começar.',
                'valor_mensal'    => 6533,
                'valor_trimestral'=> 19600,
                'valor_semestral' => 36100,
                'valor_anual'     => 69000,
                'duracao_meses'   => 12,
                'features'        => [
                    ['nome' => 'Gestão de Clientes',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Gestão de Produtos',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Documentos/mês',      'quantidade' => 500, 'unidade' => 'documentos'],
                    ['nome' => 'Utilizadores',        'quantidade' => 3, 'unidade' => 'utilizadores'],
                    ['nome' => 'Suporte Técnico',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Envio por Email',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Versão Mobile',       'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'API',                 'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Logótipo',            'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Moeda Estrangeira',   'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Impressão em Talões', 'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Relatórios Financeiros','quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Assinatura Digital',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Exportação SAFT‑AO',  'quantidade' => 1, 'unidade' => null],
                ]
            ],

            // ─── KUIA ──────────────────────────────────────────────
            [
                'nome'            => 'Kuia',
                'descricao'       => 'Para empresas em crescimento com maior volume de documentos.',
                'valor_mensal'    => 7666,
                'valor_trimestral'=> 23000,
                'valor_semestral' => 42780,
                'valor_anual'     => 74900,
                'duracao_meses'   => 12,
                'features'        => [
                    ['nome' => 'Gestão de Clientes',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Gestão de Produtos',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Documentos/mês',      'quantidade' => 750, 'unidade' => 'documentos'],
                    ['nome' => 'Utilizadores',        'quantidade' => 5, 'unidade' => 'utilizadores'],
                    ['nome' => 'Suporte Técnico',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Envio por Email',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Versão Mobile',       'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'API',                 'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Logótipo',            'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Moeda Estrangeira',   'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Impressão em Talões', 'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Relatórios Financeiros','quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Assinatura Digital',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Exportação SAFT‑AO',  'quantidade' => 1, 'unidade' => null],
                ]
            ],

            // ─── PLUS ──────────────────────────────────────────────
            [
                'nome'            => 'Plus',
                'descricao'       => 'Solução completa para grandes empresas com alto volume.',
                'valor_mensal'    => 9633,
                'valor_trimestral'=> 28900,
                'valor_semestral' => 44200,
                'valor_anual'     => 82600,
                'duracao_meses'   => 12,
                'features'        => [
                    ['nome' => 'Gestão de Clientes',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Gestão de Produtos',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Documentos/mês',      'quantidade' => 1000, 'unidade' => 'documentos'],
                    ['nome' => 'Utilizadores',        'quantidade' => 10, 'unidade' => 'utilizadores'],
                    ['nome' => 'Suporte Técnico',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Envio por Email',     'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Versão Mobile',       'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'API',                 'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Logótipo',            'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Moeda Estrangeira',   'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Impressão em Talões', 'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Relatórios Financeiros','quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Assinatura Digital',  'quantidade' => 1, 'unidade' => null],
                    ['nome' => 'Exportação SAFT‑AO',  'quantidade' => 1, 'unidade' => null],
                ]
            ],
        ];

        // Criar os planos e associar as features
        foreach ($planos as $p) {
            $plano = Plano::create([
                'id'              => (string) Str::uuid(),
                'nome'            => $p['nome'],
                'descricao'       => $p['descricao'],
                'valor_mensal'    => $p['valor_mensal'],
                'valor_trimestral'=> $p['valor_trimestral'],
                'valor_semestral' => $p['valor_semestral'],
                'valor_anual'     => $p['valor_anual'],
                'duracao_meses'   => $p['duracao_meses'],
                'ativo'           => true,
            ]);

            foreach ($p['features'] as $f) {
                $featureId = $featureIds[$f['nome']] ?? null;
                if ($featureId) {
                    $plano->features()->attach($featureId, [
                        'quantidade' => $f['quantidade'],
                        'unidade'    => $f['unidade'],
                    ]);
                }
            }
        }
    }
}