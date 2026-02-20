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
     * Documentos de venda: FT, FR, RC
     * Documentos não-venda: FP (proforma), FA (adiantamento), NC, ND, FRt
     */
    public function criarVenda(array $dados, bool $faturar = false, string $tipoDocumento = 'FT')
    {
        return DB::transaction(function () use ($dados, $faturar, $tipoDocumento) {

            Log::info('=== Iniciando criação de venda ===', [
                'dados_recebidos' => $dados,
                'faturar' => $faturar,
                'tipo_documento_recebido' => $tipoDocumento,
                'cliente_tipo' => isset($dados['cliente_id']) ? 'cadastrado' : (isset($dados['cliente_nome']) ? 'avulso' : 'não informado')
            ]);

            // Validar tipo de documento permitido
            $tiposPermitidos = ['FT', 'FR', 'FP', 'FA']; // FA é adiantamento, não é venda ainda
            if (!in_array($tipoDocumento, $tiposPermitidos)) {
                throw new \Exception("Tipo de documento {$tipoDocumento} não é válido. Use FT, FR, FP ou FA.");
            }

            // Log de aviso para tipos que não são vendas
            if (!in_array($tipoDocumento, ['FT', 'FR', 'RC'])) {
                Log::warning('Criando documento que não é venda fiscal', [
                    'tipo_documento' => $tipoDocumento,
                    'observacao' => $tipoDocumento === 'FA' ? 'FA só vira venda quando gerar recibo' : 'Documento não fiscal'
                ]);
            }

            $empresa = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // Buscar série fiscal apropriada baseada no tipo de documento
            $serieFiscal = $this->obterSerieFiscal($tipoDocumento);

            if (!$serieFiscal) {
                throw new \Exception("Nenhuma série fiscal ativa encontrada para o tipo de documento {$tipoDocumento}.");
            }

            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, $serieFiscal->digitos ?? 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            // Determinar estado de pagamento inicial
            $estadoPagamento = $this->determinarEstadoPagamentoInicial($tipoDocumento, $faturar);

            // CORREÇÃO: Garantir que cliente_nome dos dados originais seja preservado
            $clienteId = $dados['cliente_id'] ?? null;
            $clienteNome = $dados['cliente_nome'] ?? null;
            $clienteNif = $dados['cliente_nif'] ?? null;

            Log::info('Dados do cliente extraídos do request', [
                'cliente_id' => $clienteId,
                'cliente_nome' => $clienteNome,
                'cliente_nif' => $clienteNif,
            ]);

            $venda = Venda::create([
                'id' => Str::uuid(),
                'cliente_id' => $clienteId,
                'cliente_nome' => $clienteNome, // Para cliente avulso
                'cliente_nif' => $clienteNif,   // Para cliente avulso
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
                'data_venda' => $dados['data'] ?? now()->toDateString(),
                'hora_venda' => now()->toTimeString(),
                'total' => 0,
                'status' => 'aberta',
                'estado_pagamento' => $estadoPagamento,
                'tipo_documento_fiscal' => $tipoDocumento,
                'observacoes' => $dados['observacoes'] ?? null,
            ]);

            Log::info('Venda criada', [
                'venda_id' => $venda->id,
                'numero_documento' => $numeroDocumento,
                'estado_pagamento' => $estadoPagamento,
                'cliente_tipo' => $venda->cliente_id ? 'cadastrado' : ($venda->cliente_nome ? 'avulso' : 'não informado'),
                'cliente_nome_salvo' => $venda->cliente_nome,
                'cliente_nif_salvo' => $venda->cliente_nif,
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
                    'taxa_iva' => $taxaIva,
                    'valor_retencao' => $valorRetencao,
                    'taxa_retencao' => $produto->tipo === 'servico' ? 6.5 : 0,
                    'subtotal' => $subtotalFinal,
                    'codigo_produto' => $produto->codigo,
                    'unidade' => $produto->tipo === 'servico' ? ($produto->unidade_medida ?? 'hora') : 'UN',
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
                Log::info('Iniciando emissão de documento fiscal', [
                    'venda_id' => $venda->id,
                    'tipo_documento_solicitado' => $tipoDocumento,
                ]);

                // FR obrigatoriamente precisa de dados_pagamento
                if ($tipoDocumento === 'FR') {
                    if (empty($dados['dados_pagamento'])) {
                        throw new \Exception('Campo dados_pagamento é obrigatório para Fatura-Recibo (FR).');
                    }

                    // Validar valor do pagamento
                    if ($dados['dados_pagamento']['valor'] != $totalPagar) {
                        throw new \Exception('Valor do pagamento deve ser exatamente igual ao total da venda para FR.');
                    }
                }

                // Para FP, não precisa de dados_pagamento
                if ($tipoDocumento === 'FP') {
                    Log::info('Gerando Fatura Proforma (FP) - documento não fiscal', [
                        'venda_id' => $venda->id
                    ]);
                }

                // Para FA, não precisa de dados_pagamento (é adiantamento)
                if ($tipoDocumento === 'FA') {
                    Log::info('Gerando Fatura de Adiantamento (FA) - aguardando recibo para virar venda', [
                        'venda_id' => $venda->id
                    ]);
                }

                // CORREÇÃO: Recarregar venda do banco para garantir dados atualizados
                $venda->refresh();

                // Preparar payload para documento fiscal - USAR DADOS ORIGINAIS DO REQUEST
                $payloadDocumento = [
                    'tipo_documento' => $tipoDocumento,
                    'venda_id' => $venda->id,
                    'itens' => $venda->itens->map(function ($item) {
                        $produto = Produto::find($item->produto_id);
                        return [
                            'produto_id' => $item->produto_id,
                            'descricao' => $item->descricao,
                            'quantidade' => $item->quantidade,
                            'preco_unitario' => $item->preco_venda,
                            'desconto' => $item->desconto,
                            'taxa_iva' => $produto?->taxa_iva ?? 14,
                        ];
                    })->toArray(),
                ];

                // CORREÇÃO: Usar dados originais do request em vez da instância da venda
                // Isso garante que cliente_nome seja enviado corretamente
                if (!empty($dados['cliente_id'])) {
                    $payloadDocumento['cliente_id'] = $dados['cliente_id'];
                    Log::info('Adicionando cliente cadastrado ao payload (dos dados originais)', ['cliente_id' => $dados['cliente_id']]);
                } elseif (!empty($dados['cliente_nome'])) {
                    // Cliente avulso - usar dados do request
                    $payloadDocumento['cliente_nome'] = $dados['cliente_nome'];
                    Log::info('Adicionando cliente avulso ao payload (dos dados originais)', ['cliente_nome' => $dados['cliente_nome']]);

                    if (!empty($dados['cliente_nif'])) {
                        $payloadDocumento['cliente_nif'] = $dados['cliente_nif'];
                        Log::info('Adicionando NIF para cliente avulso (dos dados originais)', ['cliente_nif' => $dados['cliente_nif']]);
                    }
                }

                // Fallback: se não achou nos dados originais, tentar na venda (não deveria acontecer)
                if (empty($payloadDocumento['cliente_id']) && empty($payloadDocumento['cliente_nome'])) {
                    if ($venda->cliente_id) {
                        $payloadDocumento['cliente_id'] = $venda->cliente_id;
                        Log::warning('Usando fallback cliente_id da venda', ['cliente_id' => $venda->cliente_id]);
                    } elseif ($venda->cliente_nome) {
                        $payloadDocumento['cliente_nome'] = $venda->cliente_nome;
                        Log::warning('Usando fallback cliente_nome da venda', ['cliente_nome' => $venda->cliente_nome]);
                        if ($venda->cliente_nif) {
                            $payloadDocumento['cliente_nif'] = $venda->cliente_nif;
                        }
                    }
                }

                // Log do payload final antes de enviar
                Log::info('Payload final para documento fiscal', [
                    'cliente_id' => $payloadDocumento['cliente_id'] ?? null,
                    'cliente_nome' => $payloadDocumento['cliente_nome'] ?? null,
                    'cliente_nif' => $payloadDocumento['cliente_nif'] ?? null,
                ]);

                // Adicionar dados de pagamento se existirem (apenas para FR)
                if (!empty($dados['dados_pagamento']) && $tipoDocumento === 'FR') {
                    $payloadDocumento['dados_pagamento'] = [
                        'metodo' => $dados['dados_pagamento']['metodo'],
                        'valor' => (float) $dados['dados_pagamento']['valor'],
                        'data' => $dados['dados_pagamento']['data'] ?? now()->toDateString(),
                        'referencia' => $dados['dados_pagamento']['referencia'] ?? null,
                    ];
                    Log::info('Adicionando dados de pagamento', $payloadDocumento['dados_pagamento']);
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
                    'FR' => 'paga',           // FR já está paga
                    'RC' => 'paga',            // RC é pagamento
                    'FT' => 'pendente',        // FT aguarda pagamento
                    'FA' => 'pendente',        // FA aguarda recibo para virar venda
                    'FP' => 'pendente',        // FP sempre pendente (proforma)
                    default => 'pendente',
                };

                $novoStatus = in_array($tipoDocumento, ['FT', 'FR', 'RC']) ? 'faturada' : 'aberta';

                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status' => $novoStatus,
                    'estado_pagamento' => $novoEstadoPagamento,
                ]);

                Log::info('Documento fiscal emitido com sucesso', [
                    'venda_id' => $venda->id,
                    'documento_fiscal_id' => $documento->id,
                    'tipo_documento' => $documento->tipo_documento,
                    'estado_pagamento' => $novoEstadoPagamento,
                    'status_venda' => $novoStatus,
                    'eh_venda' => in_array($tipoDocumento, ['FT', 'FR', 'RC']) ? 'sim' : 'não'
                ]);
            } else {
                // Se não faturar, a venda permanece aberta
                $venda->update([
                    'status' => 'aberta',
                ]);

                Log::info('Venda criada sem emissão de documento fiscal', [
                    'venda_id' => $venda->id,
                    'status' => 'aberta'
                ]);
            }

            Log::info('=== Finalizando criação de venda ===', [
                'venda_id' => $venda->id,
                'tipo_documento' => $tipoDocumento,
                'eh_venda_fiscal' => in_array($tipoDocumento, ['FT', 'FR', 'RC']) ? 'sim' : 'não'
            ]);

            return $venda->load('itens.produto', 'cliente', 'user', 'documentoFiscal');
        });
    }

    /**
     * Cancelar venda
     */
    public function cancelarVenda(string $vendaId)
    {
        return DB::transaction(function () use ($vendaId) {

            $venda = Venda::with('itens.produto', 'documentoFiscal')->findOrFail($vendaId);

            if ($venda->status === 'cancelada') {
                throw new \Exception("Venda já cancelada.");
            }

            // Verificar se pode cancelar pelo estado do documento fiscal
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

            // Reverter stock (apenas para produtos, não serviços)
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

            Log::info('Venda cancelada', [
                'venda_id' => $vendaId,
                'tipo_documento' => $venda->documentoFiscal?->tipo_documento
            ]);

            return $venda;
        });
    }

    /**
     * Processar pagamento de uma venda (gerar recibo)
     * FT e FA podem receber pagamento (FA vira venda com recibo)
     */
    public function processarPagamento(string $vendaId, array $dadosPagamento)
    {
        return DB::transaction(function () use ($vendaId, $dadosPagamento) {

            $venda = Venda::with('documentoFiscal')->findOrFail($vendaId);

            if (!$venda->documentoFiscal) {
                throw new \Exception("Venda não possui documento fiscal. Gere uma fatura primeiro.");
            }

            // FT e FA podem receber pagamento via recibo
            if (!in_array($venda->documentoFiscal->tipo_documento, ['FT', 'FA'])) {
                if ($venda->documentoFiscal->tipo_documento === 'FR') {
                    throw new \Exception("Fatura-Recibo (FR) já está paga no momento da emissão.");
                }
                if ($venda->documentoFiscal->tipo_documento === 'FP') {
                    throw new \Exception("Fatura Proforma (FP) não pode receber pagamento. Converta para FT primeiro.");
                }
                if ($venda->documentoFiscal->tipo_documento === 'RC') {
                    throw new \Exception("Recibo (RC) já é um pagamento.");
                }
                throw new \Exception("Apenas Faturas (FT) e Faturas de Adiantamento (FA) podem receber pagamento via recibo.");
            }

            if ($venda->estado_pagamento === 'paga') {
                throw new \Exception("Venda já está totalmente paga.");
            }

            // Validar valor do pagamento
            $valorPendente = $this->documentoFiscalService->calcularValorPendente($venda->documentoFiscal);
            if ($dadosPagamento['valor'] > $valorPendente) {
                throw new \Exception("Valor do pagamento ({$dadosPagamento['valor']}) excede o valor pendente ({$valorPendente}).");
            }

            // Gerar recibo via DocumentoFiscalService
            $recibo = $this->documentoFiscalService->gerarRecibo(
                $venda->documentoFiscal,
                $dadosPagamento
            );

            // Atualizar estado de pagamento da venda
            $novoValorPendente = $this->documentoFiscalService->calcularValorPendente($venda->documentoFiscal);

            $novoEstado = match (true) {
                $novoValorPendente <= 0 => 'paga',
                $novoValorPendente < $venda->documentoFiscal->total_liquido => 'parcial',
                default => 'pendente',
            };

            // Se for FA e ficou paga, agora é considerada venda
            if ($venda->documentoFiscal->tipo_documento === 'FA' && $novoEstado === 'paga') {
                Log::info('Fatura de Adiantamento (FA) convertida em venda', [
                    'venda_id' => $vendaId,
                    'documento_fiscal_id' => $venda->documentoFiscal->id
                ]);
            }

            $venda->update(['estado_pagamento' => $novoEstado]);

            Log::info('Pagamento processado', [
                'venda_id' => $vendaId,
                'recibo_id' => $recibo->id,
                'valor_pago' => $dadosPagamento['valor'],
                'novo_estado' => $novoEstado,
                'tipo_documento_original' => $venda->documentoFiscal->tipo_documento
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
     * Filtra apenas documentos de venda (FT, FR, RC)
     */
    public function relatorioVendas(array $filtros = [])
    {
        $query = Venda::with('cliente', 'itens.produto', 'documentoFiscal')
            ->whereHas('documentoFiscal', function ($q) {
                // Apenas FT, FR e RC são vendas
                $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
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

        if (!empty($filtros['cliente_nome'])) {
            $query->where('cliente_nome', 'like', '%' . $filtros['cliente_nome'] . '%');
        }

        if (!empty($filtros['estado_pagamento'])) {
            $query->where('estado_pagamento', $filtros['estado_pagamento']);
        }

        if (!empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (!empty($filtros['tipo_documento'])) {
            $query->whereHas('documentoFiscal', function ($q) use ($filtros) {
                $q->where('tipo_documento', $filtros['tipo_documento']);
            });
        }

        return $query->orderBy('data_venda', 'desc')->get();
    }

    /**
     * Relatório de documentos não-venda (FP, FA, NC, ND, FRt)
     */
    public function relatorioDocumentosNaoVenda(array $filtros = [])
    {
        $query = Venda::with('cliente', 'itens.produto', 'documentoFiscal')
            ->whereHas('documentoFiscal', function ($q) {
                // Documentos que não são vendas
                $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']);
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

        if (!empty($filtros['cliente_nome'])) {
            $query->where('cliente_nome', 'like', '%' . $filtros['cliente_nome'] . '%');
        }

        if (!empty($filtros['tipo_documento'])) {
            $query->whereHas('documentoFiscal', function ($q) use ($filtros) {
                $q->where('tipo_documento', $filtros['tipo_documento']);
            });
        }

        return $query->orderBy('data_venda', 'desc')->get();
    }

    /**
     * Converter Fatura Proforma (FP) para Fatura (FT)
     */
    public function converterProformaParaFatura(string $vendaId, array $dadosPagamento = null)
    {
        return DB::transaction(function () use ($vendaId, $dadosPagamento) {

            $venda = Venda::with('documentoFiscal', 'itens.produto')->findOrFail($vendaId);

            if (!$venda->documentoFiscal || $venda->documentoFiscal->tipo_documento !== 'FP') {
                throw new \Exception("Apenas Faturas Proforma (FP) podem ser convertidas.");
            }

            if ($venda->estado_pagamento === 'cancelada') {
                throw new \Exception("Não é possível converter uma venda cancelada.");
            }

            Log::info('Convertendo Proforma para Fatura', [
                'proforma_id' => $vendaId,
                'cliente' => $venda->cliente_id ? 'cadastrado' : ($venda->cliente_nome ? 'avulso' : 'não informado')
            ]);

            // Cancelar a FP atual
            $this->documentoFiscalService->cancelarDocumento(
                $venda->documentoFiscal,
                'Convertida para Fatura (FT)'
            );

            // Criar nova FT com os mesmos itens
            $dadosNovaVenda = [
                'cliente_id' => $venda->cliente_id,
                'cliente_nome' => $venda->cliente_nome,
                'cliente_nif' => $venda->cliente_nif,
                'itens' => $venda->itens->map(function ($item) {
                    return [
                        'produto_id' => $item->produto_id,
                        'quantidade' => $item->quantidade,
                        'preco_venda' => $item->preco_venda,
                        'desconto' => $item->desconto,
                    ];
                })->toArray(),
            ];

            if ($dadosPagamento) {
                $dadosNovaVenda['dados_pagamento'] = $dadosPagamento;
            }

            // Criar nova venda como FT
            $novaVenda = $this->criarVenda($dadosNovaVenda, true, 'FT');

            Log::info('Proforma convertida para Fatura', [
                'proforma_id' => $vendaId,
                'nova_fatura_id' => $novaVenda->id,
            ]);

            return $novaVenda;
        });
    }

    /**
     * Obter série fiscal apropriada para o tipo de documento
     */
    private function obterSerieFiscal(string $tipoDocumento): ?SerieFiscal
    {
        // Mapear tipo de documento para a série apropriada
        $tipoSerie = match ($tipoDocumento) {
            'FT', 'FR', 'RC' => 'FT', // Vendas usam série de fatura
            'FP' => 'FP',              // Proforma tem série própria
            'FA' => 'FA',              // Adiantamento tem série própria
            'NC' => 'NC',              // Nota de Crédito
            'ND' => 'ND',              // Nota de Débito
            'FRt' => 'FRt',            // Fatura de Retificação
            default => $tipoDocumento,
        };

        Log::info('Buscando série fiscal', [
            'tipo_documento_original' => $tipoDocumento,
            'tipo_serie' => $tipoSerie
        ]);

        // Buscar série específica para o tipo
        $serie = SerieFiscal::where('tipo_documento', $tipoSerie)
            ->where('ativa', true)
            ->where(function ($q) {
                $q->whereNull('ano')->orWhere('ano', now()->year);
            })
            ->orderBy('padrao', 'desc') // Priorizar série padrão
            ->lockForUpdate()
            ->first();

        // Se não encontrar, buscar qualquer série ativa do mesmo tipo
        if (!$serie) {
            Log::warning('Série fiscal não encontrada com filtros de ano, buscando sem ano', [
                'tipo_serie' => $tipoSerie
            ]);

            $serie = SerieFiscal::where('tipo_documento', $tipoSerie)
                ->where('ativa', true)
                ->orderBy('padrao', 'desc')
                ->lockForUpdate()
                ->first();
        }

        if ($serie) {
            Log::info('Série fiscal encontrada', [
                'id' => $serie->id,
                'serie' => $serie->serie,
                'tipo' => $serie->tipo_documento,
                'ultimo_numero' => $serie->ultimo_numero
            ]);
        }

        return $serie;
    }

    /* ================= MÉTODOS AUXILIARES PRIVADOS ================= */

    /**
     * Determinar estado de pagamento inicial
     * Estados = pendente, paga, parcial, cancelada
     */
    private function determinarEstadoPagamentoInicial(string $tipoDocumento, bool $faturar): string
    {
        if (!$faturar) {
            return 'pendente';
        }

        return match ($tipoDocumento) {
            'FR', 'RC' => 'paga',      // FR e RC já estão pagos
            'FT', 'FA', 'FP' => 'pendente', // FT, FA, FP aguardam pagamento
            default => 'pendente',
        };
    }
}
