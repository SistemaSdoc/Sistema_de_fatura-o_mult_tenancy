<?php

namespace App\Services;

use App\Models\DocumentoFiscal;
use App\Models\ItemDocumentoFiscal;
use App\Models\Venda;
use App\Models\Empresa;
use App\Models\SerieFiscal;
use App\Models\Produto;
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
            'nome'                  => 'Fatura',
            'afeta_stock'           => true,
            'eh_venda'              => true,
            'gera_recibo'           => true,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => true,
            'pode_ter_adiantamento' => true,
            'requer_assinatura'     => true,   // AGT: obrigatório assinar
        ],
        'FR' => [
            'nome'                  => 'Fatura-Recibo',
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
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => false,  // Proforma não é documento fiscal definitivo
        ],
        'FA' => [
            'nome'                  => 'Fatura de Adiantamento',
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
            'requer_assinatura'     => false,  // AGT: recibos isentos de assinatura
        ],
        'FRt' => [
            'nome'                  => 'Fatura de Retificação',
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

    /**
     * Emite qualquer tipo de documento fiscal.
     *
     * AGT: O documento só é considerado válido após:
     *  1. Assinatura RSA (hash_fiscal + rsa_assinatura)
     *  2. Geração do QR Code
     *  3. Ambos gravados na BD antes de qualquer impressão
     */
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

            // Numeração com lock pessimista (série exclusiva por tipo, sem gaps)
            [$numero, $numeroDocumento, $serieFiscal] = $this->gerarNumeroDocumento($tipo);

            // CORREÇÃO: Usar fuso horário de Angola (UTC+1)
            $agoraAngola = Carbon::now('Africa/Luanda');
            $dataEmissao = $agoraAngola->toDateString();
            $horaEmissao = $agoraAngola->toTimeString();

            $dataVencimento = $this->calcularDataVencimento($tipo, $dados, $agoraAngola);
            $totais         = $this->processarItens($dados['itens'] ?? [], $aplicaIva, $regime);
            $clienteId      = $this->resolverCliente($dados, $tipo);

            $documentoData = [
                'id'                  => Str::uuid(),
                'user_id'             => Auth::id(),
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
                // AGT: campos de assinatura inicializados a null —
                // preenchidos depois da criação, antes de qualquer impressão
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

            // ── AGT: Assinatura e QR Code ──────────────────────────────
            if ($config['requer_assinatura']) {
                $this->assinarDocumento($documento);
            } else {
                // Documentos não sujeitos a assinatura (RC, FP) recebem
                // apenas o hash simples para integridade interna
                $documento->update([
                    'hash_fiscal' => $this->gerarHashSimples($documento),
                ]);
            }
            // ── Fim assinatura ─────────────────────────────────────────

            // FT com pagamento imediato → gerar recibo automaticamente
            if ($tipo === 'FT' && ! empty($dados['dados_pagamento'])) {
                $this->gerarRecibo($documento, [
                    'valor'            => $dados['dados_pagamento']['valor'],
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'data_pagamento'   => $dados['dados_pagamento']['data'] ?? $agoraAngola->toDateString(),
                    'referencia'       => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            // FR — registar método de pagamento no próprio documento
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

    /**
     * Gera um recibo (RC) para uma FT ou FA.
     * Recibos são isentos de assinatura RSA pela AGT.
     */
    public function gerarRecibo(DocumentoFiscal $documentoOrigem, array $dados): DocumentoFiscal
    {
        if (! in_array($documentoOrigem->tipo_documento, ['FT', 'FA'])) {
            throw new \InvalidArgumentException(
                "Apenas FT e FA podem receber recibo. Tipo: {$documentoOrigem->tipo_documento}"
            );
        }

        if (in_array($documentoOrigem->estado, [
            DocumentoFiscal::ESTADO_PAGA,
            DocumentoFiscal::ESTADO_CANCELADO,
        ])) {
            throw new \InvalidArgumentException(
                "Documento já pago ou cancelado. Estado: {$documentoOrigem->estado}"
            );
        }

        return DB::transaction(function () use ($documentoOrigem, $dados) {

            $valorPago     = (float) $dados['valor'];
            $valorPendente = $this->calcularValorPendente($documentoOrigem);

            if ($valorPago > $valorPendente + 0.01) {
                throw new \InvalidArgumentException(
                    "Valor do pagamento ({$valorPago}) excede o pendente ({$valorPendente})."
                );
            }

            [$numero, $numeroDocumento, $serieFiscal] = $this->gerarNumeroDocumento('RC');

            // CORREÇÃO: Usar fuso horário de Angola
            $agoraAngola = Carbon::now('Africa/Luanda');

            $reciboData = [
                'id'                   => Str::uuid(),
                'user_id'              => Auth::id(),
                'fatura_id'            => $documentoOrigem->id,
                'serie'                => $serieFiscal->serie,
                'numero'               => $numero,
                'numero_documento'     => $numeroDocumento,
                'tipo_documento'       => 'RC',
                'data_emissao'         => $dados['data_pagamento'] ?? $agoraAngola->toDateString(),
                'hora_emissao'         => $agoraAngola->toTimeString(),
                'data_vencimento'      => null,
                'base_tributavel'      => 0,
                'total_iva'            => 0,
                'total_retencao'       => 0,
                'total_liquido'        => $valorPago,
                'estado'               => DocumentoFiscal::ESTADO_PAGA,
                'metodo_pagamento'     => $dados['metodo_pagamento'],
                'referencia_pagamento' => $dados['referencia'] ?? null,
                'hash_fiscal'          => null,
                'rsa_assinatura'       => null,
                'rsa_versao_chave'     => null,
                'qr_code'              => null,
                'hash_anterior'        => null,
            ];

            // Herdar dados do cliente do documento origem
            if ($documentoOrigem->cliente_id) {
                $reciboData['cliente_id'] = $documentoOrigem->cliente_id;
            } elseif ($documentoOrigem->cliente_nome) {
                $reciboData['cliente_nome'] = $documentoOrigem->cliente_nome;
                $reciboData['cliente_nif']  = $documentoOrigem->cliente_nif;
            }

            $recibo = DocumentoFiscal::create($reciboData);

            // Actualizar estado do documento origem
            $this->actualizarEstadoAposPagamento($documentoOrigem, $valorPago);

            // RC: hash simples (sem RSA — isenção AGT para recibos)
            $recibo->update(['hash_fiscal' => $this->gerarHashSimples($recibo)]);

            Log::info('Recibo gerado', [
                'recibo_id'           => $recibo->id,
                'numero'              => $recibo->numero_documento,
                'documento_origem_id' => $documentoOrigem->id,
                'valor'               => $valorPago,
            ]);

            return $recibo->load('documentoOrigem');
        });
    }

    /* =====================================================================
     | NOTA DE CRÉDITO
     | ================================================================== */

    /**
     * Cria uma NC vinculada a FT ou FR.
     * AGT: NC deve identificar o(s) documento(s) rectificado(s) (campo References).
     */
    public function criarNotaCredito(DocumentoFiscal $documentoOrigem, array $dados): DocumentoFiscal
    {
        if (! in_array($documentoOrigem->tipo_documento, ['FT', 'FR'])) {
            throw new \InvalidArgumentException(
                "NC só pode ser gerada a partir de FT ou FR. Tipo: {$documentoOrigem->tipo_documento}"
            );
        }

        if ($documentoOrigem->estado === DocumentoFiscal::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException(
                "Não é possível gerar NC de documento cancelado: {$documentoOrigem->numero_documento}"
            );
        }

        $totalJaCreditado = $documentoOrigem->notasCredito()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');

        $empresa  = Empresa::firstOrFail();
        $totais   = $this->processarItens($dados['itens'], $empresa->sujeito_iva, $empresa->regime_fiscal);
        $valorNova = $totais['liquido'];

        if (($totalJaCreditado + $valorNova) > ((float) $documentoOrigem->total_liquido + 0.01)) {
            throw new \InvalidArgumentException(
                "Total creditado ({$totalJaCreditado}) + esta NC ({$valorNova}) " .
                "ultrapassa o valor do documento ({$documentoOrigem->total_liquido})."
            );
        }

        $dados['tipo_documento'] = 'NC';
        $dados['fatura_id']      = $documentoOrigem->id;
        $dados['motivo']         = $dados['motivo'] ?? "Correção de {$documentoOrigem->numero_documento}";

        $this->herdarCliente($dados, $documentoOrigem);

        return $this->emitirDocumento($dados);
    }

    /* =====================================================================
     | NOTA DE DÉBITO
     | ================================================================== */

    public function criarNotaDebito(DocumentoFiscal $documentoOrigem, array $dados): DocumentoFiscal
    {
        if (! in_array($documentoOrigem->tipo_documento, ['FT', 'FR'])) {
            throw new \InvalidArgumentException(
                "ND só pode ser gerada a partir de FT ou FR. Tipo: {$documentoOrigem->tipo_documento}"
            );
        }

        if ($documentoOrigem->estado === DocumentoFiscal::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException(
                "Não é possível gerar ND de documento cancelado: {$documentoOrigem->numero_documento}"
            );
        }

        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException('A Nota de Débito deve conter pelo menos um item.');
        }

        $dados['tipo_documento'] = 'ND';
        $dados['fatura_id']      = $documentoOrigem->id;
        $dados['motivo']         = $dados['motivo']
            ?? "Débito adicional referente à {$documentoOrigem->numero_documento}";

        $this->herdarCliente($dados, $documentoOrigem);

        return $this->emitirDocumento($dados);
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
                "Fatura cancelada ou paga não pode receber adiantamentos. Estado: {$fatura->estado}"
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
     | AGT: cancelamento é LÓGICO — dados originais e hash_fiscal são
     |      imutáveis após emissão. Apenas o campo 'estado' e os metadados
     |      de cancelamento são actualizados.
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

            // CORREÇÃO: Usar fuso horário de Angola para data de cancelamento
            $agoraAngola = Carbon::now('Africa/Luanda');

            // AGT: NUNCA sobrescrever hash_fiscal, rsa_assinatura, rsa_versao_chave
            // Apenas actualizar estado e metadados de cancelamento
            $documento->update([
                'estado'               => DocumentoFiscal::ESTADO_CANCELADO,
                'motivo_cancelamento'  => $motivo,
                'data_cancelamento'    => $agoraAngola,
                'user_cancelamento_id' => Auth::id(),
                // hash_fiscal, rsa_assinatura, rsa_versao_chave, qr_code — NÃO TOCAR
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

        // ORDENAÇÃO: Mais recente para mais antigo (data e hora)
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
        // CORREÇÃO: Usar fuso horário de Angola
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

            'adiantamentos_pendentes' => DocumentoFiscal::where('tipo_documento', 'FA')
                ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
                ->count(),

            'proformas_pendentes' => DocumentoFiscal::where('tipo_documento', 'FP')
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
        // CORREÇÃO: Usar fuso horário de Angola
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
        // CORREÇÃO: Usar fuso horário de Angola
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

        $proformasPendentes = DocumentoFiscal::where('tipo_documento', 'FP')
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
            'proformas_pendentes' => [
                'total' => DocumentoFiscal::where('tipo_documento', 'FP')
                    ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
                    ->where('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
                    ->count(),
                'items' => $proformasPendentes,
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
            // AGT: QR Code pré-gerado a incluir no PDF
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
            'Hash Fiscal',      // AGT: campo de auditoria
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

    /**
     * Assina o documento com RSA e gera o QR Code.
     *
     * AGT exige:
     *  - Algoritmo RSA com chave privada do fabricante
     *  - Versão da chave gravada com cada documento
     *  - Assinatura guardada em BD não encriptada
     *  - Hash encadeado: cada documento referencia o hash do anterior da mesma série
     *  - QR Code gerado após assinatura
     *
     * Configuração necessária em config/agt.php:
     *   'rsa_private_key_path' => storage_path('keys/agt_private.pem'),
     *   'rsa_key_version'      => 1,
     *   'numero_certificado'   => 'AGT-CERT-XXXX',
     */
    private function assinarDocumento(DocumentoFiscal $documento): void
    {
        $chavePrivadaPath = config('agt.rsa_private_key_path');
        $versaoChave      = (int) config('agt.rsa_key_version', 1);
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

        // ── Hash encadeado: buscar hash do documento anterior da mesma série ──
        $hashAnterior = DocumentoFiscal::where('serie', $documento->serie)
            ->where('tipo_documento', $documento->tipo_documento)
            ->where('numero', '<', $documento->numero)
            ->whereNotNull('hash_fiscal')
            ->orderByDesc('numero')
            ->value('hash_fiscal') ?? '0';

        // ── Dados para assinatura (conforme estrutura AGT) ────────────────
        // Campos obrigatórios: data_emissao;hora_emissao;numero_documento;total_liquido;hash_anterior
        $dadosAssinatura = implode(';', [
            $documento->data_emissao,
            $documento->hora_emissao,
            $documento->numero_documento,
            number_format((float) $documento->total_liquido, 2, '.', ''),
            $hashAnterior,
        ]);

        // ── Assinar com RSA ───────────────────────────────────────────────
        $assinatura = '';
        $resultado  = openssl_sign($dadosAssinatura, $assinatura, $chavePrivada, OPENSSL_ALGO_SHA256);

        if (! $resultado) {
            throw new \RuntimeException('Erro ao gerar assinatura RSA: ' . openssl_error_string());
        }

        // ── Hash fiscal = SHA-256 dos dados de assinatura ─────────────────
        $hashFiscal = hash('sha256', $dadosAssinatura);

        // ── QR Code (conteúdo conforme DP 71/25) ──────────────────────────
        $qrCodeConteudo = $this->gerarConteudoQrCode($documento, $hashFiscal, $numeroCertificado);

        // ── Actualizar documento (campos imutáveis após este ponto) ───────
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

    /**
     * Gera o conteúdo textual do QR Code conforme DP 71/25.
     *
     * Formato: NIF_EMITENTE*NIF_CLIENTE*DATA*TOTAL_SEM_IVA*TOTAL_IVA*TOTAL_COM_IVA*HASH4*CERT
     *
     * O QR Code deve ser renderizado em imagem pelo serviço de PDF/impressão
     * usando a biblioteca endroid/qr-code ou similar.
     */
    private function gerarConteudoQrCode(
        DocumentoFiscal $documento,
        string $hashFiscal,
        string $numeroCertificado
    ): string {
        $empresa   = Empresa::firstOrFail();
        $nifCliente = $documento->cliente?->nif
            ?? $documento->cliente_nif
            ?? 'CF'; // CF = Consumidor Final

        // Os 4 primeiros caracteres do hash (código de 4 dígitos AGT)
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

    /**
     * Hash simples (sem RSA) para documentos isentos de assinatura (RC, FP).
     * Mantém integridade interna sem violar a especificação AGT.
     */
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

    /**
     * Processa os itens calculando base tributável, IVA e retenção.
     *
     * Taxas IVA Angola (Lei 17/19 — Código do IVA):
     *  - 14% taxa geral
     *  -  5% taxa reduzida (bens essenciais — Anexo I)
     *  -  0% taxa zero (exportações, zona franca)
     *  - Isenção total (com código de motivo obrigatório no SAF-T)
     *
     * Retenção na fonte:
     *  - Configurável por produto/serviço (campo 'taxa_retencao' no produto)
     *  - Default 6,5% para serviços gerais
     *  - Pode ser 2%, 6,5%, 10%, 15% conforme natureza do serviço
     *  - Aplica-se apenas a serviços; produtos físicos não têm retenção
     */
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

            // ── Determinar taxa de IVA ─────────────────────────────────
            $taxaIva         = 0.0;
            $codigoIsencao   = null;
            $motivoIsencao   = null;

            if ($aplicaIva) {
                if ($regime === 'geral') {
                    // Taxa explícita no item > taxa do produto > taxa geral 14%
                    $taxaExplicita = $item['taxa_iva'] ?? $produto?->taxa_iva ?? null;

                    if ($taxaExplicita !== null) {
                        $taxaIva = (float) $taxaExplicita;
                    } else {
                        $taxaIva = self::IVA_GERAL;
                    }

                    // Validar que a taxa é uma das taxas legais angolanas
                    if (! in_array($taxaIva, [self::IVA_GERAL, self::IVA_REDUZIDA, self::IVA_ZERO])) {
                        Log::warning('[AGT] Taxa de IVA fora das taxas legais angolanas', [
                            'taxa_usada' => $taxaIva,
                            'produto_id' => $item['produto_id'] ?? null,
                        ]);
                    }

                    // Se taxa = 0, verificar se há código de isenção
                    if ($taxaIva === 0.0 || $taxaIva === self::IVA_ZERO) {
                        $codigoIsencao = $item['codigo_isencao'] ?? $produto?->codigo_isencao ?? 'M00';
                        $motivoIsencao = self::MOTIVOS_ISENCAO[$codigoIsencao] ?? 'Isento';
                    }

                } elseif ($regime === 'simplificado') {
                    // Regime simplificado: isento de IVA (contribuintes abaixo do limiar)
                    $taxaIva       = self::IVA_ZERO;
                    $codigoIsencao = 'M01'; // Artigo 12.º — Regime especial de isenção
                    $motivoIsencao = self::MOTIVOS_ISENCAO['M01'];
                }
            } else {
                // Empresa não sujeita a IVA
                $codigoIsencao = $item['codigo_isencao'] ?? 'M06';
                $motivoIsencao = self::MOTIVOS_ISENCAO[$codigoIsencao];
            }

            $valorIva = round($baseTributavel * $taxaIva / 100, 2);

            // ── Retenção na fonte ──────────────────────────────────────
            // Aplica-se apenas a serviços, nunca a produtos físicos.
            // A taxa é configurável por produto; default 6,5%.
            $valorRetencao = 0.0;
            $taxaRetencaoUsada = 0.0;

            $isProdutoServico = $produto?->tipo === 'servico';
            $temRetencao = $isProdutoServico && $aplicaIva;

            if ($temRetencao) {
                // Hierarquia: item > produto > default 6,5%
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
                'codigo_isencao'  => $codigoIsencao, // SAF-T: TaxExemptionCode
                'motivo_isencao'  => $motivoIsencao, // SAF-T: TaxExemptionReason
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

        // Ajuste de arredondamento
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

            if ($tipo === 'RC' && ! in_array($origem->tipo_documento, ['FT', 'FA'])) {
                throw new \InvalidArgumentException(
                    "Recibo só pode ser gerado a partir de FT ou FA. Tipo: {$origem->tipo_documento}"
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
                'codigo_isencao'      => $item['codigo_isencao'],  // SAF-T
                'motivo_isencao'      => $item['motivo_isencao'],   // SAF-T
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
            $this->movimentarStock($documento, 'saida');
        }

        if ($tipo === 'NC') {
            $this->movimentarStock($documento, 'entrada');
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

    private function actualizarEstadoAposPagamento(DocumentoFiscal $documentoOrigem, float $valorPago): void
    {
        $totalPagoActualizado = $this->calcularTotalPago($documentoOrigem) + $valorPago;

        if ($documentoOrigem->tipo_documento === 'FA') {
            $pago = $totalPagoActualizado >= (float) $documentoOrigem->total_liquido;
        } else {
            $totalAdiantamentos = (float) DB::table('adiantamento_fatura')
                ->where('fatura_id', $documentoOrigem->id)
                ->sum('valor_utilizado');

            $pago = ($totalPagoActualizado + $totalAdiantamentos) >= (float) $documentoOrigem->total_liquido;
        }

        $documentoOrigem->update([
            'estado' => $pago
                ? DocumentoFiscal::ESTADO_PAGA
                : DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
        ]);
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

    private function movimentarStock(DocumentoFiscal $documento, string $tipoMovimento): void
    {
        Log::info("Movimentação de stock: {$tipoMovimento}", [
            'documento' => $documento->numero_documento,
            'tipo'      => $documento->tipo_documento,
        ]);

        // TODO: app(StockService::class)->processarDocumentoFiscal($documento);
    }

    private function reverterStock(DocumentoFiscal $documento): void
    {
        $tipoReversao = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';
        $this->movimentarStock($documento, $tipoReversao);
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