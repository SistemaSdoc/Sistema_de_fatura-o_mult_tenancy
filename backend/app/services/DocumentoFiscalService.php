<?php

namespace App\Services;

use App\Models\DocumentoFiscal;
use App\Models\ItemDocumentoFiscal;
use App\Models\Venda;
use App\Models\Empresa;
use App\Models\SerieFiscal;
use App\Models\Cliente;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DocumentoFiscalService
{
    /**
     * Mapeamento de tipos de documento para suas características
     */
    protected $configuracoesTipo = [
        'FT' => [
            'nome' => 'Fatura',
            'afeta_stock' => true,
            'eh_venda' => true,
            'gera_recibo' => true,
            'estado_inicial' => 'emitido',
            'exige_cliente' => false, // Pode ser avulso
            'aceita_pagamento' => true,
            'pode_ter_adiantamento' => true,
        ],
        'FR' => [
            'nome' => 'Fatura-Recibo',
            'afeta_stock' => true,
            'eh_venda' => true,
            'gera_recibo' => false,
            'estado_inicial' => 'paga',
            'exige_cliente' => true, // FR exige cliente (cadastrado ou avulso)
            'aceita_pagamento' => false,
            'pode_ter_adiantamento' => false,
        ],
        'FP' => [
            'nome' => 'Fatura Proforma',
            'afeta_stock' => false, // Não afeta stock (apenas reserva)
            'eh_venda' => false,
            'gera_recibo' => false,
            'estado_inicial' => 'emitido',
            'exige_cliente' => false,
            'aceita_pagamento' => false,
            'pode_ter_adiantamento' => false,
        ],
        'FA' => [
            'nome' => 'Fatura de Adiantamento',
            'afeta_stock' => false,
            'eh_venda' => false,
            'gera_recibo' => false,
            'estado_inicial' => 'emitido',
            'exige_cliente' => true,
            'aceita_pagamento' => true,
            'pode_ter_adiantamento' => false,
        ],
        'NC' => [
            'nome' => 'Nota de Crédito',
            'afeta_stock' => true, // Reverte stock
            'eh_venda' => false,
            'gera_recibo' => false,
            'estado_inicial' => 'emitido',
            'exige_cliente' => false,
            'aceita_pagamento' => false,
            'pode_ter_adiantamento' => false,
        ],
        'ND' => [
            'nome' => 'Nota de Débito',
            'afeta_stock' => false,
            'eh_venda' => false,
            'gera_recibo' => false,
            'estado_inicial' => 'emitido',
            'exige_cliente' => false,
            'aceita_pagamento' => false,
            'pode_ter_adiantamento' => false,
        ],
        'RC' => [
            'nome' => 'Recibo',
            'afeta_stock' => false,
            'eh_venda' => true,
            'gera_recibo' => false,
            'estado_inicial' => 'paga',
            'exige_cliente' => false,
            'aceita_pagamento' => false,
            'pode_ter_adiantamento' => false,
        ],
        'FRt' => [
            'nome' => 'Fatura de Retificação',
            'afeta_stock' => false,
            'eh_venda' => false,
            'gera_recibo' => false,
            'estado_inicial' => 'emitido',
            'exige_cliente' => false,
            'aceita_pagamento' => false,
            'pode_ter_adiantamento' => false,
        ],
    ];

    /**
     * Estados válidos
     */
    const ESTADO_EMITIDO = 'emitido';
    const ESTADO_PAGA = 'paga';
    const ESTADO_PARCIALMENTE_PAGA = 'parcialmente_paga';
    const ESTADO_CANCELADO = 'cancelado';
    const ESTADO_EXPIRADO = 'expirado';

    /**
     * Emitir qualquer tipo de documento fiscal
     */
    public function emitirDocumento(array $dados)
    {
        $tipo = $dados['tipo_documento'];

        if (!isset($this->configuracoesTipo[$tipo])) {
            throw new \InvalidArgumentException("Tipo de documento {$tipo} não suportado.");
        }

        $config = $this->configuracoesTipo[$tipo];

        Log::info("Iniciando emissão de {$config['nome']}", [
            'tipo' => $tipo,
            'cliente_tipo' => isset($dados['cliente_id']) ? 'cadastrado' : (isset($dados['cliente_nome']) ? 'avulso' : 'não informado'),
            'cliente_id' => $dados['cliente_id'] ?? null,
            'cliente_nome' => $dados['cliente_nome'] ?? null,
            'cliente_nif' => $dados['cliente_nif'] ?? null,
        ]);

        return DB::transaction(function () use ($dados, $tipo, $config) {

            $empresa = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // Validações específicas por tipo
            $this->validarDadosPorTipo($dados, $tipo, $config);

            // Obter série fiscal
            $serieFiscal = $this->obterSerieFiscal($tipo);
            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, $serieFiscal->digitos ?? 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            // Calcular datas
            $dataEmissao = now();
            $dataVencimento = $this->calcularDataVencimento($tipo, $dados, $dataEmissao);

            // Processar itens e calcular totais
            $totais = $this->processarItens($dados['itens'] ?? [], $aplicaIva, $regime);

            // Resolver cliente (pode ser cadastrado ou avulso)
            $clienteId = $this->resolverCliente($dados, $tipo);
            $clienteNome = $dados['cliente_nome'] ?? null;
            $clienteNif = $dados['cliente_nif'] ?? null;

            // Log para debug do cliente
            Log::info('Dados do cliente resolvidos', [
                'cliente_id' => $clienteId,
                'cliente_nome' => $clienteNome,
                'cliente_nif' => $clienteNif,
                'metodo_resolucao' => $clienteId ? 'cadastrado' : ($clienteNome ? 'avulso' : 'não informado')
            ]);

            // Criar documento base - IMPORTANTE: só incluir cliente_nome se NÃO tiver cliente_id
            $documentoData = [
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'venda_id' => $dados['venda_id'] ?? null,
                'fatura_id' => $dados['fatura_id'] ?? null,
                'serie' => $serieFiscal->serie,
                'numero' => $numero,
                'numero_documento' => $numeroDocumento,
                'tipo_documento' => $tipo,
                'data_emissao' => $dataEmissao->toDateString(),
                'hora_emissao' => $dataEmissao->toTimeString(),
                'data_vencimento' => $dataVencimento,
                'base_tributavel' => $totais['base'],
                'total_iva' => $totais['iva'],
                'total_retencao' => $totais['retencao'],
                'total_liquido' => $totais['liquido'],
                'estado' => $config['estado_inicial'],
                'motivo' => $dados['motivo'] ?? null,
                'hash_fiscal' => null,
                'referencia_externa' => $dados['referencia_externa'] ?? null,
            ];

            // Adicionar cliente_id APENAS se existir
            if ($clienteId) {
                $documentoData['cliente_id'] = $clienteId;
                Log::info('Adicionando cliente cadastrado', ['cliente_id' => $clienteId]);
            }

            // Adicionar cliente_nome APENAS se for cliente avulso (não tem cliente_id)
            if (!$clienteId && $clienteNome) {
                $documentoData['cliente_nome'] = $clienteNome;
                Log::info('Adicionando cliente avulso', ['cliente_nome' => $clienteNome]);

                if ($clienteNif) {
                    $documentoData['cliente_nif'] = $clienteNif;
                    Log::info('Adicionando NIF para cliente avulso', ['cliente_nif' => $clienteNif]);
                }
            }

            Log::info('Dados finais do documento', [
                'cliente_id' => $documentoData['cliente_id'] ?? null,
                'cliente_nome' => $documentoData['cliente_nome'] ?? null,
                'cliente_nif' => $documentoData['cliente_nif'] ?? null,
            ]);

            // Verificar se as colunas existem antes de criar
            try {
                $documento = DocumentoFiscal::create($documentoData);
                Log::info('Documento criado com sucesso', ['id' => $documento->id]);
            } catch (\Exception $e) {
                Log::error('Erro ao criar documento', [
                    'error' => $e->getMessage(),
                    'documentoData' => $documentoData
                ]);
                throw $e;
            }

            // Criar itens do documento
            if (!empty($totais['itens_processados'])) {
                $this->criarItensDocumento($documento, $totais['itens_processados']);
            }

            // Ações pós-criação específicas por tipo
            $this->executarAcoesPosCriacao($documento, $dados, $tipo);

            // Gerar hash fiscal
            $documento->update([
                'hash_fiscal' => $this->gerarHashFiscal($documento)
            ]);

            // FT: Se tiver dados de pagamento, gerar recibo automaticamente
            if ($tipo === 'FT' && !empty($dados['dados_pagamento'])) {
                $this->gerarRecibo($documento, [
                    'valor' => $dados['dados_pagamento']['valor'],
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'data_pagamento' => $dados['dados_pagamento']['data'] ?? now()->toDateString(),
                    'referencia' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            // FR: Registrar pagamento direto (não gera recibo separado)
            if ($tipo === 'FR' && !empty($dados['dados_pagamento'])) {
                $documento->update([
                    'metodo_pagamento' => $dados['dados_pagamento']['metodo'],
                    'referencia_pagamento' => $dados['dados_pagamento']['referencia'] ?? null,
                ]);
            }

            Log::info("{$config['nome']} emitida com sucesso", [
                'documento_id' => $documento->id,
                'numero' => $numeroDocumento,
                'cliente' => $clienteId ? 'cadastrado' : ($clienteNome ? 'avulso' : 'não informado')
            ]);

            return $documento->load('itens.produto', 'cliente', 'documentoOrigem');
        });
    }

    /**
     * Gerar recibo para fatura (FT) ou adiantamento (FA)
     */
    public function gerarRecibo(DocumentoFiscal $documentoOrigem, array $dados)
    {
        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FA'])) {
            throw new \InvalidArgumentException(
                "Apenas Faturas (FT) e Faturas de Adiantamento (FA) podem receber recibo. " .
                "Tipo recebido: {$documentoOrigem->tipo_documento}"
            );
        }

        if (in_array($documentoOrigem->estado, [self::ESTADO_PAGA, self::ESTADO_CANCELADO])) {
            throw new \InvalidArgumentException(
                "Documento já se encontra pago ou cancelado. " .
                "Estado atual: {$documentoOrigem->estado}"
            );
        }

        return DB::transaction(function () use ($documentoOrigem, $dados) {

            $valorPago = $dados['valor'];
            $valorPendente = $this->calcularValorPendente($documentoOrigem);

            if ($valorPago > $valorPendente) {
                throw new \InvalidArgumentException(
                    "Valor do pagamento ({$valorPago}) excede o valor pendente ({$valorPendente})."
                );
            }

            $serieFiscal = $this->obterSerieFiscal('RC');
            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, $serieFiscal->digitos ?? 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            $reciboData = [
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'fatura_id' => $documentoOrigem->id,
                'serie' => $serieFiscal->serie,
                'numero' => $numero,
                'numero_documento' => $numeroDocumento,
                'tipo_documento' => 'RC',
                'data_emissao' => $dados['data_pagamento'] ?? now()->toDateString(),
                'hora_emissao' => now()->toTimeString(),
                'data_vencimento' => null,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retencao' => 0,
                'total_liquido' => $valorPago,
                'estado' => self::ESTADO_PAGA,
                'metodo_pagamento' => $dados['metodo_pagamento'],
                'referencia_pagamento' => $dados['referencia'] ?? null,
                'hash_fiscal' => null,
            ];

            // Herdar dados do cliente do documento origem
            if ($documentoOrigem->cliente_id) {
                $reciboData['cliente_id'] = $documentoOrigem->cliente_id;
            } elseif ($documentoOrigem->cliente_nome) {
                $reciboData['cliente_nome'] = $documentoOrigem->cliente_nome;
                $reciboData['cliente_nif'] = $documentoOrigem->cliente_nif;
            }

            $recibo = DocumentoFiscal::create($reciboData);

            // Atualizar estado do documento origem
            $novoTotalPago = $this->calcularTotalPago($documentoOrigem) + $valorPago;

            // Se for FA, também considerar adiantamentos vinculados
            if ($documentoOrigem->tipo_documento === 'FA') {
                if ($novoTotalPago >= $documentoOrigem->total_liquido) {
                    $documentoOrigem->update(['estado' => self::ESTADO_PAGA]);
                } else {
                    $documentoOrigem->update(['estado' => self::ESTADO_PARCIALMENTE_PAGA]);
                }
            } else {
                // Para FT, considerar adiantamentos vinculados
                $totalAdiantamentos = DB::table('adiantamento_fatura')
                    ->where('fatura_id', $documentoOrigem->id)
                    ->sum('valor_utilizado');

                if ($novoTotalPago + $totalAdiantamentos >= $documentoOrigem->total_liquido) {
                    $documentoOrigem->update(['estado' => self::ESTADO_PAGA]);
                } else {
                    $documentoOrigem->update(['estado' => self::ESTADO_PARCIALMENTE_PAGA]);
                }
            }

            $recibo->update(['hash_fiscal' => $this->gerarHashFiscal($recibo)]);

            Log::info('Recibo gerado com sucesso', [
                'recibo_id' => $recibo->id,
                'recibo_numero' => $recibo->numero_documento,
                'documento_origem_id' => $documentoOrigem->id,
                'documento_origem_tipo' => $documentoOrigem->tipo_documento,
                'valor' => $valorPago
            ]);

            return $recibo->load('documentoOrigem');
        });
    }

    /**
     * Criar Nota de Crédito (NC) vinculada a FT ou FR
     */
    public function criarNotaCredito(DocumentoFiscal $documentoOrigem, array $dados)
    {
        Log::info('Iniciando criação de Nota de Crédito', [
            'documento_origem_id' => $documentoOrigem->id,
            'documento_origem_tipo' => $documentoOrigem->tipo_documento
        ]);

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FR'])) {
            throw new \InvalidArgumentException(
                "Nota de Crédito só pode ser gerada a partir de Fatura (FT) ou Fatura-Recibo (FR). " .
                "Tipo recebido: {$documentoOrigem->tipo_documento}"
            );
        }

        if ($documentoOrigem->estado === self::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException(
                "Não é possível gerar NC de documento cancelado. " .
                "Documento {$documentoOrigem->numero_documento} está cancelado."
            );
        }

        // Preparar dados
        $dados['tipo_documento'] = 'NC';
        $dados['fatura_id'] = $documentoOrigem->id;
        $dados['motivo'] = $dados['motivo'] ?? "Correção de {$documentoOrigem->numero_documento}";

        // Herdar dados do cliente do documento origem
        if ($documentoOrigem->cliente_id) {
            $dados['cliente_id'] = $documentoOrigem->cliente_id;
        } elseif ($documentoOrigem->cliente_nome) {
            $dados['cliente_nome'] = $documentoOrigem->cliente_nome;
            $dados['cliente_nif'] = $documentoOrigem->cliente_nif;
        }

        return $this->emitirDocumento($dados);
    }

    /**
     * Criar Nota de Débito (ND) vinculada a FT ou FR
     */
    public function criarNotaDebito(DocumentoFiscal $documentoOrigem, array $dados)
    {
        Log::info('Iniciando criação de Nota de Débito', [
            'documento_origem_id' => $documentoOrigem->id,
            'documento_origem_tipo' => $documentoOrigem->tipo_documento,
            'documento_origem_numero' => $documentoOrigem->numero_documento
        ]);

        if (!in_array($documentoOrigem->tipo_documento, ['FT', 'FR'])) {
            throw new \InvalidArgumentException(
                "Nota de Débito só pode ser gerada a partir de Fatura (FT) ou Fatura-Recibo (FR). " .
                "Tipo recebido: {$documentoOrigem->tipo_documento}"
            );
        }

        if ($documentoOrigem->estado === self::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException(
                "Não é possível gerar ND de documento cancelado. " .
                "Documento {$documentoOrigem->numero_documento} está cancelado."
            );
        }

        // Validar itens
        if (empty($dados['itens'])) {
            throw new \InvalidArgumentException("A Nota de Débito deve conter pelo menos um item.");
        }

        // Preparar dados
        $dados['tipo_documento'] = 'ND';
        $dados['fatura_id'] = $documentoOrigem->id;

        // Herdar dados do cliente do documento origem
        if ($documentoOrigem->cliente_id) {
            $dados['cliente_id'] = $documentoOrigem->cliente_id;
        } elseif ($documentoOrigem->cliente_nome) {
            $dados['cliente_nome'] = $documentoOrigem->cliente_nome;
            $dados['cliente_nif'] = $documentoOrigem->cliente_nif;
        }

        // Garantir motivo
        if (empty($dados['motivo'])) {
            $dados['motivo'] = "Débito adicional referente à {$documentoOrigem->numero_documento}";
        }

        return $this->emitirDocumento($dados);
    }

    /**
     * Vincular Fatura de Adiantamento (FA) a Fatura (FT)
     */
    public function vincularAdiantamento(DocumentoFiscal $adiantamento, DocumentoFiscal $fatura, float $valor)
    {
        if ($adiantamento->tipo_documento !== 'FA') {
            throw new \InvalidArgumentException(
                "Apenas Faturas de Adiantamento (FA) podem ser vinculadas. " .
                "Tipo recebido: {$adiantamento->tipo_documento}"
            );
        }

        if ($adiantamento->estado !== self::ESTADO_EMITIDO) {
            throw new \InvalidArgumentException(
                "Adiantamento deve estar emitido para ser vinculado. " .
                "Estado atual: {$adiantamento->estado}"
            );
        }

        if ($fatura->tipo_documento !== 'FT') {
            throw new \InvalidArgumentException(
                "Apenas Faturas (FT) podem receber adiantamentos. " .
                "Tipo recebido: {$fatura->tipo_documento}"
            );
        }

        if (in_array($fatura->estado, [self::ESTADO_CANCELADO, self::ESTADO_PAGA])) {
            throw new \InvalidArgumentException(
                "Fatura cancelada ou já paga não pode receber adiantamentos. " .
                "Estado atual: {$fatura->estado}"
            );
        }

        if ($valor > $adiantamento->total_liquido) {
            throw new \InvalidArgumentException(
                "Valor ({$valor}) excede o total do adiantamento ({$adiantamento->total_liquido})."
            );
        }

        $valorPendenteFatura = $this->calcularValorPendente($fatura);
        if ($valor > $valorPendenteFatura) {
            throw new \InvalidArgumentException(
                "Valor ({$valor}) excede o pendente da fatura ({$valorPendenteFatura})."
            );
        }

        return DB::transaction(function () use ($adiantamento, $fatura, $valor) {

            // Criar vínculo na tabela pivot
            DB::table('adiantamento_fatura')->insert([
                'id' => Str::uuid(),
                'adiantamento_id' => $adiantamento->id,
                'fatura_id' => $fatura->id,
                'valor_utilizado' => $valor,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Verificar se adiantamento foi totalmente utilizado
            $totalUtilizado = DB::table('adiantamento_fatura')
                ->where('adiantamento_id', $adiantamento->id)
                ->sum('valor_utilizado');

            if ($totalUtilizado >= $adiantamento->total_liquido) {
                $adiantamento->update(['estado' => self::ESTADO_PAGA]);
            }

            // Atualizar estado da fatura
            $totalAdiantamentos = DB::table('adiantamento_fatura')
                ->where('fatura_id', $fatura->id)
                ->sum('valor_utilizado');

            $totalPago = $this->calcularTotalPago($fatura);
            $valorPendente = $fatura->total_liquido - $totalPago - $totalAdiantamentos;

            if ($valorPendente <= 0) {
                $fatura->update(['estado' => self::ESTADO_PAGA]);
            } else {
                $fatura->update(['estado' => self::ESTADO_PARCIALMENTE_PAGA]);
            }

            Log::info('Adiantamento vinculado com sucesso', [
                'adiantamento_id' => $adiantamento->id,
                'fatura_id' => $fatura->id,
                'valor' => $valor
            ]);

            return [
                'adiantamento' => $adiantamento->fresh(),
                'fatura' => $fatura->fresh()
            ];
        });
    }

    /**
     * Cancelar documento fiscal
     */
    public function cancelarDocumento(DocumentoFiscal $documento, string $motivo)
    {
        if ($documento->estado === self::ESTADO_CANCELADO) {
            throw new \InvalidArgumentException("Documento já se encontra cancelado.");
        }

        // Verificar se tem documentos derivados não cancelados
        $derivadosNaoCancelados = $documento->documentosDerivados()
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->count();

        if ($derivadosNaoCancelados > 0) {
            throw new \InvalidArgumentException(
                "Documento possui documentos derivados ativos. Cancele-os primeiro. " .
                "Quantidade: {$derivadosNaoCancelados}"
            );
        }

        return DB::transaction(function () use ($documento, $motivo) {

            // Reverter stock se aplicável
            if ($this->configuracoesTipo[$documento->tipo_documento]['afeta_stock']) {
                $this->reverterStock($documento);
            }

            // Se for FT ou FA com recibos associados, verificar
            if (in_array($documento->tipo_documento, ['FT', 'FA'])) {
                $recibosAtivos = $documento->recibos()
                    ->where('estado', '!=', self::ESTADO_CANCELADO)
                    ->count();

                if ($recibosAtivos > 0) {
                    throw new \InvalidArgumentException(
                        "Documento possui recibos ativos. Cancele-os primeiro. " .
                        "Quantidade: {$recibosAtivos}"
                    );
                }
            }

            $documento->update([
                'estado' => self::ESTADO_CANCELADO,
                'motivo_cancelamento' => $motivo,
                'data_cancelamento' => now(),
                'user_cancelamento_id' => Auth::id(),
            ]);

            Log::info("Documento cancelado", [
                'documento_id' => $documento->id,
                'documento_numero' => $documento->numero_documento,
                'tipo' => $documento->tipo_documento,
                'motivo' => $motivo
            ]);

            return $documento->fresh();
        });
    }

    /**
     * Processar adiantamentos expirados (chamar via cron/job)
     */
    public function processarAdiantamentosExpirados(): int
    {
        $expirados = DocumentoFiscal::where('tipo_documento', 'FA')
            ->where('estado', self::ESTADO_EMITIDO)
            ->where('data_vencimento', '<', now())
            ->get();

        $count = 0;
        foreach ($expirados as $fa) {
            $fa->update(['estado' => self::ESTADO_EXPIRADO]);
            $count++;

            Log::info("Adiantamento expirado", [
                'documento_id' => $fa->id,
                'documento_numero' => $fa->numero_documento,
                'data_vencimento' => $fa->data_vencimento
            ]);
        }

        return $count;
    }

    /**
     * Listar documentos com filtros
     */
    public function listarDocumentos(array $filtros = [])
    {
        $query = DocumentoFiscal::with('cliente', 'venda', 'itens.produto');

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

        // Filtro apenas vendas (FT, FR, RC)
        if (!empty($filtros['apenas_vendas'])) {
            $query->whereIn('tipo_documento', ['FT', 'FR', 'RC']);
        }

        // Filtro apenas não-vendas (FP, FA, NC, ND, FRt)
        if (!empty($filtros['apenas_nao_vendas'])) {
            $query->whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt']);
        }

        // Filtro de documentos pendentes (FT não pagas totalmente)
        if (!empty($filtros['pendentes'])) {
            $query->where('tipo_documento', 'FT')
                ->whereIn('estado', [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
        }

        // Filtro de adiantamentos pendentes de utilização
        if (!empty($filtros['adiantamentos_pendentes'])) {
            $query->where('tipo_documento', 'FA')
                ->where('estado', self::ESTADO_EMITIDO);
        }

        // Filtro de proformas pendentes
        if (!empty($filtros['proformas_pendentes'])) {
            $query->where('tipo_documento', 'FP')
                ->where('estado', self::ESTADO_EMITIDO);
        }

        return $query->orderBy('data_emissao', 'desc')->paginate($filtros['per_page'] ?? 20);
    }

    /**
     * Buscar documento específico com todas as relações
     */
    public function buscarDocumento(string $documentoId): DocumentoFiscal
    {
        Log::info('Buscando documento no service:', ['id' => $documentoId]);

        // Validar se é UUID válido
        if (!Str::isUuid($documentoId)) {
            throw new \InvalidArgumentException('ID de documento inválido. Formato UUID esperado.');
        }

        try {
            $documento = DocumentoFiscal::with([
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
                'userCancelamento'
            ])->findOrFail($documentoId);

            Log::info('Documento encontrado no service:', [
                'id' => $documento->id,
                'tipo' => $documento->tipo_documento,
                'numero' => $documento->numero_documento,
                'cliente' => $documento->cliente_id ? 'cadastrado' : ($documento->cliente_nome ? 'avulso' : 'não informado')
            ]);

            return $documento;

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Documento não encontrado no service:', ['id' => $documentoId]);
            throw $e;
        }
    }

    /**
     * Calcular valor pendente de uma fatura (FT) ou adiantamento (FA)
     */
    public function calcularValorPendente(DocumentoFiscal $documento): float
    {
        if (!in_array($documento->tipo_documento, ['FT', 'FA'])) {
            return 0;
        }

        $totalPago = $this->calcularTotalPago($documento);

        if ($documento->tipo_documento === 'FA') {
            return max(0, $documento->total_liquido - $totalPago);
        }

        // Para FT, considerar adiantamentos vinculados
        $totalAdiantamentos = DB::table('adiantamento_fatura')
            ->where('fatura_id', $documento->id)
            ->sum('valor_utilizado');

        return max(0, $documento->total_liquido - $totalPago - $totalAdiantamentos);
    }

    // =================== MÉTODOS PRIVADOS ===================

    private function validarDadosPorTipo(array $dados, string $tipo, array $config)
    {
        // Log para debug da validação
        Log::info('=== VALIDAÇÃO DE DOCUMENTO FISCAL ===', [
            'tipo' => $tipo,
            'exige_cliente' => $config['exige_cliente'],
            'cliente_id' => $dados['cliente_id'] ?? null,
            'cliente_nome' => $dados['cliente_nome'] ?? null,
        ]);

        // Validar cliente
        if ($config['exige_cliente']) {
            $temClienteCadastrado = !empty($dados['cliente_id']);
            $temClienteAvulso = !empty($dados['cliente_nome']);

            Log::info('Verificando cliente', [
                'tem_cliente_cadastrado' => $temClienteCadastrado,
                'tem_cliente_avulso' => $temClienteAvulso,
            ]);

            if (!$temClienteCadastrado && !$temClienteAvulso) {
                $erro = "{$config['nome']} requer um cliente (cadastrado ou avulso).";
                Log::error('Falha na validação de cliente', [
                    'erro' => $erro,
                    'dados_recebidos' => $dados
                ]);
                throw new \InvalidArgumentException($erro);
            }

            Log::info('Validação de cliente aprovada', [
                'tem_cliente_cadastrado' => $temClienteCadastrado,
                'tem_cliente_avulso' => $temClienteAvulso,
            ]);
        }

        // Validações específicas por tipo
        $regras = [
            'FR' => ['dados_pagamento' => 'required'],
            'FA' => ['data_vencimento' => 'required'],
            'RC' => ['fatura_id' => 'required'],
            'NC' => ['fatura_id' => 'required', 'motivo' => 'required', 'itens' => 'required'],
            'ND' => ['fatura_id' => 'required', 'itens' => 'required'],
            'FRt' => ['fatura_id' => 'required', 'motivo' => 'required'],
        ];

        if (isset($regras[$tipo])) {
            foreach ($regras[$tipo] as $campo => $regra) {
                if ($regra === 'required' && empty($dados[$campo])) {
                    throw new \InvalidArgumentException(
                        "Campo {$campo} é obrigatório para {$config['nome']}."
                    );
                }
            }
        }

        // Validar documento origem para NC/ND/RC/FRt
        if (!empty($dados['fatura_id'])) {
            $origem = DocumentoFiscal::find($dados['fatura_id']);
            if (!$origem) {
                throw new \InvalidArgumentException("Documento de origem não encontrado.");
            }

            if (in_array($tipo, ['NC', 'ND']) && !in_array($origem->tipo_documento, ['FT', 'FR'])) {
                throw new \InvalidArgumentException(
                    "NC/ND só podem ser geradas a partir de FT ou FR. " .
                    "Tipo recebido: {$origem->tipo_documento}"
                );
            }

            if ($tipo === 'RC' && !in_array($origem->tipo_documento, ['FT', 'FA'])) {
                throw new \InvalidArgumentException(
                    "Recibo só pode ser gerado a partir de FT ou FA. " .
                    "Tipo recebido: {$origem->tipo_documento}"
                );
            }
        }
    }

    private function obterSerieFiscal(string $tipo)
    {
        $serie = SerieFiscal::where('tipo_documento', $tipo)
            ->where('ativa', true)
            ->where(function ($q) {
                $q->whereNull('ano')->orWhere('ano', now()->year);
            })
            ->orderBy('padrao', 'desc')
            ->lockForUpdate()
            ->first();

        if (!$serie) {
            throw new \RuntimeException("Nenhuma série fiscal ativa encontrada para {$tipo}.");
        }

        return $serie;
    }

    private function calcularDataVencimento(string $tipo, array $dados, $dataEmissao): ?string
    {
        // Documentos sem vencimento
        if (in_array($tipo, ['RC', 'NC', 'FRt', 'FP'])) {
            return null;
        }

        // FA usa data_vencimento como data prevista de entrega
        if ($tipo === 'FA') {
            return $dados['data_vencimento'] ?? $dataEmissao->copy()->addDays(30)->toDateString();
        }

        if (!empty($dados['data_vencimento'])) {
            return $dados['data_vencimento'];
        }

        $prazoDias = match ($tipo) {
            'FR' => 0,  // FR é paga à vista
            'ND' => 15,
            default => 30,
        };

        return $dataEmissao->copy()->addDays($prazoDias)->toDateString();
    }

    /**
     * CORREÇÃO PRINCIPAL: Lógica de cálculo de impostos corrigida
     */
    private function processarItens(array $itens, bool $aplicaIva, string $regime)
    {
        $totalBase = 0;
        $totalIva = 0;
        $totalRetencao = 0;
        $itensProcessados = [];

        foreach ($itens as $item) {
            $produto = null;
            if (!empty($item['produto_id'])) {
                $produto = Produto::find($item['produto_id']);
            }

            $quantidade = (float) ($item['quantidade'] ?? 1);
            $precoUnitario = (float) ($item['preco_venda'] ?? $item['preco_unitario'] ?? 0);
            $desconto = (float) ($item['desconto'] ?? 0);
            $taxaDesconto = (float) ($item['taxa_desconto'] ?? 0);

            // 1. Calcular VALOR BRUTO da linha (sem descontos)
            $valorBruto = $quantidade * $precoUnitario;

            // 2. Aplicar desconto percentual se existir
            if ($taxaDesconto > 0) {
                $desconto += ($valorBruto * $taxaDesconto / 100);
            }

            // 3. Desconto não pode ser maior que valor bruto
            $desconto = min($desconto, $valorBruto);

            // 4. Calcular BASE TRIBUTÁVEL (valor bruto - desconto)
            $baseTributavel = $valorBruto - $desconto;
            $baseTributavel = max($baseTributavel, 0);

            // 5. Determinar taxa de IVA
            $taxaIva = 0;
            if ($aplicaIva && $regime === 'geral') {
                // Usar taxa específica do item, do produto, ou padrão 14%
                $taxaIva = (float) ($item['taxa_iva'] ?? $produto?->taxa_iva ?? 14);
            }

            // 6. Calcular IVA sobre a BASE TRIBUTÁVEL (já descontada)
            // FÓRMULA CORRETA: IVA incide sobre o valor líquido da linha após descontos
            $valorIva = round(($baseTributavel * $taxaIva) / 100, 2);

            // 7. Calcular retenção na fonte (se aplicável)
            $valorRetencao = 0;
            if ($produto && $produto->tipo === 'servico' && $aplicaIva) {
                // Retenção de 6.5% sobre o valor líquido (base tributável)
                // ou usar taxa configurada no produto/empresa
                $taxaRetencao = (float) ($produto->taxa_retencao ?? $item['taxa_retencao'] ?? 6.5);
                $valorRetencao = round(($baseTributavel * $taxaRetencao) / 100, 2);
            }

            // 8. Calcular TOTAL DA LINHA
            // FÓRMULA: Base + IVA - Retenção
            $totalLinha = round($baseTributavel + $valorIva - $valorRetencao, 2);

            // 9. Guardar valores detalhados para possível análise/relatórios
            $itensProcessados[] = [
                'produto_id' => $item['produto_id'] ?? null,
                'descricao' => $item['descricao'] ?? $produto?->nome ?? 'Item',
                'quantidade' => $quantidade,
                'preco_unitario' => $precoUnitario,
                'valor_bruto' => round($valorBruto, 2),           // NOVO: valor antes desconto
                'desconto' => round($desconto, 2),
                'taxa_desconto' => $taxaDesconto,
                'base_tributavel' => round($baseTributavel, 2),
                'taxa_iva' => $taxaIva,
                'valor_iva' => $valorIva,
                'taxa_retencao' => $valorRetencao > 0 ? ($produto->taxa_retencao ?? 6.5) : 0, // NOVO
                'valor_retencao' => $valorRetencao,
                'total_linha' => $totalLinha,
            ];

            // 10. Acumular totais (sem arredondamento intermediário para evitar diferenças de centavo)
            $totalBase += $baseTributavel;
            $totalIva += $valorIva;
            $totalRetencao += $valorRetencao;
        }

        // Arredondar totais finais apenas no final
        $totalBase = round($totalBase, 2);
        $totalIva = round($totalIva, 2);
        $totalRetencao = round($totalRetencao, 2);
        $totalLiquido = round($totalBase + $totalIva - $totalRetencao, 2);

        // Validação de segurança: verificar se soma das linhas bate com totais
        $somaLinhas = array_sum(array_column($itensProcessados, 'total_linha'));
        if (abs($somaLinhas - $totalLiquido) > 0.01) {
            Log::warning('Diferença de arredondamento detectada', [
                'soma_linhas' => $somaLinhas,
                'total_calculado' => $totalLiquido,
                'diferenca' => $somaLinhas - $totalLiquido
            ]);
            // Ajustar total líquido para bater com soma das linhas (mais preciso)
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

    private function criarItensDocumento(DocumentoFiscal $documento, array $itensProcessados)
    {
        foreach ($itensProcessados as $index => $item) {
            ItemDocumentoFiscal::create([
                'id' => Str::uuid(),
                'documento_fiscal_id' => $documento->id,
                'produto_id' => $item['produto_id'],
                'descricao' => $item['descricao'],
                'quantidade' => $item['quantidade'],
                'preco_unitario' => $item['preco_unitario'],
                'base_tributavel' => $item['base_tributavel'],
                'taxa_iva' => $item['taxa_iva'],
                'valor_iva' => $item['valor_iva'],
                'valor_retencao' => $item['valor_retencao'],
                'desconto' => $item['desconto'],
                'total_linha' => $item['total_linha'],
                'ordem' => $index + 1,
            ]);
        }
    }

    private function executarAcoesPosCriacao(DocumentoFiscal $documento, array $dados, string $tipo)
    {
        // Movimentar stock se aplicável
        if ($this->configuracoesTipo[$tipo]['afeta_stock']) {
            $this->movimentarStock($documento, 'saida');
        }

        // Se for NC, reverter stock (entrada)
        if ($tipo === 'NC') {
            $this->movimentarStock($documento, 'entrada');
        }

        // Se for venda (FT/FR), atualizar venda se existir
        if (in_array($tipo, ['FT', 'FR']) && !empty($dados['venda_id'])) {
            $this->atualizarVenda($dados['venda_id'], $documento);
        }
    }

    private function calcularTotalPago(DocumentoFiscal $documento): float
    {
        return DocumentoFiscal::where('fatura_id', $documento->id)
            ->where('tipo_documento', 'RC')
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->sum('total_liquido');
    }

    private function resolverCliente(array $dados, string $tipo): ?string
    {
        // Se tem cliente_id, usa ele
        if (!empty($dados['cliente_id'])) {
            return $dados['cliente_id'];
        }

        // Se tem cliente_nome, é cliente avulso - não cria ID
        if (!empty($dados['cliente_nome'])) {
            return null;
        }

        // Se tem fatura_id, herda cliente da fatura origem
        if (!empty($dados['fatura_id'])) {
            $faturaOrigem = DocumentoFiscal::find($dados['fatura_id']);
            if ($faturaOrigem) {
                return $faturaOrigem->cliente_id;
            }
        }

        // Se tem venda_id, herda cliente da venda
        if (!empty($dados['venda_id'])) {
            $venda = Venda::find($dados['venda_id']);
            if ($venda) {
                return $venda->cliente_id;
            }
        }

        return null;
    }

    private function gerarHashFiscal(DocumentoFiscal $documento): string
    {
        $dadosHash = $documento->numero_documento .
            $documento->data_emissao .
            number_format($documento->total_liquido, 2, '.', '') .
            ($documento->cliente_id ?? $documento->cliente_nome ?? 'consumidor_final') .
            env('APP_KEY');

        return hash('sha256', $dadosHash);
    }

    private function movimentarStock(DocumentoFiscal $documento, string $tipoMovimento)
    {
        // Implementar integração com StockService
        Log::info("Movimentação de stock {$tipoMovimento}", [
            'documento' => $documento->numero_documento,
            'tipo' => $documento->tipo_documento,
            'itens' => $documento->itens->map(function ($item) {
                return [
                    'produto_id' => $item->produto_id,
                    'quantidade' => $item->quantidade
                ];
            })
        ]);

        // TODO: Implementar lógica real de stock
        // StockService::movimentar($documento, $tipoMovimento);
    }

    private function reverterStock(DocumentoFiscal $documento)
    {
        $tipoReversao = $documento->tipo_documento === 'NC' ? 'saida' : 'entrada';

        Log::info("Reversão de stock", [
            'documento' => $documento->numero_documento,
            'tipo_reversao' => $tipoReversao
        ]);

        $this->movimentarStock($documento, $tipoReversao);
    }

    private function atualizarVenda(string $vendaId, DocumentoFiscal $documento)
    {
        try {
            $venda = Venda::find($vendaId);
            if ($venda) {
                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status' => 'faturada',
                    'tipo_documento_fiscal' => $documento->tipo_documento
                ]);

                Log::info('Venda atualizada com documento fiscal', [
                    'venda_id' => $vendaId,
                    'documento_id' => $documento->id,
                    'tipo_documento' => $documento->tipo_documento
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Erro ao atualizar venda:', [
                'venda_id' => $vendaId,
                'error' => $e->getMessage()
            ]);
        }
    }
}
