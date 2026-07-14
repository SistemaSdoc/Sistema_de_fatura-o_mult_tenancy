<?php

namespace App\Services;

use App\Models\Shared\MovimentoStock as SharedMovimentoStock;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\User as SharedUser;

use App\Models\Tenant\MovimentoStock as TenantMovimentoStock;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\User as TenantUser;

use App\Models\Empresa;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

/**
 * StockService
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 */
class StockService
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    private const TIPOS_MOVIMENTO_VALIDOS = [
        'compra',
        'venda',
        'ajuste',
        'nota_credito',
        'venda_cancelada',
        'nota_credito_cancelada'
    ];

    /* =====================================================================
     | GETTERS - OBTÊM DADOS DA SESSÃO
     | ================================================================== */

    /**
     * Obtém o modo do tenant (singular ou colectivo)
     * PRIORIDADE: Sessão > Empresa > Padrão
     */
    public function getModo(): string
    {
        // ✅ PRIORIDADE 1: Sessão (definido pelo ResolveTenant)
        $sessionModo = session('tenant_modo');
        if ($sessionModo) {
            $this->modo = $sessionModo;
            Log::debug('[StockService] Modo obtido da sessão', ['modo' => $this->modo]);
            return $this->modo;
        }

        // ✅ PRIORIDADE 2: Empresa
        if ($this->empresa) {
            $this->modo = $this->empresa->modo ?? 'colectivo';
            Log::debug('[StockService] Modo obtido da empresa', ['modo' => $this->modo]);
            return $this->modo;
        }

        // ✅ FALLBACK: Padrão
        Log::debug('[StockService] Modo padrão', ['modo' => $this->modo]);
        return $this->modo;
    }

    /**
     * Obtém a empresa atual
     */
    public function getEmpresa(): ?Empresa
    {
        if (!$this->empresa) {
            $this->empresa = app('current.empresa');
        }
        return $this->empresa;
    }

    /**
     * Obtém o usuário tenant atual
     */
    public function getUser(): ?object
    {
        return $this->tenantUser;
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO
     | ================================================================== */

    /**
     * Verifica se o usuário tem acesso ao tenant atual
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[StockService] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[StockService] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // ✅ ATUALIZA O MODO com o da empresa
        $this->modo = $this->empresa->modo ?? 'colectivo';

        Log::debug('[StockService] Modo definido pela empresa', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa->id,
        ]);

        // 2️⃣ Obtém o landlord user
        $landlordUser = Auth::guard('landlord')->user();

        // 3️⃣ Fallback: tenta obter da sessão
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = \App\Models\LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[StockService] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[StockService] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[StockService] Acesso verificado com sucesso', [
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
    protected function getUserId(?string $userId = null): ?string
    {
        if ($userId) {
            return $userId;
        }

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
            Log::warning('[StockService] Fallback getUserId falhou', [
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /* =====================================================================
     | HELPERS - RESOLVER MODELS CONFORME O MODO
     | ================================================================== */

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    protected function movimentoStockModel()
    {
        return $this->isColectivo() ? new SharedMovimentoStock() : new TenantMovimentoStock();
    }

    protected function documentoFiscalModel()
    {
        return $this->isColectivo() ? new SharedDocumentoFiscal() : new TenantDocumentoFiscal();
    }

    protected function aplicarScopeTenant($query)
    {
        if ($this->isColectivo()) {
            return $query->doTenant();
        }
        return $query;
    }

    protected function adicionarTenantId(array $dados): array
    {
        if ($this->isColectivo() && $this->empresa) {
            $dados['tenant_id'] = $this->empresa->id;
        }
        return $dados;
    }

    protected function buscarProdutoComLock(string $produtoId): object
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->lockForUpdate()->where('id', $produtoId)->firstOrFail();
        }
        return TenantProduto::lockForUpdate()->where('id', $produtoId)->firstOrFail();
    }

    protected function buscarProduto(string $produtoId): object
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('id', $produtoId)->firstOrFail();
        }
        return TenantProduto::where('id', $produtoId)->firstOrFail();
    }

    protected function produtoEhServico(string $produtoId): bool
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('id', $produtoId)->where('tipo', 'servico')->exists();
        }
        return TenantProduto::where('id', $produtoId)->where('tipo', 'servico')->exists();
    }

    protected function queryMovimentosStock()
    {
        if ($this->isColectivo()) {
            return SharedMovimentoStock::doTenant();
        }
        return TenantMovimentoStock::query();
    }

    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    /* =====================================================================
     | DASHBOARD
     | ================================================================== */

    /**
     * Dashboard de stock
     */
    public function dashboard(): array
    {
        Log::info('[StockService::dashboard] Iniciando', [
            'modo_atual' => $this->getModo(),
        ]);

        // ✅ Verifica acesso
        $this->verificarAcessoUsuario();

        // ✅ Garante que o modo está correto após verificação
        $modo = $this->getModo();
        Log::info('[StockService::dashboard] Modo confirmado', ['modo' => $modo]);

        $produtosEmRisco = $this->produtosEmRisco();

        $produtosQuery = $this->queryProdutos()->where('tipo', 'produto');

        $valorStock = (clone $produtosQuery)
            ->get()
            ->sum(function ($produto) {
                return $produto->estoque_atual * ($produto->custo_medio ?? 0);
            });

        $movimentosQuery = $this->queryMovimentosStock()
            ->whereDate('created_at', today())
            ->whereHas('produto', function ($q) {
                $q->where('tipo', 'produto');
            });

        $movimentosHoje = (clone $movimentosQuery)->count();
        $saidasHoje = (clone $movimentosQuery)->where('tipo', 'saida')->count();

        return [
            'produtos_total'    => (clone $produtosQuery)->count(),
            'stock_baixo'       => $produtosEmRisco->count(),
            'valor_stock'       => round($valorStock, 2),
            'produtos_em_risco' => $produtosEmRisco->map(function ($p) {
                return [
                    'id'              => $p->id,
                    'nome'            => $p->nome,
                    'estoque_atual'   => $p->estoque_atual,
                    'estoque_minimo'  => $p->estoque_minimo,
                ];
            })->toArray(),
            'movimentos_hoje'   => $movimentosHoje,
            'saidas_por_venda'  => $saidasHoje,
            'modo'              => $modo,
        ];
    }

    /* =====================================================================
     | MOVIMENTAÇÃO GENÉRICA
     | ================================================================== */

public function movimentar(
    string $produtoId,
    int $quantidade,
    string $tipo,
    string $tipoMovimento,
    ?string $referencia = null,
    ?string $observacao = null,
    ?string $userId = null,
): ?object {
    // ✅ Verifica acesso
    $this->verificarAcessoUsuario();

    // ✅ Validar tipo de movimento
    if (!in_array($tipoMovimento, self::TIPOS_MOVIMENTO_VALIDOS)) {
        throw new \InvalidArgumentException(
            "Tipo de movimento inválido: {$tipoMovimento}. " .
            "Permitidos: " . implode(', ', self::TIPOS_MOVIMENTO_VALIDOS)
        );
    }

    $modo = $this->getModo();

    Log::info('[StockService] Iniciando movimentação', [
        'produto_id'      => $produtoId,
        'quantidade'      => $quantidade,
        'tipo'            => $tipo,
        'tipo_movimento'  => $tipoMovimento,
        'referencia'      => $referencia,
        'modo'            => $modo,
    ]);

    return DB::transaction(function () use (
        $produtoId,
        $quantidade,
        $tipo,
        $tipoMovimento,
        $referencia,
        $observacao,
        $userId
    ) {
        // ✅ IDEMPOTÊNCIA: se já existe um movimento para este produto +
        // referência (venda/documento) + tipo de movimento, não duplica.
        // Isto evita descontar o stock duas vezes quando o mesmo produto
        // é processado em mais de um ponto do fluxo (ex.: uma vez ao
        // criar a venda, outra vez ao emitir o documento fiscal).
        if ($referencia !== null) {
            $jaExiste = $this->queryMovimentosStock()
                ->where('produto_id', $produtoId)
                ->where('referencia', $referencia)
                ->where('tipo_movimento', $tipoMovimento)
                ->lockForUpdate()
                ->exists();

            if ($jaExiste) {
                Log::warning('[StockService] Movimento duplicado ignorado (idempotência)', [
                    'produto_id'      => $produtoId,
                    'referencia'      => $referencia,
                    'tipo_movimento'  => $tipoMovimento,
                    'quantidade_tentada' => $quantidade,
                ]);
                return null;
            }
        }

        $produto = $this->buscarProdutoComLock($produtoId);

        if ($quantidade <= 0) {
            throw new \Exception('Quantidade inválida para movimentação de stock.');
        }

        if ($produto->tipo === 'servico') {
            Log::warning('[StockService] Tentativa de movimentar serviço ignorada');
            return null;
        }

        $estoqueAnterior = $produto->estoque_atual;

        if ($tipo === 'entrada') {
            $novaQuantidade = $estoqueAnterior + $quantidade;
        } else {
            if ($estoqueAnterior < $quantidade) {
                throw new \Exception(
                    "Stock insuficiente. Produto: {$produto->nome}, " .
                    "Disponível: {$estoqueAnterior}, Necessário: {$quantidade}"
                );
            }
            $novaQuantidade = $estoqueAnterior - $quantidade;
        }

        $produto->estoque_atual = $novaQuantidade;
        $produto->save();

        $finalUserId = $this->getUserId($userId);

        $dadosMovimento = [
            'id'                => Str::uuid(),
            'produto_id'        => $produto->id,
            'user_id'           => $finalUserId,
            'tipo'              => $tipo,
            'tipo_movimento'    => $tipoMovimento,
            'quantidade'        => $tipo === 'entrada' ? $quantidade : -$quantidade,
            'estoque_anterior'  => $estoqueAnterior,
            'estoque_novo'      => $novaQuantidade,
            'custo_medio'       => $produto->custo_medio,
            'stock_minimo'      => $produto->estoque_minimo,
            'referencia'        => $referencia,
            'observacao'        => $observacao,
        ];

        if ($this->isColectivo()) {
            $dadosMovimento['tenant_id'] = $this->empresa->id;
        }

        $movimentoModel = $this->movimentoStockModel();
        $movimento = $movimentoModel->create($dadosMovimento);

        Log::info('[StockService] Movimento registrado', [
            'movimento_id' => $movimento->id,
            'modo' => $this->getModo(),
        ]);

        return $movimento;
    });
}

    /* =====================================================================
     | MÉTODOS ESPECÍFICOS
     | ================================================================== */

    public function entradaCompra(
        string $produtoId,
        int $quantidade,
        float $precoCompra,
        ?string $compraId = null,
        ?string $userId = null
    ): ?object {
        $this->verificarAcessoUsuario();

        return DB::transaction(function () use ($produtoId, $quantidade, $precoCompra, $compraId, $userId) {
            $produto = $this->buscarProdutoComLock($produtoId);

            if ($produto->tipo === 'servico') {
                Log::warning('[StockService] Tentativa de entrada em serviço ignorada');
                return null;
            }

            if ($quantidade <= 0 || $precoCompra <= 0) {
                throw new \Exception('Quantidade ou preço de compra inválidos.');
            }

            $stockAnterior = $produto->estoque_atual;
            $custoAnterior = $produto->custo_medio ?? 0;

            $novoCustoMedio = (
                ($stockAnterior * $custoAnterior) +
                ($quantidade * $precoCompra)
            ) / max($stockAnterior + $quantidade, 1);

            $produto->custo_medio = round($novoCustoMedio, 2);
            $produto->save();

            return $this->movimentar(
                $produtoId,
                $quantidade,
                'entrada',
                'compra',
                $compraId,
                'Entrada de compra com custo médio actualizado',
                $userId
            );
        });
    }

    public function saidaVenda(
        string $produtoId,
        int $quantidade,
        ?string $vendaId = null,
        ?string $userId = null
    ): ?object {
        $this->verificarAcessoUsuario();

        if ($this->produtoEhServico($produtoId)) {
            Log::warning('[StockService] Saída em serviço ignorada');
            return null;
        }

        return $this->movimentar(
            $produtoId,
            $quantidade,
            'saida',
            'venda',
            $vendaId,
            'Venda de produto',
            $this->getUserId($userId)
        );
    }

    public function ajusteManual(
        string $produtoId,
        int $quantidade,
        string $tipo,
        ?string $referencia = null,
        ?string $observacao = null,
        ?string $userId = null
    ): ?object {
        $this->verificarAcessoUsuario();

        if ($this->produtoEhServico($produtoId)) {
            Log::warning('[StockService] Ajuste em serviço ignorado');
            return null;
        }

        if (!in_array($tipo, ['entrada', 'saida'])) {
            throw new \InvalidArgumentException("Tipo deve ser 'entrada' ou 'saida'.");
        }

        return $this->movimentar(
            $produtoId,
            $quantidade,
            $tipo,
            'ajuste',
            $referencia ?? 'AJUSTE-' . Str::random(6),
            $observacao,
            $this->getUserId($userId)
        );
    }

    public function produtosEmRisco()
    {
        $this->verificarAcessoUsuario();
        return $this->queryProdutos()
            ->whereColumn('estoque_atual', '<=', 'estoque_minimo')
            ->where('tipo', 'produto')
            ->where('status', 'ativo')
            ->get();
    }

    public function processarDocumentoFiscal(object $documento): void
    {
        $this->verificarAcessoUsuario();

        Log::info('[StockService] Processando documento fiscal', [
            'documento_id' => $documento->id,
            'tipo' => $documento->tipo_documento,
            'modo' => $this->getModo(),
        ]);

        if ($documento->estado === 'cancelado') {
            Log::warning('[StockService] Documento cancelado, ignorando');
            return;
        }

        if (!$documento->afetaStock()) {
            Log::info('[StockService] Documento não afeta stock');
            return;
        }

        $tipo = $documento->tipo_documento === 'NC' ? 'entrada' : 'saida';
        $tipoMovimento = $documento->tipo_documento === 'NC' ? 'nota_credito' : 'venda';
        $userId = $documento->user_id ?? null;

        foreach ($documento->itens as $item) {
            if (!$item->produto_id || $item->produto?->tipo === 'servico') {
                continue;
            }

            $this->movimentar(
                $item->produto_id,
                abs((int) $item->quantidade),
                $tipo,
                $tipoMovimento,
                $documento->id,
                "Documento: {$documento->numero_documento} | Item: {$item->descricao}",
                $userId
            );
        }
    }

    public function reverterDocumentoFiscal(object $documento): void
    {
        $this->verificarAcessoUsuario();

        Log::info('[StockService] Revertendo documento fiscal', [
            'documento_id' => $documento->id,
            'modo' => $this->getModo(),
        ]);

        if (!$documento->afetaStock()) {
            return;
        }

        $tipo = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';
        $tipoMovimento = $documento->tipo_documento === 'NC'
            ? 'nota_credito_cancelada'
            : 'venda_cancelada';

        $userId = $documento->user_id ?? null;

        foreach ($documento->itens as $item) {
            if (!$item->produto_id || $item->produto?->tipo === 'servico') {
                continue;
            }

            $this->movimentar(
                $item->produto_id,
                abs((int) $item->quantidade),
                $tipo,
                $tipoMovimento,
                $documento->id,
                "Reversão por cancelamento: {$documento->numero_documento}",
                $userId
            );
        }
    }
}