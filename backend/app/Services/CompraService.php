<?php

namespace App\Services;

use App\Models\Shared\Compra as SharedCompra;
use App\Models\Shared\CompraItem as SharedCompraItem;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\SerieFiscal as SharedSerieFiscal;
use App\Models\Shared\LogFiscal as SharedLogFiscal;
use App\Models\Shared\ApuramentoIva as SharedApuramentoIva;
use App\Models\Shared\User as SharedUser;

use App\Models\Tenant\Compra as TenantCompra;
use App\Models\Tenant\CompraItem as TenantCompraItem;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\SerieFiscal as TenantSerieFiscal;
use App\Models\Tenant\LogFiscal as TenantLogFiscal;
use App\Models\Tenant\ApuramentoIva as TenantApuramentoIva;
use App\Models\Tenant\User as TenantUser;

use App\Models\Empresa;
use App\Models\LandlordUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * CompraService - Multi-Tenant Service
 *
 * Suporta ambos os modos:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 *
 * 🔥 A empresa e o utilizador são obtidos dinamicamente a cada chamada,
 *    garantindo que o middleware resolve.tenant já tenha sido executado.
 */
class CompraService
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    // ============================================================
    // GETTERS - OBTÊM DADOS DA SESSÃO
    // ============================================================

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
            return $this->modo;
        }

        // ✅ PRIORIDADE 2: Empresa
        if ($this->empresa) {
            $this->modo = $this->empresa->modo ?? 'colectivo';
            return $this->modo;
        }

        // ✅ FALLBACK: Padrão
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

    // ============================================================
    // HELPERS: Resolver Models conforme o modo
    // ============================================================

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    protected function compraModel()
    {
        return $this->isColectivo() ? new SharedCompra() : new TenantCompra();
    }

    protected function itemCompraModel()
    {
        return $this->isColectivo() ? new SharedCompraItem() : new TenantCompraItem();
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
    }

    protected function serieFiscalModel()
    {
        return $this->isColectivo() ? new SharedSerieFiscal() : new TenantSerieFiscal();
    }

    protected function logFiscalModel()
    {
        return $this->isColectivo() ? new SharedLogFiscal() : new TenantLogFiscal();
    }

    protected function apuramentoIvaModel()
    {
        return $this->isColectivo() ? new SharedApuramentoIva() : new TenantApuramentoIva();
    }

    /**
     * Aplica o scope do tenant (apenas para colectivo)
     */
    protected function aplicarScopeTenant($query)
    {
        if ($this->isColectivo()) {
            return $query->doTenant();
        }
        return $query;
    }

    /**
     * Adiciona tenant_id (apenas para colectivo)
     */
    protected function adicionarTenantId(array $dados): array
    {
        if ($this->isColectivo() && $this->empresa) {
            $dados['tenant_id'] = $this->empresa->id;
        }
        return $dados;
    }

    // ============================================================
    // VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
    // ============================================================

    /**
     * Verifica se o usuário tem acesso ao tenant atual e preenche as propriedades
     */
    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[CompraService] Verificando acesso');

        // 1️⃣ Obtém a empresa do binding (definido pelo ResolveTenant)
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('CompraService: Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // 2️⃣ Atualiza o modo com base na empresa
        $this->modo = $this->empresa->modo ?? 'colectivo';

        // 3️⃣ Obtém o utilizador autenticado no guard landlord
        $landlordUser = Auth::guard('landlord')->user();

        // 4️⃣ Fallback: tenta obter da sessão
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('CompraService: Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 5️⃣ Busca o TenantUser correspondente ao email do landlordUser
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('CompraService: Utilizador tenant não encontrado para o email ' . $landlordUser->email);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[CompraService] Acesso verificado com sucesso', [
            'modo' => $this->modo,
            'user_id' => $tenantUser->id,
            'email' => $tenantUser->email,
        ]);
    }

    /**
     * Busca o utilizador no banco correto (Shared ou Tenant)
     */
    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        } else {
            return SharedUser::on('shared')
                ->where('email', $email)
                ->where('tenant_id', $empresa->id)
                ->first();
        }
    }

    /**
     * Obtém o user_id do tenantUser
     */
    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    // ============================================================
    // QUERY HELPERS
    // ============================================================

    /**
     * Query com scope para Compras
     */
    protected function queryCompras()
    {
        if ($this->isColectivo()) {
            return SharedCompra::doTenant();
        }
        return TenantCompra::query();
    }

    /**
     * Query com scope para Itens de Compra
     */
    protected function queryItensCompra()
    {
        if ($this->isColectivo()) {
            return SharedCompraItem::doTenant();
        }
        return TenantCompraItem::query();
    }

    /**
     * Query com scope para Produtos
     */
    protected function queryProdutos()
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    /**
     * Busca produto com scope
     */
    protected function buscarProduto(string $produtoId): object
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('id', $produtoId)->firstOrFail();
        }
        return TenantProduto::where('id', $produtoId)->firstOrFail();
    }

    // ============================================================
    // MÉTODOS PÚBLICOS
    // ============================================================

    /**
     * Criar nova compra com itens, cálculos fiscais, logs e apuramento IVA
     */
    public function criarCompra(array $dados)
    {
        $this->verificarAcessoUsuario();

        $modo = $this->getModo();
        Log::info('[CompraService] Criando compra', [
            'modo' => $modo,
            'fornecedor_id' => $dados['fornecedor_id'] ?? null,
        ]);

        return DB::transaction(function () use ($dados) {
            $userId = $this->getUserId();

            // ============================================
            // 1️⃣ OBTER SÉRIE FISCAL ATIVA
            // ============================================
            $serieModel = $this->serieFiscalModel();
            
            $query = $serieModel->where('tipo_documento', 'fatura')->where('ativo', 1);
            
            // Aplicar scope do tenant (apenas para colectivo)
            if ($this->isColectivo()) {
                $query = $query->doTenant();
            }
            
            $serie = $query->first();
            
            if (!$serie) {
                throw new \Exception("Nenhuma série fiscal ativa encontrada para faturas.");
            }

            $numero = $serie->numero_atual + 1;
            $numero_documento = $serie->serie . '-' . str_pad($numero, 4, '0', STR_PAD_LEFT);

            // Atualizar número da série
            $serie->update(['numero_atual' => $numero]);

            // ============================================
            // 2️⃣ CRIAR A COMPRA
            // ============================================
            $dadosCompra = [
                'id' => Str::uuid(),
                'user_id' => $userId,
                'fornecedor_id' => $dados['fornecedor_id'],
                'data_compra' => $dados['data'] ?? now()->toDateString(),
                'tipo_documento' => $dados['tipo_documento'] ?? 'fatura',
                'numero_documento' => $numero_documento,
                'data_emissao' => $dados['data_emissao'] ?? $dados['data'] ?? now()->toDateString(),
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_fatura' => 0,
                'validado_fiscalmente' => $dados['validado_fiscalmente'] ?? true,
                'subtotal' => 0,
                'desconto' => $dados['desconto'] ?? 0,
                'status' => 'pendente',
            ];

            // Adicionar tenant_id (apenas para colectivo)
            if ($this->isColectivo()) {
                $dadosCompra['tenant_id'] = $this->empresa->id;
            }

            // Usar o modelo correto
            $compraModel = $this->compraModel();
            $compra = $compraModel->create($dadosCompra);

            $total = 0;
            $total_base_tributavel = 0;
            $total_iva = 0;

            foreach ($dados['itens'] as $item) {
                // ============================================
                // 3️⃣ BUSCAR PRODUTO
                // ============================================
                $produto = $this->buscarProduto($item['produto_id']);

                $subtotal = $item['quantidade'] * $item['preco_compra'];

                // Cálculo fiscal do item
                $taxaIva = $produto->taxa_iva ?? 14.00;
                $base_tributavel_item = round($subtotal / (1 + ($taxaIva / 100)), 2);
                $valor_iva_item = round($subtotal - $base_tributavel_item, 2);

                // ============================================
                // 4️⃣ CRIAR ITEM DA COMPRA
                // ============================================
                $dadosItem = [
                    'id' => Str::uuid(),
                    'compra_id' => $compra->id,
                    'produto_id' => $produto->id,
                    'quantidade' => $item['quantidade'],
                    'preco_compra' => $item['preco_compra'],
                    'subtotal' => $subtotal,
                    'base_tributavel' => $base_tributavel_item,
                    'valor_iva' => $valor_iva_item,
                    'percentual_iva' => $taxaIva,
                    'tipo_iva' => $produto->tipo_iva ?? 'normal',
                    'total_item' => $subtotal,
                ];

                // Adicionar tenant_id (apenas para colectivo)
                if ($this->isColectivo()) {
                    $dadosItem['tenant_id'] = $this->empresa->id;
                }

                $itemModel = $this->itemCompraModel();
                $itemModel->create($dadosItem);

                // ============================================
                // 5️⃣ ATUALIZAR STOCK
                // ============================================
                $produto->estoque_atual += $item['quantidade'];
                $produto->save();

                // Acumulando totais
                $total += $subtotal;
                $total_base_tributavel += $base_tributavel_item;
                $total_iva += $valor_iva_item;
            }

            // ============================================
            // 6️⃣ ATUALIZAR COMPRA COM TOTAIS
            // ============================================
            $compra->update([
                'subtotal' => $total,
                'base_tributavel' => $total_base_tributavel,
                'total_iva' => $total_iva,
                'total_fatura' => $total,
                'total' => $total,
            ]);

            // ============================================
            // 7️⃣ REGISTRAR LOG FISCAL
            // ============================================
            $dadosLog = [
                'id' => Str::uuid(),
                'user_id' => $userId,
                'fatura_id' => $compra->id,
                'acao' => 'criação',
                'status' => 'sucesso',
                'descricao' => "Compra criada com valor total {$total} e número {$numero_documento}",
            ];

            if ($this->isColectivo()) {
                $dadosLog['tenant_id'] = $this->empresa->id;
            }

            $logModel = $this->logFiscalModel();
            $logModel->create($dadosLog);

            // ============================================
            // 8️⃣ ATUALIZAR APURAMENTO DE IVA
            // ============================================
            $periodo = Carbon::parse($compra->data_compra)->startOfMonth()->toDateString();

            $apuramentoModel = $this->apuramentoIvaModel();
            if ($this->isColectivo()) {
                $apuramento = $apuramentoModel->firstOrCreate(
                    [
                        'tenant_id' => $this->empresa->id,
                        'periodo_inicio' => $periodo
                    ],
                    ['total_base_tributavel' => 0, 'total_iva' => 0, 'total_faturas' => 0]
                );
            } else {
                $apuramento = $apuramentoModel->firstOrCreate(
                    ['periodo_inicio' => $periodo],
                    ['total_base_tributavel' => 0, 'total_iva' => 0, 'total_faturas' => 0]
                );
            }

            $apuramento->increment('total_base_tributavel', $total_base_tributavel);
            $apuramento->increment('total_iva', $total_iva);
            $apuramento->increment('total_faturas', 1);

            // ============================================
            // 9️⃣ LOG DE SUCESSO
            // ============================================
            Log::info('[CompraService] Compra criada com sucesso', [
                'compra_id' => $compra->id,
                'empresa_id' => $this->empresa->id,
                'modo' => $this->getModo(),
                'user_id' => $userId,
                'total' => $total,
            ]);

            // ============================================
            // 🔟 RETORNAR COMPRA COM RELACIONAMENTOS
            // ============================================
            return $this->buscarCompra($compra->id);
        });
    }

    /**
     * Listar todas as compras do tenant atual
     */
    public function listarCompras()
    {
        $this->verificarAcessoUsuario();

        Log::info('[CompraService] Listando compras', [
            'modo' => $this->getModo(),
        ]);

        return $this->queryCompras()
            ->with('itens.produto', 'fornecedor', 'user')
            ->orderBy('data_compra', 'desc')
            ->get();
    }

    /**
     * Buscar compra específica do tenant atual
     */
    public function buscarCompra(string $compraId)
    {
        $this->verificarAcessoUsuario();

        Log::debug('[CompraService] Buscando compra', [
            'compra_id' => $compraId,
            'modo' => $this->getModo(),
        ]);

        if ($this->isColectivo()) {
            return SharedCompra::doTenant()
                ->with('itens.produto', 'fornecedor', 'user')
                ->where('id', $compraId)
                ->firstOrFail();
        } else {
            return TenantCompra::with('itens.produto', 'fornecedor', 'user')
                ->where('id', $compraId)
                ->firstOrFail();
        }
    }

    /**
     * Cancelar compra e reverter stock
     */
    public function cancelarCompra(string $compraId)
    {
        $this->verificarAcessoUsuario();

        Log::info('[CompraService] Cancelando compra', [
            'compra_id' => $compraId,
            'modo' => $this->getModo(),
        ]);

        return DB::transaction(function () use ($compraId) {
            // Buscar compra
            if ($this->isColectivo()) {
                $compra = SharedCompra::doTenant()->where('id', $compraId)->firstOrFail();
                $items = SharedCompraItem::doTenant()->where('compra_id', $compraId)->get();
            } else {
                $compra = TenantCompra::where('id', $compraId)->firstOrFail();
                $items = TenantCompraItem::where('compra_id', $compraId)->get();
            }

            // Verificar se já está cancelada
            if ($compra->status === 'cancelada') {
                throw new \Exception('Compra já está cancelada.');
            }

            // Reverter stock
            foreach ($items as $item) {
                if ($this->isColectivo()) {
                    $produto = SharedProduto::doTenant()->where('id', $item->produto_id)->first();
                } else {
                    $produto = TenantProduto::where('id', $item->produto_id)->first();
                }
                
                if ($produto) {
                    $produto->estoque_atual -= $item->quantidade;
                    $produto->save();
                }
            }

            // Atualizar status
            $compra->status = 'cancelada';
            $compra->save();

            // Log
            $dadosLog = [
                'id' => Str::uuid(),
                'user_id' => $this->getUserId(),
                'fatura_id' => $compra->id,
                'acao' => 'cancelamento',
                'status' => 'sucesso',
                'descricao' => "Compra cancelada. Documento: {$compra->numero_documento}",
            ];

            if ($this->isColectivo()) {
                $dadosLog['tenant_id'] = $this->empresa->id;
                SharedLogFiscal::create($dadosLog);
            } else {
                TenantLogFiscal::create($dadosLog);
            }

            Log::info('[CompraService] Compra cancelada', [
                'compra_id' => $compra->id,
                'empresa_id' => $this->empresa->id,
                'modo' => $this->getModo(),
                'user_id' => $this->getUserId(),
            ]);

            return $compra->fresh();
        });
    }

    /**
     * Resumo de compras por período
     */
    public function resumoCompras(?string $dataInicio = null, ?string $dataFim = null)
    {
        $this->verificarAcessoUsuario();

        $dataInicio = $dataInicio ?? now()->startOfMonth()->toDateString();
        $dataFim = $dataFim ?? now()->endOfMonth()->toDateString();

        Log::debug('[CompraService] Resumo de compras', [
            'modo' => $this->getModo(),
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
        ]);

        if ($this->isColectivo()) {
            return SharedCompra::doTenant()
                ->whereBetween('data_compra', [$dataInicio, $dataFim])
                ->select(
                    DB::raw('COUNT(*) as total_compras'),
                    DB::raw('SUM(total_fatura) as valor_total'),
                    DB::raw('SUM(total_iva) as total_iva'),
                    DB::raw('AVG(total_fatura) as media_compra')
                )
                ->first();
        } else {
            return TenantCompra::whereBetween('data_compra', [$dataInicio, $dataFim])
                ->select(
                    DB::raw('COUNT(*) as total_compras'),
                    DB::raw('SUM(total_fatura) as valor_total'),
                    DB::raw('SUM(total_iva) as total_iva'),
                    DB::raw('AVG(total_fatura) as media_compra')
                )
                ->first();
        }
    }

    /**
     * Estatísticas de compras
     */
    public function estatisticas(?string $ano = null, ?string $mes = null)
    {
        $this->verificarAcessoUsuario();

        $ano = $ano ?? now()->year;
        $mes = $mes ?? now()->month;

        Log::debug('[CompraService] Estatísticas de compras', [
            'modo' => $this->getModo(),
            'ano' => $ano,
            'mes' => $mes,
        ]);

        $query = $this->queryCompras()
            ->whereYear('data_compra', $ano)
            ->whereMonth('data_compra', $mes);

        return [
            'total_compras' => (clone $query)->count(),
            'valor_total' => (float) (clone $query)->sum('total_fatura'),
            'total_iva' => (float) (clone $query)->sum('total_iva'),
            'media_compra' => (float) (clone $query)->avg('total_fatura') ?? 0,
            'por_fornecedor' => $this->estatisticasPorFornecedor($ano, $mes),
            'modo' => $this->getModo(),
        ];
    }

    /**
     * Estatísticas por fornecedor
     */
    protected function estatisticasPorFornecedor(string $ano, string $mes): array
    {
        $query = $this->queryCompras()
            ->whereYear('data_compra', $ano)
            ->whereMonth('data_compra', $mes)
            ->with('fornecedor')
            ->get();

        $porFornecedor = [];
        foreach ($query as $compra) {
            $nome = $compra->fornecedor?->nome ?? 'N/A';
            if (!isset($porFornecedor[$nome])) {
                $porFornecedor[$nome] = [
                    'total' => 0,
                    'quantidade' => 0,
                ];
            }
            $porFornecedor[$nome]['total'] += $compra->total_fatura;
            $porFornecedor[$nome]['quantidade']++;
        }

        return $porFornecedor;
    }
}