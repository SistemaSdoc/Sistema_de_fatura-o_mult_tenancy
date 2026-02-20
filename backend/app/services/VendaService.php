<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Produto;
use App\Models\Empresa;
use App\Models\SerieFiscal;
use App\Services\StockService;
use App\Services\DocumentoFiscalService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VendaService
{
    protected StockService $stockService;
    protected DocumentoFiscalService $documentoFiscalService;

    public function __construct(
        StockService $stockService,
        DocumentoFiscalService $documentoFiscalService
    ) {
        $this->stockService = $stockService;
        $this->documentoFiscalService = $documentoFiscalService;
    }

    /**
     * Criar venda com itens e documento fiscal opcional
     * ATUALIZADO: Apenas FT e FR geram vendas. FA é documento fiscal separado.
     */
    public function criarVenda(array $dados, bool $faturar = false, string $tipoDocumento = 'FT')
    {
        return DB::transaction(function () use ($dados, $faturar, $tipoDocumento) {

            Log::info('=== Iniciando criação de venda ===', [
                'dados_recebidos' => $dados,
                'faturar' => $faturar,
                'tipo_documento_recebido' => $tipoDocumento
            ]);

            // ATUALIZADO: Apenas FT e FR são permitidos para vendas
            if ($faturar && !in_array($tipoDocumento, ['FT', 'FR'])) {
                throw new \Exception("Tipo de documento {$tipoDocumento} não é uma venda válida. Use FT (Fatura) ou FR (Fatura-Recibo).");
            }

            $empresa = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // Buscar série fiscal para vendas (FT)
            $serieFiscal = SerieFiscal::where('tipo_documento', 'FT')
                ->where('ativa', true)
                ->where(function ($q) {
                    $q->whereNull('ano')->orWhere('ano', now()->year);
                })
                ->lockForUpdate()
                ->first();

            if (!$serieFiscal) {
                throw new \Exception("Nenhuma série fiscal ativa encontrada para vendas.");
            }

            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            // Determinar estado de pagamento inicial
            $estadoPagamento = $this->determinarEstadoPagamentoInicial($tipoDocumento, $faturar);

            $venda = Venda::create([
                'id' => Str::uuid(),
                'cliente_id' => $dados['cliente_id'] ?? null,
                'user_id' => Auth::id(),
                'documento_fiscal_id' => null,
                'tipo_documento' => 'venda',
                'serie' => $serieFiscal->serie,
                'numero' => $numero,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retencao' => 0,
                'total_pagar' => 0,
                'data_venda' => $dados['data'] ?? now()->toDateString(),
                'hora_venda' => now()->toTimeString(),
                'total' => 0,
                'status' => 'aberta',
                'estado_pagamento' => $estadoPagamento,
            ]);

            Log::info('Venda criada', [
                'venda_id' => $venda->id,
                'numero_documento' => $numeroDocumento,
                'estado_pagamento' => $estadoPagamento,
            ]);

            $totalBase = 0;
            $totalIva = 0;
            $totalRetencao = 0;

            foreach ($dados['itens'] as $item) {
                $produto = Produto::findOrFail($item['produto_id']);

                $quantidade = (int) $item['quantidade'];
                $preco = (float) $item['preco_venda'];
                $desconto = (float) ($item['desconto'] ?? 0);

                $subtotal = ($preco * $quantidade) - $desconto;
                $taxaIva = ($aplicaIva && $regime === 'geral') ? ($produto->taxa_iva ?? 14) : 0;
                $valorIva = round(($subtotal * $taxaIva) / 100, 2);
                $valorRetencao = ($produto->tipo === 'servico') ? round($subtotal * 0.10, 2) : 0;
                $baseTributavel = round($subtotal, 2);
                $subtotalFinal = $baseTributavel + $valorIva - $valorRetencao;

                ItemVenda::create([
                    'id' => Str::uuid(),
                    'venda_id' => $venda->id,
                    'produto_id' => $produto->id,
                    'descricao' => $produto->nome,
                    'quantidade' => $quantidade,
                    'preco_venda' => $preco,
                    'desconto' => $desconto,
                    'base_tributavel' => $baseTributavel,
                    'valor_iva' => $valorIva,
                    'valor_retencao' => $valorRetencao,
                    'subtotal' => $subtotalFinal,
                ]);

                // Movimentar stock apenas para produtos (não serviços)
                if ($produto->tipo !== 'servico') {
                    $this->stockService->saidaVenda($produto->id, $quantidade, $venda->id);
                }

                $totalBase += $baseTributavel;
                $totalIva += $valorIva;
                $totalRetencao += $valorRetencao;
            }

            $totalPagar = $totalBase + $totalIva - $totalRetencao;

            $venda->update([
                'base_tributavel' => $totalBase,
                'total_iva' => $totalIva,
                'total_retencao' => $totalRetencao,
                'total_pagar' => $totalPagar,
                'total' => $totalPagar,
            ]);

            Log::info('Venda atualizada com totais', [
                'venda_id' => $venda->id,
                'total_base' => $totalBase,
                'total_iva' => $totalIva,
                'total_retencao' => $totalRetencao,
                'total_pagar' => $totalPagar,
            ]);

            // Gerar documento fiscal se solicitado
            if ($faturar) {
                Log::info('Iniciando faturamento da venda', [
                    'venda_id' => $venda->id,
                    'tipo_documento_solicitado' => $tipoDocumento,
                ]);

                // FR obrigatoriamente precisa de dados_pagamento
                if ($tipoDocumento === 'FR') {
                    if (empty($dados['dados_pagamento'])) {
                        throw new \Exception('Campo dados_pagamento é obrigatório para Fatura-Recibo (FR).');
                    }
                }

                // Preparar payload para documento fiscal
                $payloadDocumento = [
                    'tipo_documento' => $tipoDocumento,
                    'venda_id' => $venda->id,
                    'cliente_id' => $venda->cliente_id,
                    'itens' => $venda->itens->map(function ($item) {
                        $produto = Produto::find($item->produto_id);
                        return [
                            'produto_id' => $item->produto_id,
                            'descricao' => $item->descricao,
                            'quantidade' => $item->quantidade,
                            'preco_venda' => $item->preco_venda,
                            'desconto' => $item->desconto,
                            'taxa_iva' => $produto?->taxa_iva ?? 14,
                        ];
                    })->toArray(),
                ];

                // Adicionar dados de pagamento se existirem
                if (!empty($dados['dados_pagamento'])) {
                    $payloadDocumento['dados_pagamento'] = [
                        'metodo' => $dados['dados_pagamento']['metodo'],
                        'valor' => (float) $dados['dados_pagamento']['valor'],
                        'referencia' => $dados['dados_pagamento']['referencia'] ?? null,
                    ];
                }

                $documento = $this->documentoFiscalService->emitirDocumento($payloadDocumento);

                // Verificar tipo criado
                if ($documento->tipo_documento !== $tipoDocumento) {
                    Log::error('TIPO DE DOCUMENTO INCORRETO!', [
                        'esperado' => $tipoDocumento,
                        'recebido' => $documento->tipo_documento,
                    ]);
                    throw new \Exception("Erro interno: Tipo de documento incorreto.");
                }

                // Atualizar venda com referência ao documento fiscal
                $novoEstadoPagamento = match ($tipoDocumento) {
                    'FR' => 'paga',
                    'FT' => 'pendente',
                    default => 'pendente',
                };

                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status' => 'faturada',
                    'estado_pagamento' => $novoEstadoPagamento,
                ]);

                Log::info('Venda faturada com sucesso', [
                    'venda_id' => $venda->id,
                    'documento_fiscal_id' => $documento->id,
                    'tipo_documento' => $documento->tipo_documento,
                    'estado_pagamento' => $novoEstadoPagamento,
                ]);
            }

            Log::info('=== Finalizando criação de venda ===', ['venda_id' => $venda->id]);

            return $venda->load('itens.produto', 'cliente', 'user', 'documentoFiscal');
        });
    }

    /**
     * Cancelar venda
     * ATUALIZADO: Verifica estado do documento fiscal antes de cancelar
     */
    public function cancelarVenda(string $vendaId)
    {
        return DB::transaction(function () use ($vendaId) {

            $venda = Venda::with('itens.produto', 'documentoFiscal')->findOrFail($vendaId);

            if ($venda->status === 'cancelada') {
                throw new \Exception("Venda já cancelada.");
            }

            // ATUALIZADO: Verificar se pode cancelar pelo estado do documento fiscal
            if ($venda->documentoFiscal) {
                // Se documento já está pago, não pode cancelar diretamente
                if ($venda->documentoFiscal->estado === 'paga') {
                    throw new \Exception("Não é possível cancelar venda com documento fiscal pago. Cancele o documento fiscal primeiro.");
                }

                // Se tem recibos, não pode cancelar
                if ($venda->documentoFiscal->recibos()->where('estado', '!=', 'cancelado')->exists()) {
                    throw new \Exception("Venda possui recibos de pagamento. Cancele-os primeiro.");
                }

                // Cancelar documento fiscal se estiver emitido ou parcialmente pago
                if (in_array($venda->documentoFiscal->estado, ['emitido', 'parcialmente_paga'])) {
                    $this->documentoFiscalService->cancelarDocumento(
                        $venda->documentoFiscal,
                        'Cancelamento da venda associada: ' . $venda->id
                    );
                }
            }

            // Reverter stock
            foreach ($venda->itens as $item) {
                if ($item->produto && $item->produto->tipo !== 'servico') {
                    $this->stockService->movimentar(
                        $item->produto_id,
                        $item->quantidade,
                        'entrada',
                        'venda_cancelada',
                        $venda->id
                    );
                }
            }

            $venda->update([
                'status' => 'cancelada',
                'estado_pagamento' => 'cancelada',
            ]);

            return $venda;
        });
    }

    /**
     * Processar pagamento de uma venda (gerar recibo)
     * ATUALIZADO: Apenas FT pode receber recibo
     */
    public function processarPagamento(string $vendaId, array $dadosPagamento)
    {
        return DB::transaction(function () use ($vendaId, $dadosPagamento) {

            $venda = Venda::with('documentoFiscal')->findOrFail($vendaId);

            if (!$venda->documentoFiscal) {
                throw new \Exception("Venda não possui documento fiscal. Gere uma fatura primeiro.");
            }

            // ATUALIZADO: Apenas FT pode receber pagamento via recibo
            if ($venda->documentoFiscal->tipo_documento !== 'FT') {
                throw new \Exception("Apenas Faturas (FT) podem receber pagamento via recibo. FR já está paga.");
            }

            if ($venda->estado_pagamento === 'paga') {
                throw new \Exception("Venda já está totalmente paga.");
            }

            // Gerar recibo via DocumentoFiscalService
            $recibo = $this->documentoFiscalService->gerarRecibo(
                $venda->documentoFiscal,
                $dadosPagamento
            );

            // Atualizar estado de pagamento da venda
            $valorPendente = $this->documentoFiscalService->calcularValorPendente($venda->documentoFiscal);

            $novoEstado = match (true) {
                $valorPendente <= 0 => 'paga',
                $valorPendente < $venda->documentoFiscal->total_liquido => 'parcial',
                default => 'pendente',
            };

            $venda->update(['estado_pagamento' => $novoEstado]);

            Log::info('Pagamento processado', [
                'venda_id' => $vendaId,
                'recibo_id' => $recibo->id,
                'valor_pago' => $dadosPagamento['valor'],
                'novo_estado' => $novoEstado,
            ]);

            return [
                'venda' => $venda->fresh(),
                'recibo' => $recibo,
                'estado_pagamento' => $novoEstado,
            ];
        });
    }

    /**
     * Relatório de vendas
     * ATUALIZADO: Filtra apenas vendas válidas (FT/FR)
     */
    public function relatorioVendas(array $filtros = [])
    {
        $query = Venda::with('cliente', 'itens.produto', 'documentoFiscal')
            ->whereHas('documentoFiscal', function ($q) {
                // Apenas FT e FR são vendas
                $q->whereIn('tipo_documento', ['FT', 'FR']);
            });

        if (!empty($filtros['data_inicio'])) {
            $query->whereDate('data_venda', '>=', $filtros['data_inicio']);
        }

        if (!empty($filtros['data_fim'])) {
            $query->whereDate('data_venda', '<=', $filtros['data_fim']);
        }

        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }

        if (!empty($filtros['estado_pagamento'])) {
            $query->where('estado_pagamento', $filtros['estado_pagamento']);
        }

        if (!empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->orderBy('data_venda', 'desc')->get();
    }

    /* ================= MÉTODOS AUXILIARES PRIVADOS ================= */

    /**
     * Determinar estado de pagamento inicial
     * ATUALIZADO: Estados = pendente, paga, parcial, cancelada
     */
    private function determinarEstadoPagamentoInicial(string $tipoDocumento, bool $faturar): string
    {
        if (!$faturar) {
            return 'pendente';
        }

        return match ($tipoDocumento) {
            'FR' => 'paga',
            'FT' => 'pendente',
            default => 'pendente',
        };
    }
}
