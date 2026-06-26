<?php

namespace App\Services;

use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\ItemDocumentoFiscal as SharedItemDocumentoFiscal;
use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\SerieFiscal as SharedSerieFiscal;
use App\Models\Shared\Produto as SharedProduto;

use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\ItemDocumentoFiscal as TenantItemDocumentoFiscal;
use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\SerieFiscal as TenantSerieFiscal;
use App\Models\Tenant\Produto as TenantProduto;

use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * DocumentoFiscalService
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 * 
 * ✅ NUMERAÇÃO NO FORMATO ANGOLANO:
 * - {TIPO} {SERIE}/{ANO}/{NUMERO}
 * - Exemplo: FR LOJA1/2026/0542
 */
class DocumentoFiscalService
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    /* =====================================================================
     | TAXAS DE IVA ANGOLA
     | ================================================================== */

    public const IVA_GERAL    = 14.0;
    public const IVA_REDUZIDA = 5.0;
    public const IVA_ZERO     = 0.0;

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
     | CONSTRUTOR
     | ================================================================== */

    public function __construct()
    {
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        
        Log::debug('[DocumentoFiscalService] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);

        // ✅ Criar séries padrão se não existirem
        $this->criarSeriesPadrao();
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

    protected function documentoFiscalModel()
    {
        return $this->isColectivo() ? new SharedDocumentoFiscal() : new TenantDocumentoFiscal();
    }

    protected function itemDocumentoFiscalModel()
    {
        return $this->isColectivo() ? new SharedItemDocumentoFiscal() : new TenantItemDocumentoFiscal();
    }

    protected function vendaModel()
    {
        return $this->isColectivo() ? new SharedVenda() : new TenantVenda();
    }

    protected function serieFiscalModel()
    {
        return $this->isColectivo() ? new SharedSerieFiscal() : new TenantSerieFiscal();
    }

    protected function produtoModel()
    {
        return $this->isColectivo() ? new SharedProduto() : new TenantProduto();
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

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO
     | ================================================================== */

    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[DocumentoFiscalService] Verificando acesso');

        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[DocumentoFiscalService] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        $this->modo = $this->empresa->modo ?? 'colectivo';

        $landlordUser = Auth::guard('landlord')->user();

        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[DocumentoFiscalService] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[DocumentoFiscalService] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[DocumentoFiscalService] Acesso verificado com sucesso', [
            'modo' => $this->modo,
            'user_id' => $tenantUser->id,
            'email' => $tenantUser->email,
        ]);
    }

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

    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    protected function obterEmpresa()
    {
        if ($this->isColectivo()) {
            return $this->empresa;
        }
        return Empresa::firstOrFail();
    }

    /* =====================================================================
     | EMISSÃO DE DOCUMENTOS
     | ================================================================== */

    public function emitirDocumento(array $dados)
    {
        $this->verificarAcessoUsuario();

        $tipo = $dados['tipo_documento'];

        if (!isset($this->configuracoesTipo[$tipo])) {
            throw new \InvalidArgumentException("Tipo de documento {$tipo} não suportado.");
        }

        $config = $this->configuracoesTipo[$tipo];

        Log::info("Iniciando emissão de {$config['nome']}", [
            'tipo' => $tipo,
            'modo' => $this->getModo(),
            'empresa_id' => $this->empresa->id,
        ]);

        return DB::transaction(function () use ($dados, $tipo, $config) {

            $empresa = $this->obterEmpresa();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

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
            $totais = $this->processarItens($dados['itens'] ?? [], $aplicaIva, $regime);
            $clienteId = $this->resolverCliente($dados, $tipo);

            $documentoData = [
                'id' => Str::uuid(),
                'user_id' => $this->getUserId(),
                'venda_id' => $dados['venda_id'] ?? null,
                'fatura_id' => $dados['fatura_id'] ?? null,
                'serie' => $serieFiscal->serie ?? 'A',
                'numero' => $numero,
                'numero_documento' => $numeroDocumento,
                'tipo_documento' => $tipo,
                'data_emissao' => $dataEmissao,
                'hora_emissao' => $horaEmissao,
                'data_vencimento' => $dataVencimento,
                'base_tributavel' => $totais['base'],
                'total_iva' => $totais['iva'],
                'total_retencao' => $totais['retencao'],
                'total_liquido' => $totais['liquido'],
                'estado' => $config['estado_inicial'],
                'motivo' => $dados['motivo'] ?? null,
                'hash_fiscal' => null,
                'rsa_assinatura' => null,
                'rsa_versao_chave' => null,
                'qr_code' => null,
                'hash_anterior' => null,
                'referencia_externa' => $dados['referencia_externa'] ?? null,
            ];

            if ($this->isColectivo()) {
                $documentoData['tenant_id'] = $this->empresa->id;
            }

            if ($clienteId) {
                $documentoData['cliente_id'] = $clienteId;
            }

            if (!$clienteId && !empty($dados['cliente_nome'])) {
                $documentoData['cliente_nome'] = $dados['cliente_nome'];
                if (!empty($dados['cliente_nif'])) {
                    $documentoData['cliente_nif'] = $dados['cliente_nif'];
                }
            }

            if ($this->isColectivo()) {
                $documento = SharedDocumentoFiscal::create($documentoData);
            } else {
                $documento = TenantDocumentoFiscal::create($documentoData);
            }

            if (!empty($totais['itens_processados'])) {
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

            if ($tipo === 'FT' && !empty($dados['dados_pagamento'])) {
                $this->gerarRecibo($documento, [
                    'valor' => $dados['dados_pagamento']['valor'],
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'data_pagamento' => $dados['dados_pagamento']['data'] ?? $agoraAngola->toDateString(),
                    'referencia' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            if ($tipo === 'FR' && !empty($dados['dados_pagamento'])) {
                $documento->update([
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'referencia_pagamento' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            Log::info("{$config['nome']} emitida com sucesso", [
                'documento_id' => $documento->id,
                'numero' => $numeroDocumento,
                'modo' => $this->getModo(),
            ]);

            return $documento->load('itens.produto', 'cliente', 'documentoOrigem');
        });
    }

    /* =====================================================================
     | RECIBO
     | ================================================================== */

    public function gerarRecibo($documentoOrigem, array $dados)
    {
        $this->verificarAcessoUsuario();

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FA', 'FP'])) {
            throw new \InvalidArgumentException(
                "Apenas FT, FA e FP podem receber recibo. Tipo atual: {$documentoOrigem->tipo_documento}"
            );
        }

        if (in_array($documentoOrigem->estado, ['cancelado'])) {
            throw new \InvalidArgumentException("Documento cancelado. Não é possível gerar recibo.");
        }

        if ($documentoOrigem->tipo_documento === 'FT' && $documentoOrigem->estado === 'paga') {
            throw new \InvalidArgumentException("Fatura já está totalmente paga.");
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
                'id' => Str::uuid(),
                'user_id' => $this->getUserId(),
                'fatura_id' => $documentoOrigem->id,
                'serie' => $serieFiscal->serie ?? 'A',
                'numero' => $numero,
                'numero_documento' => $numeroDocumento,
                'tipo_documento' => 'RC',
                'data_emissao' => $dados['data_pagamento'] ?? $agoraAngola->toDateString(),
                'hora_emissao' => $agoraAngola->toTimeString(),
                'data_vencimento' => null,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retencao' => 0,
                'total_liquido' => $valorPago,
                'estado' => 'paga',
                'metodo_pagamento' => $dados['metodo_pagamento'] ?? 'dinheiro',
                'referencia_pagamento' => $dados['referencia'] ?? null,
                'hash_fiscal' => null,
                'rsa_assinatura' => null,
                'rsa_versao_chave' => null,
                'qr_code' => null,
                'hash_anterior' => null,
            ];

            if ($this->isColectivo()) {
                $reciboData['tenant_id'] = $this->empresa->id;
            }

            if ($documentoOrigem->cliente_id) {
                $reciboData['cliente_id'] = $documentoOrigem->cliente_id;
            } elseif ($documentoOrigem->cliente_nome) {
                $reciboData['cliente_nome'] = $documentoOrigem->cliente_nome;
                $reciboData['cliente_nif'] = $documentoOrigem->cliente_nif ?? null;
            }

            if ($this->isColectivo()) {
                $recibo = SharedDocumentoFiscal::create($reciboData);
            } else {
                $recibo = TenantDocumentoFiscal::create($reciboData);
            }

            if ($documentoOrigem->tipo_documento !== 'FP') {
                $this->actualizarEstadoAposPagamento($documentoOrigem, $valorPago);
            }

            $recibo->update(['hash_fiscal' => $this->gerarHashSimples($recibo)]);

            Log::info('Recibo gerado com sucesso', [
                'recibo_id' => $recibo->id,
                'numero' => $recibo->numero_documento,
                'modo' => $this->getModo(),
                'valor' => $valorPago,
            ]);

            return $recibo->load('documentoOrigem', 'cliente');
        });
    }

    /* =====================================================================
     | NOTA DE CRÉDITO (CORRIGIDO)
     | ================================================================== */

    public function criarNotaCredito($documentoOrigem, array $dados)
    {
        $this->verificarAcessoUsuario();

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FR'])) {
            throw new \InvalidArgumentException(
                "Nota de Crédito só pode ser gerada a partir de Fatura (FT) ou Fatura-Recibo (FR). " .
                "Tipo atual: {$documentoOrigem->tipo_documento}"
            );
        }

        if ($documentoOrigem->estado === 'cancelado') {
            throw new \InvalidArgumentException(
                "Não é possível gerar Nota de Crédito de documento cancelado: {$documentoOrigem->numero_documento}"
            );
        }

        $notasCredito = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()->where('fatura_id', $documentoOrigem->id)->where('tipo_documento', 'NC')->where('estado', '!=', 'cancelado')
            : TenantDocumentoFiscal::where('fatura_id', $documentoOrigem->id)->where('tipo_documento', 'NC')->where('estado', '!=', 'cancelado');

        $totalJaCreditado = $notasCredito->sum('total_liquido');

        $empresa = $this->obterEmpresa();
        $totais = $this->processarItens($dados['itens'], $empresa->sujeito_iva, $empresa->regime_fiscal);
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
        $dados['fatura_id'] = $documentoOrigem->id;
        $dados['motivo'] = $dados['motivo'] ?? "Correção de {$documentoOrigem->numero_documento}";

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

    public function criarNotaDebito($documentoOrigem, array $dados)
    {
        $this->verificarAcessoUsuario();

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FR'])) {
            throw new \InvalidArgumentException(
                "Nota de Débito só pode ser gerada a partir de Fatura (FT). " .
                "Tipo atual: {$documentoOrigem->tipo_documento}"
            );
        }

        if ($documentoOrigem->estado === 'cancelado') {
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
        $dados['fatura_id'] = $documentoOrigem->id;
        $dados['motivo'] = $dados['motivo'] ?? "Débito adicional referente à {$documentoOrigem->numero_documento}";

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

    public function vincularAdiantamento($adiantamento, $fatura, float $valor): array
    {
        $this->verificarAcessoUsuario();

        if ($adiantamento->tipo_documento !== 'FA') {
            throw new \InvalidArgumentException(
                "Apenas FA pode ser vinculada. Tipo: {$adiantamento->tipo_documento}"
            );
        }

        if ($adiantamento->estado !== 'emitido') {
            throw new \InvalidArgumentException(
                "Adiantamento deve estar emitido. Estado: {$adiantamento->estado}"
            );
        }

        if ($fatura->tipo_documento !== 'FT') {
            throw new \InvalidArgumentException(
                "Apenas FT pode receber adiantamentos. Tipo: {$fatura->tipo_documento}"
            );
        }

        if (in_array($fatura->estado, ['cancelado', 'paga'])) {
            throw new \InvalidArgumentException(
                "Factura cancelada ou paga não pode receber adiantamentos. Estado: {$fatura->estado}"
            );
        }

        $clienteAdiantamento = $adiantamento->cliente_id ?? $adiantamento->cliente_nome;
        $clienteFatura = $fatura->cliente_id ?? $fatura->cliente_nome;

        if ($clienteAdiantamento && $clienteFatura && $clienteAdiantamento !== $clienteFatura) {
            throw new \InvalidArgumentException('O cliente do adiantamento não coincide com o cliente da fatura.');
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
                'id' => Str::uuid(),
                'adiantamento_id' => $adiantamento->id,
                'fatura_id' => $fatura->id,
                'valor_utilizado' => $valor,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $totalUtilizado = DB::table('adiantamento_fatura')
                ->where('adiantamento_id', $adiantamento->id)
                ->sum('valor_utilizado');

            if ((float) $totalUtilizado >= (float) $adiantamento->total_liquido) {
                $adiantamento->update(['estado' => 'paga']);
            }

            $totalAdiantamentos = DB::table('adiantamento_fatura')
                ->where('fatura_id', $fatura->id)
                ->sum('valor_utilizado');

            $totalPago = $this->calcularTotalPago($fatura);
            $valorPendente = (float) $fatura->total_liquido - $totalPago - (float) $totalAdiantamentos;

            if ($valorPendente <= 0.01) {
                $fatura->update(['estado' => 'paga']);
            } else {
                $fatura->update(['estado' => 'parcialmente_paga']);
            }

            Log::info('Adiantamento vinculado', [
                'adiantamento_id' => $adiantamento->id,
                'fatura_id' => $fatura->id,
                'valor' => $valor,
                'modo' => $this->getModo(),
            ]);

            return [
                'adiantamento' => $adiantamento->fresh(),
                'fatura' => $fatura->fresh(),
            ];
        });
    }

    /* =====================================================================
     | CANCELAMENTO
     | ================================================================== */

    public function cancelarDocumento($documento, string $motivo)
    {
        $this->verificarAcessoUsuario();

        if ($documento->estado === 'cancelado') {
            throw new \InvalidArgumentException('Documento já se encontra cancelado.');
        }

        $derivadosActivos = $documento->documentosDerivados()
            ->where('estado', '!=', 'cancelado')
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
                    ->where('estado', '!=', 'cancelado')
                    ->count();

                if ($recibosActivos > 0) {
                    throw new \InvalidArgumentException(
                        "Documento possui {$recibosActivos} recibos activos. Cancele-os primeiro."
                    );
                }
            }

            $agoraAngola = Carbon::now('Africa/Luanda');

            $documento->update([
                'estado' => 'cancelado',
                'motivo_cancelamento' => $motivo,
                'data_cancelamento' => $agoraAngola,
                'user_cancelamento_id' => $this->getUserId(),
            ]);

            Log::info('Documento cancelado', [
                'id' => $documento->id,
                'numero' => $documento->numero_documento,
                'motivo' => $motivo,
                'modo' => $this->getModo(),
            ]);

            return $documento->fresh();
        });
    }

    /* =====================================================================
     | LISTAGEM E BUSCA
     | ================================================================== */

    public function listarDocumentos(array $filtros = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $this->verificarAcessoUsuario();

        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant()->with('cliente', 'venda', 'itens.produto');
        } else {
            $query = TenantDocumentoFiscal::with('cliente', 'venda', 'itens.produto');
        }

        if (!empty($filtros['tipo'])) {
            $query->where('tipo_documento', $filtros['tipo']);
        }

        if (!empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }

        if (!empty($filtros['cliente_id'])) {
            $query->where('cliente_id', $filtros['cliente_id']);
        }

        if (!empty($filtros['cliente_nome'])) {
            $query->where('cliente_nome', 'like', '%' . $filtros['cliente_nome'] . '%');
        }

        if (!empty($filtros['data_inicio'])) {
            $query->whereDate('data_emissao', '>=', $filtros['data_inicio']);
        }

        if (!empty($filtros['data_fim'])) {
            $query->whereDate('data_emissao', '<=', $filtros['data_fim']);
        }

        if (!empty($filtros['apenas_vendas'])) {
            $query->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
        }

        if (!empty($filtros['apenas_nao_vendas'])) {
            $query->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']);
        }

        if (!empty($filtros['pendentes'])) {
            $query->where('tipo_documento', 'FT')
                ->whereIn('estado', ['emitido', 'parcialmente_paga']);
        }

        if (!empty($filtros['adiantamentos_pendentes'])) {
            $query->where('tipo_documento', 'FA')
                ->where('estado', 'emitido');
        }

        if (!empty($filtros['proformas_pendentes'])) {
            $query->where('tipo_documento', 'FP')
                ->where('estado', 'emitido');
        }

        return $query->orderBy('data_emissao', 'desc')
            ->orderBy('hora_emissao', 'desc')
            ->orderBy('numero', 'desc')
            ->paginate($filtros['per_page'] ?? 20);
    }

    public function buscarDocumento(string $documentoId)
    {
        $this->verificarAcessoUsuario();

        if (!Str::isUuid($documentoId)) {
            throw new \InvalidArgumentException('ID inválido. Formato UUID esperado.');
        }

        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant()
                ->with([
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
                ])
                ->findOrFail($documentoId);
        }

        return TenantDocumentoFiscal::with([
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

    public function calcularValorPendente($documento): float
    {
        if (!in_array($documento->tipo_documento, ['FT', 'FA'])) {
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
        $this->verificarAcessoUsuario();

        $agoraAngola = Carbon::now('Africa/Luanda');

        if ($this->isColectivo()) {
            $expirados = SharedDocumentoFiscal::doTenant()
                ->where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->where('data_vencimento', '<', $agoraAngola->toDateString())
                ->get();
        } else {
            $expirados = TenantDocumentoFiscal::where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->where('data_vencimento', '<', $agoraAngola->toDateString())
                ->get();
        }

        $count = 0;

        foreach ($expirados as $fa) {
            $fa->update(['estado' => 'expirado']);
            $count++;

            Log::info('Adiantamento expirado', [
                'id' => $fa->id,
                'numero' => $fa->numero_documento,
                'data_vencimento' => $fa->data_vencimento,
                'modo' => $this->getModo(),
            ]);
        }

        return $count;
    }

    /* =====================================================================
     | DASHBOARD
     | ================================================================== */

    public function dadosDashboard(): array
    {
        $this->verificarAcessoUsuario();

        $hoje = Carbon::now('Africa/Luanda');
        $inicioMes = $hoje->copy()->startOfMonth();

        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant();
        } else {
            $query = TenantDocumentoFiscal::query();
        }

        $faturasPendentes = (clone $query)
            ->where('tipo_documento', 'FT')
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->with('recibos')
            ->get();

        $totalPendenteCobranca = $faturasPendentes->sum(function ($fatura) {
            return $this->calcularValorPendente($fatura);
        });

        return [
            'faturas_emitidas_mes' => (clone $query)
                ->where('tipo_documento', 'FT')
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
                ->count(),

            'faturas_pendentes' => $faturasPendentes->count(),

            'total_pendente_cobranca' => round($totalPendenteCobranca, 2),

            'adiantamentos_pendentes_pagamento' => (clone $query)
                ->where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->count(),

            'proformas_em_aberto' => (clone $query)
                ->where('tipo_documento', 'FP')
                ->where('estado', 'emitido')
                ->count(),

            'documentos_cancelados_mes' => (clone $query)
                ->where('estado', 'cancelado')
                ->whereBetween('data_cancelamento', [$inicioMes, $hoje])
                ->count(),

            'total_vendas_mes' => (clone $query)
                ->whereIn('tipo_documento', ['FT', 'FR', 'RC'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
                ->count(),

            'total_nao_vendas_mes' => (clone $query)
                ->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
                ->count(),
        ];
    }

    public function evolucaoMensal(int $ano): array
    {
        $this->verificarAcessoUsuario();

        $evolucao = [];

        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant();
        } else {
            $query = TenantDocumentoFiscal::query();
        }

        for ($mes = 1; $mes <= 12; $mes++) {
            $inicioMes = Carbon::create($ano, $mes, 1, 0, 0, 0, 'Africa/Luanda')->startOfMonth();
            $fimMes = Carbon::create($ano, $mes, 1, 0, 0, 0, 'Africa/Luanda')->endOfMonth();

            $totalVendas = (clone $query)
                ->whereIn('tipo_documento', ['FT', 'FR', 'RC'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $fimMes->toDateString()])
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido');

            $totalNaoVendas = (clone $query)
                ->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $fimMes->toDateString()])
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido');

            $totalPendente = (clone $query)
                ->whereIn('tipo_documento', ['FT', 'FA'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->where('data_emissao', '<=', $fimMes->toDateString())
                ->sum('total_liquido');

            $evolucao[] = [
                'mes' => $mes,
                'ano' => $ano,
                'total_vendas' => (float) $totalVendas,
                'total_nao_vendas' => (float) $totalNaoVendas,
                'total_pendente' => (float) $totalPendente,
            ];
        }

        return $evolucao;
    }

    public function estatisticasPagamentos(): array
    {
        $this->verificarAcessoUsuario();

        $hoje = Carbon::now('Africa/Luanda');
        $inicioMes = $hoje->copy()->startOfMonth();
        $inicioAno = $hoje->copy()->startOfYear();

        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant();
        } else {
            $query = TenantDocumentoFiscal::query();
        }

        $porMetodo = (clone $query)
            ->whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', 'cancelado')
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
                    'total' => (float) $item->total,
                ]];
            });

        $totalPagoMes = (clone $query)
            ->whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', 'cancelado')
            ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
            ->sum('total_liquido');

        $totalPagoAno = (clone $query)
            ->whereIn('tipo_documento', ['RC', 'FR'])
            ->where('estado', '!=', 'cancelado')
            ->whereBetween('data_emissao', [$inicioAno->toDateString(), $hoje->toDateString()])
            ->sum('total_liquido');

        return [
            'por_metodo' => $porMetodo,
            'total_pago_mes' => (float) $totalPagoMes,
            'total_pago_ano' => (float) $totalPagoAno,
            'media_por_dia_mes' => (float) round($totalPagoMes / max($hoje->day, 1), 2),
        ];
    }

    public function alertasPendentes(): array
    {
        $this->verificarAcessoUsuario();

        $hoje = Carbon::now('Africa/Luanda');

        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant();
        } else {
            $query = TenantDocumentoFiscal::query();
        }

        $adiantamentosVencidos = (clone $query)
            ->where('tipo_documento', 'FA')
            ->where('estado', 'emitido')
            ->whereNotNull('data_vencimento')
            ->where('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get();

        $faturasComAdiantamentosPendentes = (clone $query)
            ->where('tipo_documento', 'FT')
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->whereHas('faturasAdiantamento', function ($q) {
                $q->whereIn('estado', ['emitido', 'parcialmente_paga']);
            })
            ->with(['cliente', 'faturasAdiantamento' => function ($q) {
                $q->whereIn('estado', ['emitido', 'parcialmente_paga']);
            }])
            ->orderByDesc('data_emissao')
            ->limit(10)
            ->get();

        $proformasEmAberto = (clone $query)
            ->where('tipo_documento', 'FP')
            ->where('estado', 'emitido')
            ->where('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
            ->with('cliente')
            ->orderBy('data_emissao')
            ->limit(10)
            ->get();

        $faturasVencidas = (clone $query)
            ->where('tipo_documento', 'FT')
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->whereNotNull('data_vencimento')
            ->where('data_vencimento', '<', $hoje->toDateString())
            ->with('cliente')
            ->orderBy('data_vencimento')
            ->limit(10)
            ->get();

        return [
            'adiantamentos_vencidos' => [
                'total' => (clone $query)
                    ->where('tipo_documento', 'FA')
                    ->where('estado', 'emitido')
                    ->whereNotNull('data_vencimento')
                    ->where('data_vencimento', '<', $hoje->toDateString())
                    ->count(),
                'items' => $adiantamentosVencidos,
            ],

            'faturas_com_adiantamentos_pendentes' => [
                'total' => (clone $query)
                    ->where('tipo_documento', 'FT')
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->whereHas('faturasAdiantamento', function ($q) {
                        $q->whereIn('estado', ['emitido', 'parcialmente_paga']);
                    })
                    ->count(),
                'items' => $faturasComAdiantamentosPendentes,
            ],

            'proformas_em_aberto' => [
                'total' => (clone $query)
                    ->where('tipo_documento', 'FP')
                    ->where('estado', 'emitido')
                    ->where('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
                    ->count(),
                'items' => $proformasEmAberto,
            ],

            'faturas_vencidas' => [
                'total' => (clone $query)
                    ->where('tipo_documento', 'FT')
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
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

    public function dadosParaPdf($documento): array
    {
        $this->verificarAcessoUsuario();

        $documento->loadMissing([
            'itens.produto',
            'cliente',
            'documentoOrigem',
            'recibos',
            'user',
        ]);

        $empresa = $this->obterEmpresa();

        return [
            'empresa' => [
                'nome' => $empresa->nome,
                'nif' => $empresa->nif,
                'morada' => $empresa->endereco ?? $empresa->morada ?? '',
                'telefone' => $empresa->telefone,
                'email' => $empresa->email,
                'logo' => $empresa->logo,
                'certificado_agt' => $empresa->software_validation_number ?? null,
            ],
            'documento' => $documento,
            'itens' => $documento->itens,
            'cliente' => [
                'nome' => $documento->cliente_nome ?? $documento->cliente?->nome ?? 'Consumidor Final',
                'nif' => $documento->cliente_nif ?? $documento->cliente?->nif ?? '',
            ],
            'qr_code' => $documento->qr_code,
        ];
    }

    public function dadosParaExcel(array $filtros = []): array
    {
        $this->verificarAcessoUsuario();

        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant()->with('cliente', 'itens');
        } else {
            $query = TenantDocumentoFiscal::with('cliente', 'itens');
        }

        $documentos = (clone $query)
            ->when(!empty($filtros['tipo']), fn($q) => $q->where('tipo_documento', $filtros['tipo']))
            ->when(!empty($filtros['estado']), fn($q) => $q->where('estado', $filtros['estado']))
            ->when(!empty($filtros['cliente_id']), fn($q) => $q->where('cliente_id', $filtros['cliente_id']))
            ->when(!empty($filtros['data_inicio']), fn($q) => $q->whereDate('data_emissao', '>=', $filtros['data_inicio']))
            ->when(!empty($filtros['data_fim']), fn($q) => $q->whereDate('data_emissao', '<=', $filtros['data_fim']))
            ->when(!empty($filtros['apenas_vendas']), fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR', 'RC']))
            ->when(!empty($filtros['apenas_nao_vendas']), fn($q) => $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']))
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

        $linhas = $documentos->map(function ($doc) {
            return [
                $doc->numero_documento,
                $doc->tipo_documento_nome ?? $doc->tipo_documento,
                $doc->data_emissao ? date('d/m/Y', strtotime($doc->data_emissao)) : '',
                $doc->hora_emissao ?? '',
                $doc->cliente_nome ?? $doc->cliente?->nome ?? 'Consumidor Final',
                $doc->cliente_nif ?? $doc->cliente?->nif ?? '',
                number_format((float) $doc->base_tributavel, 2, ',', '.'),
                number_format((float) $doc->total_iva, 2, ',', '.'),
                number_format((float) $doc->total_retencao, 2, ',', '.'),
                number_format((float) $doc->total_liquido, 2, ',', '.'),
                $doc->estado,
                $doc->metodo_pagamento ?? '—',
                $doc->data_vencimento ? date('d/m/Y', strtotime($doc->data_vencimento)) : '—',
                $doc->hash_fiscal ?? '—',
            ];
        })->toArray();

        return [
            'cabecalho' => $cabecalho,
            'linhas' => $linhas,
            'documentos' => $documentos,
        ];
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — ASSINATURA RSA (AGT)
     | ================================================================== */

    private function assinarDocumento($documento): void
    {
        $chavePrivadaPath = config('agt.rsa_private_key_path');
        $versaoChave = (int) config('agt.rsa_key_version', 1);
        $numeroCertificado = config('agt.numero_certificado', '');

        if (!$chavePrivadaPath || !file_exists($chavePrivadaPath)) {
            Log::error('[AGT] Chave privada RSA não encontrada', [
                'path' => $chavePrivadaPath,
            ]);
            throw new \RuntimeException(
                'Chave privada RSA para assinatura AGT não configurada.'
            );
        }

        $chavePrivada = openssl_pkey_get_private(file_get_contents($chavePrivadaPath));

        if (!$chavePrivada) {
            throw new \RuntimeException('Erro ao carregar chave privada RSA: ' . openssl_error_string());
        }

        $hashAnterior = '0';

        if ($this->isColectivo()) {
            $hashAnterior = SharedDocumentoFiscal::doTenant()
                ->where('serie', $documento->serie)
                ->where('tipo_documento', $documento->tipo_documento)
                ->where('numero', '<', $documento->numero)
                ->whereNotNull('hash_fiscal')
                ->orderByDesc('numero')
                ->value('hash_fiscal') ?? '0';
        } else {
            $hashAnterior = TenantDocumentoFiscal::where('serie', $documento->serie)
                ->where('tipo_documento', $documento->tipo_documento)
                ->where('numero', '<', $documento->numero)
                ->whereNotNull('hash_fiscal')
                ->orderByDesc('numero')
                ->value('hash_fiscal') ?? '0';
        }

        $dadosAssinatura = implode(';', [
            $documento->data_emissao,
            $documento->hora_emissao,
            $documento->numero_documento,
            number_format((float) $documento->total_liquido, 2, '.', ''),
            $hashAnterior,
        ]);

        $assinatura = '';
        $resultado = openssl_sign($dadosAssinatura, $assinatura, $chavePrivada, OPENSSL_ALGO_SHA256);

        if (!$resultado) {
            throw new \RuntimeException('Erro ao gerar assinatura RSA: ' . openssl_error_string());
        }

        $hashFiscal = hash('sha256', $dadosAssinatura);
        $qrCodeConteudo = $this->gerarConteudoQrCode($documento, $hashFiscal, $numeroCertificado);

        $documento->update([
            'hash_fiscal' => $hashFiscal,
            'rsa_assinatura' => base64_encode($assinatura),
            'rsa_versao_chave' => $versaoChave,
            'hash_anterior' => $hashAnterior,
            'qr_code' => $qrCodeConteudo,
        ]);

        Log::info('[AGT] Documento assinado com sucesso', [
            'documento_id' => $documento->id,
            'numero' => $documento->numero_documento,
            'rsa_versao_chave' => $versaoChave,
        ]);
    }

    private function gerarConteudoQrCode($documento, string $hashFiscal, string $numeroCertificado): string
    {
        $empresa = $this->obterEmpresa();
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

    private function gerarHashSimples($documento): string
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
     | MÉTODOS PRIVADOS — PROCESSAMENTO DE ITENS
     | ================================================================== */

    private function processarItens(array $itens, bool $aplicaIva, string $regime): array
    {
        $totalBase = 0.0;
        $totalIva = 0.0;
        $totalRetencao = 0.0;
        $itensProcessados = [];

        foreach ($itens as $item) {
            $produto = !empty($item['produto_id'])
                ? $this->buscarProduto($item['produto_id'])
                : null;

            $quantidade = (float) ($item['quantidade'] ?? 1);
            $precoUnitario = (float) ($item['preco_venda'] ?? $item['preco_unitario'] ?? 0);
            $desconto = (float) ($item['desconto'] ?? 0);
            $taxaDesconto = (float) ($item['taxa_desconto'] ?? 0);

            $valorBruto = $quantidade * $precoUnitario;

            if ($taxaDesconto > 0) {
                $desconto += $valorBruto * $taxaDesconto / 100;
            }

            $desconto = min($desconto, $valorBruto);
            $baseTributavel = max($valorBruto - $desconto, 0.0);

            $taxaIva = 0.0;
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

                    if ($taxaIva === 0.0 || $taxaIva === self::IVA_ZERO) {
                        $codigoIsencao = $item['codigo_isencao'] ?? $produto?->codigo_isencao ?? 'M00';
                        $motivoIsencao = self::MOTIVOS_ISENCAO[$codigoIsencao] ?? 'Isento';
                    }
                } elseif ($regime === 'simplificado') {
                    $taxaIva = self::IVA_ZERO;
                    $codigoIsencao = 'M01';
                    $motivoIsencao = self::MOTIVOS_ISENCAO['M01'];
                }
            } else {
                $codigoIsencao = $item['codigo_isencao'] ?? 'M06';
                $motivoIsencao = self::MOTIVOS_ISENCAO[$codigoIsencao];
            }

            $valorIva = round($baseTributavel * $taxaIva / 100, 2);

            $valorRetencao = 0.0;
            $taxaRetencaoUsada = 0.0;

            $isProdutoServico = $produto && $produto->tipo === 'servico';
            $temRetencao = $isProdutoServico && $aplicaIva;

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
                'produto_id' => $item['produto_id'] ?? null,
                'descricao' => $item['descricao'] ?? $produto?->nome ?? 'Item',
                'quantidade' => $quantidade,
                'preco_unitario' => $precoUnitario,
                'valor_bruto' => round($valorBruto, 2),
                'desconto' => round($desconto, 2),
                'taxa_desconto' => $taxaDesconto,
                'base_tributavel' => round($baseTributavel, 2),
                'taxa_iva' => $taxaIva,
                'valor_iva' => $valorIva,
                'codigo_isencao' => $codigoIsencao,
                'motivo_isencao' => $motivoIsencao,
                'taxa_retencao' => $taxaRetencaoUsada,
                'valor_retencao' => $valorRetencao,
                'total_linha' => $totalLinha,
            ];

            $totalBase += $baseTributavel;
            $totalIva += $valorIva;
            $totalRetencao += $valorRetencao;
        }

        $totalBase = round($totalBase, 2);
        $totalIva = round($totalIva, 2);
        $totalRetencao = round($totalRetencao, 2);
        $totalLiquido = round($totalBase + $totalIva - $totalRetencao, 2);

        $somaLinhas = round(array_sum(array_column($itensProcessados, 'total_linha')), 2);
        if (abs($somaLinhas - $totalLiquido) > 0.01) {
            Log::warning('[AGT] Diferença de arredondamento ajustada', [
                'soma_linhas' => $somaLinhas,
                'total_calculado' => $totalLiquido,
            ]);
            $totalLiquido = $somaLinhas;
        }

        return [
            'base' => $totalBase,
            'iva' => $totalIva,
            'retencao' => $totalRetencao,
            'liquido' => $totalLiquido,
            'itens_processados' => $itensProcessados,
        ];
    }

    private function buscarProduto(string $produtoId)
    {
        if ($this->isColectivo()) {
            return SharedProduto::doTenant()->where('id', $produtoId)->first();
        }
        return TenantProduto::where('id', $produtoId)->first();
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — NUMERAÇÃO ✅
     | ================================================================== */

    /**
     * Gera um novo número de documento fiscal no formato angolano
     * 
     * FORMATO: {TIPO} {SERIE}/{ANO}/{NUMERO}
     * Exemplo: FR LOJA1/2026/0542
     */
    private function gerarNumeroDocumento(string $tipo): array
    {
        // 1️⃣ OBTER SÉRIE FISCAL ATIVA
        $serieFiscal = $this->obterSerieFiscal($tipo);

        // 2️⃣ GARANTIR QUE É UM OBJETO VÁLIDO
        if (!$serieFiscal || !isset($serieFiscal->serie)) {
            Log::warning('[DocumentoFiscalService] Série fiscal inválida, usando fallback', [
                'tipo' => $tipo,
                'modo' => $this->getModo(),
            ]);

            $serieFiscal = (object) [
                'serie' => 'LOJA1',
                'digitos' => 4,
                'ultimo_numero' => 0,
                'ano' => now()->year,
                'id' => null,
            ];
        }

        // 3️⃣ LOCK PARA EVITAR CONFLITOS
        if (isset($serieFiscal->id) && $serieFiscal->id) {
            if ($this->isColectivo()) {
                DB::table('series_fiscais')
                    ->where('id', $serieFiscal->id)
                    ->where('tenant_id', $this->empresa->id)
                    ->lockForUpdate()
                    ->first();
            } else {
                DB::table('series_fiscais')
                    ->where('id', $serieFiscal->id)
                    ->lockForUpdate()
                    ->first();
            }
        }

        // 4️⃣ DETERMINAR O ANO
        $ano = $serieFiscal->ano ?? now()->year;

        // 5️⃣ BUSCAR ÚLTIMO NÚMERO REAL PARA O ANO
        $ultimoNumeroReal = $this->buscarUltimoNumeroPorAno($tipo, $serieFiscal->serie, $ano);

        // 6️⃣ CALCULAR PRÓXIMO NÚMERO
        $numeroBase = max($serieFiscal->ultimo_numero ?? 0, $ultimoNumeroReal ?? 0);
        $numero = $numeroBase + 1;

        // 7️⃣ GERAR NÚMERO DO DOCUMENTO NO FORMATO ANGOLANO
        $digitos = $serieFiscal->digitos ?? 4;
        $numeroComPadding = str_pad($numero, $digitos, '0', STR_PAD_LEFT);
        $numeroDocumento = $tipo . ' ' . $serieFiscal->serie . '/' . $ano . '/' . $numeroComPadding;

        // 8️⃣ VERIFICAR SE NÚMERO JÁ EXISTE (SEGURANÇA)
        $tentativas = 0;
        while ($this->numeroDocumentoExiste($tipo, $numeroDocumento) && $tentativas < 100) {
            $tentativas++;
            $numero++;
            $numeroComPadding = str_pad($numero, $digitos, '0', STR_PAD_LEFT);
            $numeroDocumento = $tipo . ' ' . $serieFiscal->serie . '/' . $ano . '/' . $numeroComPadding;
        }

        if ($tentativas >= 100) {
            throw new \RuntimeException(
                "Não foi possível gerar número único para {$tipo} após 100 tentativas."
            );
        }

        // 9️⃣ ATUALIZAR O NÚMERO DA SÉRIE
        if (isset($serieFiscal->id) && $serieFiscal->id) {
            $serieFiscal->update([
                'ultimo_numero' => $numero,
                'ano' => $ano,
            ]);
        }

        Log::info('[DocumentoFiscalService] Número de documento gerado', [
            'tipo' => $tipo,
            'numero_documento' => $numeroDocumento,
            'serie' => $serieFiscal->serie,
            'ano' => $ano,
            'numero' => $numero,
            'modo' => $this->getModo(),
        ]);

        return [$numero, $numeroDocumento, $serieFiscal];
    }

    /**
     * Obtém a série fiscal ativa para um tipo de documento
     * ✅ CORRIGIDO: Verifica se a coluna tenant_id existe antes de usar
     */
    private function obterSerieFiscal(string $tipo): object
    {
        $model = $this->serieFiscalModel();

        // Buscar série ativa para o ano atual
        $query = $model->where('tipo_documento', $tipo)
            ->where('ativa', true)
            ->where(function ($q) {
                $q->whereNull('ano')->orWhere('ano', now()->year);
            })
            ->orderByDesc('padrao');

        // ⚠️ SÓ APLICAR TENANT SE A TABELA TIVER tenant_id
        if ($this->isColectivo() && $this->colunaExiste('series_fiscais', 'tenant_id')) {
            $query = $query->where('tenant_id', $this->empresa->id);
        }

        $serie = $query->first();

        // Se não encontrar, criar uma série padrão
        if (!$serie) {
            Log::warning('[DocumentoFiscalService] Nenhuma série fiscal ativa, criando padrão', [
                'tipo' => $tipo,
                'modo' => $this->getModo(),
            ]);

            $nomeEmpresa = $this->empresa->nome ?? 'LOJA';
            $serieNome = $this->gerarSerieNome($nomeEmpresa);

            $dadosSerie = [
                'id' => Str::uuid(),
                'tipo_documento' => $tipo,
                'serie' => $serieNome,
                'digitos' => 4,
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'ano' => now()->year,
                'valida_agt' => !in_array($tipo, ['FP', 'RC']),
            ];

            // ⚠️ SÓ ADICIONAR tenant_id SE A TABELA TIVER A COLUNA
            if ($this->isColectivo() && $this->colunaExiste('series_fiscais', 'tenant_id')) {
                $dadosSerie['tenant_id'] = $this->empresa->id;
            }

            $model = $this->serieFiscalModel();
            $serie = $model->create($dadosSerie);

            Log::info('[DocumentoFiscalService] Série fiscal criada automaticamente', [
                'tipo' => $tipo,
                'serie' => $serie->serie,
                'id' => $serie->id,
                'modo' => $this->getModo(),
            ]);
        }

        return $serie;
    }

    /**
     * Busca o último número real utilizado para um ano específico
     */
    private function buscarUltimoNumeroPorAno(string $tipo, string $serie, int $ano): int
    {
        if ($this->isColectivo()) {
            $doc = SharedDocumentoFiscal::doTenant()
                ->where('tipo_documento', $tipo)
                ->where('numero_documento', 'like', $tipo . ' ' . $serie . '/' . $ano . '/%')
                ->orderBy('numero', 'desc')
                ->first();
        } else {
            $doc = TenantDocumentoFiscal::where('tipo_documento', $tipo)
                ->where('numero_documento', 'like', $tipo . ' ' . $serie . '/' . $ano . '/%')
                ->orderBy('numero', 'desc')
                ->first();
        }

        return $doc ? (int) $doc->numero : 0;
    }

    /**
     * Verifica se o número do documento já existe
     */
    private function numeroDocumentoExiste(string $tipo, string $numeroDocumento): bool
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant()
                ->where('numero_documento', $numeroDocumento)
                ->exists();
        }

        return TenantDocumentoFiscal::where('numero_documento', $numeroDocumento)
            ->exists();
    }

    /**
     * Gera um nome de série a partir do nome da empresa
     */
    private function gerarSerieNome(string $nomeEmpresa): string
    {
        // Remover acentos e caracteres especiais
        $nome = preg_replace('/[^a-zA-Z0-9]/', '', $nomeEmpresa);
        // Limitar a 10 caracteres e colocar em maiúsculas
        return strtoupper(substr($nome, 0, 10));
    }

    /**
     * Verifica se uma coluna existe numa tabela
     */
    private function colunaExiste(string $tabela, string $coluna): bool
    {
        try {
            return Schema::connection($this->isColectivo() ? 'shared' : 'tenant')
                ->hasColumn($tabela, $coluna);
        } catch (\Exception $e) {
            return false;
        }
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — SÉRIES PADRÃO
     | ================================================================== */

    /**
     * Cria séries fiscais padrão se não existirem
     */
  private function criarSeriesPadrao(): void
    {
        $tenantId = $this->empresa?->id;
        $modo = $this->getModo();

        Log::debug('[DocumentoFiscalService] Verificando séries padrão', [
            'tenant_id' => $tenantId,
            'modo' => $modo,
        ]);

        // ✅ VERIFICAR SE EXISTE SÉRIE PARA O TENANT ATUAL
        $query = $this->serieFiscalModel()->where('padrao', true);

        // Se tiver tenant_id, filtrar por ele
        if ($this->isColectivo() && $tenantId && $this->colunaExiste('series_fiscais', 'tenant_id')) {
            $query = $query->where('tenant_id', $tenantId);
        }

        $existeSerie = $query->exists();

        // Se já existir séries, não criar novamente
        if ($existeSerie) {
            Log::debug('[DocumentoFiscalService] Séries fiscais já existem', [
                'tenant_id' => $tenantId,
                'modo' => $modo,
            ]);
            return;
        }

        $tipos = ['FT', 'FR', 'FP', 'FA', 'NC', 'ND', 'RC', 'FRt'];
        $ano = now()->year;
        $nomeEmpresa = $this->empresa->nome ?? 'LOJA';
        $serieNome = $this->gerarSerieNome($nomeEmpresa);

        Log::info('[DocumentoFiscalService] Criando séries fiscais padrão', [
            'tenant_id' => $tenantId,
            'tipos' => $tipos,
            'serie' => $serieNome,
            'ano' => $ano,
            'modo' => $modo,
        ]);

        $temTenantId = $this->isColectivo() && $tenantId && $this->colunaExiste('series_fiscais', 'tenant_id');

        foreach ($tipos as $tipo) {
            // ✅ VERIFICAR SE JÁ EXISTE PARA ESTE TIPO + TENANT
            $queryExiste = $this->serieFiscalModel()
                ->where('tipo_documento', $tipo)
                ->where('serie', $serieNome)
                ->where('ano', $ano);

            if ($temTenantId) {
                $queryExiste = $queryExiste->where('tenant_id', $tenantId);
            }

            if ($queryExiste->exists()) {
                continue;
            }

            // ✅ CRIAR SÉRIE
            $dados = [
                'id' => Str::uuid(),
                'tipo_documento' => $tipo,
                'serie' => $serieNome,
                'descricao' => "Série padrão — " . $this->getTipoDocumentoNome($tipo),
                'digitos' => 4,
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'ano' => $ano,
                'valida_agt' => !in_array($tipo, ['FP', 'RC']),
            ];

            // ✅ ADICIONAR TENANT_ID SE EXISTIR
            if ($temTenantId) {
                $dados['tenant_id'] = $tenantId;
            }

            $this->serieFiscalModel()->create($dados);

            Log::info('[DocumentoFiscalService] Série padrão criada', [
                'tenant_id' => $tenantId,
                'tipo' => $tipo,
                'serie' => $serieNome,
                'ano' => $ano,
                'modo' => $modo,
            ]);
        }
    }

    /**
     * Obtém o nome do tipo de documento em português
     */
    private function getTipoDocumentoNome(string $tipo): string
    {
        $map = [
            'FT' => 'Faturas',
            'FR' => 'Faturas-Recibo',
            'FP' => 'Faturas Proforma',
            'FA' => 'Faturas de Adiantamento',
            'NC' => 'Notas de Crédito',
            'ND' => 'Notas de Débito',
            'RC' => 'Recibos',
            'FRt' => 'Faturas de Retificação',
        ];

        return $map[$tipo] ?? $tipo;
    }

    /* =====================================================================
     | MÉTODOS PRIVADOS — AUXILIARES
     | ================================================================== */

    private function validarDadosPorTipo(array $dados, string $tipo, array $config): void
    {
        if ($config['exige_cliente']) {
            $temCliente = !empty($dados['cliente_id']) || !empty($dados['cliente_nome']);

            if (!$temCliente) {
                throw new \InvalidArgumentException(
                    "{$config['nome']} requer um cliente (cadastrado ou avulso)."
                );
            }
        }

        $regras = [
            'FR' => ['dados_pagamento'],
            'FA' => ['data_vencimento'],
            'RC' => ['fatura_id'],
            'NC' => ['fatura_id', 'motivo', 'itens'],
            'ND' => ['fatura_id', 'itens'],
            'FRt' => ['fatura_id', 'motivo'],
        ];

        foreach ($regras[$tipo] ?? [] as $campo) {
            if (empty($dados[$campo])) {
                throw new \InvalidArgumentException(
                    "Campo '{$campo}' é obrigatório para {$config['nome']}."
                );
            }
        }

        if (!empty($dados['fatura_id'])) {
            if ($this->isColectivo()) {
                $origem = SharedDocumentoFiscal::doTenant()->find($dados['fatura_id']);
            } else {
                $origem = TenantDocumentoFiscal::find($dados['fatura_id']);
            }

            if (!$origem) {
                throw new \InvalidArgumentException('Documento de origem não encontrado.');
            }

            if (in_array($tipo, ['NC', 'ND']) && !in_array($origem->tipo_documento, ['FT', 'FR'])) {
                throw new \InvalidArgumentException(
                    "NC/ND só podem ser geradas a partir de FT ou FR. Tipo: {$origem->tipo_documento}"
                );
            }

            if ($tipo === 'RC' && !in_array($origem->tipo_documento, ['FT', 'FA', 'FP'])) {
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

        if (!empty($dados['data_vencimento'])) {
            return $dados['data_vencimento'];
        }

        $prazoDias = match ($tipo) {
            'FR' => 0,
            'ND' => 15,
            default => 30,
        };

        return $dataEmissao->copy()->addDays($prazoDias)->toDateString();
    }

    private function criarItensDocumento($documento, array $itensProcessados): void
    {
        $agora = Carbon::now('Africa/Luanda');

        $registos = array_map(function ($item, $index) use ($documento, $agora) {
            $data = [
                'id' => (string) Str::uuid(),
                'documento_fiscal_id' => $documento->id,
                'produto_id' => $item['produto_id'],
                'descricao' => $item['descricao'],
                'quantidade' => $item['quantidade'],
                'preco_unitario' => $item['preco_unitario'],
                'base_tributavel' => $item['base_tributavel'],
                'taxa_iva' => $item['taxa_iva'],
                'valor_iva' => $item['valor_iva'],
                'codigo_isencao' => $item['codigo_isencao'],
                'motivo_isencao' => $item['motivo_isencao'],
                'valor_retencao' => $item['valor_retencao'],
                'taxa_retencao' => $item['taxa_retencao'],
                'desconto' => $item['desconto'],
                'total_linha' => $item['total_linha'],
                'ordem' => $index + 1,
                'created_at' => $agora,
                'updated_at' => $agora,
            ];

            if ($this->isColectivo()) {
                $data['tenant_id'] = $this->empresa->id;
            }

            return $data;
        }, $itensProcessados, array_keys($itensProcessados));

        if ($this->isColectivo()) {
            SharedItemDocumentoFiscal::insert($registos);
        } else {
            TenantItemDocumentoFiscal::insert($registos);
        }
    }

    private function executarAcoesPosCriacao($documento, array $dados, string $tipo): void
    {
        if ($this->configuracoesTipo[$tipo]['afeta_stock']) {
            $this->movimentarStock($documento, 'saida');
        }

        if ($tipo === 'NC') {
            $this->movimentarStock($documento, 'entrada');
        }

        if (in_array($tipo, ['FT', 'FR']) && !empty($dados['venda_id'])) {
            $this->atualizarVenda($dados['venda_id'], $documento);
        }
    }

    private function calcularTotalPago($documento): float
    {
        if ($this->isColectivo()) {
            return (float) SharedDocumentoFiscal::doTenant()
                ->where('fatura_id', $documento->id)
                ->where('tipo_documento', 'RC')
                ->where('estado', '!=', 'cancelado')
                ->sum('total_liquido');
        }

        return (float) TenantDocumentoFiscal::where('fatura_id', $documento->id)
            ->where('tipo_documento', 'RC')
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido');
    }

    private function actualizarEstadoAposPagamento($documentoOrigem, float $valorPago): void
    {
        $totalPagoActualizado = $this->calcularTotalPago($documentoOrigem) + $valorPago;

        if ($documentoOrigem->tipo_documento === 'FA') {
            $estadoFinal = $totalPagoActualizado >= (float) $documentoOrigem->total_liquido
                ? 'paga'
                : 'parcialmente_paga';
        } else {
            $totalAdiantamentos = (float) DB::table('adiantamento_fatura')
                ->where('fatura_id', $documentoOrigem->id)
                ->sum('valor_utilizado');

            $estadoFinal = ($totalPagoActualizado + $totalAdiantamentos) >= (float) $documentoOrigem->total_liquido
                ? 'paga'
                : 'parcialmente_paga';
        }

        $documentoOrigem->update(['estado' => $estadoFinal]);
    }

    private function resolverCliente(array $dados, string $tipo): ?string
    {
        if (!empty($dados['cliente_id'])) {
            return $dados['cliente_id'];
        }

        if (!empty($dados['cliente_nome'])) {
            return null;
        }

        if (!empty($dados['fatura_id'])) {
            if ($this->isColectivo()) {
                $origem = SharedDocumentoFiscal::doTenant()->find($dados['fatura_id']);
            } else {
                $origem = TenantDocumentoFiscal::find($dados['fatura_id']);
            }
            if ($origem) {
                return $origem->cliente_id;
            }
        }

        if (!empty($dados['venda_id'])) {
            if ($this->isColectivo()) {
                $venda = SharedVenda::doTenant()->find($dados['venda_id']);
            } else {
                $venda = TenantVenda::find($dados['venda_id']);
            }
            if ($venda) {
                return $venda->cliente_id;
            }
        }

        return null;
    }

    private function herdarCliente(array &$dados, $origem): void
    {
        if ($origem->cliente_id) {
            $dados['cliente_id'] = $origem->cliente_id;
        } elseif ($origem->cliente_nome) {
            $dados['cliente_nome'] = $origem->cliente_nome;
            $dados['cliente_nif'] = $origem->cliente_nif ?? null;
        }
    }

    private function movimentarStock($documento, string $tipoMovimento): void
    {
        Log::info("Movimentação de stock: {$tipoMovimento}", [
            'documento' => $documento->numero_documento ?? $documento->id,
            'tipo' => $documento->tipo_documento ?? 'unknown',
            'modo' => $this->getModo(),
        ]);
    }

    private function reverterStock($documento): void
    {
        $tipoReversao = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';
        $this->movimentarStock($documento, $tipoReversao);
    }

    private function atualizarVenda(string $vendaId, $documento): void
    {
        try {
            if ($this->isColectivo()) {
                $venda = SharedVenda::doTenant()->find($vendaId);
            } else {
                $venda = TenantVenda::find($vendaId);
            }

            if ($venda) {
                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status' => 'faturada',
                    'tipo_documento_fiscal' => $documento->tipo_documento,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Erro ao actualizar venda', [
                'venda_id' => $vendaId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}