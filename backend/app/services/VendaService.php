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
use Carbon\Carbon;

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
     */
    public function criarVenda(array $dados, bool $faturar = false, string $tipoDocumento = 'FT')
    {
        return DB::transaction(function () use ($dados, $faturar, $tipoDocumento) {
            Log::info('=== Iniciando criação de venda ===', [
                'tipo_documento' => $tipoDocumento,
                'faturar' => $faturar,
                'cliente_tipo' => isset($dados['cliente_id']) ? 'cadastrado' : 'avulso'
            ]);

            // Validar tipo de documento permitido
            $this->validarTipoDocumento($tipoDocumento);

            $empresa = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // Buscar série fiscal apropriada
            $serieFiscal = $this->obterSerieFiscal($tipoDocumento);
            if (!$serieFiscal) {
                throw new \Exception("Nenhuma série fiscal ativa encontrada para o tipo de documento {$tipoDocumento}.");
            }

            // Gerar número do documento
            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, $serieFiscal->digitos ?? 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            // Horário de Angola (UTC+1)
            $agoraAngola = Carbon::now('Africa/Luanda');

            // Criar venda
            $venda = Venda::create([
                'id' => Str::uuid(),
                'cliente_id' => $dados['cliente_id'] ?? null,
                'cliente_nome' => $dados['cliente_nome'] ?? null,
                'cliente_nif' => $dados['cliente_nif'] ?? null,
                'user_id' => Auth::id(),
                'documento_fiscal_id' => null,
                'tipo_documento' => 'venda',
                'serie' => $serieFiscal->serie,
                'numero' => $numero,
                'numero_documento' => $numeroDocumento,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retencao' => 0,
                'total_pagar' => 0,
                'data_venda' => $agoraAngola->toDateString(),
                'hora_venda' => $agoraAngola->format('H:i:s'),
                'total' => 0,
                'status' => 'aberta',
                'estado_pagamento' => $this->determinarEstadoPagamentoInicial($tipoDocumento, $faturar),
                'tipo_documento_fiscal' => $tipoDocumento,
                'observacoes' => $dados['observacoes'] ?? null,
            ]);

            // Processar itens
            $totais = $this->processarItens($venda, $dados['itens'], $aplicaIva, $regime);

            // Atualizar venda com totais
            $venda->update($totais);

            // Gerar documento fiscal se solicitado
            if ($faturar) {
                $documento = $this->emitirDocumentoFiscal($venda, $dados, $tipoDocumento);

                $novoEstadoPagamento = $this->determinarEstadoAposEmissao($tipoDocumento);
                $novoStatus = in_array($tipoDocumento, ['FT', 'FR', 'RC']) ? 'faturada' : 'aberta';

                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status' => $novoStatus,
                    'estado_pagamento' => $novoEstadoPagamento,
                ]);

                Log::info('Documento fiscal emitido', [
                    'venda_id' => $venda->id,
                    'documento_id' => $documento->id,
                    'tipo' => $documento->tipo_documento
                ]);
            }

            return $venda->load('itens.produto', 'cliente', 'user', 'documentoFiscal');
        });
    }

    /**
     * Validar tipo de documento
     */
    private function validarTipoDocumento(string $tipoDocumento): void
    {
        $tiposPermitidos = ['FT', 'FR', 'FP', 'FA'];
        if (!in_array($tipoDocumento, $tiposPermitidos)) {
            throw new \Exception("Tipo de documento {$tipoDocumento} não é válido. Use FT, FR, FP ou FA.");
        }
    }

    /**
     * Processar itens da venda
     */
    private function processarItens(Venda $venda, array $itens, bool $aplicaIva, string $regime): array
    {
        $totalBase = 0;
        $totalIva = 0;
        $totalRetencao = 0;

        foreach ($itens as $item) {
            $produto = Produto::findOrFail($item['produto_id']);

            $resultado = $this->processarItem($produto, $item, $aplicaIva, $regime);

            // Criar item da venda
            ItemVenda::create(array_merge($resultado, [
                'id' => Str::uuid(),
                'venda_id' => $venda->id,
                'produto_id' => $produto->id,
                'descricao' => $produto->nome,
                'codigo_produto' => $produto->codigo,
                'unidade' => $produto->tipo === 'servico' ? ($produto->unidade_medida ?? 'hora') : ($produto->unidade ?? 'UN'),
            ]));

            // Movimentar stock apenas para produtos
            if ($produto->tipo !== 'servico') {
                $this->stockService->saidaVenda($produto->id, $item['quantidade'], $venda->id);
            }

            $totalBase += $resultado['base_tributavel'];
            $totalIva += $resultado['valor_iva'];
            $totalRetencao += $resultado['valor_retencao'];
        }

        $totalPagar = round($totalBase + $totalIva - $totalRetencao, 2);

        return [
            'base_tributavel' => round($totalBase, 2),
            'total_iva' => round($totalIva, 2),
            'total_retencao' => round($totalRetencao, 2),
            'total_pagar' => $totalPagar,
            'total' => $totalPagar,
        ];
    }

    /**
     * Processar um item individual
     */
    private function processarItem(Produto $produto, array $item, bool $aplicaIva, string $regime): array
    {
        $quantidade = (int) $item['quantidade'];
        $preco = (float) $item['preco_venda'];
        $desconto = (float) ($item['desconto'] ?? 0);
        $taxaRetencao = isset($item['taxa_retencao']) ? (float) $item['taxa_retencao'] : ($produto->retencao ?? 0);

        $subtotal = ($preco * $quantidade) - $desconto;

        // Cálculo do IVA
        $taxaIva = ($aplicaIva && $regime === 'geral') ? ($produto->taxa_iva ?? 0) : 0;
        $valorIva = round(($subtotal * $taxaIva) / 100, 2);

        // Cálculo da retenção (apenas para serviços)
        $valorRetencao = ($produto->tipo === 'servico' && $taxaRetencao > 0)
            ? round(($subtotal * $taxaRetencao) / 100, 2)
            : 0;

        $baseTributavel = round($subtotal, 2);
        $subtotalFinal = $baseTributavel + $valorIva - $valorRetencao;

        Log::info('Item processado', [
            'produto' => $produto->nome,
            'tipo' => $produto->tipo,
            'subtotal' => $subtotal,
            'iva' => $valorIva,
            'retencao' => $valorRetencao,
            'final' => $subtotalFinal
        ]);

        return [
            'quantidade' => $quantidade,
            'preco_venda' => $preco,
            'desconto' => $desconto,
            'base_tributavel' => $baseTributavel,
            'valor_iva' => $valorIva,
            'taxa_iva' => $taxaIva,
            'valor_retencao' => $valorRetencao,
            'taxa_retencao' => $taxaRetencao,
            'subtotal' => $subtotalFinal,
        ];
    }

    /**
     * Emitir documento fiscal
     */
    private function emitirDocumentoFiscal(Venda $venda, array $dados, string $tipoDocumento)
    {
        // Validar FR
        if ($tipoDocumento === 'FR') {
            $this->validarFR($dados, $venda->total);
        }

        // Preparar payload
        $payload = [
            'tipo_documento' => $tipoDocumento,
            'venda_id' => $venda->id,
            'itens' => $venda->itens->map(function ($item) {
                return [
                    'produto_id' => $item->produto_id,
                    'descricao' => $item->descricao,
                    'quantidade' => $item->quantidade,
                    'preco_unitario' => $item->preco_venda,
                    'desconto' => $item->desconto,
                    'taxa_iva' => $item->taxa_iva,
                    'taxa_retencao' => $item->taxa_retencao,
                ];
            })->toArray(),
        ];

        // Adicionar cliente
        if (!empty($dados['cliente_id'])) {
            $payload['cliente_id'] = $dados['cliente_id'];
        } elseif (!empty($dados['cliente_nome'])) {
            $payload['cliente_nome'] = $dados['cliente_nome'];
            if (!empty($dados['cliente_nif'])) {
                $payload['cliente_nif'] = $dados['cliente_nif'];
            }
        }

        // Adicionar dados de pagamento para FR
        if ($tipoDocumento === 'FR' && !empty($dados['dados_pagamento'])) {
            $payload['dados_pagamento'] = [
                'metodo' => $dados['dados_pagamento']['metodo'],
                'valor' => (float) $dados['dados_pagamento']['valor'],
                'data' => $dados['dados_pagamento']['data'] ?? Carbon::now('Africa/Luanda')->toDateString(),
                'referencia' => $dados['dados_pagamento']['referencia'] ?? null,
            ];
        }

        return $this->documentoFiscalService->emitirDocumento($payload);
    }

    /**
     * Validar Fatura-Recibo
     */
    private function validarFR(array $dados, float $totalVenda): void
    {
        if (empty($dados['dados_pagamento'])) {
            throw new \Exception('Campo dados_pagamento é obrigatório para Fatura-Recibo (FR).');
        }

        $valorPagamento = (float) $dados['dados_pagamento']['valor'];
        $diferenca = abs(round($valorPagamento, 2) - round($totalVenda, 2));

        if ($diferenca > 0.01) {
            throw new \Exception(
                'Valor do pagamento (' . number_format($valorPagamento, 2, ',', '.') .
                ') deve ser exatamente igual ao total da venda (' .
                number_format($totalVenda, 2, ',', '.') . ') para FR.'
            );
        }
    }

    /**
     * Cancelar venda
     */
    public function cancelarVenda(string $vendaId, string $motivo)
    {
        return DB::transaction(function () use ($vendaId, $motivo) {
            $venda = Venda::with('itens.produto', 'documentoFiscal')->findOrFail($vendaId);

            if ($venda->status === 'cancelada') {
                throw new \Exception("Venda já cancelada.");
            }

            if ($venda->documentoFiscal) {
                if ($venda->documentoFiscal->estado === 'paga') {
                    throw new \Exception("Não é possível cancelar venda com documento fiscal pago.");
                }

                if ($venda->documentoFiscal->recibos()->where('estado', '!=', 'cancelado')->exists()) {
                    throw new \Exception("Venda possui recibos de pagamento. Cancele-os primeiro.");
                }

                if (in_array($venda->documentoFiscal->estado, ['emitido', 'parcialmente_paga'])) {
                    $this->documentoFiscalService->cancelarDocumento(
                        $venda->documentoFiscal,
                        $motivo
                    );
                }
            }

            // Devolver stock
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

            Log::info('Venda cancelada', ['venda_id' => $vendaId]);

            return $venda;
        });
    }

    /**
     * Processar pagamento de uma venda
     */
    public function processarPagamento(string $vendaId, array $dadosPagamento)
    {
        return DB::transaction(function () use ($vendaId, $dadosPagamento) {
            $venda = Venda::with('documentoFiscal')->findOrFail($vendaId);

            if (!$venda->documentoFiscal) {
                throw new \Exception("Venda não possui documento fiscal.");
            }

            if (!in_array($venda->documentoFiscal->tipo_documento, ['FT', 'FA'])) {
                throw new \Exception("Apenas Faturas (FT) e Faturas de Adiantamento (FA) podem receber pagamento.");
            }

            if ($venda->estado_pagamento === 'paga') {
                throw new \Exception("Venda já está totalmente paga.");
            }

            $recibo = $this->documentoFiscalService->gerarRecibo(
                $venda->documentoFiscal,
                $dadosPagamento
            );

            $novoValorPendente = $venda->valor_pendente;

            $novoEstado = match (true) {
                $novoValorPendente <= 0 => 'paga',
                $novoValorPendente < $venda->documentoFiscal->total_liquido => 'parcial',
                default => 'pendente',
            };

            $venda->update(['estado_pagamento' => $novoEstado]);

            Log::info('Pagamento processado', [
                'venda_id' => $vendaId,
                'recibo_id' => $recibo->id,
                'valor' => $dadosPagamento['valor'],
                'novo_estado' => $novoEstado
            ]);

            return [
                'venda' => $venda->fresh(),
                'recibo' => $recibo,
                'estado_pagamento' => $novoEstado,
            ];
        });
    }

    /**
     * Obter série fiscal
     */
    private function obterSerieFiscal(string $tipoDocumento): ?SerieFiscal
    {
        $tipoSerie = match ($tipoDocumento) {
            'FT', 'FR', 'RC' => 'FT',
            'FP' => 'FP',
            'FA' => 'FA',
            'NC' => 'NC',
            'ND' => 'ND',
            'FRt' => 'FRt',
            default => $tipoDocumento,
        };

        $serie = SerieFiscal::where('tipo_documento', $tipoSerie)
            ->where('ativa', true)
            ->where(function ($q) {
                $q->whereNull('ano')->orWhere('ano', now()->year);
            })
            ->orderBy('padrao', 'desc')
            ->lockForUpdate()
            ->first();

        if (!$serie) {
            $serie = SerieFiscal::where('tipo_documento', $tipoSerie)
                ->where('ativa', true)
                ->orderBy('padrao', 'desc')
                ->lockForUpdate()
                ->first();
        }

        return $serie;
    }

    /**
     * Determinar estado de pagamento inicial
     */
    private function determinarEstadoPagamentoInicial(string $tipoDocumento, bool $faturar): string
    {
        if (!$faturar) return 'pendente';
        return match ($tipoDocumento) {
            'FR', 'RC' => 'paga',
            default => 'pendente',
        };
    }

    /**
     * Determinar estado após emissão
     */
    private function determinarEstadoAposEmissao(string $tipoDocumento): string
    {
        return match ($tipoDocumento) {
            'FR' => 'paga',
            default => 'pendente',
        };
    }
}
