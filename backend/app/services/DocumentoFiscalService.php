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

class DocumentoFiscalService
{
    /* =====================================================================
     | CONFIGURAÇÕES POR TIPO DE DOCUMENTO
     | ================================================================== */

    protected array $configuracoesTipo = [
        'FT' => [
            'nome'                 => 'Fatura',
            'afeta_stock'          => true,
            'eh_venda'             => true,
            'gera_recibo'          => true,
            'estado_inicial'       => 'emitido',
            'exige_cliente'        => false,
            'aceita_pagamento'     => true,
            'pode_ter_adiantamento' => true,
        ],
        'FR' => [
            'nome'                 => 'Fatura-Recibo',
            'afeta_stock'          => true,
            'eh_venda'             => true,
            'gera_recibo'          => false,
            'estado_inicial'       => 'paga',
            'exige_cliente'        => true,
            'aceita_pagamento'     => false,
            'pode_ter_adiantamento' => false,
        ],
        'FP' => [
            'nome'                 => 'Fatura Proforma',
            'afeta_stock'          => false,
            'eh_venda'             => false,
            'gera_recibo'          => false,
            'estado_inicial'       => 'emitido',
            'exige_cliente'        => false,
            'aceita_pagamento'     => false,
            'pode_ter_adiantamento' => false,
        ],
        'FA' => [
            'nome'                 => 'Fatura de Adiantamento',
            'afeta_stock'          => false,
            'eh_venda'             => false,
            'gera_recibo'          => false,
            'estado_inicial'       => 'emitido',
            'exige_cliente'        => true,
            'aceita_pagamento'     => true,
            'pode_ter_adiantamento' => false,
        ],
        'NC' => [
            'nome'                 => 'Nota de Crédito',
            'afeta_stock'          => true,
            'eh_venda'             => false,
            'gera_recibo'          => false,
            'estado_inicial'       => 'emitido',
            'exige_cliente'        => false,
            'aceita_pagamento'     => false,
            'pode_ter_adiantamento' => false,
        ],
        'ND' => [
            'nome'                 => 'Nota de Débito',
            'afeta_stock'          => false,
            'eh_venda'             => false,
            'gera_recibo'          => false,
            'estado_inicial'       => 'emitido',
            'exige_cliente'        => false,
            'aceita_pagamento'     => false,
            'pode_ter_adiantamento' => false,
        ],
        'RC' => [
            'nome'                 => 'Recibo',
            'afeta_stock'          => false,
            'eh_venda'             => true,
            'gera_recibo'          => false,
            'estado_inicial'       => 'paga',
            'exige_cliente'        => false,
            'aceita_pagamento'     => false,
            'pode_ter_adiantamento' => false,
        ],
        'FRt' => [
            'nome'                 => 'Fatura de Retificação',
            'afeta_stock'          => false,
            'eh_venda'             => false,
            'gera_recibo'          => false,
            'estado_inicial'       => 'emitido',
            'exige_cliente'        => false,
            'aceita_pagamento'     => false,
            'pode_ter_adiantamento' => false,
        ],
    ];

    /* =====================================================================
     | EMISSÃO DE DOCUMENTOS
     | ================================================================== */

    /**
     * Emite qualquer tipo de documento fiscal.
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

            $empresa   = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime    = $empresa->regime_fiscal;

            $this->validarDadosPorTipo($dados, $tipo, $config);

            // Numeração com lock pessimista para evitar duplicados
            [$numero, $numeroDocumento, $serieFiscal] = $this->gerarNumeroDocumento($tipo);

            $dataEmissao   = now();
            $dataVencimento = $this->calcularDataVencimento($tipo, $dados, $dataEmissao);
            $totais        = $this->processarItens($dados['itens'] ?? [], $aplicaIva, $regime);
            $clienteId     = $this->resolverCliente($dados, $tipo);

            $documentoData = [
                'id'                 => Str::uuid(),
                'user_id'            => Auth::id(),
                'venda_id'           => $dados['venda_id'] ?? null,
                'fatura_id'          => $dados['fatura_id'] ?? null,
                'serie'              => $serieFiscal->serie,
                'numero'             => $numero,
                'numero_documento'   => $numeroDocumento,
                'tipo_documento'     => $tipo,
                'data_emissao'       => $dataEmissao->toDateString(),
                'hora_emissao'       => $dataEmissao->toTimeString(),
                'data_vencimento'    => $dataVencimento,
                'base_tributavel'    => $totais['base'],
                'total_iva'          => $totais['iva'],
                'total_retencao'     => $totais['retencao'],
                'total_liquido'      => $totais['liquido'],
                'estado'             => $config['estado_inicial'],
                'motivo'             => $dados['motivo'] ?? null,
                'hash_fiscal'        => null,
                'referencia_externa' => $dados['referencia_externa'] ?? null,
            ];

            // Cliente cadastrado
            if ($clienteId) {
                $documentoData['cliente_id'] = $clienteId;
            }

            // Cliente avulso — apenas quando não há cliente cadastrado
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

            $documento->update([
                'hash_fiscal' => $this->gerarHashFiscal($documento),
            ]);

            // FT com pagamento imediato — gerar recibo automaticamente
            if ($tipo === 'FT' && ! empty($dados['dados_pagamento'])) {
                $this->gerarRecibo($documento, [
                    'valor'             => $dados['dados_pagamento']['valor'],
                    'metodo_pagamento'  => $dados['dados_pagamento']['metodo'],
                    'data_pagamento'    => $dados['dados_pagamento']['data'] ?? now()->toDateString(),
                    'referencia'        => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            // FR — registar método de pagamento no próprio documento
            if ($tipo === 'FR' && ! empty($dados['dados_pagamento'])) {
                $documento->update([
                    'metodo_pagamento'    => $dados['dados_pagamento']['metodo'],
                    'referencia_pagamento' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            Log::info("{$config['nome']} emitida com sucesso", [
                'documento_id' => $documento->id,
                'numero'       => $numeroDocumento,
            ]);

            return $documento->load('itens.produto', 'cliente', 'documentoOrigem');
        });
    }

    /* =====================================================================
     | RECIBO
     | ================================================================== */

    /**
     * Gera um recibo (RC) para uma FT ou FA.
     * Suporta múltiplos recibos parciais — não bloqueia pagamentos em prestações.
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

            $reciboData = [
                'id'                  => Str::uuid(),
                'user_id'             => Auth::id(),
                'fatura_id'           => $documentoOrigem->id,
                'serie'               => $serieFiscal->serie,
                'numero'              => $numero,
                'numero_documento'    => $numeroDocumento,
                'tipo_documento'      => 'RC',
                'data_emissao'        => $dados['data_pagamento'] ?? now()->toDateString(),
                'hora_emissao'        => now()->toTimeString(),
                'data_vencimento'     => null,
                'base_tributavel'     => 0,
                'total_iva'           => 0,
                'total_retencao'      => 0,
                'total_liquido'       => $valorPago,
                'estado'              => DocumentoFiscal::ESTADO_PAGA,
                'metodo_pagamento'    => $dados['metodo_pagamento'],
                'referencia_pagamento' => $dados['referencia'] ?? null,
                'hash_fiscal'         => null,
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

            $recibo->update(['hash_fiscal' => $this->gerarHashFiscal($recibo)]);

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
     * Valida que o valor creditado não ultrapassa o valor original.
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

        // Validar que o total creditado não ultrapassa o valor do documento original
        $totalJaCreditado = $documentoOrigem->notasCredito()
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->sum('total_liquido');

        $empresa   = Empresa::firstOrFail();
        $totais    = $this->processarItens($dados['itens'], $empresa->sujeito_iva, $empresa->regime_fiscal);
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

    /**
     * Cria uma ND vinculada a FT ou FR.
     */
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

    /**
     * Vincula uma FA a uma FT, com validação de cliente e valores.
     */
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

        // Validar que o cliente coincide — evita cruzar adiantamentos entre clientes
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

            // Verificar se adiantamento foi totalmente utilizado
            $totalUtilizado = DB::table('adiantamento_fatura')
                ->where('adiantamento_id', $adiantamento->id)
                ->sum('valor_utilizado');

            if ((float) $totalUtilizado >= (float) $adiantamento->total_liquido) {
                $adiantamento->update(['estado' => DocumentoFiscal::ESTADO_PAGA]);
            }

            // Actualizar estado da fatura
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

    /**
     * Cancela um documento, revertendo stock se necessário.
     */
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

            $documento->update([
                'estado'               => DocumentoFiscal::ESTADO_CANCELADO,
                'motivo_cancelamento'  => $motivo,
                'data_cancelamento'    => now(),
                'user_cancelamento_id' => Auth::id(),
            ]);

            Log::info('Documento cancelado', [
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

    /**
     * Lista documentos com filtros e paginação.
     */
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

        return $query->orderBy('data_emissao', 'desc')->paginate($filtros['per_page'] ?? 20);
    }

    /**
     * Busca um documento específico com todas as relações.
     */
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

    /**
     * Calcula o valor ainda por pagar num documento FT ou FA.
     */
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

    /**
     * Processa adiantamentos expirados — deve ser chamado via Job agendado.
     */
    public function processarAdiantamentosExpirados(): int
    {
        $expirados = DocumentoFiscal::where('tipo_documento', 'FA')
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->where('data_vencimento', '<', now())
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
     | DASHBOARD — dados agregados
     | ================================================================== */

    /**
     * Dados para o dashboard principal.
     * Nota: total_pendente_cobranca calculado correctamente por diferença
     * directa nos documentos — não por subtracção de totais independentes.
     */
    public function dadosDashboard(): array
    {
        $hoje      = now();
        $inicioMes = $hoje->copy()->startOfMonth();

        $faturasPendentes = DocumentoFiscal::where('tipo_documento', 'FT')
            ->whereIn('estado', [
                DocumentoFiscal::ESTADO_EMITIDO,
                DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
            ])
            ->with('recibos')
            ->get();

        // Calcular o pendente real: soma de (total_liquido - total pago por recibos - adiantamentos)
        $totalPendenteCobranca = $faturasPendentes->sum(function ($fatura) {
            return $this->calcularValorPendente($fatura);
        });

        return [
            'faturas_emitidas_mes' => DocumentoFiscal::where('tipo_documento', 'FT')
                ->whereBetween('data_emissao', [$inicioMes, $hoje])
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
                ->whereBetween('data_emissao', [$inicioMes, $hoje])
                ->count(),

            'total_nao_vendas_mes' => DocumentoFiscal::whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                ->whereBetween('data_emissao', [$inicioMes, $hoje])
                ->count(),
        ];
    }

    /**
     * Evolução mensal de documentos fiscais para um dado ano.
     */
    public function evolucaoMensal(int $ano): array
    {
        $evolucao = [];

        for ($mes = 1; $mes <= 12; $mes++) {
            // Carbon::create evita mutação do objecto now()
            $inicioMes = Carbon::create($ano, $mes, 1)->startOfMonth();
            $fimMes    = Carbon::create($ano, $mes, 1)->endOfMonth();

            $totalVendas = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR', 'RC'])
                ->whereBetween('data_emissao', [$inicioMes, $fimMes])
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_liquido');

            $totalNaoVendas = DocumentoFiscal::whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                ->whereBetween('data_emissao', [$inicioMes, $fimMes])
                ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
                ->sum('total_liquido');

            $totalPendente = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', [
                    DocumentoFiscal::ESTADO_EMITIDO,
                    DocumentoFiscal::ESTADO_PARCIALMENTE_PAGA,
                ])
                ->where('data_emissao', '<=', $fimMes)
                ->sum('total_liquido');

            $evolucao[] = [
                'mes'             => $mes,
                'ano'             => $ano,
                'total_vendas'    => (float) $totalVendas,
                'total_nao_vendas' => (float) $totalNaoVendas,
                'total_pendente'  => (float) $totalPendente,
            ];
        }

        return $evolucao;
    }

    /**
     * Estatísticas de pagamentos por método e período.
     */
    public function estatisticasPagamentos(): array
    {
        $hoje       = now();
        $inicioMes  = $hoje->copy()->startOfMonth();
        $inicioAno  = $hoje->copy()->startOfYear();

        $porMetodo = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->whereBetween('data_emissao', [$inicioMes, $hoje])
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
            ->whereBetween('data_emissao', [$inicioMes, $hoje])
            ->sum('total_liquido');

        $totalPagoAno = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', DocumentoFiscal::ESTADO_CANCELADO)
            ->whereBetween('data_emissao', [$inicioAno, $hoje])
            ->sum('total_liquido');

        return [
            'por_metodo'        => $porMetodo,
            'total_pago_mes'    => (float) $totalPagoMes,
            'total_pago_ano'    => (float) $totalPagoAno,
            'media_por_dia_mes' => (float) round($totalPagoMes / max($hoje->day, 1), 2),
        ];
    }

    /**
     * Alertas de documentos pendentes para o dashboard.
     */
    public function alertasPendentes(): array
    {
        $hoje = now();

        $adiantamentosVencidos = DocumentoFiscal::where('tipo_documento', 'FA')
            ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
            ->whereNotNull('data_vencimento')
            ->where('data_vencimento', '<', $hoje)
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
            ->where('data_emissao', '<', $hoje->copy()->subDays(7))
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
            ->where('data_vencimento', '<', $hoje)
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get();

        return [
            'adiantamentos_vencidos' => [
                'total' => DocumentoFiscal::where('tipo_documento', 'FA')
                    ->where('estado', DocumentoFiscal::ESTADO_EMITIDO)
                    ->whereNotNull('data_vencimento')
                    ->where('data_vencimento', '<', $hoje)
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
                    ->where('data_emissao', '<', $hoje->copy()->subDays(7))
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
                    ->where('data_vencimento', '<', $hoje)
                    ->count(),
                'items' => $faturasVencidas,
            ],
        ];
    }

    /* =====================================================================
     | EXPORTAÇÃO — PDF e Excel
     | ================================================================== */

    /**
     * Retorna os dados estruturados de um documento para geração de PDF.
     * O Controller usa estes dados para passar à view de impressão.
     */
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
                'nome'      => $empresa->nome,
                'nif'       => $empresa->nif,
                'morada'    => $empresa->morada,
                'telefone'  => $empresa->telefone,
                'email'     => $empresa->email,
                'logo'      => $empresa->logo,
            ],
            'documento' => $documento,
            'itens'     => $documento->itens,
            'cliente'   => [
                'nome' => $documento->nome_cliente,
                'nif'  => $documento->nif_cliente,
            ],
        ];
    }

    /**
     * Retorna os dados estruturados para exportação Excel de uma lista de documentos.
     * Formato: array de linhas prontas para uma folha de cálculo.
     */
    public function dadosParaExcel(array $filtros = []): array
    {
        // Reutiliza a listagem sem paginação para exportação completa
        $documentos = DocumentoFiscal::with('cliente', 'itens')
            ->when(! empty($filtros['tipo']), fn ($q) => $q->where('tipo_documento', $filtros['tipo']))
            ->when(! empty($filtros['estado']), fn ($q) => $q->where('estado', $filtros['estado']))
            ->when(! empty($filtros['cliente_id']), fn ($q) => $q->where('cliente_id', $filtros['cliente_id']))
            ->when(! empty($filtros['data_inicio']), fn ($q) => $q->whereDate('data_emissao', '>=', $filtros['data_inicio']))
            ->when(! empty($filtros['data_fim']), fn ($q) => $q->whereDate('data_emissao', '<=', $filtros['data_fim']))
            ->when(! empty($filtros['apenas_vendas']), fn ($q) => $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']))
            ->when(! empty($filtros['apenas_nao_vendas']), fn ($q) => $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']))
            ->orderBy('data_emissao', 'desc')
            ->get();

        $cabecalho = [
            'Número',
            'Tipo',
            'Data Emissão',
            'Cliente',
            'NIF Cliente',
            'Base Tributável',
            'Total IVA',
            'Total Retenção',
            'Total Líquido',
            'Estado',
            'Método Pagamento',
            'Vencimento',
        ];

        $linhas = $documentos->map(fn ($doc) => [
            $doc->numero_documento,
            $doc->tipo_documento_nome,
            $doc->data_emissao?->format('d/m/Y'),
            $doc->nome_cliente,
            $doc->nif_cliente,
            number_format((float) $doc->base_tributavel, 2, ',', '.'),
            number_format((float) $doc->total_iva, 2, ',', '.'),
            number_format((float) $doc->total_retencao, 2, ',', '.'),
            number_format((float) $doc->total_liquido, 2, ',', '.'),
            $doc->estado,
            $doc->metodo_pagamento ?? '—',
            $doc->data_vencimento?->format('d/m/Y') ?? '—',
        ])->toArray();

        return [
            'cabecalho'  => $cabecalho,
            'linhas'     => $linhas,
            'documentos' => $documentos,
        ];
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS
     | ================================================================== */

    /**
     * Gera o próximo número de documento com lock pessimista para evitar duplicados.
     * Retorna [$numero, $numeroDocumento, $serieFiscal].
     */
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

        $numeroBase  = max($serieFiscal->ultimo_numero, $ultimoNumeroReal ?? 0);
        $tentativas  = 0;
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

    /**
     * Processa os itens calculando base tributável, IVA e retenção.
     * IVA incide sobre o valor líquido após descontos.
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

            $taxaIva = 0.0;
            if ($aplicaIva && $regime === 'geral') {
                $taxaIva = (float) ($item['taxa_iva'] ?? $produto?->taxa_iva ?? 14);
            }

            $valorIva      = round($baseTributavel * $taxaIva / 100, 2);
            $valorRetencao = 0.0;

            if ($produto && $produto->tipo === 'servico' && $aplicaIva) {
                $taxaRetencao  = (float) ($produto->taxa_retencao ?? $item['taxa_retencao'] ?? 6.5);
                $valorRetencao = round($baseTributavel * $taxaRetencao / 100, 2);
            }

            $totalLinha = round($baseTributavel + $valorIva - $valorRetencao, 2);

            $itensProcessados[] = [
                'produto_id'     => $item['produto_id'] ?? null,
                'descricao'      => $item['descricao'] ?? $produto?->nome ?? 'Item',
                'quantidade'     => $quantidade,
                'preco_unitario' => $precoUnitario,
                'valor_bruto'    => round($valorBruto, 2),
                'desconto'       => round($desconto, 2),
                'taxa_desconto'  => $taxaDesconto,
                'base_tributavel' => round($baseTributavel, 2),
                'taxa_iva'       => $taxaIva,
                'valor_iva'      => $valorIva,
                'taxa_retencao'  => $valorRetencao > 0 ? ($produto->taxa_retencao ?? 6.5) : 0,
                'valor_retencao' => $valorRetencao,
                'total_linha'    => $totalLinha,
            ];

            $totalBase     += $baseTributavel;
            $totalIva      += $valorIva;
            $totalRetencao += $valorRetencao;
        }

        $totalBase     = round($totalBase, 2);
        $totalIva      = round($totalIva, 2);
        $totalRetencao = round($totalRetencao, 2);
        $totalLiquido  = round($totalBase + $totalIva - $totalRetencao, 2);

        // Ajuste de arredondamento: alinhar com soma real das linhas
        $somaLinhas = round(array_sum(array_column($itensProcessados, 'total_linha')), 2);
        if (abs($somaLinhas - $totalLiquido) > 0.01) {
            Log::warning('Diferença de arredondamento ajustada', [
                'soma_linhas'       => $somaLinhas,
                'total_calculado'   => $totalLiquido,
                'diferenca'         => $somaLinhas - $totalLiquido,
            ]);
            $totalLiquido = $somaLinhas;
        }

        return [
            'base'             => $totalBase,
            'iva'              => $totalIva,
            'retencao'         => $totalRetencao,
            'liquido'          => $totalLiquido,
            'itens_processados' => $itensProcessados,
        ];
    }

    /**
     * Cria os itens do documento em batch — evita N queries individuais.
     */
    private function criarItensDocumento(DocumentoFiscal $documento, array $itensProcessados): void
    {
        $agora = now();

        $registos = array_map(function ($item, $index) use ($documento, $agora) {
            return [
                'id'                   => (string) Str::uuid(),
                'documento_fiscal_id'  => $documento->id,
                'produto_id'           => $item['produto_id'],
                'descricao'            => $item['descricao'],
                'quantidade'           => $item['quantidade'],
                'preco_unitario'       => $item['preco_unitario'],
                'base_tributavel'      => $item['base_tributavel'],
                'taxa_iva'             => $item['taxa_iva'],
                'valor_iva'            => $item['valor_iva'],
                'valor_retencao'       => $item['valor_retencao'],
                'desconto'             => $item['desconto'],
                'total_linha'          => $item['total_linha'],
                'ordem'                => $index + 1,
                'created_at'           => $agora,
                'updated_at'           => $agora,
            ];
        }, $itensProcessados, array_keys($itensProcessados));

        // Insert em batch — uma única query para todos os itens
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

    /**
     * Actualiza o estado do documento origem após registo de pagamento.
     */
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

    /**
     * Copia os dados do cliente do documento origem para o array de dados do novo documento.
     */
    private function herdarCliente(array &$dados, DocumentoFiscal $origem): void
    {
        if ($origem->cliente_id) {
            $dados['cliente_id'] = $origem->cliente_id;
        } elseif ($origem->cliente_nome) {
            $dados['cliente_nome'] = $origem->cliente_nome;
            $dados['cliente_nif']  = $origem->cliente_nif;
        }
    }

    private function gerarHashFiscal(DocumentoFiscal $documento): string
    {
        $dadosHash = $documento->numero_documento
            . $documento->data_emissao
            . number_format((float) $documento->total_liquido, 2, '.', '')
            . ($documento->cliente_id ?? $documento->cliente_nome ?? 'consumidor_final')
            . config('app.key');  // config() respeita cache, env() não

        return hash('sha256', $dadosHash);
    }

    private function movimentarStock(DocumentoFiscal $documento, string $tipoMovimento): void
    {
        Log::info("Movimentação de stock: {$tipoMovimento}", [
            'documento' => $documento->numero_documento,
            'tipo'      => $documento->tipo_documento,
        ]);

        // TODO: StockService::movimentar($documento, $tipoMovimento);
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
                    'documento_fiscal_id'    => $documento->id,
                    'status'                 => 'faturada',
                    'tipo_documento_fiscal'  => $documento->tipo_documento,
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
