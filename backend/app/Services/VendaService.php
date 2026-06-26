<?php

namespace App\Services;

use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\ItemVenda as SharedItemVenda;
use App\Models\Shared\Produto as SharedProduto;

use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\ItemVenda as TenantItemVenda;
use App\Models\Tenant\Produto as TenantProduto;

use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
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
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 */
class VendaService
{
    protected StockService $stockService;
    protected DocumentoFiscalService $documentoFiscalService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct(
        StockService $stockService,
        DocumentoFiscalService $documentoFiscalService
    ) {
        $this->stockService = $stockService;
        $this->documentoFiscalService = $documentoFiscalService;
        
        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[VendaService] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS: Modo e Models
     | ================================================================== */

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        return $this->modo;
    }

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    protected function vendaModel()
    {
        return $this->isColectivo() ? new SharedVenda() : new TenantVenda();
    }

    protected function itemVendaModel()
    {
        return $this->isColectivo() ? new SharedItemVenda() : new TenantItemVenda();
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[VendaService] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[VendaService] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // ✅ Atualiza o modo
        $this->modo = $this->empresa->modo ?? 'colectivo';

        // 2️⃣ Obtém o landlord user (guard onde o login foi feito)
        $landlordUser = Auth::guard('landlord')->user();

        // 3️⃣ Fallback: tenta obter da sessão
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[VendaService] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[VendaService] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[VendaService] Acesso verificado com sucesso', [
            'modo' => $this->modo,
            'user_id' => $tenantUser->id,
            'email' => $tenantUser->email,
        ]);
    }

    /**
     * Busca usuário no banco correto
     */
    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }
        return SharedUser::on('shared')
            ->where('email', $email)
            ->where('tenant_id', $empresa->id)
            ->first();
    }

    /**
     * Obtém o user_id do tenantUser
     */
    protected function getUserId(): ?string
    {
        if ($this->tenantUser) {
            return $this->tenantUser->id;
        }

        // Fallback
        try {
            $landlordUser = Auth::guard('landlord')->user();
            if ($landlordUser && $this->empresa) {
                $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
                if ($tenantUser) {
                    return $tenantUser->id;
                }
            }
        } catch (\Exception $e) {
            Log::warning('[VendaService] Fallback getUserId falhou', [
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Obtém a empresa do tenant actual (do contexto)
     */
    private function obterEmpresaAtual(): Empresa
    {
        if ($this->empresa) {
            Log::debug('[VendaService] Empresa obtida do contexto', [
                'id' => $this->empresa->id,
                'nome' => $this->empresa->nome,
                'modo' => $this->modo,
            ]);
            return $this->empresa;
        }

        // Fallback: tentar da sessão
        $tenantId = session('tenant_id');
        if ($tenantId) {
            $empresa = Empresa::on('landlord')->find($tenantId);
            if ($empresa) {
                Log::debug('[VendaService] Empresa obtida da sessão', [
                    'id' => $empresa->id,
                    'nome' => $empresa->nome,
                ]);
                return $empresa;
            }
        }

        throw new \RuntimeException('Não foi possível identificar a empresa do tenant actual.');
    }

    /* =====================================================================
     | HELPERS: Query e Model
     | ================================================================== */

    protected function buscarProduto(string $produtoId): object
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('id', $produtoId)->firstOrFail();
        }
        return TenantProduto::where('id', $produtoId)->firstOrFail();
    }

    protected function queryVendas()
    {
        if ($this->isColectivo()) {
            return SharedVenda::doTenant();
        }
        return TenantVenda::query();
    }

    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    protected function adicionarTenantId(array $dados): array
    {
        if ($this->isColectivo() && $this->empresa) {
            $dados['tenant_id'] = $this->empresa->id;
        }
        return $dados;
    }

    /* =====================================================================
     | CRIAR VENDA
     | ================================================================== */

    public function criarVenda(array $dados, bool $faturar = false, string $tipoDocumento = 'FT'): object
    {
        $this->verificarAcessoUsuario();

        return DB::transaction(function () use ($dados, $faturar, $tipoDocumento) {
            Log::info('=== Iniciando criação de venda ===', [
                'tipo_documento'  => $tipoDocumento,
                'faturar'         => $faturar,
                'modo'            => $this->getModo(),
                'empresa_id'      => $this->empresa?->id,
            ]);

            $this->validarTipoDocumento($tipoDocumento);

            // ⭐ OBTER EMPRESA DO CONTEXTO
            $empresa = $this->obterEmpresaAtual();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            $agoraAngola = Carbon::now('Africa/Luanda');
            $userId = $this->getUserId();

            $numeroVenda = $this->gerarNumeroVendaInterno();
            $numeroVendaFormatado = 'VD-' . str_pad($numeroVenda, 6, '0', STR_PAD_LEFT);

            $dadosVenda = [
                'id'                    => Str::uuid(),
                'cliente_id'            => $dados['cliente_id'] ?? null,
                'cliente_nome'          => $dados['cliente_nome'] ?? null,
                'cliente_nif'           => $dados['cliente_nif'] ?? null,
                'user_id'               => $userId,
                'documento_fiscal_id'   => null,
                'numero'                => $numeroVenda,
                'numero_documento'      => $numeroVendaFormatado,
                'base_tributavel'       => 0,
                'total_iva'             => 0,
                'total_retencao'        => 0,
                'total_pagar'           => 0,
                'data_venda'            => $agoraAngola->toDateString(),
                'hora_venda'            => $agoraAngola->format('H:i:s'),
                'total'                 => 0,
                'status'                => 'aberta',
                'estado_pagamento'      => $this->determinarEstadoPagamentoInicial($tipoDocumento, $faturar),
                'tipo_documento_fiscal' => $tipoDocumento,
                'observacoes'           => $dados['observacoes'] ?? null,
                'desconto_global'       => (float) ($dados['desconto_global'] ?? 0),
                'troco'                 => (float) ($dados['troco'] ?? 0),
            ];

            // ⭐ ADICIONAR TENANT_ID (apenas para colectivo)
            if ($this->isColectivo()) {
                $dadosVenda['tenant_id'] = $this->empresa->id;
            }

            // ⭐ USAR O MODEL CORRETO
            if ($this->isColectivo()) {
                $venda = SharedVenda::create($dadosVenda);
            } else {
                $venda = TenantVenda::create($dadosVenda);
            }

            // Processar itens e calcular totais
            $totais = $this->processarItens($venda, $dados['itens'], $aplicaIva, $regime);

            // Aplicar desconto global se existir
            $descontoGlobal = (float) ($dados['desconto_global'] ?? 0);
            if ($descontoGlobal > 0) {
                $totais = $this->aplicarDescontoGlobal($totais, $descontoGlobal);
            }

            $venda->update($totais);
            $venda->refresh();

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
            }

            return $venda->load('itens.produto', 'cliente', 'user', 'documentoFiscal');
        });
    }

    /* =====================================================================
     | CANCELAR VENDA
     | ================================================================== */

    public function cancelarVenda(string $vendaId, string $motivo): object
    {
        $this->verificarAcessoUsuario();

        return DB::transaction(function () use ($vendaId, $motivo) {
            // ⭐ BUSCAR VENDA COM SCOPE
            if ($this->isColectivo()) {
                $venda = SharedVenda::doTenant()->with('itens.produto', 'documentoFiscal')->where('id', $vendaId)->firstOrFail();
            } else {
                $venda = TenantVenda::with('itens.produto', 'documentoFiscal')->where('id', $vendaId)->firstOrFail();
            }

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

            Log::info('Venda cancelada', [
                'venda_id' => $vendaId,
                'modo'     => $this->getModo(),
            ]);

            return $venda;
        });
    }

    /* =====================================================================
     | PROCESSAR PAGAMENTO
     | ================================================================== */

    public function processarPagamento(string $vendaId, array $dadosPagamento): array
    {
        $this->verificarAcessoUsuario();

        return DB::transaction(function () use ($vendaId, $dadosPagamento) {
            // ⭐ BUSCAR VENDA COM SCOPE
            if ($this->isColectivo()) {
                $venda = SharedVenda::doTenant()->with('documentoFiscal')->where('id', $vendaId)->firstOrFail();
            } else {
                $venda = TenantVenda::with('documentoFiscal')->where('id', $vendaId)->firstOrFail();
            }

            if (!$venda->documentoFiscal) {
                throw new \Exception('Venda não possui documento fiscal.');
            }

            if (!in_array($venda->documentoFiscal->tipo_documento, ['FT', 'FA'])) {
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
                default => 'pendente',
            };

            $venda->update(['estado_pagamento' => $novoEstado]);

            return [
                'venda'            => $venda->fresh(),
                'recibo'           => $recibo,
                'estado_pagamento' => $novoEstado,
            ];
        });
    }

    /* =====================================================================
     | CONSULTAS
     | ================================================================== */

    public function listarVendas(array $filtros = [])
    {
        $this->verificarAcessoUsuario();

        $query = $this->queryVendas()->with(['cliente', 'itens.produto', 'documentoFiscal']);

        if (!empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (!empty($filtros['estado_pagamento'])) {
            $query->where('estado_pagamento', $filtros['estado_pagamento']);
        }

        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }

        if (!empty($filtros['data_inicio'])) {
            $query->whereDate('data_venda', '>=', $filtros['data_inicio']);
        }

        if (!empty($filtros['data_fim'])) {
            $query->whereDate('data_venda', '<=', $filtros['data_fim']);
        }

        return $query->orderBy('data_venda', 'desc')->orderBy('hora_venda', 'desc')->get();
    }

    public function buscarVenda(string $vendaId): object
    {
        $this->verificarAcessoUsuario();

        if ($this->isColectivo()) {
            return SharedVenda::doTenant()
                ->with(['cliente', 'itens.produto', 'documentoFiscal', 'user'])
                ->where('id', $vendaId)
                ->firstOrFail();
        }

        return TenantVenda::with(['cliente', 'itens.produto', 'documentoFiscal', 'user'])
            ->where('id', $vendaId)
            ->firstOrFail();
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS (MANTIDOS)
     | ================================================================== */

    private function gerarNumeroVendaInterno(): int
    {
        $query = $this->queryVendas();
        $ultimo = (clone $query)->lockForUpdate()->max('numero') ?? 0;
        return $ultimo + 1;
    }

    private function validarTipoDocumento(string $tipoDocumento): void
    {
        $tiposPermitidos = ['FT', 'FR', 'FP', 'FA'];
        if (!in_array($tipoDocumento, $tiposPermitidos)) {
            throw new \Exception(
                "Tipo de documento {$tipoDocumento} não é válido para criação de venda. Use FT, FR, FP ou FA."
            );
        }
    }

    private function processarItens(object $venda, array $itens, bool $aplicaIva, string $regime): array
    {
        $totalBase = 0.0;
        $totalIva = 0.0;
        $totalRetencao = 0.0;

        foreach ($itens as $item) {
            $produto = $this->buscarProduto($item['produto_id']);
            $resultado = $this->processarItem($produto, $item, $aplicaIva, $regime);

            $dadosItem = array_merge($resultado, [
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
            ]);

            if ($this->isColectivo()) {
                $dadosItem['tenant_id'] = $this->empresa->id;
            }

            if ($this->isColectivo()) {
                SharedItemVenda::create($dadosItem);
            } else {
                TenantItemVenda::create($dadosItem);
            }

            if ($produto->tipo !== 'servico') {
                $this->stockService->saidaVenda(
                    $produto->id,
                    (int) $item['quantidade'],
                    $venda->id
                );
            }

            $totalBase += $resultado['base_tributavel'];
            $totalIva += $resultado['valor_iva'];
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
        object $produto,
        array $item,
        bool $aplicaIva,
        string $regime
    ): array {
        $quantidade = (int) $item['quantidade'];
        $preco = (float) $item['preco_venda'];
        $desconto = (float) ($item['desconto'] ?? 0);
        $subtotal = ($preco * $quantidade) - $desconto;

        // ── IVA ──────────────────────────────────────────────────────────
        $taxaIva = 0.0;
        $codigoIsencao = null;
        $motivoIsencao = null;

        if ($aplicaIva && $regime === 'geral') {
            $taxaIva = (float) ($item['taxa_iva'] ?? $produto->taxa_iva ?? DocumentoFiscalService::IVA_GERAL);

            if ($taxaIva === 0.0) {
                $codigoIsencao = $item['codigo_isencao'] ?? $produto->codigo_isencao ?? 'M00';
                $motivoIsencao = DocumentoFiscalService::MOTIVOS_ISENCAO[$codigoIsencao] ?? 'Isento';
            }
        } elseif ($aplicaIva && $regime === 'simplificado') {
            $taxaIva = 0.0;
            $codigoIsencao = 'M01';
            $motivoIsencao = DocumentoFiscalService::MOTIVOS_ISENCAO['M01'];
        } else {
            $codigoIsencao = 'M06';
            $motivoIsencao = DocumentoFiscalService::MOTIVOS_ISENCAO['M06'];
        }

        $valorIva = round(($subtotal * $taxaIva) / 100, 2);

        // ── Retenção ──────────────────────────────────────────────────────
        $valorRetencao = 0.0;
        $taxaRetencao = 0.0;

        if ($produto->tipo === 'servico' && $aplicaIva) {
            $taxaRetencao = (float) ($item['taxa_retencao'] ?? $produto->taxa_retencao ?? ProdutoService::TAXA_RETENCAO_DEFAULT);
            $valorRetencao = round(($subtotal * $taxaRetencao) / 100, 2);
        }

        $baseTributavel = round($subtotal, 2);

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
            'subtotal'        => round($baseTributavel + $valorIva - $valorRetencao, 2),
        ];
    }

    private function aplicarDescontoGlobal(array $totais, float $descontoGlobal): array
    {
        $totalOriginal = $totais['total_pagar'];

        if ($totalOriginal <= 0 || $descontoGlobal <= 0) {
            return $totais;
        }

        $novoTotal = max(0, $totalOriginal - $descontoGlobal);
        $proporcao = $novoTotal / $totalOriginal;
        $novaBase = round($totais['base_tributavel'] * $proporcao, 2);
        $novoIva = round($totais['total_iva'] * $proporcao, 2);

        return [
            'base_tributavel' => $novaBase,
            'total_iva'       => $novoIva,
            'total_retencao'  => $totais['total_retencao'],
            'total_pagar'     => $novoTotal,
            'total'           => $novoTotal,
        ];
    }

    private function emitirDocumentoFiscal(object $venda, array $dados, string $tipoDocumento)
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

        if (!empty($dados['cliente_id'])) {
            $payload['cliente_id'] = $dados['cliente_id'];
        } elseif (!empty($dados['cliente_nome'])) {
            $payload['cliente_nome'] = $dados['cliente_nome'];
            if (!empty($dados['cliente_nif'])) {
                $payload['cliente_nif'] = $dados['cliente_nif'];
            }
        }

        if ($tipoDocumento === 'FR' && !empty($dados['dados_pagamento'])) {
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

        if ($valorPagamento < $totalVenda - 0.01) {
            throw new \Exception(
                'Valor do pagamento (' . number_format($valorPagamento, 2, ',', '.') .
                ') é insuficiente. Total da venda: ' .
                number_format($totalVenda, 2, ',', '.') . ' para FR.'
            );
        }
    }

    private function determinarEstadoPagamentoInicial(string $tipoDocumento, bool $faturar): string
    {
        if (!$faturar) return 'pendente';
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