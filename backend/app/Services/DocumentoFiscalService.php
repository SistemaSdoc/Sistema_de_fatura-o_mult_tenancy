<?php

namespace App\Services;

use App\Models\Tenant\DocumentoFiscal;
use App\Models\Tenant\ItemDocumentoFiscal;
use App\Models\Tenant\Venda;
use App\Models\Empresa;
use App\Models\Tenant\SerieFiscal;
use App\Models\Tenant\Produto;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * DocumentoFiscalService
 *
 * Conformidade AGT (Angola):
 *  - Assinatura RSA assimétrica (DP Executivo sobre validação de sistemas)
 *  - QR Code obrigatório (DP 71/25, em vigor desde Set/2025)
 *  - Taxas IVA: 14% geral, 5% reduzida, 0% zero, isenção c/ código motivo
 *  - Retenção na fonte configurável por produto/serviço
 *  - Numeração sequencial contínua sem gaps, por série
 *  - Hash encadeado (cada documento referencia o hash do anterior)
 *  - Exportação SAF-T (AO) via SaftService
 *  - Documentos rectificativos com referência obrigatória ao original
 *  - Cancelamento lógico — dados originais e hash preservados
 * 
 * REGRA SEMÂNTICA IMPORTANTE:
 *  - Proforma (FP) NÃO é uma venda, NÃO é uma dívida, NÃO é "pendente de pagamento".
 *    Estado 'emitido' em FP significa "orçamento a aguardar conversão/aceitação".
 *  - Pendência financeira aplica-se APENAS a FT (Fatura) e FA (Adiantamento).
 * 
 * REGRAS PARA NOTAS DE CRÉDITO E DÉBITO (Angola):
 *  - Nota de Crédito (NC): Reduz o valor de uma fatura. Só pode ser emitida a partir de
 *    FT ou FR que NÃO esteja cancelada. Não pode ultrapassar o saldo da fatura.
 *  - Nota de Débito (ND): Aumenta o valor de uma fatura. Só pode ser emitida a partir de
 *    FT que NÃO esteja cancelada. Serve para cobrar serviços adicionais, juros ou multas.
 */
class DocumentoFiscalService
{
    /* =====================================================================
     | TAXAS DE IVA ANGOLA (Código do IVA — Lei 17/19)
     | ================================================================== */

    /** Taxa geral: 14% */
    public const IVA_GERAL    = 14.0;
    /** Taxa reduzida: 5% (bens essenciais — Anexo I do Código do IVA) */
    public const IVA_REDUZIDA = 5.0;
    /** Taxa zero: exportações, zona franca, etc. */
    public const IVA_ZERO     = 0.0;

    /**
     * Códigos de motivo de isenção/não liquidação de IVA.
     * Usados no SAF-T (AO) campo <TaxExemptionCode> e no corpo da factura.
     */
    public const MOTIVOS_ISENCAO = [
        'M00' => 'Não sujeito / não tributado',
        'M01' => 'Artigo 12.º do Código do IVA (Regime especial de isenção)',
        'M02' => 'Artigo 13.º do Código do IVA (Isenções nas importações)',
        'M03' => 'Artigo 14.º do Código do IVA (Isenções nas exportações)',
        'M04' => 'Artigo 15.º do Código do IVA (Isenções nas operações internas)',
        'M05' => 'Regime de tributação pelo lucro consolidado',
        'M06' => 'Contribuinte isento – não sujeito a IVA',
        'M99' => 'Outras isenções',
    ];

    /* =====================================================================
     | CONFIGURAÇÕES POR TIPO DE DOCUMENTO
     | ================================================================== */

    protected array $configuracoesTipo = [
        'FT' => [
            'nome'                  => 'Factura',
            'afeta_stock'           => true,
            'eh_venda'              => true,
            'gera_recibo'           => true,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => true,
            'pode_ter_adiantamento' => true,
            'requer_assinatura'     => true,
        ],
        'FR' => [
            'nome'                  => 'Factura-Recibo',
            'afeta_stock'           => true,
            'eh_venda'              => true,
            'gera_recibo'           => false,
            'estado_inicial'        => 'paga',
            'exige_cliente'         => true,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
        ],
        'FP' => [
            'nome'                  => 'Fatura Proforma',
            'afeta_stock'           => false,
            'eh_venda'              => false,
            'gera_recibo'           => true,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => true,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => false,
        ],
        'FA' => [
            'nome'                  => 'Factura de Adiantamento',
            'afeta_stock'           => false,
            'eh_venda'              => false,
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => true,
            'aceita_pagamento'      => true,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
        ],
        'NC' => [
            'nome'                  => 'Nota de Crédito',
            'afeta_stock'           => true,
            'eh_venda'              => false,
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
        ],
        'ND' => [
            'nome'                  => 'Nota de Débito',
            'afeta_stock'           => false,
            'eh_venda'              => false,
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
        ],
        'RC' => [
            'nome'                  => 'Recibo',
            'afeta_stock'           => false,
            'eh_venda'              => true,
            'gera_recibo'           => false,
            'estado_inicial'        => 'paga',
            'exige_cliente'         => false,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => false,
        ],
        'FRt' => [
            'nome'                  => 'Factura de Retificação',
            'afeta_stock'           => false,
            'eh_venda'              => false,
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
        ],
    ];

    /* =====================================================================
     | EMISSÃO DE DOCUMENTOS
     | ================================================================== */

    public function emitirDocumento(array $dados): DocumentoFiscal
    {
        $tipo = $dados['tipo_documento'];

        if (! isset($this->configuracoesTipo[$tipo])) {
            throw new \InvalidArgumentException("Tipo de documento {$tipo} não suportado.");
        }

        $config = $this->configuracoesTipo[$tipo];

        Log::info("Iniciando emissão de {$config['nome']}", [
            'tipo'         => $tipo,
            'cliente_id'   => $dados['cliente_id'] ?? null,
            'cliente_nome' => $dados['cliente_nome'] ?? null,
        ]);

        return DB::transaction(function () use ($dados, $tipo, $config) {

            $empresa    = Empresa::firstOrFail();
            $aplicaIva  = $empresa->sujeito_iva;
            $regime     = $empresa->regime_fiscal;

            $this->validarDadosPorTipo($dados, $tipo, $config);

            // Para NC e ND, validações adicionais
            if ($tipo === 'NC') {
                $this->validarNotaCredito($dados);
            }

            if ($tipo === 'ND') {
                $this->validarNotaDebito($dados);
            }

            [$numero, $numeroDocumento, $serieFiscal] = $this->gerarNumeroDocumento($tipo);

            $agoraAngola = Carbon::now('Africa/Luanda');
            $dataEmissao = $agoraAngola->toDateString();
            $horaEmissao = $agoraAngola->toTimeString();

            $dataVencimento = $this->calcularDataVencimento($tipo, $dados, $agoraAngola);
            $totais         = $this->processarItens($dados['itens'] ?? [], $aplicaIva, $regime);
            $clienteId      = $this->resolverCliente($dados, $tipo);

            $documentoData = [
                'id'                  => Str::uuid(),
                'user_id'             => auth('tenant')->id(),
                'venda_id'            => $dados['venda_id'] ?? null,
                'fatura_id'           => $dados['fatura_id'] ?? null,
                'serie'               => $serieFiscal->serie,
                'numero'              => $numero,
                'numero_documento'    => $numeroDocumento,
                'tipo_documento'      => $tipo,
                'data_emissao'        => $dataEmissao,
                'hora_emissao'        => $horaEmissao,
                'data_vencimento'     => $dataVencimento,
                'base_tributavel'     => $totais['base'],
                'total_iva'           => $totais['iva'],
                'total_retencao'      => $totais['retencao'],
                'total_liquido'       => $totais['liquido'],
                'estado'              => $config['estado_inicial'],
                'motivo'              => $dados['motivo'] ?? null,
                'hash_fiscal'         => null,
                'rsa_assinatura'      => null,
                'rsa_versao_chave'    => null,
                'qr_code'             => null,
                'hash_anterior'       => null,
                'referencia_externa'  => $dados['referencia_externa'] ?? null,
            ];

            if ($clienteId) {
                $documentoData['cliente_id'] = $clienteId;
            }

            if (! $clienteId && ! empty($dados['cliente_nome'])) {
                $documentoData['cliente_nome'] = $dados['cliente_nome'];
                if (! empty($dados['cliente_nif'])) {
                    $documentoData['cliente_nif'] = $dados['cliente_nif'];
                }
            }

            $documento = DocumentoFiscal::create($documentoData);

            if (! empty($totais['itens_processados'])) {
                $this->criarItensDocumento($documento, $totais['itens_processados']);
            }

            $this->executarAcoesPosCriacao($documento, $dados, $tipo);

            if ($config['requer_assinatura']) {
                $this->assinarDocumento($documento);
            } else {
                $documento->update([
                    'hash_fiscal' => $this->gerarHashSimples($documento),
                ]);
            }

            if ($tipo === 'FT' && ! empty($dados['dados_pagamento'])) {
                $this->gerarRecibo($documento, [
                    'valor'            => $dados['dados_pagamento']['valor'],
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'data_pagamento'   => $dados['dados_pagamento']['data'] ?? $agoraAngola->toDateString(),
                    'referencia'       => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            if ($tipo === 'FR' && ! empty($dados['dados_pagamento'])) {
                $documento->update([
                    'metodo_pagamento'     => $dados['dados_pagamento']['metodo'],
                    'referencia_pagamento' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            Log::info("{$config['nome']} emitida com sucesso", [
                'documento_id' => $documento->id,
                'numero'       => $numeroDocumento,
                'data_emissao' => $dataEmissao,
                'hora_emissao' => $horaEmissao,
            ]);

            return $documento->load('itens.produto', 'cliente', 'documentoOrigem');
        });
    }

    /* =====================================================================
     | RECIBO
     | ================================================================== */

    public function gerarRecibo(DocumentoFiscal $documentoOrigem, array $dados): DocumentoFiscal
    {
        if (! in_array($documentoOrigem->tipo_documento, ['FT', 'FA', 'FP'])) {
            throw new \InvalidArgumentException(
                "Apenas FT, FA e FP podem receber recibo. Tipo atual: {$documentoOrigem->tipo_documento}"
            );
        }

        if (in_array($documentoOrigem->estado, [
            DocumentoFiscal::ESTADO_CANCELADO,
        ])) {
            throw new \InvalidArgumentException(
                "Documento cancelado. Não é possível gerar recibo."
            );
        }

        if ($documentoOrigem->tipo_documento === 'FT' && $documentoOrigem->estado === DocumentoFiscal::ESTADO_PAGA) {
            throw new \InvalidArgumentException(
                "Fatura já está totalmente paga. Estado: {$documentoOrigem->estado}"
            );
        }

        return DB::transaction(function () use ($documentoOrigem, $dados) {
            $valorPago = (float) ($dados['valor'] ?? 0);

            if ($documentoOrigem->tipo_documento === 'FP') {
                $valorPendente = (float) $documentoOrigem->total_liquido;
            } else {
                $valorPendente = $this->calcularValorPendente($documentoOrigem);
            }

            if ($valorPago <= 0) {
                throw new \InvalidArgumentException("O valor do pagamento deve ser maior que zero.");
            }

            if ($valorPago > $valorPendente + 0.01) {
                throw new \InvalidArgumentException(
                    "Valor do pagamento ({$valorPago}) excede o valor pendente ({$valorPendente})."
                );
            }

            [$numero, $numeroDocumento, $serieFiscal] = $this->gerarNumeroDocumento('RC');

            $agoraAngola = Carbon::now('Africa/Luanda');

            $reciboData = [
                'id'                    => Str::uuid(),
                'user_id'               => auth('tenant')->id(),
                'fatura_id'             => $documentoOrigem->id,
                'serie'                 => $serieFiscal->serie,
                'numero'                => $numero,
                'numero_documento'      => $numeroDocumento,
                'tipo_documento'        => 'RC',
                'data_emissao'          => $dados['data_pagamento'] ?? $agoraAngola->toDateString(),
                'hora_emissao'          => $agoraAngola->toTimeString(),
                'data_vencimento'       => null,
                'base_tributavel'       => 0,
                'total_iva'             => 0,
                'total_retencao'        => 0,
                'total_liquido'         => $valorPago,
                'estado'                => DocumentoFiscal::ESTADO_PAGA,
                'metodo_pagamento'      => $dados['metodo_pagamento'] ?? 'dinheiro',
                'referencia_pagamento'  => $dados['referencia'] ?? null,
                'hash_fiscal'           => null,
                'rsa_assinatura'        => null,
                'rsa_versao_chave'      => null,
                'qr_code'               => null,
                'hash_anterior'         => null,
            ];

            if ($documentoOrigem->cliente_id) {
                $reciboData['cliente_id'] = $documentoOrigem->cliente_id;
            } elseif ($documentoOrigem->cliente_nome) {
                $reciboData['cliente_nome'] = $documentoOrigem->cliente_nome;
                $reciboData['cliente_nif']  = $documentoOrigem->cliente_nif ?? null;
            }

            $recibo = DocumentoFiscal::create($reciboData);

            // Proformas NÃO mudam de estado ao receber pagamento
            if ($documentoOrigem->tipo_documento !== 'FP') {
                $this->actualizarEstadoAposPagamento($documentoOrigem, $valorPago);
            }

            $recibo->update(['hash_fiscal' => $this->gerarHashSimples($recibo)]);

            Log::info('Recibo gerado com sucesso', [
                'recibo_id'    => $recibo->id,
                'numero'       => $recibo->numero_documento,
                'origem_tipo'  => $documentoOrigem->tipo_documento,
                'origem_id'    => $documentoOrigem->id,
                'valor'        => $valorPago,
            ]);

            return $recibo->load('documentoOrigem', 'cliente');
        });
    }

    /* =====================================================================
     | NOTA DE CRÉDITO (CORRIGIDO)
     | ================================================================== */

    public function criarNotaCredito(DocumentoFiscal $documentoOrigem, array $dados): DocumentoFiscal
    {
        // 1. VALIDAR TIPO DE DOCUMENTO ORIGEM
        if (! in_array($documentoOrigem->tipo_documento, ['FT', 'FR'])) {
            throw new \InvalidArgumentException(
                "Nota de Crédito só pode ser gerada a partir de Fatura (FT) ou Fatura-Recibo (FR). " .
                "Tipo atual: {$documentoOrigem->tipo_documento}"
            );
        }

        // 2. VALIDAR SE A FATURA NÃO ESTÁ CANCELADA
        if ($documentoOrigem->estado === DocumentoFiscal::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException(
                "Não é possível gerar Nota de Crédito de documento cancelado: {$documentoOrigem->numero_documento}"
            );
        }

        // 3. VALIDAR SE A FATURA NÃO ESTÁ EXPIRADA
        if ($documentoOrigem->estado === DocumentoFiscal::ESTADO_EXPIRADO) {
            throw new \InvalidArgumentException(
                "Não é possível emitir Nota de Crédito para uma fatura expirada: {$documentoOrigem->numero_documento}"
            );
        }

        // 4. VALIDAR SE A FATURA NÃO ESTÁ TOTALMENTE PAGA
        if ($documentoOrigem->estado === DocumentoFiscal::ESTADO_PAGA) {
            $valorPendente = $this->calcularValorPendente($documentoOrigem);
            if ($valorPendente <= 0.01) {
                throw new \InvalidArgumentException(
                    "Não é possível emitir Nota de Crédito para uma fatura já totalmente paga. " .
                    "Fatura: {$documentoOrigem->numero_documento}"
                );
            }
        }

        // 5. CALCULAR TOTAL JÁ CREDITADO
        $totalJaCreditado = $documentoOrigem->notasCredito()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');

        // 6. PROCESSAR ITENS DA NC
        $empresa = Empresa::firstOrFail();
        $totais  = $this->processarItens($dados['itens'], $empresa->sujeito_iva, $empresa->regime_fiscal);
        $valorNova = $totais['liquido'];

        // 7. VALIDAR VALOR MÁXIMO DA NC
        $valorMaximo = (float) $documentoOrigem->total_liquido - $totalJaCreditado;

        if ($valorMaximo <= 0.01) {
            throw new \InvalidArgumentException(
                "Esta fatura já possui créditos emitidos que cobrem todo o seu valor. " .
                "Saldo disponível: 0.00 Kz"
            );
        }

        if ($valorNova > $valorMaximo + 0.01) {
            throw new \InvalidArgumentException(
                "O valor da Nota de Crédito (" . number_format($valorNova, 2) . " Kz) " .
                "excede o saldo disponível (" . number_format($valorMaximo, 2) . " Kz). " .
                "Total da fatura: " . number_format($documentoOrigem->total_liquido, 2) . " Kz, " .
                "Créditos já emitidos: " . number_format($totalJaCreditado, 2) . " Kz"
            );
        }

        // 8. VALIDAR MOTIVO (obrigatório para NC)
        if (empty($dados['motivo'])) {
            throw new \InvalidArgumentException(
                "O motivo da Nota de Crédito é obrigatório."
            );
        }

        if (strlen($dados['motivo']) < 10) {
            throw new \InvalidArgumentException(
                "O motivo da Nota de Crédito deve ter pelo menos 10 caracteres."
            );
        }

        // 9. VALIDAR ITENS DA NC VS FATURA ORIGINAL
        $this->validarItensNotaCredito($documentoOrigem, $dados['itens']);

        // 10. PREPARAR DADOS PARA EMISSÃO
        $dados['tipo_documento'] = 'NC';
        $dados['fatura_id']      = $documentoOrigem->id;
        $dados['motivo']         = $dados['motivo'];

        $this->herdarCliente($dados, $documentoOrigem);

        // 11. EMITIR A NOTA DE CRÉDITO
        $nc = $this->emitirDocumento($dados);

        // 12. ATUALIZAR ESTADO DA FATURA ORIGINAL
        $this->atualizarEstadoFaturaAposCredito($documentoOrigem);

        Log::info('Nota de Crédito emitida com sucesso', [
            'nc_id'              => $nc->id,
            'nc_numero'          => $nc->numero_documento,
            'fatura_id'          => $documentoOrigem->id,
            'fatura_numero'      => $documentoOrigem->numero_documento,
            'valor_credito'      => $valorNova,
            'total_creditado'    => $totalJaCreditado + $valorNova,
            'saldo_restante'     => (float) $documentoOrigem->total_liquido - ($totalJaCreditado + $valorNova),
        ]);

        return $nc->load('documentoOrigem', 'itens', 'cliente');
    }

    /**
     * Valida se os itens da Nota de Crédito são compatíveis com a fatura original
     */
    private function validarItensNotaCredito(DocumentoFiscal $fatura, array $itensNC): void
    {
        $itensFatura = $fatura->itens()->get();

        foreach ($itensNC as $itemNC) {
            // Se tem produto_id, verifica se existe na fatura
            if (! empty($itemNC['produto_id'])) {
                $existeNaFatura = $itensFatura->contains('produto_id', $itemNC['produto_id']);
                
                if (! $existeNaFatura) {
                    Log::warning('Item da Nota de Crédito não encontrado na fatura original', [
                        'produto_id' => $itemNC['produto_id'],
                        'fatura_id'  => $fatura->id,
                        'descricao'  => $itemNC['descricao'] ?? 'sem descrição'
                    ]);
                }
            }

            // Verifica se a quantidade não excede o que foi faturado
            if (! empty($itemNC['produto_id'])) {
                $itemFatura = $itensFatura->firstWhere('produto_id', $itemNC['produto_id']);
                if ($itemFatura) {
                    $quantidadeFaturada = (float) $itemFatura->quantidade;
                    $quantidadeNC = (float) ($itemNC['quantidade'] ?? 0);
                    
                    // Verifica créditos anteriores para este produto
                    $totalCreditadoProduto = $fatura->notasCredito()
                        ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                        ->whereHas('itens', function ($q) use ($itemNC) {
                            $q->where('produto_id', $itemNC['produto_id']);
                        })
                        ->sum('quantidade');
                    
                    $quantidadeTotalCreditada = $totalCreditadoProduto + $quantidadeNC;
                    
                    if ($quantidadeTotalCreditada > $quantidadeFaturada + 0.01) {
                        throw new \InvalidArgumentException(
                            "Quantidade creditada para o produto '{$itemNC['descricao']}' " .
                            "({$quantidadeTotalCreditada}) excede a quantidade faturada ({$quantidadeFaturada})."
                        );
                    }
                }
            }
        }
    }

    /**
     * Atualiza o estado da fatura após emissão de Nota de Crédito
     */
    private function atualizarEstadoFaturaAposCredito(DocumentoFiscal $fatura): void
    {
        $totalJaCreditado = $fatura->notasCredito()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');
        
        $saldo = (float) $fatura->total_liquido - $totalJaCreditado;
        
        if ($saldo <= 0.01) {
            $fatura->update(['estado' => DocumentoFiscal::ESTADO_PAGA]);
            Log::info('Fatura marcada como paga após crédito total', [
                'fatura_id' => $fatura->id,
                'saldo' => $saldo
            ]);
        } else {
            // Verifica se já estava paga e agora tem crédito
            $totalPago = $this->calcularTotalPago($fatura);
            if ($totalPago > 0 && $saldo < (float) $fatura->total_liquido) {
                $fatura->update(['estado' => DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA]);
            }
        }
    }

    /* =====================================================================
     | NOTA DE DÉBITO (CORRIGIDO)
     | ================================================================== */

    public function criarNotaDebito(DocumentoFiscal $documentoOrigem, array $dados): DocumentoFiscal
    {
        // 1. VALIDAR TIPO DE DOCUMENTO ORIGEM (apenas FT)
        if (! in_array($documentoOrigem->tipo_documento, ['FT'])) {
            throw new \InvalidArgumentException(
                "Nota de Débito só pode ser gerada a partir de Fatura (FT). " .
                "Tipo atual: {$documentoOrigem->tipo_documento}"
            );
        }

        // 2. VALIDAR SE A FATURA NÃO ESTÁ CANCELADA
        if ($documentoOrigem->estado === DocumentoFiscal::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException(
                "Não é possível gerar Nota de Débito de documento cancelado: {$documentoOrigem->numero_documento}"
            );
        }

        // 3. VALIDAR SE A FATURA NÃO ESTÁ EXPIRADA
        if ($documentoOrigem->estado === DocumentoFiscal::ESTADO_EXPIRADO) {
            throw new \InvalidArgumentException(
                "Não é possível emitir Nota de Débito para uma fatura expirada: {$documentoOrigem->numero_documento}"
            );
        }

        // 4. VALIDAR ITENS (obrigatório)
        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException(
                'A Nota de Débito deve conter pelo menos um item.'
            );
        }

        // 5. VALIDAR SE O DÉBITO É PARA SERVIÇOS
        $this->validarServicosNotaDebito($dados['itens']);

        // 6. VALIDAR PRAZO PARA DÉBITO (até 30 dias após emissão da fatura)
        $dataEmissaoFatura = Carbon::parse($documentoOrigem->data_emissao, 'Africa/Luanda');
        $prazoMaximo = $dataEmissaoFatura->copy()->addDays(30);
        $hoje = Carbon::now('Africa/Luanda');

        if ($hoje->gt($prazoMaximo)) {
            throw new \InvalidArgumentException(
                "O prazo para emitir Nota de Débito é de até 30 dias após a emissão da fatura. " .
                "Fatura emitida em: {$dataEmissaoFatura->format('d/m/Y')}, " .
                "Prazo máximo: {$prazoMaximo->format('d/m/Y')}."
            );
        }

        // 7. VERIFICAR SE A FATURA JÁ FOI PAGA
        $valorPago = $this->calcularTotalPago($documentoOrigem);
        $isPaga = $documentoOrigem->estado === DocumentoFiscal::ESTADO_PAGA;
        
        if ($isPaga) {
            // Se a fatura está paga, o débito deve ser claramente para juros ou multa
            $this->validarJurosMultaFaturaPaga($dados['itens']);
            
            Log::info('Nota de Débito para fatura paga - cobrança de juros/multas', [
                'fatura_id' => $documentoOrigem->id,
                'valor_pago' => $valorPago
            ]);
        }

        // 8. PREPARAR DADOS PARA EMISSÃO
        $dados['tipo_documento'] = 'ND';
        $dados['fatura_id']      = $documentoOrigem->id;
        $dados['motivo']         = $dados['motivo'] 
            ?? "Débito adicional referente à {$documentoOrigem->numero_documento}";

        $this->herdarCliente($dados, $documentoOrigem);

        // 9. EMITIR A NOTA DE DÉBITO
        $nd = $this->emitirDocumento($dados);

        // 10. ATUALIZAR ESTADO DA FATURA ORIGINAL
        $this->atualizarEstadoFaturaAposDebito($documentoOrigem, $nd);

        Log::info('Nota de Débito emitida com sucesso', [
            'nd_id'              => $nd->id,
            'nd_numero'          => $nd->numero_documento,
            'fatura_id'          => $documentoOrigem->id,
            'fatura_numero'      => $documentoOrigem->numero_documento,
            'valor_debito'       => $nd->total_liquido,
            'novo_valor_total'   => (float) $documentoOrigem->total_liquido + (float) $nd->total_liquido,
        ]);

        return $nd->load('documentoOrigem', 'itens', 'cliente');
    }

    /**
     * Valida se os itens da Nota de Débito são serviços
     */
    private function validarServicosNotaDebito(array $itens): void
    {
        $itensInvalidos = [];

        foreach ($itens as $item) {
            // Verifica se a descrição é detalhada
            if (empty($item['descricao']) || strlen($item['descricao']) < 5) {
                throw new \InvalidArgumentException(
                    "Cada item da Nota de Débito deve ter uma descrição detalhada."
                );
            }

            // Verifica se é serviço pelo produto_id
            if (! empty($item['produto_id'])) {
                $produto = Produto::find($item['produto_id']);
                if ($produto && $produto->tipo === 'produto') {
                    $itensInvalidos[] = $item['descricao'];
                }
            } else {
                // Item avulso - verifica pela descrição
                $descricaoLower = strtolower($item['descricao']);
                $palavrasServico = [
                    'serviço', 'servico', 'consulta', 'consultoria', 
                    'manutenção', 'manutencao', 'instalação', 'instalacao',
                    'juro', 'juros', 'multa', 'penalidade', 'taxa', 
                    'comissão', 'comissao', 'honorário', 'honorario',
                    'assessoria', 'planejamento', 'projeto', 'engenharia',
                    'design', 'desenvolvimento', 'programação', 'suporte',
                    'treinamento', 'consulting'
                ];
                
                $isServico = false;
                foreach ($palavrasServico as $palavra) {
                    if (strpos($descricaoLower, $palavra) !== false) {
                        $isServico = true;
                        break;
                    }
                }
                
                if (!$isServico) {
                    $itensInvalidos[] = $item['descricao'];
                }
            }
        }

        if (!empty($itensInvalidos)) {
            throw new \InvalidArgumentException(
                "Nota de Débito só pode ser usada para serviços.\n" .
                "Os seguintes itens não são serviços: " . implode(', ', $itensInvalidos)
            );
        }
    }

    /**
     * Valida se os itens são juros ou multas para fatura paga
     */
    private function validarJurosMultaFaturaPaga(array $itens): void
    {
        $temJuros = false;
        $temMulta = false;
        
        foreach ($itens as $item) {
            $descricao = strtolower($item['descricao']);
            if (strpos($descricao, 'juro') !== false || strpos($descricao, 'juros') !== false) {
                $temJuros = true;
            }
            if (strpos($descricao, 'multa') !== false || strpos($descricao, 'penalidade') !== false) {
                $temMulta = true;
            }
        }
        
        if (!$temJuros && !$temMulta) {
            throw new \InvalidArgumentException(
                "A fatura já está paga. Nota de Débito para fatura paga deve ser " .
                "exclusivamente para cobrança de juros de mora ou multas contratuais."
            );
        }
    }

    /**
     * Validação adicional para Nota de Crédito
     */
    private function validarNotaCredito(array $dados): void
    {
        // Verifica se tem fatura_id
        if (empty($dados['fatura_id'])) {
            throw new \InvalidArgumentException('Nota de Crédito deve referenciar uma fatura.');
        }

        // Verifica se tem motivo
        if (empty($dados['motivo'])) {
            throw new \InvalidArgumentException('Motivo da Nota de Crédito é obrigatório.');
        }

        if (strlen($dados['motivo']) < 10) {
            throw new \InvalidArgumentException('Motivo da Nota de Crédito deve ter pelo menos 10 caracteres.');
        }

        // Verifica se tem itens
        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException('Nota de Crédito deve conter pelo menos um item.');
        }
    }

    /**
     * Validação adicional para Nota de Débito
     */
    private function validarNotaDebito(array $dados): void
    {
        // Verifica se tem fatura_id
        if (empty($dados['fatura_id'])) {
            throw new \InvalidArgumentException('Nota de Débito deve referenciar uma fatura.');
        }

        // Verifica se tem itens
        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException('Nota de Débito deve conter pelo menos um item.');
        }

        // Valida se os itens são serviços
        $this->validarServicosNotaDebito($dados['itens']);
    }

    /**
     * Atualiza o estado da fatura após emissão de Nota de Débito
     */
    private function atualizarEstadoFaturaAposDebito(DocumentoFiscal $fatura, DocumentoFiscal $nd): void
    {
        $valorDebito = (float) $nd->total_liquido;
        $novoValorTotal = (float) $fatura->total_liquido + $valorDebito;
        
        // Atualiza o valor total da fatura para refletir o débito
        $fatura->update([
            'total_liquido' => $novoValorTotal
        ]);
        
        // Se a fatura estava paga, passa a ter saldo pendente
        if ($fatura->estado === DocumentoFiscal::ESTADO_PAGA) {
            $fatura->update(['estado' => DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA]);
            Log::info('Fatura voltou a ficar parcialmente paga após débito', [
                'fatura_id' => $fatura->id,
                'valor_debito' => $valorDebito,
                'novo_valor' => $novoValorTotal
            ]);
        }
    }

    /* =====================================================================
     | ADIANTAMENTO
     | ================================================================== */

    public function vincularAdiantamento(
        DocumentoFiscal $adiantamento,
        DocumentoFiscal $fatura,
        float $valor
    ): array {
        if ($adiantamento->tipo_documento !== 'FA') {
            throw new \InvalidArgumentException(
                "Apenas FA pode ser vinculada. Tipo: {$adiantamento->tipo_documento}"
            );
        }

        if ($adiantamento->estado !== DocumentoFiscal::ESTADO_EMITIDO) {
            throw new \InvalidArgumentException(
                "Adiantamento deve estar emitido. Estado: {$adiantamento->estado}"
            );
        }

        if ($fatura->tipo_documento !== 'FT') {
            throw new \InvalidArgumentException(
                "Apenas FT pode receber adiantamentos. Tipo: {$fatura->tipo_documento}"
            );
        }

        if (in_array($fatura->estado, [
            DocumentoFiscal::ESTADO_CANCELADO,
            DocumentoFiscal::ESTADO_PAGA,
        ])) {
            throw new \InvalidArgumentException(
                "Factura cancelada ou paga não pode receber adiantamentos. Estado: {$fatura->estado}"
            );
        }

        $clienteAdiantamento = $adiantamento->cliente_id ?? $adiantamento->cliente_nome;
        $clienteFatura       = $fatura->cliente_id ?? $fatura->cliente_nome;

        if ($clienteAdiantamento && $clienteFatura && $clienteAdiantamento !== $clienteFatura) {
            throw new \InvalidArgumentException(
                'O cliente do adiantamento não coincide com o cliente da fatura.'
            );
        }

        if ($valor > (float) $adiantamento->total_liquido) {
            throw new \InvalidArgumentException(
                "Valor ({$valor}) excede o total do adiantamento ({$adiantamento->total_liquido})."
            );
        }

        $valorPendenteFatura = $this->calcularValorPendente($fatura);
        if ($valor > $valorPendenteFatura + 0.01) {
            throw new \InvalidArgumentException(
                "Valor ({$valor}) excede o pendente da fatura ({$valorPendenteFatura})."
            );
        }

        return DB::transaction(function () use ($adiantamento, $fatura, $valor) {

            DB::table('adiantamento_fatura')->insert([
                'id'              => Str::uuid(),
                'adiantamento_id' => $adiantamento->id,
                'fatura_id'       => $fatura->id,
                'valor_utilizado' => $valor,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            $totalUtilizado = DB::table('adiantamento_fatura')
                ->where('adiantamento_id', $adiantamento->id)
                ->sum('valor_utilizado');

            if ((float) $totalUtilizado >= (float) $adiantamento->total_liquido) {
                $adiantamento->update(['estado' => DocumentoFiscal::ESTADO_PAGA]);
            }

            $totalAdiantamentos = DB::table('adiantamento_fatura')
                ->where('fatura_id', $fatura->id)
                ->sum('valor_utilizado');

            $totalPago     = $this->calcularTotalPago($fatura);
            $valorPendente = (float) $fatura->total_liquido - $totalPago - (float) $totalAdiantamentos;

            if ($valorPendente <= 0.01) {
                $fatura->update(['estado' => DocumentoFiscal::ESTADO_PAGA]);
            } else {
                $fatura->update(['estado' => DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA]);
            }

            Log::info('Adiantamento vinculado', [
                'adiantamento_id' => $adiantamento->id,
                'fatura_id'       => $fatura->id,
                'valor'           => $valor,
            ]);

            return [
                'adiantamento' => $adiantamento->fresh(),
                'fatura'       => $fatura->fresh(),
            ];
        });
    }

    /* =====================================================================
     | CANCELAMENTO
     | ================================================================== */

    public function cancelarDocumento(DocumentoFiscal $documento, string $motivo): DocumentoFiscal
    {
        if ($documento->estado === DocumentoFiscal::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException('Documento já se encontra cancelado.');
        }

        $derivadosActivos = $documento->documentosDerivados()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->count();

        if ($derivadosActivos > 0) {
            throw new \InvalidArgumentException(
                "Documento possui {$derivadosActivos} documentos derivados activos. Cancele-os primeiro."
            );
        }

        return DB::transaction(function () use ($documento, $motivo) {

            if ($this->configuracoesTipo[$documento->tipo_documento]['afeta_stock']) {
                $this->reverterStock($documento);
            }

            if (in_array($documento->tipo_documento, ['FT', 'FA'])) {
                $recibosActivos = $documento->recibos()
                    ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                    ->count();

                if ($recibosActivos > 0) {
                    throw new \InvalidArgumentException(
                        "Documento possui {$recibosActivos} recibos activos. Cancele-os primeiro."
                    );
                }
            }

            $agoraAngola = Carbon::now('Africa/Luanda');

            $documento->update([
                'estado'               => DocumentoFiscal::ESTADO_CANCELADO,
                'motivo_cancelamento'  => $motivo,
                'data_cancelamento'    => $agoraAngola,
                'user_cancelamento_id' => auth('tenant')->id(),
            ]);

            Log::info('Documento cancelado (cancelamento lógico — hash preservado)', [
                'id'     => $documento->id,
                'numero' => $documento->numero_documento,
                'motivo' => $motivo,
            ]);

            return $documento->fresh();
        });
    }

    /* =====================================================================
     | LISTAGEM E BUSCA
     | ================================================================== */

    public function listarDocumentos(array $filtros = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = DocumentoFiscal::with('cliente', 'venda', 'itens.produto');

        if (! empty($filtros['tipo'])) {
            $query->where('tipo_documento', $filtros['tipo']);
        }

        if (! empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }

        if (! empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }

        if (! empty($filtros['cliente_nome'])) {
            $query->where('cliente_nome', 'like', '%' . $filtros['cliente_nome'] . '%');
        }

        if (! empty($filtros['data_inicio'])) {
            $query->whereDate('data_emissao', '>=', $filtros['data_inicio']);
        }

        if (! empty($filtros['data_fim'])) {
            $query->whereDate('data_emissao', '<=', $filtros['data_fim']);
        }

        if (! empty($filtros['apenas_vendas'])) {
            $query->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
        }

        if (! empty($filtros['apenas_nao_vendas'])) {
            $query->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']);
        }

        if (! empty($filtros['pendentes'])) {
            $query->where('tipo_documento', 'FT')
                ->whereIn('estado', [
                    DocumentoFiscal::ESTADO_EMITIDO,
                    DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                ]);
        }

        if (! empty($filtros['adiantamentos_pendentes'])) {
            $query->where('tipo_documento', 'FA')
                ->where('estado', DocumentoFiscal::ESTADO_EMITIDO);
        }

        if (! empty($filtros['proformas_pendentes'])) {
            $query->where('tipo_documento', 'FP')
                ->where('estado', DocumentoFiscal::ESTADO_EMITIDO);
        }

        return $query->orderBy('data_emissao', 'desc')
                     ->orderBy('hora_emissao', 'desc')
                     ->orderBy('numero', 'desc')
                     ->paginate($filtros['per_page'] ?? 20);
    }

    public function buscarDocumento(string $documentoId): DocumentoFiscal
    {
        if (! Str::isUuid($documentoId)) {
            throw new \InvalidArgumentException('ID inválido. Formato UUID esperado.');
        }

        return DocumentoFiscal::with([
            'cliente',
            'venda',
            'itens.produto',
            'documentoOrigem',
            'documentosDerivados',
            'recibos',
            'notasCredito',
            'notasDebito',
            'faturasAdiantamento',
            'faturasVinculadas',
            'user',
            'userCancelamento',
        ])->findOrFail($documentoId);
    }

    /* =====================================================================
     | CÁLCULOS DE PAGAMENTO
     | ================================================================== */

    public function calcularValorPendente(DocumentoFiscal $documento): float
    {
        if (! in_array($documento->tipo_documento, ['FT', 'FA'])) {
            return 0.0;
        }

        $totalPago = $this->calcularTotalPago($documento);

        if ($documento->tipo_documento === 'FA') {
            return max(0.0, (float) $documento->total_liquido - $totalPago);
        }

        $totalAdiantamentos = (float) DB::table('adiantamento_fatura')
            ->where('fatura_id', $documento->id)
            ->sum('valor_utilizado');

        return max(0.0, (float) $documento->total_liquido - $totalPago - $totalAdiantamentos);
    }

    /**
     * Calcula o saldo disponível para crédito em uma fatura
     */
    public function calcularSaldoDisponivel(DocumentoFiscal $fatura): float
    {
        if (! in_array($fatura->tipo_documento, ['FT', 'FR'])) {
            return 0.0;
        }

        $totalCreditado = $fatura->notasCredito()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');

        return max(0.0, (float) $fatura->total_liquido - $totalCreditado);
    }

    /**
     * Verifica se pode emitir Nota de Crédito para um documento
     */
    public function podeEmitirNotaCredito(DocumentoFiscal $documento): array
    {
        // 1. Tipo de documento
        if (! in_array($documento->tipo_documento, ['FT', 'FR'])) {
            return [
                'pode' => false,
                'motivo' => "Apenas Fatura (FT) ou Fatura-Recibo (FR) podem originar Nota de Crédito. Tipo atual: {$documento->tipo_documento}"
            ];
        }

        // 2. Estado
        if ($documento->estado === DocumentoFiscal::ESTADO_CANCELADO) {
            return ['pode' => false, 'motivo' => 'Não é possível emitir Nota de Crédito para uma fatura cancelada.'];
        }
        if ($documento->estado === DocumentoFiscal::ESTADO_EXPIRADO) {
            return ['pode' => false, 'motivo' => 'Não é possível emitir Nota de Crédito para uma fatura expirada.'];
        }

        // 3. Saldo disponível
        $saldo = $this->calcularSaldoDisponivel($documento);
        if ($saldo <= 0.01) {
            return [
                'pode' => false,
                'motivo' => 'Esta fatura não possui saldo disponível para crédito.'
            ];
        }

        return ['pode' => true];
    }

    /**
     * Verifica se pode emitir Nota de Débito para um documento
     */
    public function podeEmitirNotaDebito(DocumentoFiscal $documento): array
    {
        // 1. Tipo de documento (apenas FT)
        if ($documento->tipo_documento !== 'FT') {
            return [
                'pode' => false,
                'motivo' => "Apenas Fatura (FT) pode originar Nota de Débito. Tipo atual: {$documento->tipo_documento}"
            ];
        }

        // 2. Estado
        if ($documento->estado === DocumentoFiscal::ESTADO_CANCELADO) {
            return ['pode' => false, 'motivo' => 'Não é possível emitir Nota de Débito para uma fatura cancelada.'];
        }
        if ($documento->estado === DocumentoFiscal::ESTADO_EXPIRADO) {
            return ['pode' => false, 'motivo' => 'Não é possível emitir Nota de Débito para uma fatura expirada.'];
        }

        // 3. Prazo de 30 dias
        $dataEmissao = Carbon::parse($documento->data_emissao, 'Africa/Luanda');
        $prazoMaximo = $dataEmissao->copy()->addDays(30);
        $hoje = Carbon::now('Africa/Luanda');

        if ($hoje->gt($prazoMaximo)) {
            return [
                'pode' => false,
                'motivo' => "O prazo para emitir Nota de Débito é de até 30 dias após a emissão da fatura.\n" .
                            "Prazo máximo: {$prazoMaximo->format('d/m/Y')}"
            ];
        }

        return ['pode' => true];
    }

    /**
     * Calcula o total de créditos já emitidos para uma fatura
     */
    public function calcularTotalCreditosEmitidos(DocumentoFiscal $fatura): float
    {
        return (float) $fatura->notasCredito()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');
    }

    /* =====================================================================
     | EXPIRAÇÃO DE ADIANTAMENTOS
     | ================================================================== */

    public function processarAdiantamentosExpirados(): int
    {
        $agoraAngola = Carbon::now('Africa/Luanda');

        $expirados = DocumentoFiscal::where('tipo_documento', 'FA')
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->where('data_vencimento', '<', $agoraAngola->toDateString())
            ->get();

        $count = 0;

        foreach ($expirados as $fa) {
            $fa->update(['estado' => DocumentoFiscal::ESTADO_EXPIRADO]);
            $count++;

            Log::info('Adiantamento expirado', [
                'id'              => $fa->id,
                'numero'          => $fa->numero_documento,
                'data_vencimento' => $fa->data_vencimento,
            ]);
        }

        return $count;
    }

    /* =====================================================================
     | DASHBOARD
     | ================================================================== */

    public function dadosDashboard(): array
    {
        $hoje      = Carbon::now('Africa/Luanda');
        $inicioMes = $hoje->copy()->startOfMonth();

        $faturasPendentes = DocumentoFiscal::where('tipo_documento', 'FT')
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->with('recibos')
            ->get();

        $totalPendenteCobranca = $faturasPendentes->sum(function ($fatura) {
            return $this->calcularValorPendente($fatura);
        });

        return [
            'faturas_emitidas_mes' => DocumentoFiscal::where('tipo_documento', 'FT')
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
                ->count(),

            'faturas_pendentes' => $faturasPendentes->count(),

            'total_pendente_cobranca' => round($totalPendenteCobranca, 2),

            'adiantamentos_pendentes_pagamento' => DocumentoFiscal::where('tipo_documento', 'FA')
                ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
                ->count(),

            'proformas_em_aberto' => DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
                ->count(),

            'documentos_cancelados_mes' => DocumentoFiscal::where('estado', DocumentoFiscal::ESTADO_CANCELADO)
                ->whereBetween('data_cancelamento', [$inicioMes, $hoje])
                ->count(),

            'total_vendas_mes' => DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR', 'RC'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
                ->count(),

            'total_nao_vendas_mes' => DocumentoFiscal::whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
                ->count(),
        ];
    }

    public function evolucaoMensal(int $ano): array
    {
        $evolucao = [];

        for ($mes = 1; $mes <= 12; $mes++) {
            $inicioMes = Carbon::create($ano, $mes, 1, 0, 0, 0, 'Africa/Luanda')->startOfMonth();
            $fimMes    = Carbon::create($ano, $mes, 1, 0, 0, 0, 'Africa/Luanda')->endOfMonth();

            $totalVendas = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR', 'RC'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $fimMes->toDateString()])
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_liquido');

            $totalNaoVendas = DocumentoFiscal::whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $fimMes->toDateString()])
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_liquido');

            $totalPendente = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', [
                    DocumentoFiscal::ESTADO_EMITIDO,
                    DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                ])
                ->where('data_emissao', '<=', $fimMes->toDateString())
                ->sum('total_liquido');

            $evolucao[] = [
                'mes'              => $mes,
                'ano'              => $ano,
                'total_vendas'     => (float) $totalVendas,
                'total_nao_vendas' => (float) $totalNaoVendas,
                'total_pendente'   => (float) $totalPendente,
            ];
        }

        return $evolucao;
    }

    public function estatisticasPagamentos(): array
    {
        $hoje      = Carbon::now('Africa/Luanda');
        $inicioMes = $hoje->copy()->startOfMonth();
        $inicioAno = $hoje->copy()->startOfYear();

        $porMetodo = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
            ->select(
                'metodo_pagamento',
                DB::raw('COUNT(*) as quantidade'),
                DB::raw('SUM(total_liquido) as total')
            )
            ->groupBy('metodo_pagamento')
            ->get()
            ->mapWithKeys(function ($item) {
                $metodo = $item->metodo_pagamento ?? 'nao_informado';
                return [$metodo => [
                    'quantidade' => $item->quantidade,
                    'total'      => (float) $item->total,
                ]];
            });

        $totalPagoMes = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
            ->sum('total_liquido');

        $totalPagoAno = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->whereBetween('data_emissao', [$inicioAno->toDateString(), $hoje->toDateString()])
            ->sum('total_liquido');

        return [
            'por_metodo'        => $porMetodo,
            'total_pago_mes'    => (float) $totalPagoMes,
            'total_pago_ano'    => (float) $totalPagoAno,
            'media_por_dia_mes' => (float) round($totalPagoMes / max($hoje->day, 1), 2),
        ];
    }

    public function alertasPendentes(): array
    {
        $hoje = Carbon::now('Africa/Luanda');

        $adiantamentosVencidos = DocumentoFiscal::where('tipo_documento', 'FA')
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->whereNotNull('data_vencimento')
            ->where('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get();

        $faturasComAdiantamentosPendentes = DocumentoFiscal::where('tipo_documento', 'FT')
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereHas('faturasAdiantamento', fn ($q) =>
                $q->whereIn('estado', [
                    DocumentoFiscal::ESTADO_EMITIDO,
                    DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                ])
            )
            ->with(['cliente', 'faturasAdiantamento' => fn ($q) =>
                $q->whereIn('estado', [
                    DocumentoFiscal::ESTADO_EMITIDO,
                    DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                ])
            ])
            ->orderByDesc('data_emissao')
            ->limit(10)
            ->get();

        $proformasEmAberto = DocumentoFiscal::where('tipo_documento', 'FP')
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->where('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->with('cliente')
            ->orderBy('data_emissao')
            ->limit(10)
            ->get();

        $faturasVencidas = DocumentoFiscal::where('tipo_documento', 'FT')
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->whereNotNull('data_vencimento')
            ->where('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get();

        return [
            'adiantamentos_vencidos' => [
                'total' => DocumentoFiscal::where('tipo_documento', 'FA')
                    ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
                    ->whereNotNull('data_vencimento')
                    ->where('data_vencimento', '<', $hoje->toDateString())
                    ->count(),
                'items' => $adiantamentosVencidos,
            ],

            'faturas_com_adiantamentos_pendentes' => [
                'total' => DocumentoFiscal::where('tipo_documento', 'FT')
                    ->whereIn('estado', [
                        DocumentoFiscal::ESTADO_EMITIDO,
                        DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                    ])
                    ->whereHas('faturasAdiantamento', fn ($q) =>
                        $q->whereIn('estado', [
                            DocumentoFiscal::ESTADO_EMITIDO,
                            DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                        ])
                    )
                    ->count(),
                'items' => $faturasComAdiantamentosPendentes,
            ],

            'proformas_em_aberto' => [
                'total' => DocumentoFiscal::where('tipo_documento', 'FP')
                    ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
                    ->where('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
                    ->count(),
                'items' => $proformasEmAberto,
            ],

            'faturas_vencidas' => [
                'total' => DocumentoFiscal::where('tipo_documento', 'FT')
                    ->whereIn('estado', [
                        DocumentoFiscal::ESTADO_EMITIDO,
                        DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                    ])
                    ->whereNotNull('data_vencimento')
                    ->where('data_vencimento', '<', $hoje->toDateString())
                    ->count(),
                'items' => $faturasVencidas,
            ],
        ];
    }

    /* =====================================================================
     | EXPORTAÇÃO — PDF e Excel
     | ================================================================== */

    public function dadosParaPdf(DocumentoFiscal $documento): array
    {
        $documento->loadMissing([
            'itens.produto',
            'cliente',
            'documentoOrigem',
            'recibos',
            'user',
        ]);

        $empresa = Empresa::firstOrFail();

        return [
            'empresa'   => [
                'nome'             => $empresa->nome,
                'nif'              => $empresa->nif,
                'morada'           => $empresa->morada,
                'telefone'         => $empresa->telefone,
                'email'            => $empresa->email,
                'logo'             => $empresa->logo,
                'certificado_agt'  => $empresa->certificado_agt ?? null,
            ],
            'documento' => $documento,
            'itens'     => $documento->itens,
            'cliente'   => [
                'nome' => $documento->nome_cliente,
                'nif'  => $documento->nif_cliente,
            ],
            'qr_code'   => $documento->qr_code,
        ];
    }

    public function dadosParaExcel(array $filtros = []): array
    {
        $documentos = DocumentoFiscal::with('cliente', 'itens')
            ->when(! empty($filtros['tipo']), fn ($q) => $q->where('tipo_documento', $filtros['tipo']))
            ->when(! empty($filtros['estado']), fn ($q) => $q->where('estado', $filtros['estado']))
            ->when(! empty($filtros['cliente_id']), fn ($q) => $q->where('cliente_id', $filtros['cliente_id']))
            ->when(! empty($filtros['data_inicio']), fn ($q) => $q->whereDate('data_emissao', '>=', $filtros['data_inicio']))
            ->when(! empty($filtros['data_fim']), fn ($q) => $q->whereDate('data_emissao', '<=', $filtros['data_fim']))
            ->when(! empty($filtros['apenas_vendas']), fn ($q) => $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']))
            ->when(! empty($filtros['apenas_nao_vendas']), fn ($q) => $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']))
            ->orderBy('data_emissao', 'desc')
            ->orderBy('hora_emissao', 'desc')
            ->orderBy('numero', 'desc')
            ->get();

        $cabecalho = [
            'Número',
            'Tipo',
            'Data Emissão',
            'Hora Emissão',
            'Cliente',
            'NIF Cliente',
            'Base Tributável',
            'Total IVA',
            'Total Retenção',
            'Total Líquido',
            'Estado',
            'Método Pagamento',
            'Vencimento',
            'Hash Fiscal',
        ];

        $linhas = $documentos->map(fn ($doc) => [
            $doc->numero_documento,
            $doc->tipo_documento_nome,
            $doc->data_emissao?->format('d/m/Y'),
            $doc->hora_emissao,
            $doc->nome_cliente,
            $doc->nif_cliente,
            number_format((float) $doc->base_tributavel, 2, ',', '.'),
            number_format((float) $doc->total_iva, 2, ',', '.'),
            number_format((float) $doc->total_retencao, 2, ',', '.'),
            number_format((float) $doc->total_liquido, 2, ',', '.'),
            $doc->estado,
            $doc->metodo_pagamento ?? '—',
            $doc->data_vencimento?->format('d/m/Y') ?? '—',
            $doc->hash_fiscal ?? '—',
        ])->toArray();

        return [
            'cabecalho'  => $cabecalho,
            'linhas'     => $linhas,
            'documentos' => $documentos,
        ];
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — ASSINATURA RSA (AGT)
     | ================================================================== */

    private function assinarDocumento(DocumentoFiscal $documento): void
    {
        $chavePrivadaPath  = config('agt.rsa_private_key_path');
        $versaoChave       = (int) config('agt.rsa_key_version', 1);
        $numeroCertificado = config('agt.numero_certificado', '');

        if (! $chavePrivadaPath || ! file_exists($chavePrivadaPath)) {
            Log::error('[AGT] Chave privada RSA não encontrada', [
                'path' => $chavePrivadaPath,
            ]);
            throw new \RuntimeException(
                'Chave privada RSA para assinatura AGT não configurada. ' .
                'Configure agt.rsa_private_key_path em config/agt.php.'
            );
        }

        $chavePrivada = openssl_pkey_get_private(file_get_contents($chavePrivadaPath));

        if (! $chavePrivada) {
            throw new \RuntimeException('Erro ao carregar chave privada RSA: ' . openssl_error_string());
        }

        $hashAnterior = DocumentoFiscal::where('serie', $documento->serie)
            ->where('tipo_documento', $documento->tipo_documento)
            ->where('numero', '<', $documento->numero)
            ->whereNotNull('hash_fiscal')
            ->orderByDesc('numero')
            ->value('hash_fiscal') ?? '0';

        $dadosAssinatura = implode(';', [
            $documento->data_emissao,
            $documento->hora_emissao,
            $documento->numero_documento,
            number_format((float) $documento->total_liquido, 2, '.', ''),
            $hashAnterior,
        ]);

        $assinatura = '';
        $resultado  = openssl_sign($dadosAssinatura, $assinatura, $chavePrivada, OPENSSL_ALGO_SHA256);

        if (! $resultado) {
            throw new \RuntimeException('Erro ao gerar assinatura RSA: ' . openssl_error_string());
        }

        $hashFiscal     = hash('sha256', $dadosAssinatura);
        $qrCodeConteudo = $this->gerarConteudoQrCode($documento, $hashFiscal, $numeroCertificado);

        $documento->update([
            'hash_fiscal'      => $hashFiscal,
            'rsa_assinatura'   => base64_encode($assinatura),
            'rsa_versao_chave' => $versaoChave,
            'hash_anterior'    => $hashAnterior,
            'qr_code'          => $qrCodeConteudo,
        ]);

        Log::info('[AGT] Documento assinado com sucesso', [
            'documento_id'     => $documento->id,
            'numero'           => $documento->numero_documento,
            'rsa_versao_chave' => $versaoChave,
            'hash_fiscal'      => $hashFiscal,
        ]);
    }

    private function gerarConteudoQrCode(
        DocumentoFiscal $documento,
        string $hashFiscal,
        string $numeroCertificado
    ): string {
        $empresa    = Empresa::firstOrFail();
        $nifCliente = $documento->cliente?->nif
            ?? $documento->cliente_nif
            ?? 'CF';

        $hash4 = strtoupper(substr($hashFiscal, 0, 4));

        return implode('*', [
            $empresa->nif,
            $nifCliente,
            $documento->data_emissao,
            number_format((float) $documento->base_tributavel, 2, '.', ''),
            number_format((float) $documento->total_iva, 2, '.', ''),
            number_format((float) $documento->total_liquido, 2, '.', ''),
            $hash4,
            $numeroCertificado,
        ]);
    }

    private function gerarHashSimples(DocumentoFiscal $documento): string
    {
        $dados = implode('|', [
            $documento->numero_documento,
            $documento->data_emissao,
            $documento->hora_emissao,
            number_format((float) $documento->total_liquido, 2, '.', ''),
            $documento->cliente_id ?? $documento->cliente_nome ?? 'CF',
            config('app.key'),
        ]);

        return hash('sha256', $dados);
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — PROCESSAMENTO DE ITENS (IVA)
     | ================================================================== */

    private function processarItens(array $itens, bool $aplicaIva, string $regime): array
    {
        $totalBase     = 0.0;
        $totalIva      = 0.0;
        $totalRetencao = 0.0;
        $itensProcessados = [];

        foreach ($itens as $item) {
            $produto = ! empty($item['produto_id'])
                ? Produto::find($item['produto_id'])
                : null;

            $quantidade    = (float) ($item['quantidade'] ?? 1);
            $precoUnitario = (float) ($item['preco_venda'] ?? $item['preco_unitario'] ?? 0);
            $desconto      = (float) ($item['desconto'] ?? 0);
            $taxaDesconto  = (float) ($item['taxa_desconto'] ?? 0);

            $valorBruto = $quantidade * $precoUnitario;

            if ($taxaDesconto > 0) {
                $desconto += $valorBruto * $taxaDesconto / 100;
            }

            $desconto       = min($desconto, $valorBruto);
            $baseTributavel = max($valorBruto - $desconto, 0.0);

            $taxaIva       = 0.0;
            $codigoIsencao = null;
            $motivoIsencao = null;

            if ($aplicaIva) {
                if ($regime === 'geral') {
                    $taxaExplicita = $item['taxa_iva'] ?? $produto?->taxa_iva ?? null;

                    if ($taxaExplicita !== null) {
                        $taxaIva = (float) $taxaExplicita;
                    } else {
                        $taxaIva = self::IVA_GERAL;
                    }

                    if (! in_array($taxaIva, [self::IVA_GERAL, self::IVA_REDUZIDA, self::IVA_ZERO])) {
                        Log::warning('[AGT] Taxa de IVA fora das taxas legais angolanas', [
                            'taxa_usada' => $taxaIva,
                            'produto_id' => $item['produto_id'] ?? null,
                        ]);
                    }

                    if ($taxaIva === 0.0 || $taxaIva === self::IVA_ZERO) {
                        $codigoIsencao = $item['codigo_isencao'] ?? $produto?->codigo_isencao ?? 'M00';
                        $motivoIsencao = self::MOTIVOS_ISENCAO[$codigoIsencao] ?? 'Isento';
                    }

                } elseif ($regime === 'simplificado') {
                    $taxaIva       = self::IVA_ZERO;
                    $codigoIsencao = 'M01';
                    $motivoIsencao = self::MOTIVOS_ISENCAO['M01'];
                }
            } else {
                $codigoIsencao = $item['codigo_isencao'] ?? 'M06';
                $motivoIsencao = self::MOTIVOS_ISENCAO[$codigoIsencao];
            }

            $valorIva = round($baseTributavel * $taxaIva / 100, 2);

            $valorRetencao     = 0.0;
            $taxaRetencaoUsada = 0.0;

            $isServicoItem    = (($item['eh_servico'] ?? null) === true) || $produto?->tipo === 'servico';
            $temRetencao      = $isServicoItem && $aplicaIva;

            if ($temRetencao) {
                $taxaRetencaoUsada = (float) (
                    $item['taxa_retencao']
                    ?? $produto?->taxa_retencao
                    ?? 6.5
                );
                $valorRetencao = round($baseTributavel * $taxaRetencaoUsada / 100, 2);
            }

            $totalLinha = round($baseTributavel + $valorIva - $valorRetencao, 2);

            $itensProcessados[] = [
                'produto_id'      => $item['produto_id'] ?? null,
                'descricao'       => $item['descricao'] ?? $produto?->nome ?? 'Item',
                'quantidade'      => $quantidade,
                'preco_unitario'  => $precoUnitario,
                'valor_bruto'     => round($valorBruto, 2),
                'desconto'        => round($desconto, 2),
                'taxa_desconto'   => $taxaDesconto,
                'base_tributavel' => round($baseTributavel, 2),
                'taxa_iva'        => $taxaIva,
                'valor_iva'       => $valorIva,
                'codigo_isencao'  => $codigoIsencao,
                'motivo_isencao'  => $motivoIsencao,
                'taxa_retencao'   => $taxaRetencaoUsada,
                'valor_retencao'  => $valorRetencao,
                'total_linha'     => $totalLinha,
            ];

            $totalBase     += $baseTributavel;
            $totalIva      += $valorIva;
            $totalRetencao += $valorRetencao;
        }

        $totalBase     = round($totalBase, 2);
        $totalIva      = round($totalIva, 2);
        $totalRetencao = round($totalRetencao, 2);
        $totalLiquido  = round($totalBase + $totalIva - $totalRetencao, 2);

        $somaLinhas = round(array_sum(array_column($itensProcessados, 'total_linha')), 2);
        if (abs($somaLinhas - $totalLiquido) > 0.01) {
            Log::warning('[AGT] Diferença de arredondamento ajustada', [
                'soma_linhas'     => $somaLinhas,
                'total_calculado' => $totalLiquido,
                'diferenca'       => $somaLinhas - $totalLiquido,
            ]);
            $totalLiquido = $somaLinhas;
        }

        return [
            'base'              => $totalBase,
            'iva'               => $totalIva,
            'retencao'          => $totalRetencao,
            'liquido'           => $totalLiquido,
            'itens_processados' => $itensProcessados,
        ];
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — NUMERAÇÃO
     | ================================================================== */

    private function gerarNumeroDocumento(string $tipo): array
    {
        $serieFiscal = $this->obterSerieFiscal($tipo);

        DB::table('series_fiscais')
            ->where('id', $serieFiscal->id)
            ->lockForUpdate()
            ->first();

        $ultimoNumeroReal = DocumentoFiscal::where('serie', $serieFiscal->serie)
            ->where('tipo_documento', $tipo)
            ->lockForUpdate()
            ->max('numero');

        $numeroBase    = max($serieFiscal->ultimo_numero, $ultimoNumeroReal ?? 0);
        $tentativas    = 0;
        $maxTentativas = 100;

        do {
            $numero          = $numeroBase + 1 + $tentativas;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad(
                $numero,
                $serieFiscal->digitos ?? 5,
                '0',
                STR_PAD_LEFT
            );

            $existe = DocumentoFiscal::where('numero_documento', $numeroDocumento)
                ->lockForUpdate()
                ->exists();

            if (! $existe) {
                break;
            }

            $tentativas++;

            if ($tentativas >= $maxTentativas) {
                throw new \RuntimeException(
                    "Não foi possível gerar número único para {$tipo} após {$maxTentativas} tentativas."
                );
            }
        } while (true);

        $serieFiscal->update(['ultimo_numero' => $numero]);

        Log::info('Número de documento gerado', [
            'tipo'             => $tipo,
            'numero_documento' => $numeroDocumento,
            'tentativas'       => $tentativas,
        ]);

        return [$numero, $numeroDocumento, $serieFiscal];
    }

    private function obterSerieFiscal(string $tipo): SerieFiscal
    {
        $serie = SerieFiscal::where('tipo_documento', $tipo)
            ->where('ativa', true)
            ->where(fn ($q) => $q->whereNull('ano')->orWhere('ano', now()->year))
            ->orderByDesc('padrao')
            ->lockForUpdate()
            ->first();

        if (! $serie) {
            throw new \RuntimeException("Nenhuma série fiscal activa encontrada para {$tipo}.");
        }

        return $serie;
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — AUXILIARES
     | ================================================================== */

    private function validarDadosPorTipo(array $dados, string $tipo, array $config): void
    {
        if ($config['exige_cliente']) {
            $temCliente = ! empty($dados['cliente_id']) || ! empty($dados['cliente_nome']);

            if (! $temCliente) {
                throw new \InvalidArgumentException(
                    "{$config['nome']} requer um cliente (cadastrado ou avulso)."
                );
            }
        }

        $regras = [
            'FR'  => ['dados_pagamento'],
            'FA'  => ['data_vencimento'],
            'RC'  => ['fatura_id'],
            'NC'  => ['fatura_id', 'motivo', 'itens'],
            'ND'  => ['fatura_id', 'itens'],
            'FRt' => ['fatura_id', 'motivo'],
        ];

        foreach ($regras[$tipo] ?? [] as $campo) {
            if (empty($dados[$campo])) {
                throw new \InvalidArgumentException(
                    "Campo '{$campo}' é obrigatório para {$config['nome']}."
                );
            }
        }

        if (! empty($dados['fatura_id'])) {
            $origem = DocumentoFiscal::find($dados['fatura_id']);

            if (! $origem) {
                throw new \InvalidArgumentException('Documento de origem não encontrado.');
            }

            if (in_array($tipo, ['NC', 'ND']) && ! in_array($origem->tipo_documento, ['FT', 'FR'])) {
                throw new \InvalidArgumentException(
                    "NC/ND só podem ser geradas a partir de FT ou FR. Tipo: {$origem->tipo_documento}"
                );
            }

            if ($tipo === 'RC' && ! in_array($origem->tipo_documento, ['FT', 'FA', 'FP'])) {
                throw new \InvalidArgumentException(
                    "Recibo só pode ser gerado a partir de FT, FA ou FP. Tipo: {$origem->tipo_documento}"
                );
            }
        }
    }

    private function calcularDataVencimento(string $tipo, array $dados, Carbon $dataEmissao): ?string
    {
        if (in_array($tipo, ['RC', 'NC', 'FRt', 'FP'])) {
            return null;
        }

        if ($tipo === 'FA') {
            return $dados['data_vencimento']
                ?? $dataEmissao->copy()->addDays(30)->toDateString();
        }

        if (! empty($dados['data_vencimento'])) {
            return $dados['data_vencimento'];
        }

        $prazoDias = match ($tipo) {
            'FR'    => 0,
            'ND'    => 15,
            default => 30,
        };

        return $dataEmissao->copy()->addDays($prazoDias)->toDateString();
    }

    private function criarItensDocumento(DocumentoFiscal $documento, array $itensProcessados): void
    {
        $agora = Carbon::now('Africa/Luanda');

        $registos = array_map(function ($item, $index) use ($documento, $agora) {
            return [
                'id'                  => (string) Str::uuid(),
                'documento_fiscal_id' => $documento->id,
                'produto_id'          => $item['produto_id'],
                'descricao'           => $item['descricao'],
                'quantidade'          => $item['quantidade'],
                'preco_unitario'      => $item['preco_unitario'],
                'base_tributavel'     => $item['base_tributavel'],
                'taxa_iva'            => $item['taxa_iva'],
                'valor_iva'           => $item['valor_iva'],
                'codigo_isencao'      => $item['codigo_isencao'],
                'motivo_isencao'      => $item['motivo_isencao'],
                'valor_retencao'      => $item['valor_retencao'],
                'taxa_retencao'       => $item['taxa_retencao'],
                'desconto'            => $item['desconto'],
                'total_linha'         => $item['total_linha'],
                'ordem'               => $index + 1,
                'created_at'          => $agora,
                'updated_at'          => $agora,
            ];
        }, $itensProcessados, array_keys($itensProcessados));

        ItemDocumentoFiscal::insert($registos);
    }

    private function executarAcoesPosCriacao(DocumentoFiscal $documento, array $dados, string $tipo): void
    {
        if ($this->configuracoesTipo[$tipo]['afeta_stock']) {
            $this->movimentarStock($documento);
        }

        if (in_array($tipo, ['FT', 'FR']) && ! empty($dados['venda_id'])) {
            $this->atualizarVenda($dados['venda_id'], $documento);
        }
    }

    private function calcularTotalPago(DocumentoFiscal $documento): float
    {
        return (float) DocumentoFiscal::where('fatura_id', $documento->id)
            ->where('tipo_documento', 'RC')
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');
    }

    /**
     * Alias público para controllers e outros consumers.
     */
    public function calcularValorPago(DocumentoFiscal $documento): float
    {
        return $this->calcularTotalPago($documento);
    }

    private function actualizarEstadoAposPagamento(DocumentoFiscal $documentoOrigem, float $valorPago): void
    {
        $totalPagoActualizado = $this->calcularTotalPago($documentoOrigem) + $valorPago;

        if ($documentoOrigem->tipo_documento === 'FA') {
            $estadoFinal = $totalPagoActualizado >= (float) $documentoOrigem->total_liquido
                ? DocumentoFiscal::ESTADO_PAGA
                : DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA;
        } else {
            $totalAdiantamentos = (float) DB::table('adiantamento_fatura')
                ->where('fatura_id', $documentoOrigem->id)
                ->sum('valor_utilizado');

            $estadoFinal = ($totalPagoActualizado + $totalAdiantamentos) >= (float) $documentoOrigem->total_liquido
                ? DocumentoFiscal::ESTADO_PAGA
                : DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA;
        }

        $documentoOrigem->update(['estado' => $estadoFinal]);
    }

    private function resolverCliente(array $dados, string $tipo): ?string
    {
        if (! empty($dados['cliente_id'])) {
            return $dados['cliente_id'];
        }

        if (! empty($dados['cliente_nome'])) {
            return null;
        }

        if (! empty($dados['fatura_id'])) {
            $origem = DocumentoFiscal::find($dados['fatura_id']);
            if ($origem) {
                return $origem->cliente_id;
            }
        }

        if (! empty($dados['venda_id'])) {
            $venda = Venda::find($dados['venda_id']);
            if ($venda) {
                return $venda->cliente_id;
            }
        }

        return null;
    }

    private function herdarCliente(array &$dados, DocumentoFiscal $origem): void
    {
        if ($origem->cliente_id) {
            $dados['cliente_id'] = $origem->cliente_id;
        } elseif ($origem->cliente_nome) {
            $dados['cliente_nome'] = $origem->cliente_nome;
            $dados['cliente_nif']  = $origem->cliente_nif;
        }
    }

    private function movimentarStock(DocumentoFiscal $documento): void
    {
        Log::info('Movimentação de stock', [
            'documento' => $documento->numero_documento,
            'tipo'      => $documento->tipo_documento,
        ]);

        app(StockService::class)->processarDocumentoFiscal($documento);
    }

    private function reverterStock(DocumentoFiscal $documento): void
    {
        Log::info("Reversão de stock", [
            'documento' => $documento->numero_documento,
            'tipo'      => $documento->tipo_documento,
        ]);

        app(StockService::class)->reverterDocumentoFiscal($documento);
    }

    private function atualizarVenda(string $vendaId, DocumentoFiscal $documento): void
    {
        try {
            $venda = Venda::find($vendaId);

            if ($venda) {
                $venda->update([
                    'documento_fiscal_id'   => $documento->id,
                    'status'                => 'faturada',
                    'tipo_documento_fiscal' => $documento->tipo_documento,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Erro ao actualizar venda', [
                'venda_id' => $vendaId,
                'error'    => $e->getMessage(),
            ]);
        }
    }
}
