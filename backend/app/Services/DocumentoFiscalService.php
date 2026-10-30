<?php

namespace App\Services;

use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Shared\ItemDocumentoFiscal as SharedItemDocumentoFiscal;
use App\Models\Shared\Venda as SharedVenda;
use App\Models\Shared\SerieFiscal as SharedSerieFiscal;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Shared\FacturaGlobalAnexo as SharedFacturaGlobalAnexo;

use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Tenant\ItemDocumentoFiscal as TenantItemDocumentoFiscal;
use App\Models\Tenant\Venda as TenantVenda;
use App\Models\Tenant\SerieFiscal as TenantSerieFiscal;
use App\Models\Tenant\Produto as TenantProduto;
use App\Models\Tenant\FacturaGlobalAnexo as TenantFacturaGlobalAnexo;

use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * DocumentoFiscalService
 *
 * Suporta modos 'colectivo' (shared DB) e 'singular' (tenant DB).
 * Conforme DP 71/25 (Regime Jurídico das Facturas).
 */
class DocumentoFiscalService
{
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

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
            'nome'                  => 'Factura Proforma',
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
            'nome'                  => 'Factura de Retificação (depreciado)',
            'afeta_stock'           => false,
            'eh_venda'              => false,
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => false,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
        ],

        // ─── DP 71/25 ─────────────────────────────────────────
        'FG' => [
            'nome'                  => 'Factura Global',
            'afeta_stock'           => true,
            'eh_venda'              => true,
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => true,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
            'exige_periodo_ref'     => true,
            'exige_anexos'          => true,
        ],
        'FGR' => [
            'nome'                  => 'Factura Global-Recibo',
            'afeta_stock'           => true,
            'eh_venda'              => true,
            'gera_recibo'           => false,
            'estado_inicial'        => 'paga',
            'exige_cliente'         => true,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
            'exige_periodo_ref'     => true,
            'exige_anexos'          => true,
        ],
        'TV' => [
            'nome'                  => 'Talão de Venda',
            'afeta_stock'           => true,
            'eh_venda'              => true,
            'gera_recibo'           => false,
            'estado_inicial'        => 'paga',
            'exige_cliente'         => false,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => false,
        ],
        'FGEN' => [
            'nome'                  => 'Factura Genérica',
            'afeta_stock'           => false,
            'eh_venda'              => true,
            'gera_recibo'           => false,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => true,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
            'sectorial'             => 'financeiro',
        ],
        'AC' => [
            'nome'                  => 'Aviso de Cobrança',
            'afeta_stock'           => false,
            'eh_venda'              => false,
            'gera_recibo'           => true,
            'estado_inicial'        => 'emitido',
            'exige_cliente'         => true,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
            'sectorial'             => 'segurador',
        ],
        'ACR' => [
            'nome'                  => 'Aviso de Cobrança-Recibo',
            'afeta_stock'           => false,
            'eh_venda'              => false,
            'gera_recibo'           => false,
            'estado_inicial'        => 'paga',
            'exige_cliente'         => true,
            'aceita_pagamento'      => false,
            'pode_ter_adiantamento' => false,
            'requer_assinatura'     => true,
            'sectorial'             => 'segurador',
        ],
    ];

    /* =====================================================================
     | CONSTRUTOR E HELPERS
     | ================================================================== */

    public function __construct()
    {
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
    }

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

    protected function facturaGlobalAnexoModel()
    {
        return $this->isColectivo() ? new SharedFacturaGlobalAnexo() : new TenantFacturaGlobalAnexo();
    }

    protected function verificarAcessoUsuario(): void
    {
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
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
            throw new \Exception('Usuário não autenticado.', 401);
        }

        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }
        $this->tenantUser = $tenantUser;
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

    protected function taxaIvaVigente(): float
    {
        return $this->obterEmpresa()->taxaIvaVigente();
    }

    /* =====================================================================
     | EMISSÃO
     | ================================================================== */

    public function emitirDocumento(array $dados)
    {
        $this->verificarAcessoUsuario();
        $this->criarSeriesPadrao();

        $tipo = $dados['tipo_documento'];

        if (!isset($this->configuracoesTipo[$tipo])) {
            throw new \InvalidArgumentException("Tipo de documento {$tipo} não suportado.");
        }

        if ($tipo === 'FRt') {
            throw new \InvalidArgumentException(
                "Factura de Retificação (FRt) foi descontinuada pelo DP 71/25. Use Nota de Crédito (NC)."
            );
        }

        $config = $this->configuracoesTipo[$tipo];
        $autoFaturacao = !empty($dados['auto_faturacao']);

        return DB::transaction(function () use ($dados, $tipo, $config, $autoFaturacao) {

            $empresa = $this->obterEmpresa();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            $this->validarDadosPorTipo($dados, $tipo, $config);

            if ($tipo === 'NC') {
                $this->validarNotaCredito($dados);
            }
            if ($tipo === 'ND') {
                $this->validarNotaDebito($dados);
            }

            [$numero, $numeroDocumento, $serieFiscal] = $this->gerarNumeroDocumento($tipo, $autoFaturacao);

            $agoraAngola = Carbon::now('Africa/Luanda');
            $dataEmissao = $agoraAngola->toDateString();
            $horaEmissao = $agoraAngola->toTimeString();

            $dataVencimento = $this->calcularDataVencimento($tipo, $dados, $agoraAngola);
            $taxaRetencaoAuto = null;
            if ($autoFaturacao) {
                $taxaRetencaoAuto = (float) config(
                    ($dados['tipo_bem'] ?? 'bem') === 'servico'
                        ? 'agt.retencao_servicos'
                        : 'agt.retencao_bens',
                    6.5
                );
            }

            $totais = $this->processarItens($dados['itens'] ?? [], $aplicaIva, $regime, $taxaRetencaoAuto);
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
                'nome_banco' => $dados['nome_banco'] ?? null,
                'iban' => $dados['iban'] ?? null,
                'numero_conta' => $dados['numero_conta'] ?? null,
                // DP 71/25
                'periodo_referencia_inicio' => $dados['periodo_referencia_inicio'] ?? null,
                'periodo_referencia_fim' => $dados['periodo_referencia_fim'] ?? null,
                'auto_faturacao' => $autoFaturacao,
                'motivo_auto_faturacao' => $dados['motivo_auto_faturacao'] ?? null,
                'software_certificacao_numero' => ($empresa->software_validation_number ?? config('agt.numero_certificado')) ?: null,
                'print_count' => 0,
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

            // Anexos da Factura Global (Art. 8.º n.º 2)
            if (in_array($tipo, ['FG', 'FGR'], true) && !empty($dados['anexos'])) {
                $this->criarAnexosFacturaGlobal($documento, $dados['anexos']);
            }

            $this->executarAcoesPosCriacao($documento, $dados, $tipo);

            if ($config['requer_assinatura']) {
                $this->assinarDocumento($documento);
            } else {
                $documento->update(['hash_fiscal' => $this->gerarHashSimples($documento)]);
            }

            if ($tipo === 'FT' && !empty($dados['dados_pagamento'])) {
                $this->gerarRecibo($documento, [
                    'valor' => $dados['dados_pagamento']['valor'],
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'data_pagamento' => $dados['dados_pagamento']['data'] ?? $agoraAngola->toDateString(),
                    'referencia' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            if (in_array($tipo, ['FR', 'FGR', 'TV'], true) && !empty($dados['dados_pagamento'])) {
                $documento->update([
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'referencia_pagamento' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            return $documento->load('itens.produto', 'cliente', 'documentoOrigem', 'anexos');
        });
    }

    /* =====================================================================
     | RECIBO / NC / ND / ADIANTAMENTO (mantidos)
     | ================================================================== */

    public function gerarRecibo($documentoOrigem, array $dados)
    {
        $this->verificarAcessoUsuario();

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FA', 'FP', 'FG'])) {
            throw new \InvalidArgumentException(
                "Apenas FT, FA, FP e FG podem receber recibo. Tipo atual: {$documentoOrigem->tipo_documento}"
            );
        }

        if (in_array($documentoOrigem->estado, ['cancelado'])) {
            throw new \InvalidArgumentException("Documento cancelado.");
        }

        if ($documentoOrigem->tipo_documento === 'FT' && $documentoOrigem->estado === 'paga') {
            throw new \InvalidArgumentException("Fatura já está totalmente paga.");
        }

        return DB::transaction(function () use ($documentoOrigem, $dados) {
            $valorPago = (float) ($dados['valor'] ?? 0);

            $valorPendente = $documentoOrigem->tipo_documento === 'FP'
                ? (float) $documentoOrigem->total_liquido
                : $this->calcularValorPendente($documentoOrigem);

            if ($valorPago <= 0) {
                throw new \InvalidArgumentException("Valor deve ser maior que zero.");
            }
            if ($valorPago > $valorPendente + 0.01) {
                throw new \InvalidArgumentException("Valor ({$valorPago}) excede pendente ({$valorPendente}).");
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
                'auto_faturacao' => false,
                'print_count' => 0,
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

            $recibo = $this->isColectivo()
                ? SharedDocumentoFiscal::create($reciboData)
                : TenantDocumentoFiscal::create($reciboData);

            if ($documentoOrigem->tipo_documento !== 'FP') {
                $this->actualizarEstadoAposPagamento($documentoOrigem, $valorPago);
            }

            $recibo->update(['hash_fiscal' => $this->gerarHashSimples($recibo)]);

            return $recibo->load('documentoOrigem', 'cliente');
        });
    }

    public function criarNotaCredito($documentoOrigem, array $dados)
    {
        $this->verificarAcessoUsuario();

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FR', 'FG', 'FGR'])) {
            throw new \InvalidArgumentException(
                "Nota de Crédito só pode ser gerada a partir de FT, FR, FG ou FGR. Tipo: {$documentoOrigem->tipo_documento}"
            );
        }

        if ($documentoOrigem->estado === 'cancelado') {
            throw new \InvalidArgumentException("Documento cancelado.");
        }

        $notasCredito = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()->where('fatura_id', $documentoOrigem->id)->where('tipo_documento', 'NC')->where('estado', '!=', 'cancelado')
            : TenantDocumentoFiscal::where('fatura_id', $documentoOrigem->id)->where('tipo_documento', 'NC')->where('estado', '!=', 'cancelado');

        $totalJaCreditado = $notasCredito->sum('total_liquido');

        $empresa = $this->obterEmpresa();
        $totais = $this->processarItens($dados['itens'], $empresa->sujeito_iva, $empresa->regime_fiscal);
        $valorNova = $totais['liquido'];

        $valorMaximo = (float) $documentoOrigem->total_liquido - $totalJaCreditado;
        if ($valorMaximo <= 0.01) {
            throw new \InvalidArgumentException("Saldo disponível: 0.00 Kz");
        }
        if ($valorNova > $valorMaximo + 0.01) {
            throw new \InvalidArgumentException(
                "Valor ({$valorNova}) excede saldo disponível ({$valorMaximo})."
            );
        }
        if (empty($dados['motivo']) || strlen($dados['motivo']) < 10) {
            throw new \InvalidArgumentException("Motivo obrigatório (min. 10 caracteres).");
        }

        $this->validarItensNotaCredito($documentoOrigem, $dados['itens']);

        $dados['tipo_documento'] = 'NC';
        $dados['fatura_id'] = $documentoOrigem->id;
        $dados['motivo'] = $dados['motivo'] ?? "Correção de {$documentoOrigem->numero_documento}";

        $this->herdarCliente($dados, $documentoOrigem);

        $nc = $this->emitirDocumento($dados);
        $this->atualizarEstadoFaturaAposCredito($documentoOrigem);

        return $nc->load('documentoOrigem', 'itens', 'cliente');
    }

    private function validarItensNotaCredito($fatura, array $itensNC): void
    {
        $itensFatura = $fatura->itens()->get();

        foreach ($itensNC as $itemNC) {
            if (!empty($itemNC['produto_id'])) {
                $itemFatura = $itensFatura->firstWhere('produto_id', $itemNC['produto_id']);
                if ($itemFatura) {
                    $quantidadeFaturada = (float) $itemFatura->quantidade;
                    $quantidadeNC = (float) ($itemNC['quantidade'] ?? 0);

                    $totalCreditadoProduto = $fatura->notasCredito()
                        ->where('estado', '!=', 'cancelado')
                        ->whereHas('itens', function ($q) use ($itemNC) {
                            $q->where('produto_id', $itemNC['produto_id']);
                        })
                        ->sum('quantidade');

                    if ($totalCreditadoProduto + $quantidadeNC > $quantidadeFaturada + 0.01) {
                        throw new \InvalidArgumentException(
                            "Quantidade creditada excede a faturada para '{$itemNC['descricao']}'."
                        );
                    }
                }
            }
        }
    }

    public function atualizarEstadoFaturaAposCredito($fatura): void
    {
        $totalJaCreditado = $fatura->notasCredito()
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido');

        $saldo = (float) $fatura->total_liquido - $totalJaCreditado;

        if ($saldo <= 0.01) {
            $fatura->update(['estado' => 'paga']);
        } else {
            $totalPago = $this->calcularTotalPago($fatura);
            if ($totalPago > 0 && $saldo < (float) $fatura->total_liquido) {
                $fatura->update(['estado' => 'parcialmente_paga']);
            }
        }
    }

    public function criarNotaDebito($documentoOrigem, array $dados)
    {
        $this->verificarAcessoUsuario();

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FG'])) {
            throw new \InvalidArgumentException("Nota de Débito só pode ser gerada a partir de FT ou FG.");
        }

        if (in_array($documentoOrigem->estado, ['cancelado', 'expirado'])) {
            throw new \InvalidArgumentException("Documento cancelado ou expirado.");
        }

        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException('Nota de Débito exige itens.');
        }

        $this->validarServicosNotaDebito($dados['itens']);

        $dataEmissaoFatura = Carbon::parse($documentoOrigem->data_emissao, 'Africa/Luanda');
        $prazoMaximo = $dataEmissaoFatura->copy()->addDays(30);
        if (Carbon::now('Africa/Luanda')->gt($prazoMaximo)) {
            throw new \InvalidArgumentException("Prazo de 30 dias excedido.");
        }

        if ($documentoOrigem->estado === 'paga') {
            $this->validarJurosMultaFaturaPaga($dados['itens']);
        }

        $dados['tipo_documento'] = 'ND';
        $dados['fatura_id'] = $documentoOrigem->id;
        $dados['motivo'] = $dados['motivo'] ?? "Débito adicional referente à {$documentoOrigem->numero_documento}";

        $this->herdarCliente($dados, $documentoOrigem);

        $nd = $this->emitirDocumento($dados);
        $this->atualizarEstadoFaturaAposDebito($documentoOrigem, $nd);

        return $nd->load('documentoOrigem', 'itens', 'cliente');
    }

    private function validarServicosNotaDebito(array $itens): void
    {
        foreach ($itens as $item) {
            if (empty($item['descricao']) || strlen($item['descricao']) < 5) {
                throw new \InvalidArgumentException("Cada item deve ter descrição (min. 5 caracteres).");
            }

            if (!empty($item['produto_id'])) {
                $produto = $this->buscarProduto($item['produto_id']);
                if ($produto && $produto->tipo === 'produto') {
                    throw new \InvalidArgumentException(
                        "Nota de Débito só para serviços. Item '{$item['descricao']}' é produto."
                    );
                }
            }
        }
    }

    private function validarJurosMultaFaturaPaga(array $itens): void
    {
        $temJurosOuMulta = false;
        foreach ($itens as $item) {
            $d = strtolower($item['descricao']);
            if (strpos($d, 'juro') !== false || strpos($d, 'multa') !== false || strpos($d, 'penalidade') !== false) {
                $temJurosOuMulta = true;
                break;
            }
        }

        if (!$temJurosOuMulta) {
            throw new \InvalidArgumentException(
                "Fatura paga — ND apenas para juros de mora ou multas contratuais."
            );
        }
    }

    private function validarNotaCredito(array $dados): void
    {
        if (empty($dados['fatura_id'])) {
            throw new \InvalidArgumentException('NC deve referenciar fatura.');
        }
        if (empty($dados['motivo']) || strlen($dados['motivo']) < 10) {
            throw new \InvalidArgumentException('Motivo obrigatório (min. 10 caracteres).');
        }
        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException('NC deve conter itens.');
        }
    }

    private function validarNotaDebito(array $dados): void
    {
        if (empty($dados['fatura_id'])) {
            throw new \InvalidArgumentException('ND deve referenciar fatura.');
        }
        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException('ND deve conter itens.');
        }
    }

    private function atualizarEstadoFaturaAposDebito($fatura, $nd): void
    {
        $novoValor = (float) $fatura->total_liquido + (float) $nd->total_liquido;
        $fatura->update(['total_liquido' => $novoValor]);

        if ($fatura->estado === 'paga') {
            $fatura->update(['estado' => 'parcialmente_paga']);
        }
    }

    public function vincularAdiantamento($adiantamento, $fatura, float $valor): array
    {
        $this->verificarAcessoUsuario();

        if ($adiantamento->tipo_documento !== 'FA') {
            throw new \InvalidArgumentException("Apenas FA pode ser vinculada.");
        }
        if ($adiantamento->estado !== 'emitido') {
            throw new \InvalidArgumentException("Adiantamento deve estar emitido.");
        }
        if ($fatura->tipo_documento !== 'FT') {
            throw new \InvalidArgumentException("Apenas FT pode receber adiantamentos.");
        }
        if (in_array($fatura->estado, ['cancelado', 'paga'])) {
            throw new \InvalidArgumentException("Fatura cancelada ou paga.");
        }
        if ($valor > (float) $adiantamento->total_liquido) {
            throw new \InvalidArgumentException("Valor excede o adiantamento.");
        }
        if ($valor > $this->calcularValorPendente($fatura) + 0.01) {
            throw new \InvalidArgumentException("Valor excede o pendente da fatura.");
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

            $fatura->update([
                'estado' => $valorPendente <= 0.01 ? 'paga' : 'parcialmente_paga',
            ]);

            return [
                'adiantamento' => $adiantamento->fresh(),
                'fatura' => $fatura->fresh(),
            ];
        });
    }

    public function cancelarDocumento($documento, string $motivo)
    {
        $this->verificarAcessoUsuario();

        if ($documento->estado === 'cancelado') {
            throw new \InvalidArgumentException('Documento já cancelado.');
        }

        $derivados = $documento->documentosDerivados()->where('estado', '!=', 'cancelado')->count();
        if ($derivados > 0) {
            throw new \InvalidArgumentException("Documento possui {$derivados} derivados activos.");
        }

        return DB::transaction(function () use ($documento, $motivo) {
            if ($this->configuracoesTipo[$documento->tipo_documento]['afeta_stock'] ?? false) {
                $this->reverterStock($documento);
            }

            $documento->update([
                'estado' => 'cancelado',
                'motivo_cancelamento' => $motivo,
                'data_cancelamento' => Carbon::now('Africa/Luanda'),
                'user_cancelamento_id' => $this->getUserId(),
            ]);

            return $documento->fresh();
        });
    }

    /* =====================================================================
     | MÉTODOS PÚBLICOS NOVOS (DP 71/25)
     | ================================================================== */

    /**
     * Emite Factura Global (FG) ou Factura Global-Recibo (FGR).
     * Art. 3.º al. j), Art. 8.º n.º 2.
     */
    public function emitirFacturaGlobal(array $dados)
    {
        $this->verificarAcessoUsuario();

        $tipo = $dados['tipo_documento'] ?? 'FG';
        if (!in_array($tipo, ['FG', 'FGR'], true)) {
            throw new \InvalidArgumentException("Tipo inválido para factura global: {$tipo}.");
        }

        $dados['tipo_documento'] = $tipo;
        return $this->emitirDocumento($dados);
    }

    /**
     * Emite Talão de Venda (TV). Art. 5.º n.º 2-3.
     */
    public function emitirTalaoVenda(array $dados)
    {
        $this->verificarAcessoUsuario();

        $dados['tipo_documento'] = 'TV';

        if (!empty($dados['cliente_nif'])) {
            throw new \InvalidArgumentException(
                'Talão de Venda é para adquirente sem NIF. Se tiver NIF, emita FR.'
            );
        }

        return $this->emitirDocumento($dados);
    }

    /**
     * Emite Factura-Recibo em regime de Auto-Facturação (Art. 11.º-14.º).
     */
    public function emitirAutoFacturacao(array $dados)
    {
        $this->verificarAcessoUsuario();

        $dados['tipo_documento'] = 'FR';
        $dados['auto_faturacao'] = true;

        if (empty($dados['motivo_auto_faturacao'])) {
            throw new \InvalidArgumentException(
                'Auto-facturação exige motivo (Art. 12.º n.º 1).'
            );
        }

        $this->validarLimiteAutoFacturacao($dados);

        $documento = $this->emitirDocumento($dados);
        return $documento;
    }

    private function validarLimiteAutoFacturacao(array $dados): void
    {
        $totalCustos = $this->calcularCustosAno();
        $totalAutoFact = $this->calcularTotalAutoFacturacaoAno();

        $percentagemMax = !empty($dados['bens_essenciais']) ? 0.40 : 0.20;
        $limite = $totalCustos * $percentagemMax;
        $valorNovo = $this->calcularTotalDocumento($dados);

        if ($totalCustos > 0 && ($totalAutoFact + $valorNovo) > $limite) {
            throw new \InvalidArgumentException(sprintf(
                'Auto-facturação excederia limite de %.0f%% (Art. 13.º). Usado: %.2f de %.2f Kz.',
                $percentagemMax * 100,
                $totalAutoFact,
                $limite
            ));
        }
    }

    private function calcularCustosAno(): float
    {
        $query = $this->documentoFiscalModel()
            ->whereYear('data_emissao', now()->year)
            ->whereIn('tipo_documento', ['FT', 'FR', 'FG', 'FGR'])
            ->where('estado', '!=', 'cancelado');

        if ($this->isColectivo()) {
            $query->where('tenant_id', $this->empresa->id);
        }

        return (float) $query->sum('base_tributavel');
    }

    private function calcularTotalAutoFacturacaoAno(): float
    {
        $query = $this->documentoFiscalModel()
            ->where('tipo_documento', 'FR')
            ->where('auto_faturacao', true)
            ->whereYear('data_emissao', now()->year)
            ->where('estado', '!=', 'cancelado');

        if ($this->isColectivo()) {
            $query->where('tenant_id', $this->empresa->id);
        }

        return (float) $query->sum('base_tributavel');
    }

    private function calcularTotalDocumento(array $dados): float
    {
        $total = 0.0;
        foreach ($dados['itens'] ?? [] as $item) {
            $sub = ($item['quantidade'] ?? 1) * ($item['preco_venda'] ?? $item['preco_unitario'] ?? 0);
            $total += $sub;
        }
        return $total;
    }

    /* =====================================================================
     | LISTAGEM / BUSCA
     | ================================================================== */

    public function listarDocumentos(array $filtros = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $this->verificarAcessoUsuario();

        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()->with('cliente', 'venda', 'itens.produto', 'anexos')
            : TenantDocumentoFiscal::with('cliente', 'venda', 'itens.produto', 'anexos');

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
            $query->whereIn('tipo_documento', ['FT', 'FR', 'RC', 'FG', 'FGR', 'TV']);
        }
        if (!empty($filtros['apenas_nao_vendas'])) {
            $query->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt', 'FGEN', 'AC', 'ACR']);
        }
        if (!empty($filtros['apenas_globais'])) {
            $query->whereIn('tipo_documento', ['FG', 'FGR']);
        }
        if (!empty($filtros['apenas_auto_facturacao'])) {
            $query->where('auto_faturacao', true);
        }
        if (!empty($filtros['pendentes'])) {
            $query->where('tipo_documento', 'FT')
                ->whereIn('estado', ['emitido', 'parcialmente_paga']);
        }
        if (!empty($filtros['adiantamentos_pendentes'])) {
            $query->where('tipo_documento', 'FA')->where('estado', 'emitido');
        }
        if (!empty($filtros['proformas_pendentes'])) {
            $query->where('tipo_documento', 'FP')->where('estado', 'emitido');
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
            throw new \InvalidArgumentException('ID inválido.');
        }

        $with = [
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
            'anexos',
        ];

        return $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()->with($with)->findOrFail($documentoId)
            : TenantDocumentoFiscal::with($with)->findOrFail($documentoId);
    }

    /* =====================================================================
     | CÁLCULOS DE PAGAMENTO
     | ================================================================== */

    public function calcularValorPendente($documento): float
    {
        if (!in_array($documento->tipo_documento, ['FT', 'FA', 'FG'])) {
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

    public function calcularValorPago($documento): float
    {
        return $this->calcularTotalPago($documento);
    }

    public function calcularSaldoDisponivel($fatura): float
    {
        if (!in_array($fatura->tipo_documento, ['FT', 'FR', 'FG', 'FGR'])) {
            return 0.0;
        }

        $totalCreditado = $fatura->notasCredito()
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido');

        return max(0.0, (float) $fatura->total_liquido - $totalCreditado);
    }

    public function podeEmitirNotaCredito($documento): array
    {
        if (!in_array($documento->tipo_documento, ['FT', 'FR', 'FG', 'FGR'])) {
            return ['pode' => false, 'motivo' => "NC apenas de FT, FR, FG ou FGR."];
        }
        if (in_array($documento->estado, ['cancelado', 'expirado'])) {
            return ['pode' => false, 'motivo' => 'Documento cancelado/expirado.'];
        }
        if ($this->calcularSaldoDisponivel($documento) <= 0.01) {
            return ['pode' => false, 'motivo' => 'Sem saldo disponível.'];
        }
        return ['pode' => true];
    }

    public function podeEmitirNotaDebito($documento): array
    {
        if (!in_array($documento->tipo_documento, ['FT', 'FG'])) {
            return ['pode' => false, 'motivo' => "ND apenas de FT ou FG."];
        }
        if (in_array($documento->estado, ['cancelado', 'expirado'])) {
            return ['pode' => false, 'motivo' => 'Documento cancelado/expirado.'];
        }

        $prazo = Carbon::parse($documento->data_emissao, 'Africa/Luanda')->addDays(30);
        if (Carbon::now('Africa/Luanda')->gt($prazo)) {
            return ['pode' => false, 'motivo' => "Prazo de 30 dias excedido (max: {$prazo->format('d/m/Y')})."];
        }

        return ['pode' => true];
    }

    public function calcularTotalCreditosEmitidos($fatura): float
    {
        return (float) $fatura->notasCredito()
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido');
    }

    /* =====================================================================
     | EXPIRAÇÃO DE ADIANTAMENTOS
     | ================================================================== */

    public function processarAdiantamentosExpirados(): int
    {
        $this->verificarAcessoUsuario();

        $agoraAngola = Carbon::now('Africa/Luanda');

        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        $expirados = $query->where('tipo_documento', 'FA')
            ->where('estado', 'emitido')
            ->where('data_vencimento', '<', $agoraAngola->toDateString())
            ->get();

        $count = 0;
        foreach ($expirados as $fa) {
            $fa->update(['estado' => 'expirado']);
            $count++;
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

        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        $faturasPendentes = (clone $query)
            ->whereIn('tipo_documento', ['FT', 'FG'])
            ->whereIn('estado', ['emitido', 'parcialmente_paga'])
            ->with('recibos')
            ->get();

        $totalPendenteCobranca = $faturasPendentes->sum(fn($f) => $this->calcularValorPendente($f));

        return [
            'faturas_emitidas_mes' => (clone $query)->whereIn('tipo_documento', ['FT', 'FG'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])->count(),
            'faturas_pendentes' => $faturasPendentes->count(),
            'total_pendente_cobranca' => round($totalPendenteCobranca, 2),
            'adiantamentos_pendentes_pagamento' => (clone $query)->where('tipo_documento', 'FA')
                ->where('estado', 'emitido')->count(),
            'proformas_em_aberto' => (clone $query)->where('tipo_documento', 'FP')
                ->where('estado', 'emitido')->count(),
            'documentos_cancelados_mes' => (clone $query)->where('estado', 'cancelado')
                ->whereBetween('data_cancelamento', [$inicioMes, $hoje])->count(),
            'total_vendas_mes' => (clone $query)->whereIn('tipo_documento', ['FT', 'FR', 'RC', 'FG', 'FGR', 'TV'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])->count(),
            'total_nao_vendas_mes' => (clone $query)->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt', 'FGEN', 'AC', 'ACR'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])->count(),
            'auto_facturacao_mes' => (clone $query)->where('auto_faturacao', true)
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])->count(),
            'facturas_globais_mes' => (clone $query)->whereIn('tipo_documento', ['FG', 'FGR'])
                ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])->count(),
        ];
    }

    public function evolucaoMensal(int $ano): array
    {
        $this->verificarAcessoUsuario();

        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        $evolucao = [];
        for ($mes = 1; $mes <= 12; $mes++) {
            $inicio = Carbon::create($ano, $mes, 1, 0, 0, 0, 'Africa/Luanda')->startOfMonth();
            $fim = $inicio->copy()->endOfMonth();

            $evolucao[] = [
                'mes' => $mes,
                'ano' => $ano,
                'total_vendas' => (float) (clone $query)->whereIn('tipo_documento', ['FT', 'FR', 'RC', 'FG', 'FGR', 'TV'])
                    ->whereBetween('data_emissao', [$inicio->toDateString(), $fim->toDateString()])
                    ->where('estado', '!=', 'cancelado')->sum('total_liquido'),
                'total_nao_vendas' => (float) (clone $query)->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt', 'FGEN', 'AC', 'ACR'])
                    ->whereBetween('data_emissao', [$inicio->toDateString(), $fim->toDateString()])
                    ->where('estado', '!=', 'cancelado')->sum('total_liquido'),
                'total_pendente' => (float) (clone $query)->whereIn('tipo_documento', ['FT', 'FA', 'FG'])
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->where('data_emissao', '<=', $fim->toDateString())->sum('total_liquido'),
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

        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        $porMetodo = (clone $query)->whereIn('tipo_documento', ['RC', 'FR', 'FGR', 'TV', 'ACR'])
            ->where('estado', '!=', 'cancelado')
            ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
            ->select('metodo_pagamento', DB::raw('COUNT(*) as quantidade'), DB::raw('SUM(total_liquido) as total'))
            ->groupBy('metodo_pagamento')
            ->get()
            ->mapWithKeys(fn($item) => [
                $item->metodo_pagamento ?? 'nao_informado' => [
                    'quantidade' => $item->quantidade,
                    'total' => (float) $item->total,
                ],
            ]);

        $totalPagoMes = (clone $query)->whereIn('tipo_documento', ['RC', 'FR', 'FGR', 'TV', 'ACR'])
            ->where('estado', '!=', 'cancelado')
            ->whereBetween('data_emissao', [$inicioMes->toDateString(), $hoje->toDateString()])
            ->sum('total_liquido');

        $totalPagoAno = (clone $query)->whereIn('tipo_documento', ['RC', 'FR', 'FGR', 'TV', 'ACR'])
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

        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        return [
            'adiantamentos_vencidos' => [
                'total' => (clone $query)->where('tipo_documento', 'FA')->where('estado', 'emitido')
                    ->whereNotNull('data_vencimento')->where('data_vencimento', '<', $hoje->toDateString())->count(),
                'items' => (clone $query)->where('tipo_documento', 'FA')->where('estado', 'emitido')
                    ->whereNotNull('data_vencimento')->where('data_vencimento', '<', $hoje->toDateString())
                    ->with('cliente')->orderBy('data_vencimento')->limit(10)->get(),
            ],
            'faturas_com_adiantamentos_pendentes' => [
                'total' => (clone $query)->where('tipo_documento', 'FT')
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->whereHas('faturasAdiantamento', fn($q) => $q->whereIn('estado', ['emitido', 'parcialmente_paga']))->count(),
                'items' => (clone $query)->where('tipo_documento', 'FT')
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->whereHas('faturasAdiantamento', fn($q) => $q->whereIn('estado', ['emitido', 'parcialmente_paga']))
                    ->with(['cliente', 'faturasAdiantamento'])->orderByDesc('data_emissao')->limit(10)->get(),
            ],
            'proformas_em_aberto' => [
                'total' => (clone $query)->where('tipo_documento', 'FP')->where('estado', 'emitido')
                    ->where('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())->count(),
                'items' => (clone $query)->where('tipo_documento', 'FP')->where('estado', 'emitido')
                    ->where('data_emissao', '<', $hoje->copy()->subDays(7)->toDateString())
                    ->with('cliente')->orderBy('data_emissao')->limit(10)->get(),
            ],
            'faturas_vencidas' => [
                'total' => (clone $query)->whereIn('tipo_documento', ['FT', 'FG'])
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->whereNotNull('data_vencimento')->where('data_vencimento', '<', $hoje->toDateString())->count(),
                'items' => (clone $query)->whereIn('tipo_documento', ['FT', 'FG'])
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->whereNotNull('data_vencimento')->where('data_vencimento', '<', $hoje->toDateString())
                    ->with('cliente')->orderBy('data_vencimento')->limit(10)->get(),
            ],
        ];
    }

    /* =====================================================================
     | PDF / EXCEL
     | ================================================================== */

    public function dadosParaPdf($documento): array
    {
        $this->verificarAcessoUsuario();

        $documento->loadMissing(['itens.produto', 'cliente', 'documentoOrigem', 'recibos', 'user', 'anexos']);
        $empresa = $this->obterEmpresa();

        return [
            'empresa' => [
                'nome' => $empresa->nome,
                'nif' => $empresa->nif,
                'morada' => $empresa->endereco ?? $empresa->morada ?? '',
                'telefone' => $empresa->telefone,
                'email' => $empresa->email,
                'logo' => $empresa->logo,
                'regime_fiscal' => $empresa->regime_fiscal,
                'certificado_agt' => $empresa->software_validation_number ?? null,
            ],
            'documento' => $documento,
            'itens' => $documento->itens,
            'anexos' => $documento->anexos,
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

        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()->with('cliente', 'itens')
            : TenantDocumentoFiscal::with('cliente', 'itens');

        $documentos = (clone $query)
            ->when(!empty($filtros['tipo']), fn($q) => $q->where('tipo_documento', $filtros['tipo']))
            ->when(!empty($filtros['estado']), fn($q) => $q->where('estado', $filtros['estado']))
            ->when(!empty($filtros['cliente_id']), fn($q) => $q->where('cliente_id', $filtros['cliente_id']))
            ->when(!empty($filtros['data_inicio']), fn($q) => $q->whereDate('data_emissao', '>=', $filtros['data_inicio']))
            ->when(!empty($filtros['data_fim']), fn($q) => $q->whereDate('data_emissao', '<=', $filtros['data_fim']))
            ->when(!empty($filtros['apenas_vendas']), fn($q) => $q->whereIn('tipo_documento', ['FT', 'FR', 'RC', 'FG', 'FGR', 'TV']))
            ->when(!empty($filtros['apenas_nao_vendas']), fn($q) => $q->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt', 'FGEN', 'AC', 'ACR']))
            ->when(!empty($filtros['apenas_auto_facturacao']), fn($q) => $q->where('auto_faturacao', true))
            ->orderBy('data_emissao', 'desc')->orderBy('hora_emissao', 'desc')->orderBy('numero', 'desc')
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
            'Auto-Facturação',
            'Hash Fiscal',
        ];

        $linhas = $documentos->map(fn($doc) => [
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
            $doc->auto_faturacao ? 'SIM' : 'NÃO',
            $doc->hash_fiscal ?? '—',
        ])->toArray();

        return ['cabecalho' => $cabecalho, 'linhas' => $linhas, 'documentos' => $documentos];
    }

    /* =====================================================================
     | ASSINATURA RSA (AGT)
     | ================================================================== */

    private function assinarDocumento($documento): void
    {
        $chavePrivadaPath = config('agt.rsa_private_key_path');
        $versaoChave = (int) config('agt.rsa_key_version', 1);
        $numeroCertificado = config('agt.numero_certificado', '');

        if (!$chavePrivadaPath || !file_exists($chavePrivadaPath)) {
            throw new \RuntimeException('Chave privada RSA para assinatura AGT não configurada.');
        }

        $chavePrivada = openssl_pkey_get_private(file_get_contents($chavePrivadaPath));
        if (!$chavePrivada) {
            throw new \RuntimeException('Erro ao carregar chave RSA: ' . openssl_error_string());
        }

        $hashAnterior = '0';
        $queryHash = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        $hashAnterior = $queryHash->where('serie', $documento->serie)
            ->where('tipo_documento', $documento->tipo_documento)
            ->where('numero', '<', $documento->numero)
            ->whereNotNull('hash_fiscal')
            ->orderByDesc('numero')
            ->value('hash_fiscal') ?? '0';

        $dadosAssinatura = implode(';', [
            $documento->data_emissao,
            $documento->hora_emissao,
            $documento->numero_documento,
            number_format((float) $documento->total_liquido, 2, '.', ''),
            $hashAnterior,
        ]);

        $assinatura = '';
        if (!openssl_sign($dadosAssinatura, $assinatura, $chavePrivada, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('Erro ao gerar assinatura: ' . openssl_error_string());
        }

        $hashFiscal = hash('sha256', $dadosAssinatura);
        $qrCode = $this->gerarConteudoQrCode($documento, $hashFiscal, $numeroCertificado);

        $documento->update([
            'hash_fiscal' => $hashFiscal,
            'rsa_assinatura' => base64_encode($assinatura),
            'rsa_versao_chave' => $versaoChave,
            'hash_anterior' => $hashAnterior,
            'qr_code' => $qrCode,
        ]);
    }

    private function gerarConteudoQrCode($documento, string $hashFiscal, string $numeroCertificado): string
    {
        $empresa = $this->obterEmpresa();
        $nifCliente = $documento->cliente?->nif ?? $documento->cliente_nif ?? 'CF';
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
     | PROCESSAMENTO DE ITENS
     | ================================================================== */

    private function processarItens(
        array $itens,
        bool $aplicaIva,
        string $regime,
        ?float $taxaRetencaoAuto = null
    ): array
    {
        $totalBase = 0.0;
        $totalIva = 0.0;
        $totalRetencao = 0.0;
        $itensProcessados = [];

        foreach ($itens as $item) {
            $produto = !empty($item['produto_id']) ? $this->buscarProduto($item['produto_id']) : null;

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
                    $taxaIva = (float) ($item['taxa_iva'] ?? $produto?->taxa_iva ?? $this->taxaIvaVigente());
                    if ($taxaIva === 0.0) {
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
            if ($taxaRetencaoAuto !== null) {
                $taxaRetencaoUsada = $taxaRetencaoAuto;
                $valorRetencao = round($baseTributavel * $taxaRetencaoUsada / 100, 2);
            } elseif ($isProdutoServico && $aplicaIva) {
                $taxaRetencaoUsada = (float) ($item['taxa_retencao'] ?? $produto?->taxa_retencao ?? 6.5);
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
        return $this->isColectivo()
            ? SharedProduto::doTenant()->where('id', $produtoId)->first()
            : TenantProduto::where('id', $produtoId)->first();
    }

    /* =====================================================================
     | NUMERAÇÃO (com suporte a auto-facturação)
     | ================================================================== */

    private function gerarNumeroDocumento(string $tipo, bool $autoFaturacao = false): array
    {
        $serieFiscal = $this->obterSerieFiscal($tipo, $autoFaturacao);

        if (!$serieFiscal || !isset($serieFiscal->serie)) {
            throw new \RuntimeException("Série fiscal não configurada para o tipo {$tipo}.");
        }

        if (isset($serieFiscal->id) && $serieFiscal->id) {
            $conn = $this->isColectivo() ? 'shared' : 'tenant';
            $q = DB::connection($conn)->table('series_fiscais')->where('id', $serieFiscal->id);
            if ($this->isColectivo()) {
                $q->where('tenant_id', $this->empresa->id);
            }
            $q->lockForUpdate()->first();
        }

        $ano = $serieFiscal->ano ?? now()->year;
        $ultimoNumeroReal = $this->buscarUltimoNumeroPorAno($tipo, $serieFiscal->serie, $ano);
        $numero = max($serieFiscal->ultimo_numero ?? 0, $ultimoNumeroReal ?? 0) + 1;

        $digitos = $serieFiscal->digitos ?? 4;
        $numeroDoc = $tipo . ' ' . $serieFiscal->serie . '/' . $ano . '/' . str_pad($numero, $digitos, '0', STR_PAD_LEFT);

        $tentativas = 0;
        while ($this->numeroDocumentoExiste($tipo, $numeroDoc) && $tentativas < 100) {
            $tentativas++;
            $numero++;
            $numeroDoc = $tipo . ' ' . $serieFiscal->serie . '/' . $ano . '/' . str_pad($numero, $digitos, '0', STR_PAD_LEFT);
        }

        if ($tentativas >= 100) {
            throw new \RuntimeException("Não foi possível gerar número único para {$tipo}.");
        }

        if (isset($serieFiscal->id) && $serieFiscal->id) {
            $serieFiscal->update(['ultimo_numero' => $numero, 'ano' => $ano]);
        }

        return [$numero, $numeroDoc, $serieFiscal];
    }

    private function obterSerieFiscal(string $tipo, bool $autoFaturacao = false): object
    {
        $model = $this->serieFiscalModel();
        $query = $model->where('tipo_documento', $tipo)
            ->where('ativa', true)
            ->where(fn($q) => $q->whereNull('ano')->orWhere('ano', now()->year))
            ->orderByDesc('padrao');

        if ($this->colunaExiste('series_fiscais', 'auto_faturacao')) {
            $query->where('auto_faturacao', $autoFaturacao);
        }

        if ($this->isColectivo() && $this->colunaExiste('series_fiscais', 'tenant_id')) {
            $query->where('tenant_id', $this->empresa->id);
        }

        $serie = $query->first();

        if (!$serie) {
            $seriesPadrao = [
                'FT' => 'A',
                'FR' => 'A',
                'FP' => 'P',
                'FA' => 'AD',
                'NC' => 'C',
                'ND' => 'D',
                'RC' => 'R',
                'FRt' => 'FRT',
                'FG' => 'G',
                'FGR' => 'GR',
                'TV' => 'T',
                'FGEN' => 'GF',
                'AC' => 'AC',
                'ACR' => 'AR',
            ];

            $serieNome = $autoFaturacao ? 'AF' : ($seriesPadrao[$tipo] ?? 'GERAL');

            $dados = [
                'id' => Str::uuid(),
                'tipo_documento' => $tipo,
                'serie' => $serieNome,
                'digitos' => 4,
                'ultimo_numero' => 0,
                'ativa' => true,
                'padrao' => true,
                'ano' => now()->year,
                'valida_agt' => !in_array($tipo, ['FP', 'RC'], true),
            ];

            if ($this->colunaExiste('series_fiscais', 'auto_faturacao')) {
                $dados['auto_faturacao'] = $autoFaturacao;
            }
            if ($this->isColectivo() && $this->colunaExiste('series_fiscais', 'tenant_id')) {
                $dados['tenant_id'] = $this->empresa->id;
            }

            $serie = $model->create($dados);
        }

        return $serie;
    }

    private function buscarUltimoNumeroPorAno(string $tipo, string $serie, int $ano): int
    {
        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        $doc = $query->where('tipo_documento', $tipo)
            ->where('numero_documento', 'like', $tipo . ' ' . $serie . '/' . $ano . '/%')
            ->orderBy('numero', 'desc')
            ->first();

        return $doc ? (int) $doc->numero : 0;
    }

    private function numeroDocumentoExiste(string $tipo, string $numeroDoc): bool
    {
        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        return $query->where('numero_documento', $numeroDoc)->exists();
    }

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
     | SÉRIES PADRÃO
     | ================================================================== */

    private function criarSeriesPadrao(): void
    {
        $tenantId = $this->empresa?->id;
        $modo = $this->getModo();
        $ano = now()->year;

        $tipos = ['FT', 'FR', 'FP', 'FA', 'NC', 'ND', 'RC', 'FG', 'FGR', 'TV'];

        $seriesMap = [
            'FT' => 'A',
            'FR' => 'A',
            'FP' => 'P',
            'FA' => 'AD',
            'NC' => 'C',
            'ND' => 'D',
            'RC' => 'R',
            'FG' => 'G',
            'FGR' => 'GR',
            'TV' => 'T',
        ];

        $temTenantId = $this->isColectivo() && $tenantId && $this->colunaExiste('series_fiscais', 'tenant_id');
        $temAutoFact = $this->colunaExiste('series_fiscais', 'auto_faturacao');

        foreach ($tipos as $tipo) {
            $serieNome = $seriesMap[$tipo];

            $chave = ['tipo_documento' => $tipo, 'serie' => $serieNome, 'ano' => $ano];
            if ($temTenantId) $chave['tenant_id'] = $tenantId;
            if ($temAutoFact) $chave['auto_faturacao'] = false;

            // Desativar séries antigas com nomes diferentes
            $q = $this->serieFiscalModel()->where('tipo_documento', $tipo)
                ->where('ano', $ano)->where('serie', '!=', $serieNome);
            if ($temTenantId) $q->where('tenant_id', $tenantId);
            if ($temAutoFact) $q->where('auto_faturacao', false);

            foreach ($q->get() as $antiga) {
                if ($antiga->ativa || $antiga->padrao) {
                    $antiga->update(['ativa' => false, 'padrao' => false]);
                }
            }

            try {
                $this->serieFiscalModel()->firstOrCreate($chave, [
                    'id' => (string) Str::uuid(),
                    'descricao' => "Série padrão — " . $this->getTipoDocumentoNome($tipo),
                    'digitos' => 4,
                    'ultimo_numero' => 0,
                    'ativa' => true,
                    'padrao' => true,
                    'valida_agt' => !in_array($tipo, ['FP', 'RC'], true),
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->getCode() !== '23000') throw $e;
            }
        }

        // Série especial AF (auto-facturação)
// Série especial AF (auto-facturação)
if ($temAutoFact) {
    // Chave REAL da unique (não inclui auto_faturacao)
    $chaveReal = [
        'tipo_documento' => 'FR',
        'serie'          => 'AF',
        'ano'            => $ano,
    ];
    if ($temTenantId) $chaveReal['tenant_id'] = $tenantId;

    $existente = $this->serieFiscalModel()->where($chaveReal)->first();

    if ($existente) {
        // Já existe — garantir auto_faturacao=true e activa
        if (!$existente->auto_faturacao || !$existente->ativa) {
            $existente->update([
                'auto_faturacao' => true,
                'ativa'          => true,
                'padrao'         => true,
            ]);
        }
    } else {
        try {
            $dadosAF = array_merge($chaveReal, [
                'id'             => (string) Str::uuid(),
                'descricao'      => 'Série Auto-Facturação — Faturas-Recibo',
                'digitos'        => 4,
                'ultimo_numero'  => 0,
                'ativa'          => true,
                'padrao'         => true,
                'valida_agt'     => true,
                'auto_faturacao' => true,
            ]);

            $this->serieFiscalModel()->create($dadosAF);
        } catch (\Illuminate\Database\QueryException $e) {
            // Race condition: já foi criada por outro request
            if ($e->getCode() !== '23000') throw $e;
        }
    }
}
    }

    private function getTipoDocumentoNome(string $tipo): string
    {
        return [
            'FT' => 'Faturas',
            'FR' => 'Faturas-Recibo',
            'FP' => 'Faturas Proforma',
            'FA' => 'Faturas de Adiantamento',
            'NC' => 'Notas de Crédito',
            'ND' => 'Notas de Débito',
            'RC' => 'Recibos',
            'FRt' => 'Faturas de Retificação (legado)',
            'FG' => 'Faturas Globais',
            'FGR' => 'Faturas Globais-Recibo',
            'TV' => 'Talões de Venda',
            'FGEN' => 'Faturas Genéricas',
            'AC' => 'Avisos de Cobrança',
            'ACR' => 'Avisos de Cobrança-Recibo',
        ][$tipo] ?? $tipo;
    }

    /* =====================================================================
     | VALIDAÇÕES
     | ================================================================== */

    private function validarDadosPorTipo(array $dados, string $tipo, array $config): void
    {
        if ($config['exige_cliente'] ?? false) {
            $temCliente = !empty($dados['cliente_id']) || !empty($dados['cliente_nome']);
            $clienteGenerico = $tipo === 'FR'
                && empty($dados['cliente_id'])
                && Str::lower(trim((string) ($dados['cliente_nome'] ?? ''))) === 'consumidor final';

            if (!$temCliente || $clienteGenerico) {
                throw new \InvalidArgumentException(
                    "{$config['nome']} requer a identificação do cliente; Consumidor Final não é válido para uma Fatura-Recibo."
                );
            }
        }

        $regras = [
            'FR' => ['dados_pagamento'],
            'FA' => ['data_vencimento'],
            'RC' => ['fatura_id'],
            'NC' => ['fatura_id', 'motivo', 'itens'],
            'ND' => ['fatura_id', 'itens'],
            'FG' => ['periodo_referencia_inicio', 'periodo_referencia_fim', 'anexos', 'itens'],
            'FGR' => ['periodo_referencia_inicio', 'periodo_referencia_fim', 'anexos', 'itens'],
            'TV' => ['itens'],
        ];

        foreach ($regras[$tipo] ?? [] as $campo) {
            if (empty($dados[$campo])) {
                throw new \InvalidArgumentException("Campo '{$campo}' obrigatório para {$config['nome']}.");
            }
        }

        // Factura Global: validar período
        if (in_array($tipo, ['FG', 'FGR'], true)) {
            $inicio = Carbon::parse($dados['periodo_referencia_inicio']);
            $fim = Carbon::parse($dados['periodo_referencia_fim']);

            if ($inicio->gt($fim)) {
                throw new \InvalidArgumentException('Período de referência inválido.');
            }
            if ($inicio->diffInDays($fim) > 31) {
                throw new \InvalidArgumentException('Factura Global não pode exceder 31 dias (Art. 3.º al. j)).');
            }
            foreach ($dados['anexos'] as $i => $anexo) {
                if (empty($anexo['referencia']) || empty($anexo['data_anexo']) || empty($anexo['tipo_anexo'])) {
                    throw new \InvalidArgumentException("Anexo #{$i} inválido.");
                }
            }
        }

        // Talão de Venda: sem NIF
        if ($tipo === 'TV' && !empty($dados['cliente_nif'])) {
            throw new \InvalidArgumentException(
                'Talão de Venda é para adquirente sem NIF (Art. 5.º n.º 4).'
            );
        }

        // Auto-facturação
        if (!empty($dados['auto_faturacao']) && $tipo !== 'FR') {
            throw new \InvalidArgumentException('Auto-facturação só se aplica a FR (Art. 12.º n.º 1).');
        }

        // Verificar origem para NC/ND/RC
        if (!empty($dados['fatura_id'])) {
            $origem = $this->isColectivo()
                ? SharedDocumentoFiscal::doTenant()->find($dados['fatura_id'])
                : TenantDocumentoFiscal::find($dados['fatura_id']);

            if (!$origem) {
                throw new \InvalidArgumentException('Documento de origem não encontrado.');
            }

            if (in_array($tipo, ['NC'], true) && !in_array($origem->tipo_documento, ['FT', 'FR', 'FG', 'FGR'], true)) {
                throw new \InvalidArgumentException("NC só de FT/FR/FG/FGR. Tipo: {$origem->tipo_documento}");
            }
            if ($tipo === 'ND' && !in_array($origem->tipo_documento, ['FT', 'FG'], true)) {
                throw new \InvalidArgumentException("ND só de FT ou FG. Tipo: {$origem->tipo_documento}");
            }
            if ($tipo === 'RC' && !in_array($origem->tipo_documento, ['FT', 'FA', 'FP', 'FG'], true)) {
                throw new \InvalidArgumentException("RC só de FT/FA/FP/FG. Tipo: {$origem->tipo_documento}");
            }
        }
    }

    private function calcularDataVencimento(string $tipo, array $dados, Carbon $dataEmissao): ?string
    {
        if (in_array($tipo, ['RC', 'NC', 'FRt', 'FP', 'TV', 'FGR', 'FGEN', 'ACR'], true)) {
            return null;
        }

        if ($tipo === 'FA' || $tipo === 'FG') {
            return $dados['data_vencimento'] ?? $dataEmissao->copy()->addDays(30)->toDateString();
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

    private function criarItensDocumento($documento, array $itens): void
    {
        $agora = Carbon::now('Africa/Luanda');

        $registos = array_map(function ($item, $i) use ($documento, $agora) {
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
                'ordem' => $i + 1,
                'created_at' => $agora,
                'updated_at' => $agora,
            ];
            if ($this->isColectivo()) {
                $data['tenant_id'] = $this->empresa->id;
            }
            return $data;
        }, $itens, array_keys($itens));

        if ($this->isColectivo()) {
            SharedItemDocumentoFiscal::insert($registos);
        } else {
            TenantItemDocumentoFiscal::insert($registos);
        }
    }

    private function criarAnexosFacturaGlobal($documento, array $anexos): void
    {
        foreach ($anexos as $anexo) {
            $dados = [
                'id' => (string) Str::uuid(),
                'documento_fiscal_id' => $documento->id,
                'tipo_anexo' => $anexo['tipo_anexo'],
                'referencia' => $anexo['referencia'],
                'data_anexo' => $anexo['data_anexo'],
                'valor_total' => $anexo['valor_total'] ?? null,
                'observacoes' => $anexo['observacoes'] ?? null,
            ];
            if ($this->isColectivo()) {
                $dados['tenant_id'] = $this->empresa->id;
                SharedFacturaGlobalAnexo::create($dados);
            } else {
                TenantFacturaGlobalAnexo::create($dados);
            }
        }
    }

    private function executarAcoesPosCriacao($documento, array $dados, string $tipo): void
    {
        if ($this->configuracoesTipo[$tipo]['afeta_stock'] ?? false) {
            $this->movimentarStock($documento, $tipo);
        }

        if (in_array($tipo, ['FT', 'FR', 'FG', 'FGR'], true) && !empty($dados['venda_id'])) {
            $this->atualizarVenda($dados['venda_id'], $documento);
        }
    }

    private function calcularTotalPago($documento): float
    {
        $query = $this->isColectivo()
            ? SharedDocumentoFiscal::doTenant()
            : TenantDocumentoFiscal::query();

        return (float) $query->where('fatura_id', $documento->id)
            ->whereIn('tipo_documento', ['RC'])
            ->where('estado', '!=', 'cancelado')
            ->sum('total_liquido');
    }

    private function actualizarEstadoAposPagamento($documentoOrigem, float $valorPago): void
    {
        $totalPago = $this->calcularTotalPago($documentoOrigem) + $valorPago;

        if ($documentoOrigem->tipo_documento === 'FA') {
            $estadoFinal = $totalPago >= (float) $documentoOrigem->total_liquido ? 'paga' : 'parcialmente_paga';
        } else {
            $totalAdiantamentos = (float) DB::table('adiantamento_fatura')
                ->where('fatura_id', $documentoOrigem->id)
                ->sum('valor_utilizado');
            $estadoFinal = ($totalPago + $totalAdiantamentos) >= (float) $documentoOrigem->total_liquido
                ? 'paga' : 'parcialmente_paga';
        }

        $documentoOrigem->update(['estado' => $estadoFinal]);
    }

    private function resolverCliente(array $dados, string $tipo): ?string
    {
        if (!empty($dados['cliente_id'])) return $dados['cliente_id'];
        if (!empty($dados['cliente_nome'])) return null;

        if (!empty($dados['fatura_id'])) {
            $origem = $this->isColectivo()
                ? SharedDocumentoFiscal::doTenant()->find($dados['fatura_id'])
                : TenantDocumentoFiscal::find($dados['fatura_id']);
            if ($origem) return $origem->cliente_id;
        }

        if (!empty($dados['venda_id'])) {
            $venda = $this->isColectivo()
                ? SharedVenda::doTenant()->find($dados['venda_id'])
                : TenantVenda::find($dados['venda_id']);
            if ($venda) return $venda->cliente_id;
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

    private function movimentarStock($documento, string $tipoDocumento): void
    {
        $stockService = app(\App\Services\StockService::class);
        $userId = $this->getUserId();
        $itens = $documento->itens()->get();
        $autoFacturacao = (bool) ($documento->auto_faturacao ?? false);

        foreach ($itens as $item) {
            if (empty($item->produto_id)) continue;

            $produto = $this->buscarProduto($item->produto_id);
            if (!$produto || $produto->tipo === 'servico') continue;

            $quantidade = (int) round((float) $item->quantidade);
            if ($quantidade <= 0) continue;

            try {
                if ($autoFacturacao) {
                    // Compra de produtor → stock ENTRA
                    $stockService->movimentar(
                        $item->produto_id,
                        $quantidade,
                        'entrada',
                        'auto_facturacao',
                        $documento->numero_documento,
                        "Auto-facturação — aquisição de {$documento->numero_documento}",
                        $userId
                    );
                    continue;
                }

                if (in_array($tipoDocumento, ['FT', 'FR', 'FG', 'FGR', 'TV'], true)) {
                    $stockService->movimentar(
                        $item->produto_id,
                        $quantidade,
                        'saida',
                        'venda',
                        $documento->numero_documento,
                        "Venda referente a {$documento->numero_documento}",
                        $userId
                    );
                } elseif ($tipoDocumento === 'NC') {
                    $stockService->movimentar(
                        $item->produto_id,
                        $quantidade,
                        'entrada',
                        'nota_credito',
                        $documento->numero_documento,
                        "Devolução referente a {$documento->numero_documento}",
                        $userId
                    );
                }
            } catch (\Exception $e) {
                Log::error('[DocumentoFiscalService] Falha stock', [
                    'documento' => $documento->numero_documento,
                    'tipo' => $tipoDocumento,
                    'auto_fact' => $autoFacturacao,
                    'erro' => $e->getMessage(),
                ]);
                throw $e;
            }
        }
    }

    private function reverterStock($documento): void
    {
        app(StockService::class)->reverterDocumentoFiscal($documento);
    }

    private function atualizarVenda(string $vendaId, $documento): void
    {
        try {
            $venda = $this->isColectivo()
                ? SharedVenda::doTenant()->find($vendaId)
                : TenantVenda::find($vendaId);

            if ($venda) {
                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status' => 'faturada',
                    'tipo_documento_fiscal' => $documento->tipo_documento,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Erro ao actualizar venda', ['venda_id' => $vendaId, 'error' => $e->getMessage()]);
        }
    }
}
