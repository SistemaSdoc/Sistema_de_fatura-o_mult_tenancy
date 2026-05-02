<?php

namespace App\Services;

use App\Models\Tenant\Venda;
use App\Models\Tenant\ItemVenda;
use App\Models\Tenant\Produto;
use App\Models\Empresa;
use App\Services\StockService;
use App\Services\DocumentoFiscalService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * VendaService
 *
 * Correcções:
 *  - 'tipo_documento' REMOVIDO do Venda::create() — coluna não existe na tabela.
 *    O tipo fica em 'tipo_documento_fiscal'.
 *  - Numeração fiscal gerida pelo DocumentoFiscalService.
 *  - IVA 0%, 5%, 14% suportados; retenção lida do produto.
 *  - Adicionado suporte a desconto global e troco.
 */
class VendaService
{
    protected StockService $stockService;
    protected DocumentoFiscalService $documentoFiscalService;

    public function __construct(
        StockService $stockService,
        DocumentoFiscalService $documentoFiscalService
    ) {
        $this->stockService           = $stockService;
        $this->documentoFiscalService = $documentoFiscalService;
    }

    /* =====================================================================
     | CRIAR VENDA
     | ================================================================== */

    public function criarVenda(array $dados, bool $faturar = false, string $tipoDocumento = 'FT'): Venda
    {
        return DB::transaction(function () use ($dados, $faturar, $tipoDocumento) {
            Log::info('=== Iniciando criação de venda ===', [
                'tipo_documento' => $tipoDocumento,
                'faturar'        => $faturar,
                'cliente_tipo'   => isset($dados['cliente_id']) ? 'cadastrado' : 'avulso',
                'desconto_global' => $dados['desconto_global'] ?? 0,
                'troco'          => $dados['troco'] ?? 0,
            ]);

            $this->validarTipoDocumento($tipoDocumento);

            $empresa   = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime    = $empresa->regime_fiscal;

            $agoraAngola = Carbon::now('Africa/Luanda');

            $numeroVenda         = $this->gerarNumeroVendaInterno();
            $numeroVendaFormatado = 'VD-' . str_pad($numeroVenda, 6, '0', STR_PAD_LEFT);

            $venda = Venda::create([
                'id'                  => Str::uuid(),
                'cliente_id'          => $dados['cliente_id'] ?? null,
                'cliente_nome'        => $dados['cliente_nome'] ?? null,
                'cliente_nif'         => $dados['cliente_nif'] ?? null,
                'user_id'             => auth('tenant')->id(),
                'documento_fiscal_id' => null,
                'numero'              => $numeroVenda,
                'numero_documento'    => $numeroVendaFormatado,
                'base_tributavel'     => 0,
                'total_iva'           => 0,
                'total_retencao'      => 0,
                'total_pagar'         => 0,
                'data_venda'          => $agoraAngola->toDateString(),
                'hora_venda'          => $agoraAngola->format('H:i:s'),
                'total'               => 0,
                'status'              => 'aberta',
                'estado_pagamento'    => $this->determinarEstadoPagamentoInicial($tipoDocumento, $faturar),
                'tipo_documento_fiscal' => $tipoDocumento,
                'observacoes'         => $dados['observacoes'] ?? null,
                // NOVOS CAMPOS: desconto global e troco
                'desconto_global'     => (float) ($dados['desconto_global'] ?? 0),
                'troco'               => (float) ($dados['troco'] ?? 0),
            ]);

            // Processar itens e calcular totais
            $totais = $this->processarItens($venda, $dados['itens'], $aplicaIva, $regime);
            
            // Aplicar desconto global se existir
            $descontoGlobal = (float) ($dados['desconto_global'] ?? 0);
            if ($descontoGlobal > 0) {
                $totais = $this->aplicarDescontoGlobal($totais, $descontoGlobal);
                Log::info('Desconto global aplicado', [
                    'desconto_global' => $descontoGlobal,
                    'novo_total' => $totais['total']
                ]);
            }
            
            $venda->update($totais);

            // Emitir documento fiscal se pedido
            if ($faturar) {
                $documento = $this->emitirDocumentoFiscal($venda, $dados, $tipoDocumento);

                $novoEstadoPagamento = $this->determinarEstadoAposEmissao($tipoDocumento);
                $novoStatus = in_array($tipoDocumento, ['FT', 'FR', 'RC']) ? 'faturada' : 'aberta';

                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status'              => $novoStatus,
                    'estado_pagamento'    => $novoEstadoPagamento,
                ]);

                Log::info('Documento fiscal emitido', [
                    'venda_id'     => $venda->id,
                    'documento_id' => $documento->id,
                    'tipo'         => $documento->tipo_documento,
                ]);
            }

            return $venda->load('itens.produto', 'cliente', 'user', 'documentoFiscal');
        });
    }

    /**
     * Aplicar desconto global proporcionalmente aos itens
     */
    private function aplicarDescontoGlobal(array $totais, float $descontoGlobal): array
    {
        $totalOriginal = $totais['total_pagar'];
        
        if ($totalOriginal <= 0 || $descontoGlobal <= 0) {
            return $totais;
        }
        
        // Calcular novo total após desconto
        $novoTotal = max(0, $totalOriginal - $descontoGlobal);
        
        // Ajustar base tributável proporcionalmente
        $proporcao = $novoTotal / $totalOriginal;
        $novaBase = round($totais['base_tributavel'] * $proporcao, 2);
        $novoIva = round($totais['total_iva'] * $proporcao, 2);
        
        // Retenção permanece a mesma (não é afetada por desconto)
        $novaRetencao = $totais['total_retencao'];
        
        return [
            'base_tributavel' => $novaBase,
            'total_iva'       => $novoIva,
            'total_retencao'  => $novaRetencao,
            'total_pagar'     => $novoTotal,
            'total'           => $novoTotal,
        ];
    }

    /* =====================================================================
     | CANCELAR VENDA
     | ================================================================== */

    public function cancelarVenda(string $vendaId, string $motivo): Venda
    {
        return DB::transaction(function () use ($vendaId, $motivo) {
            $venda = Venda::with('itens.produto', 'documentoFiscal')->findOrFail($vendaId);

            if ($venda->status === 'cancelada') {
                throw new \Exception('Venda já cancelada.');
            }

            if ($venda->documentoFiscal) {
                if ($venda->documentoFiscal->estado === 'paga') {
                    throw new \Exception('Não é possível cancelar venda com documento fiscal pago.');
                }

                if ($venda->documentoFiscal->recibos()->where('estado', '!=', 'cancelado')->exists()) {
                    throw new \Exception('Venda possui recibos de pagamento. Cancele-os primeiro.');
                }

                if (in_array($venda->documentoFiscal->estado, ['emitido', 'parcialmente_paga'])) {
                    $this->documentoFiscalService->cancelarDocumento(
                        $venda->documentoFiscal,
                        $motivo
                    );
                }
            }

            foreach ($venda->itens as $item) {
                if ($item->produto && $item->produto->tipo !== 'servico') {
                    $this->stockService->movimentar(
                        $item->produto_id,
                        (int) $item->quantidade,
                        'entrada',
                        'venda_cancelada',
                        $venda->id
                    );
                }
            }

            $venda->update([
                'status'           => 'cancelada',
                'estado_pagamento' => 'cancelada',
            ]);

            Log::info('Venda cancelada', ['venda_id' => $vendaId]);

            return $venda;
        });
    }

    /* =====================================================================
     | PROCESSAR PAGAMENTO
     | ================================================================== */

    public function processarPagamento(string $vendaId, array $dadosPagamento): array
    {
        return DB::transaction(function () use ($vendaId, $dadosPagamento) {
            $venda = Venda::with('documentoFiscal')->findOrFail($vendaId);

            if (! $venda->documentoFiscal) {
                throw new \Exception('Venda não possui documento fiscal.');
            }

            if (! in_array($venda->documentoFiscal->tipo_documento, ['FT', 'FA'])) {
                throw new \Exception('Apenas Faturas (FT) e Faturas de Adiantamento (FA) podem receber pagamento.');
            }

            if ($venda->estado_pagamento === 'paga') {
                throw new \Exception('Venda já está totalmente paga.');
            }

            $recibo = $this->documentoFiscalService->gerarRecibo(
                $venda->documentoFiscal,
                $dadosPagamento
            );

            $valorPendente = $this->documentoFiscalService
                ->calcularValorPendente($venda->documentoFiscal->fresh());

            $novoEstado = match (true) {
                $valorPendente <= 0 => 'paga',
                $valorPendente < (float) $venda->documentoFiscal->total_liquido => 'parcial',
                default             => 'pendente',
            };

            $venda->update(['estado_pagamento' => $novoEstado]);

            Log::info('Pagamento processado', [
                'venda_id'    => $vendaId,
                'recibo_id'   => $recibo->id,
                'valor'       => $dadosPagamento['valor'],
                'novo_estado' => $novoEstado,
            ]);

            return [
                'venda'            => $venda->fresh(),
                'recibo'           => $recibo,
                'estado_pagamento' => $novoEstado,
            ];
        });
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS
     | ================================================================== */

    private function gerarNumeroVendaInterno(): int
    {
        $ultimo = Venda::lockForUpdate()->max('numero') ?? 0;
        return $ultimo + 1;
    }

    private function validarTipoDocumento(string $tipoDocumento): void
    {
        $tiposPermitidos = ['FT', 'FR', 'FP', 'FA'];
        if (! in_array($tipoDocumento, $tiposPermitidos)) {
            throw new \Exception(
                "Tipo de documento {$tipoDocumento} não é válido para criação de venda. Use FT, FR, FP ou FA."
            );
        }
    }

    private function processarItens(Venda $venda, array $itens, bool $aplicaIva, string $regime): array
    {
        $totalBase     = 0.0;
        $totalIva      = 0.0;
        $totalRetencao = 0.0;

        foreach ($itens as $item) {
            $produto   = Produto::findOrFail($item['produto_id']);
            $resultado = $this->processarItem($produto, $item, $aplicaIva, $regime);

            ItemVenda::create(array_merge($resultado, [
                'id'             => Str::uuid(),
                'venda_id'       => $venda->id,
                'produto_id'     => $produto->id,
                'descricao'      => $produto->nome,
                'codigo_produto' => $produto->codigo,
                'unidade'        => $produto->tipo === 'servico'
                    ? ($produto->unidade_medida ?? 'hora')
                    : ($produto->unidade ?? 'UN'),
                'codigo_isencao' => $resultado['codigo_isencao'],
                'motivo_isencao' => $resultado['motivo_isencao'],
            ]));

            if ($produto->tipo !== 'servico') {
                $this->stockService->saidaVenda(
                    $produto->id,
                    (int) $item['quantidade'],
                    $venda->id
                );
            }

            $totalBase     += $resultado['base_tributavel'];
            $totalIva      += $resultado['valor_iva'];
            $totalRetencao += $resultado['valor_retencao'];
        }

        $totalPagar = round($totalBase + $totalIva - $totalRetencao, 2);

        return [
            'base_tributavel' => round($totalBase, 2),
            'total_iva'       => round($totalIva, 2),
            'total_retencao'  => round($totalRetencao, 2),
            'total_pagar'     => $totalPagar,
            'total'           => $totalPagar,
        ];
    }

    private function processarItem(
        Produto $produto,
        array $item,
        bool $aplicaIva,
        string $regime
    ): array {
        $quantidade = (int) $item['quantidade'];
        $preco      = (float) $item['preco_venda'];
        $desconto   = (float) ($item['desconto'] ?? 0);
        $subtotal   = ($preco * $quantidade) - $desconto;

        // ── IVA ──────────────────────────────────────────────────────────
        $taxaIva       = 0.0;
        $codigoIsencao = null;
        $motivoIsencao = null;

        if ($aplicaIva && $regime === 'geral') {
            $taxaIva = (float) ($item['taxa_iva'] ?? $produto->taxa_iva ?? DocumentoFiscalService::IVA_GERAL);

            if ($taxaIva === 0.0) {
                $codigoIsencao = $item['codigo_isencao'] ?? $produto->codigo_isencao ?? 'M00';
                $motivoIsencao = DocumentoFiscalService::MOTIVOS_ISENCAO[$codigoIsencao] ?? 'Isento';
            }
        } elseif ($aplicaIva && $regime === 'simplificado') {
            $taxaIva       = 0.0;
            $codigoIsencao = 'M01';
            $motivoIsencao = DocumentoFiscalService::MOTIVOS_ISENCAO['M01'];
        } else {
            $codigoIsencao = 'M06';
            $motivoIsencao = DocumentoFiscalService::MOTIVOS_ISENCAO['M06'];
        }

        $valorIva = round(($subtotal * $taxaIva) / 100, 2);

        // ── Retenção ──────────────────────────────────────────────────────
        $valorRetencao = 0.0;
        $taxaRetencao  = 0.0;

        if ($produto->tipo === 'servico' && $aplicaIva) {
            $taxaRetencao  = (float) ($item['taxa_retencao'] ?? $produto->taxa_retencao ?? ProdutoService::TAXA_RETENCAO_DEFAULT);
            $valorRetencao = round(($subtotal * $taxaRetencao) / 100, 2);
        }

        $baseTributavel = round($subtotal, 2);
        $subtotalFinal  = $baseTributavel + $valorIva - $valorRetencao;

        Log::info('Item processado', [
            'produto'       => $produto->nome,
            'tipo'          => $produto->tipo,
            'subtotal'      => $subtotal,
            'desconto_item' => $desconto,
            'taxa_iva'      => $taxaIva,
            'iva'           => $valorIva,
            'taxa_retencao' => $taxaRetencao,
            'retencao'      => $valorRetencao,
            'final'         => $subtotalFinal,
        ]);

        return [
            'quantidade'      => $quantidade,
            'preco_venda'     => $preco,
            'desconto'        => $desconto,
            'base_tributavel' => $baseTributavel,
            'valor_iva'       => $valorIva,
            'taxa_iva'        => $taxaIva,
            'codigo_isencao'  => $codigoIsencao,
            'motivo_isencao'  => $motivoIsencao,
            'valor_retencao'  => $valorRetencao,
            'taxa_retencao'   => $taxaRetencao,
            'subtotal'        => round($subtotalFinal, 2),
        ];
    }

    private function emitirDocumentoFiscal(Venda $venda, array $dados, string $tipoDocumento)
    {
        if ($tipoDocumento === 'FR') {
            $this->validarFR($dados, (float) $venda->total);
        }

        $payload = [
            'tipo_documento' => $tipoDocumento,
            'venda_id'       => $venda->id,
            'itens'          => $venda->itens->map(function ($item) {
                return [
                    'produto_id'     => $item->produto_id,
                    'descricao'      => $item->descricao,
                    'quantidade'     => $item->quantidade,
                    'preco_unitario' => $item->preco_venda,
                    'desconto'       => $item->desconto,
                    'taxa_iva'       => $item->taxa_iva,
                    'codigo_isencao' => $item->codigo_isencao,
                    'taxa_retencao'  => $item->taxa_retencao,
                ];
            })->toArray(),
        ];

        if (! empty($dados['cliente_id'])) {
            $payload['cliente_id'] = $dados['cliente_id'];
        } elseif (! empty($dados['cliente_nome'])) {
            $payload['cliente_nome'] = $dados['cliente_nome'];
            if (! empty($dados['cliente_nif'])) {
                $payload['cliente_nif'] = $dados['cliente_nif'];
            }
        }

        if ($tipoDocumento === 'FR' && ! empty($dados['dados_pagamento'])) {
            $payload['dados_pagamento'] = [
                'metodo'     => $dados['dados_pagamento']['metodo'],
                'valor'      => (float) $dados['dados_pagamento']['valor'],
                'data'       => $dados['dados_pagamento']['data']
                    ?? Carbon::now('Africa/Luanda')->toDateString(),
                'referencia' => $dados['dados_pagamento']['referencia'] ?? null,
            ];
        }

        return $this->documentoFiscalService->emitirDocumento($payload);
    }

private function validarFR(array $dados, float $totalVenda): void
{
    if (empty($dados['dados_pagamento'])) {
        throw new \Exception('Campo dados_pagamento é obrigatório para Fatura-Recibo (FR).');
    }

    $valorPagamento = (float) $dados['dados_pagamento']['valor'];
    
    // O valor do pagamento pode ser maior ou igual ao total da venda
    // Se for menor, erro. Se for maior, gera troco (ok)
    if ($valorPagamento < $totalVenda - 0.01) {
        throw new \Exception(
            'Valor do pagamento (' . number_format($valorPagamento, 2, ',', '.') .
            ') é insuficiente. Total da venda: ' .
            number_format($totalVenda, 2, ',', '.') . ' para FR.'
        );
    }
    
    // Log para registrar o troco
    if ($valorPagamento > $totalVenda + 0.01) {
        $troco = $valorPagamento - $totalVenda;
        Log::info('Troco gerado para FR', [
            'venda_total' => $totalVenda,
            'pago' => $valorPagamento,
            'troco' => $troco
        ]);
    }
}

    private function determinarEstadoPagamentoInicial(string $tipoDocumento, bool $faturar): string
    {
        if (! $faturar) return 'pendente';

        return match ($tipoDocumento) {
            'FR', 'RC' => 'paga',
            default    => 'pendente',
        };
    }

    private function determinarEstadoAposEmissao(string $tipoDocumento): string
    {
        return match ($tipoDocumento) {
            'FR'    => 'paga',
            default => 'pendente',
        };
    }
}