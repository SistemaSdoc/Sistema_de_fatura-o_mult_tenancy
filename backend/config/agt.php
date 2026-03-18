<?php

/**
 * ============================================================================
 * config/agt.php
 * Configurações da Administração Geral Tributária (AGT) — Angola
 * ============================================================================
 *
 * Este ficheiro contém TODAS as configurações necessárias para o sistema
 * estar em conformidade com os requisitos de certificação AGT, incluindo:
 *
 *  - Assinatura RSA de documentos fiscais
 *  - Geração de QR Code (DP 71/25)
 *  - Taxas de IVA e retenção (Lei 17/19)
 *  - Exportação SAF-T (AO)
 *  - Informações do certificado AGT
 *
 * ============================================================================
 * CONFIGURAÇÃO INICIAL OBRIGATÓRIA
 * ============================================================================
 *
 * 1. Gerar par de chaves RSA:
 *    openssl genrsa -out storage/keys/agt_private.pem 2048
 *    openssl rsa -in storage/keys/agt_private.pem -pubout -out storage/keys/agt_public.pem
 *
 * 2. Proteger a chave privada (nunca versionar em git):
 *    chmod 600 storage/keys/agt_private.pem
 *    echo "storage/keys/" >> .gitignore
 *
 * 3. Submeter a chave PÚBLICA à AGT para obter o número de certificado.
 *    Guardar o número de certificado em AGT_NUMERO_CERTIFICADO no .env
 *
 * 4. Configurar as variáveis de ambiente no ficheiro .env (ver secção abaixo)
 *
 * ============================================================================
 * VARIÁVEIS .env NECESSÁRIAS
 * ============================================================================
 *
 * # Assinatura RSA
 * AGT_RSA_PRIVATE_KEY_PATH=storage/keys/agt_private.pem
 * AGT_RSA_KEY_VERSION=1
 *
 * # Certificado AGT (obtido após submissão da chave pública à AGT)
 * AGT_NUMERO_CERTIFICADO=AGT-CERT-XXXX
 * AGT_NOME_SOFTWARE=NomeSoftware_v1.0
 *
 * # Informações da empresa (usadas no SAF-T)
 * AGT_EMPRESA_NIF=5417XXXXXXX
 * AGT_EMPRESA_NOME=Nome da Empresa, Lda.
 * AGT_EMPRESA_MORADA=Rua X, Bairro Y, Luanda
 *
 * # SAF-T
 * AGT_SAFT_VERSAO=1.04_01
 * AGT_AMBIENTE=producao        # producao | homologacao
 *
 * # Facturação electrónica (DP 71/25)
 * AGT_FATURACAO_ELETRONICA_ATIVA=true
 * AGT_PORTAL_URL=https://efatura.agt.minfin.gov.ao
 * AGT_PORTAL_TOKEN=           # token de autenticação no portal AGT
 */

return [

    /* ====================================================================
     | ASSINATURA RSA
     | ==================================================================
     | AGT exige algoritmo RSA assimétrico com chave privada do fabricante.
     | A chave privada NUNCA deve estar em texto plano no repositório.
     */
    'rsa_private_key_path' => env('AGT_RSA_PRIVATE_KEY_PATH', storage_path('keys/agt_private.pem')),
    'rsa_public_key_path'  => env('AGT_RSA_PUBLIC_KEY_PATH',  storage_path('keys/agt_public.pem')),

    /**
     * Versão da chave RSA actualmente em uso.
     * Incrementar sempre que o par de chaves for substituído.
     * AGT exige que a versão seja gravada com cada documento assinado.
     */
    'rsa_key_version'      => (int) env('AGT_RSA_KEY_VERSION', 1),

    /* ====================================================================
     | CERTIFICADO AGT
     | ==================================================================
     | Número atribuído pela AGT após submissão e validação do sistema.
     | Incluído no QR Code de cada documento emitido.
     */
    'numero_certificado'   => env('AGT_NUMERO_CERTIFICADO', ''),

    /**
     * Nome e versão do software conforme registado na AGT.
     * Formato sugerido: NomeSoftware_vX.Y
     */
    'nome_software'        => env('AGT_NOME_SOFTWARE', 'SistemaPOS_v1.0'),

    /* ====================================================================
     | AMBIENTE
     | ==================================================================
     | producao   — documentos com validade fiscal real
     | homologacao — documentos de teste, sem validade fiscal
     |
     | Em homologação os documentos impressos devem conter o aviso:
     | "Documento emitido para fins de homologação — sem validade fiscal"
     */
    'ambiente'             => env('AGT_AMBIENTE', 'producao'),

    /* ====================================================================
     | SAF-T (AO) — STANDARD AUDIT FILE FOR TAX PURPOSES (ANGOLA)
     | ==================================================================
     | Versão do esquema SAF-T conforme publicação AGT.
     | Exportação obrigatória mensal para documentos IVA.
     */
    'saft' => [
        'versao'           => env('AGT_SAFT_VERSAO', '1.04_01'),
        'directorio_export' => env('AGT_SAFT_DIR', storage_path('app/saft')),

        /**
         * Tipos de SAF-T disponíveis:
         *  C — Contabilístico (Accounting)
         *  I — Facturação (Invoicing) — o mais comum
         *  S — Stocks
         */
        'tipo_default'      => 'I',
    ],

    /* ====================================================================
     | TAXAS DE IVA (Lei 17/19 — Código do IVA Angola)
     | ==================================================================
     */
    'iva' => [
        /**
         * Taxa geral: aplica-se a todos os bens e serviços não especificados.
         */
        'taxa_geral'     => 14.0,

        /**
         * Taxa reduzida: bens essenciais listados no Anexo I do Código do IVA.
         * Exemplos: alimentos básicos (farinha, arroz, açúcar), medicamentos,
         * livros escolares, água potável, energia eléctrica para uso doméstico.
         */
        'taxa_reduzida'  => 5.0,

        /**
         * Taxa zero: exportações de bens, zonas francas, operações específicas.
         * Difere da isenção: o contribuinte pode deduzir o IVA suportado.
         */
        'taxa_zero'      => 0.0,

        /**
         * Taxas válidas — usadas na validação de formulários e no SAF-T.
         */
        'taxas_validas'  => [0.0, 5.0, 14.0],

        /**
         * Códigos de motivo de isenção/não liquidação (SAF-T campo TaxExemptionCode).
         * Obrigatório sempre que taxa_iva = 0%.
         */
        'motivos_isencao' => [
            'M00' => 'Não sujeito / não tributado',
            'M01' => 'Artigo 12.º do Código do IVA (Regime especial de isenção)',
            'M02' => 'Artigo 13.º do Código do IVA (Isenções nas importações)',
            'M03' => 'Artigo 14.º do Código do IVA (Isenções nas exportações)',
            'M04' => 'Artigo 15.º do Código do IVA (Isenções nas operações internas)',
            'M05' => 'Regime de tributação pelo lucro consolidado',
            'M06' => 'Contribuinte isento — não sujeito a IVA',
            'M99' => 'Outras isenções',
        ],
    ],

    /* ====================================================================
     | TAXAS DE RETENÇÃO NA FONTE (IRPS / IRPC — Artigo 67.º)
     | ==================================================================
     | Aplicam-se APENAS a serviços prestados; produtos físicos não têm retenção.
     */
    'retencao' => [
        /**
         * Taxa default para serviços técnicos e de gestão (taxa geral).
         */
        'taxa_default'   => 6.5,

        /**
         * Todas as taxas válidas por natureza do serviço.
         */
        'taxas_validas' => [
            '2.0'  => 'Serviços de construção civil...',
            '5.0'  => 'Trabalho independente...',
            '6.5'  => 'Serviços técnicos e de gestão (taxa geral)',
            '10.0' => 'Royalties e direitos de autor',
            '15.0' => 'Dividendos e juros — entidades não residentes',
        ],
        /**
         * Só aplicar retenção quando a empresa está sujeita a IVA.
         */
        'apenas_sujeitos_iva' => true,
    ],

    /* ====================================================================
     | FACTURAÇÃO ELECTRÓNICA (DP 71/25)
     | ==================================================================
     | Obrigatória a partir de:
     |   1 Jan 2026 — Grandes contribuintes e facturas para órgãos do Estado
     |   1 Jan 2027 — Restantes contribuintes (regimes Geral e Simplificado)
     */
    'faturacao_eletronica' => [
        'ativa'       => env('AGT_FATURACAO_ELETRONICA_ATIVA', false),
        'portal_url'  => env('AGT_PORTAL_URL', 'https://efatura.agt.minfin.gov.ao'),
        'portal_token' => env('AGT_PORTAL_TOKEN', ''),

        /**
         * Timeout para comunicação com o portal AGT (segundos).
         */
        'timeout'     => 10,

        /**
         * Se true, falhas na comunicação com o portal não bloqueiam a emissão.
         * O documento é emitido e reenviado quando o portal ficar disponível.
         */
        'modo_offline' => true,
    ],

    /* ====================================================================
     | QR CODE (DP 71/25)
     | ==================================================================
     | Formato do conteúdo:
     |   NIF_EMITENTE*NIF_CLIENTE*DATA*BASE*IVA*TOTAL*HASH4*CERT
     |
     | HASH4 = primeiros 4 caracteres (maiúsculas) do hash fiscal RSA-SHA256.
     | CF = Consumidor Final (quando o cliente não tem NIF).
     */
    'qr_code' => [
        /**
         * Separador entre campos do QR Code.
         */
        'separador' => '*',

        /**
         * NIF genérico para consumidor final (sem NIF conhecido).
         */
        'consumidor_final_nif' => 'CF',

        /**
         * Tamanho do código de verificação (primeiros N chars do hash).
         */
        'tamanho_hash' => 4,

        /**
         * Tamanho da imagem QR Code em pixels (para geração por endroid/qr-code).
         * Mínimo recomendado pela AGT: 100x100px.
         */
        'tamanho_imagem' => 200,
    ],

    /* ====================================================================
     | NUMERAÇÃO DE DOCUMENTOS
     | ==================================================================
     */
    'numeracao' => [
        /**
         * Número de dígitos no sufixo da numeração (ex: FT-00001 = 5 dígitos).
         */
        'digitos_default' => 5,

        /**
         * Separador entre série e número (ex: FT A 2025/00001 ou FT-00001).
         */
        'separador' => '-',

        /**
         * Incluir o ano na série (ex: FT-2025-00001).
         * Útil para séries que reiniciam anualmente.
         */
        'incluir_ano' => false,
    ],

    /* ====================================================================
     | PRAZOS LEGAIS
     | ==================================================================
     */
    'prazos' => [
        /**
         * Prazo máximo para emissão de factura após o facto tributário (dias).
         * Art. 36.º do Código do IVA: 5 dias úteis.
         */
        'emissao_fatura_dias' => 5,

        /**
         * Prazo de arquivo de documentos fiscais (anos).
         * CGT Art. 36.º: mínimo 5 anos.
         */
        'arquivo_anos' => 5,

        /**
         * Prazo de entrega da declaração periódica de IVA (dia do mês seguinte).
         */
        'declaracao_iva_dia' => 20,
    ],

    /* ====================================================================
     | REGIMES FISCAIS
     | ==================================================================
     */
    'regimes' => [
        /**
         * Limiar de facturação anual para regime geral (AOA).
         * Contribuintes abaixo ficam no regime simplificado (isentos de IVA).
         * Valor indicativo — confirmar com AGT / legislação em vigor.
         */
        'limiar_regime_geral_aoa' => 350_000_000,

        'tipos' => [
            'geral'        => 'Regime Geral de IVA',
            'simplificado' => 'Regime Simplificado (isento de IVA)',
            'especial'     => 'Regime Especial',
        ],
    ],

    /* ====================================================================
     | MOEDA
     | ==================================================================
     */
    'moeda' => [
        'codigo'   => 'AOA',
        'simbolo'  => 'Kz',
        'decimais' => 2,
        'separador_decimal'  => ',',
        'separador_milhares' => '.',
    ],

];
