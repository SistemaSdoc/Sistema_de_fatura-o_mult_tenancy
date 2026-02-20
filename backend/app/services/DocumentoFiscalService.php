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
        'FT' => ['nome' => 'Fatura', 'afeta_stock' => true, 'eh_venda' => true, 'gera_recibo' => true, 'estado_inicial' => 'emitido'],
        'FR' => ['nome' => 'Fatura-Recibo', 'afeta_stock' => true, 'eh_venda' => true, 'gera_recibo' => false, 'estado_inicial' => 'paga'],
        'FA' => ['nome' => 'Fatura de Adiantamento', 'afeta_stock' => false, 'eh_venda' => false, 'gera_recibo' => false, 'estado_inicial' => 'emitido'],
        'NC' => ['nome' => 'Nota de Crédito', 'afeta_stock' => true, 'eh_venda' => false, 'gera_recibo' => false, 'estado_inicial' => 'emitido'],
        'ND' => ['nome' => 'Nota de Débito', 'afeta_stock' => false, 'eh_venda' => false, 'gera_recibo' => false, 'estado_inicial' => 'emitido'],
        'RC' => ['nome' => 'Recibo', 'afeta_stock' => false, 'eh_venda' => false, 'gera_recibo' => false, 'estado_inicial' => 'paga'],
        'FRt' => ['nome' => 'Fatura de Retificação', 'afeta_stock' => false, 'eh_venda' => false, 'gera_recibo' => false, 'estado_inicial' => 'emitido'],
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

        Log::info("Iniciando emissão de {$config['nome']}", ['tipo' => $tipo, 'dados' => $dados]);

        return DB::transaction(function () use ($dados, $tipo, $config) {

            $empresa = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // Validações específicas por tipo
            $this->validarDadosPorTipo($dados, $tipo);

            // Obter série fiscal
            $serieFiscal = $this->obterSerieFiscal($tipo);
            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            // Calcular datas
            $dataEmissao = now();
            $dataVencimento = $this->calcularDataVencimento($tipo, $dados, $dataEmissao);

            // Processar itens e calcular totais
            $totais = $this->processarItens($dados['itens'] ?? [], $aplicaIva, $regime);

            // Resolver cliente
            $clienteId = $dados['cliente_id'] ?? $this->resolverCliente($dados, $tipo);

            // Criar documento base
            $documento = DocumentoFiscal::create([
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'venda_id' => $dados['venda_id'] ?? null,
                'cliente_id' => $clienteId,
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
            ]);

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
                'numero' => $numeroDocumento
            ]);

            return $documento->load('itens.produto', 'cliente', 'documentoOrigem');
        });
    }

    /**
     * Gerar recibo para fatura (FT)
     */
    public function gerarRecibo(DocumentoFiscal $fatura, array $dados)
    {
        if ($fatura->tipo_documento !== 'FT') {
            throw new \InvalidArgumentException("Apenas Faturas (FT) podem receber recibo.");
        }

        if (in_array($fatura->estado, [self::ESTADO_PAGA, self::ESTADO_CANCELADO])) {
            throw new \InvalidArgumentException("Fatura já se encontra paga ou cancelada.");
        }

        return DB::transaction(function () use ($fatura, $dados) {

            $valorPago = $dados['valor'];
            $valorPendente = $this->calcularValorPendente($fatura);

            if ($valorPago > $valorPendente) {
                throw new \InvalidArgumentException("Valor do pagamento ({$valorPago}) excede o valor pendente ({$valorPendente}).");
            }

            $serieFiscal = $this->obterSerieFiscal('RC');
            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            $recibo = DocumentoFiscal::create([
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'fatura_id' => $fatura->id,
                'cliente_id' => $fatura->cliente_id,
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
            ]);

            // Atualizar estado da fatura
            $novoTotalPago = $this->calcularTotalPago($fatura) + $valorPago;

            if ($novoTotalPago >= $fatura->total_liquido) {
                $fatura->update(['estado' => self::ESTADO_PAGA]);
            } else {
                $fatura->update(['estado' => self::ESTADO_PARCIALMENTE_PAGA]);
            }

            $recibo->update(['hash_fiscal' => $this->gerarHashFiscal($recibo)]);

            return $recibo->load('documentoOrigem');
        });
    }

    /**
     * Criar Nota de Crédito (NC) vinculada a FT ou FR
     */
    public function criarNotaCredito(DocumentoFiscal $documentoOrigem, array $dados)
    {
        // Log para debug
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
        $dados['cliente_id'] = $documentoOrigem->cliente_id;
        $dados['motivo'] = $dados['motivo'] ?? "Correção de {$documentoOrigem->numero_documento}";

        return $this->emitirDocumento($dados);
    }

    /**
     * Criar Nota de Débito (ND) vinculada a FT ou FR
     */
    public function criarNotaDebito(DocumentoFiscal $documentoOrigem, array $dados)
    {
        // Log para debug
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
        $dados['cliente_id'] = $documentoOrigem->cliente_id;

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
            throw new \InvalidArgumentException("Apenas Faturas de Adiantamento (FA) podem ser vinculadas.");
        }

        if ($adiantamento->estado !== self::ESTADO_EMITIDO) {
            throw new \InvalidArgumentException("Adiantamento deve estar emitido para ser vinculado.");
        }

        if ($fatura->tipo_documento !== 'FT') {
            throw new \InvalidArgumentException("Apenas Faturas (FT) podem receber adiantamentos.");
        }

        if (in_array($fatura->estado, [self::ESTADO_CANCELADO, self::ESTADO_PAGA])) {
            throw new \InvalidArgumentException("Fatura cancelada ou já paga não pode receber adiantamentos.");
        }

        if ($valor > $adiantamento->total_liquido) {
            throw new \InvalidArgumentException("Valor excede o total do adiantamento.");
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

            $valorPendente = $fatura->total_liquido - $this->calcularTotalPago($fatura) - $totalAdiantamentos;

            if ($valorPendente <= 0) {
                $fatura->update(['estado' => self::ESTADO_PAGA]);
            } else {
                $fatura->update(['estado' => self::ESTADO_PARCIALMENTE_PAGA]);
            }

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
            throw new \InvalidArgumentException("Documento possui documentos derivados ativos. Cancele-os primeiro.");
        }

        return DB::transaction(function () use ($documento, $motivo) {

            // Reverter stock se aplicável
            if ($this->configuracoesTipo[$documento->tipo_documento]['afeta_stock']) {
                $this->reverterStock($documento);
            }

            // Se for FT ou FR com NC/ND associados, verificar
            if (in_array($documento->tipo_documento, ['FT', 'FR'])) {
                // Cancelar recibos associados
                $documento->recibos()->where('estado', '!=', self::ESTADO_CANCELADO)->each(function ($recibo) use ($motivo) {
                    $this->cancelarDocumento($recibo, "Cancelamento automático: {$motivo}");
                });
            }

            $documento->update([
                'estado' => self::ESTADO_CANCELADO,
                'motivo_cancelamento' => $motivo,
                'data_cancelamento' => now(),
                'user_cancelamento_id' => Auth::id(),
            ]);

            Log::info("Documento cancelado", [
                'documento_id' => $documento->id,
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

        if (!empty($filtros['data_inicio'])) {
            $query->whereDate('data_emissao', '>=', $filtros['data_inicio']);
        }

        if (!empty($filtros['data_fim'])) {
            $query->whereDate('data_emissao', '<=', $filtros['data_fim']);
        }

        // Filtro de documentos pendentes (FT/FR não pagas totalmente)
        if (!empty($filtros['pendentes'])) {
            $query->whereIn('tipo_documento', ['FT', 'FR'])
                ->whereIn('estado', [self::ESTADO_EMITIDO, self::ESTADO_PARCIALMENTE_PAGA]);
        }

        // Filtro de adiantamentos pendentes de utilização
        if (!empty($filtros['adiantamentos_pendentes'])) {
            $query->where('tipo_documento', 'FA')
                ->where('estado', self::ESTADO_EMITIDO);
        }

        return $query->orderBy('data_emissao', 'desc')->paginate($filtros['per_page'] ?? 20);
    }

    /**
     * Buscar documento específico com todas as relações
     */
    public function buscarDocumento(string $documentoId): DocumentoFiscal
    {
        // Log para debug
        Log::info('Buscando documento no service:', ['id' => $documentoId]);

        // Validar se é UUID válido (opcional, mas recomendado)
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
                'numero' => $documento->numero_documento
            ]);

            return $documento;

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Documento não encontrado no service:', ['id' => $documentoId]);
            throw $e;
        }
    }

    /**
     * Calcular valor pendente de uma fatura
     */
    public function calcularValorPendente(DocumentoFiscal $fatura): float
    {
        if (!in_array($fatura->tipo_documento, ['FT', 'FR'])) {
            return 0;
        }

        $totalPago = $this->calcularTotalPago($fatura);
        $totalAdiantamentos = DB::table('adiantamento_fatura')
            ->where('fatura_id', $fatura->id)
            ->sum('valor_utilizado');

        return max(0, $fatura->total_liquido - $totalPago - $totalAdiantamentos);
    }

    // =================== MÉTODOS PRIVADOS ===================

    private function validarDadosPorTipo(array $dados, string $tipo)
    {
        $regras = [
            'FT' => ['cliente_id' => 'required'],
            'FR' => ['cliente_id' => 'required', 'dados_pagamento' => 'required'],
            'FA' => ['cliente_id' => 'required', 'data_vencimento' => 'required'],
            'RC' => ['fatura_id' => 'required'],
            'NC' => ['fatura_id' => 'required', 'motivo' => 'required', 'itens' => 'required'],
            'ND' => ['fatura_id' => 'required', 'itens' => 'required'],
            'FRt' => ['fatura_id' => 'required', 'motivo' => 'required'],
        ];

        if (isset($regras[$tipo])) {
            foreach ($regras[$tipo] as $campo => $regra) {
                if ($regra === 'required' && empty($dados[$campo])) {
                    throw new \InvalidArgumentException(
                        "Campo {$campo} é obrigatório para {$this->configuracoesTipo[$tipo]['nome']}."
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
                throw new \InvalidArgumentException("NC/ND só podem ser geradas a partir de FT ou FR.");
            }

            if ($tipo === 'RC' && $origem->tipo_documento !== 'FT') {
                throw new \InvalidArgumentException("Recibo só pode ser gerado a partir de FT.");
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
        if (in_array($tipo, ['RC', 'NC', 'FRt'])) {
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

            $baseTributavel = ($quantidade * $precoUnitario) - $desconto;
            $baseTributavel = max($baseTributavel, 0);

            $taxaIva = ($aplicaIva && $regime === 'geral')
                ? (float) ($item['taxa_iva'] ?? $produto?->taxa_iva ?? 14)
                : 0;

            $valorIva = round(($baseTributavel * $taxaIva) / 100, 2);

            $valorRetencao = ($produto && $produto->tipo === 'servico')
                ? round($baseTributavel * 0.1, 2)
                : 0;

            $totalLinha = round($baseTributavel + $valorIva - $valorRetencao, 2);

            $itensProcessados[] = [
                'produto_id' => $item['produto_id'] ?? null,
                'descricao' => $item['descricao'] ?? $produto?->nome ?? 'Item',
                'quantidade' => $quantidade,
                'preco_unitario' => $precoUnitario,
                'base_tributavel' => $baseTributavel,
                'taxa_iva' => $taxaIva,
                'valor_iva' => $valorIva,
                'valor_retencao' => $valorRetencao,
                'desconto' => $desconto,
                'total_linha' => $totalLinha,
            ];

            $totalBase += $baseTributavel;
            $totalIva += $valorIva;
            $totalRetencao += $valorRetencao;
        }

        return [
            'base' => round($totalBase, 2),
            'iva' => round($totalIva, 2),
            'retencao' => round($totalRetencao, 2),
            'liquido' => round($totalBase + $totalIva - $totalRetencao, 2),
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

    private function calcularTotalPago(DocumentoFiscal $fatura): float
    {
        return DocumentoFiscal::where('fatura_id', $fatura->id)
            ->where('tipo_documento', 'RC')
            ->where('estado', '!=', self::ESTADO_CANCELADO)
            ->sum('total_liquido');
    }

    private function resolverCliente(array $dados, string $tipo): ?string
    {
        if (!empty($dados['fatura_id'])) {
            $faturaOrigem = DocumentoFiscal::find($dados['fatura_id']);
            return $faturaOrigem?->cliente_id;
        }

        if (!empty($dados['venda_id'])) {
            $venda = Venda::find($dados['venda_id']);
            return $venda?->cliente_id;
        }

        return null;
    }

    private function gerarHashFiscal(DocumentoFiscal $documento): string
    {
        $dadosHash = $documento->numero_documento .
            $documento->data_emissao .
            number_format($documento->total_liquido, 2, '.', '') .
            $documento->cliente_id .
            env('APP_KEY');

        return hash('sha256', $dadosHash);
    }

    private function movimentarStock(DocumentoFiscal $documento, string $tipoMovimento)
    {
        // Implementar integração com StockService
        Log::info("Movimentação de stock {$tipoMovimento}", [
            'documento' => $documento->numero_documento,
            'tipo' => $documento->tipo_documento
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

        // TODO: Implementar reversão real de stock
    }

    private function atualizarVenda(string $vendaId, DocumentoFiscal $documento)
    {
        try {
            $venda = Venda::find($vendaId);
            if ($venda) {
                $venda->update([
                    'documento_fiscal_id' => $documento->id,
                    'status' => 'faturado'
                ]);

                Log::info('Venda atualizada com documento fiscal', [
                    'venda_id' => $vendaId,
                    'documento_id' => $documento->id
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
