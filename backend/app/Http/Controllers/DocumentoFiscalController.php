<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DocumentoFiscal;
use App\Services\DocumentoFiscalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class DocumentoFiscalController extends Controller
{
    protected $documentoService;

    public function __construct(DocumentoFiscalService $documentoService)
    {
        $this->documentoService = $documentoService;
    }

    /**
     * Listar documentos fiscais com filtros
     */
    public function index(Request $request)
    {
        try {
            $filtros = $request->validate([
                'tipo' => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado' => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255', // Para cliente avulso
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date',
                'pendentes' => 'nullable|boolean',
                'adiantamentos_pendentes' => 'nullable|boolean',
                'proformas_pendentes' => 'nullable|boolean', // NOVO
                'apenas_vendas' => 'nullable|boolean', // Filtrar apenas FT, FR, RC
                'apenas_nao_vendas' => 'nullable|boolean',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            $documentos = $this->documentoService->listarDocumentos($filtros);

            return response()->json([
                'success' => true,
                'message' => 'Lista de documentos carregada com sucesso',
                'data' => $documentos
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao listar documentos:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar documentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar documento específico
     */
    public function show($id)
    {
        Log::channel('single')->info('========== DOCUMENTO FISCAL CONTROLLER ==========');
        Log::channel('single')->info('1. Método show chamado', [
            'id_recebido' => $id,
            'tipo_id' => gettype($id),
            'metodo' => request()->method(),
            'url' => request()->fullUrl()
        ]);

        try {
            if (!$id) {
                Log::channel('single')->error('2. ERRO: ID nulo ou vazio');
                return response()->json([
                    'success' => false,
                    'message' => 'ID do documento não fornecido'
                ], 400);
            }

            Log::channel('single')->info('3. Chamando service buscarDocumento', ['id' => $id]);

            $documento = $this->documentoService->buscarDocumento($id);

            Log::channel('single')->info('4. Documento encontrado', [
                'id' => $documento->id,
                'tipo' => $documento->tipo_documento,
                'numero' => $documento->numero_documento,
                'cliente' => $documento->cliente ? 'cadastrado' : ($documento->cliente_nome ? 'avulso' : 'não informado')
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Documento carregado com sucesso',
                'data' => ['documento' => $documento]
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::channel('single')->error('5. ERRO: Documento não encontrado', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Documento não encontrado'
            ], 404);
        } catch (\Exception $e) {
            Log::channel('single')->error('6. ERRO inesperado', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar documento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Emitir qualquer tipo de documento fiscal
     * ✅ NOTA: O troco não é tratado aqui - é responsabilidade do frontend
     * A validação de pagamento para FR está no VendaController, não neste controller
     */
    public function emitir(Request $request)
    {
        try {
            $dados = $request->validate([
                'tipo_documento' => 'required|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'venda_id' => 'nullable|uuid|exists:vendas,id',
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255', // Para cliente avulso
                'cliente_nif' => 'nullable|string|max:20',   // Para cliente avulso
                'fatura_id' => 'nullable|uuid|exists:documentos_fiscais,id',
                'itens' => 'required_unless:tipo_documento,FA|array',
                'itens.*.produto_id' => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao' => 'required_with:itens|string',
                'itens.*.quantidade' => 'required_with:itens|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required_with:itens|numeric|min:0',
                'itens.*.taxa_iva' => 'required_with:itens|numeric|min:0',
                'itens.*.desconto' => 'nullable|numeric|min:0',
                'dados_pagamento' => 'nullable|array',
                'dados_pagamento.metodo' => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'dados_pagamento.valor' => 'required_with:dados_pagamento|numeric|min:0.01',
                'dados_pagamento.data' => 'nullable|date',
                'dados_pagamento.referencia' => 'nullable|string|max:100',
                'motivo' => 'nullable|string|max:500',
                'data_vencimento' => 'nullable|date',
                'referencia_externa' => 'nullable|string|max:100'
            ]);

            // Validação específica para cliente
            if (empty($dados['cliente_id']) && empty($dados['cliente_nome'])) {
                // Para FR, cliente é obrigatório
                if ($dados['tipo_documento'] === 'FR') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Fatura-Recibo (FR) requer um cliente (selecionado ou avulso)'
                    ], 422);
                }
                // Para outros tipos, cliente é opcional mas registramos como "Consumidor Final" se não informado
                $dados['cliente_nome'] = 'Consumidor Final';
            }

            $documento = $this->documentoService->emitirDocumento($dados);

            return response()->json([
                'success' => true,
                'message' => 'Documento emitido com sucesso',
                'data' => $documento
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao emitir documento:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao emitir documento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gerar recibo para fatura (FT) ou adiantamento (FA)
     */
    public function gerarRecibo(Request $request, $documentoId)
    {
        try {
            // Buscar o documento origem
            $documento = $this->documentoService->buscarDocumento($documentoId);

            // FT e FA podem receber recibo
            if (!in_array($documento->tipo_documento, ['FT', 'FA'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas Faturas (FT) e Faturas de Adiantamento (FA) podem receber recibo. Tipo recebido: ' . $documento->tipo_documento
                ], 422);
            }

            if (in_array($documento->estado, ['paga', 'cancelado'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Documento já se encontra pago ou cancelado'
                ], 422);
            }

            $dados = $request->validate([
                'valor' => 'required|numeric|min:0.01|max:' . $this->documentoService->calcularValorPendente($documento),
                'metodo_pagamento' => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'data_pagamento' => 'nullable|date',
                'referencia' => 'nullable|string|max:100'
            ]);

            $recibo = $this->documentoService->gerarRecibo($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Recibo gerado com sucesso',
                'data' => $recibo
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Documento não encontrado'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar recibo:', [
                'documento_id' => $documentoId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar recibo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar Nota de Crédito
     */
    public function criarNotaCredito(Request $request, $documentoId)
    {
        try {
            // Buscar o documento origem
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if (!in_array($documento->tipo_documento, ['FT', 'FR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nota de Crédito só pode ser gerada a partir de FT ou FR. Tipo recebido: ' . $documento->tipo_documento
                ], 422);
            }

            $dados = $request->validate([
                'itens' => 'required|array|min:1',
                'itens.*.produto_id' => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao' => 'required|string',
                'itens.*.quantidade' => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva' => 'required|numeric|min:0',
                'motivo' => 'required|string|max:500'
            ]);

            $nc = $this->documentoService->criarNotaCredito($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Nota de Crédito emitida com sucesso',
                'data' => $nc
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Documento de origem não encontrado'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Erro ao criar Nota de Crédito:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao emitir Nota de Crédito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar Nota de Débito
     */
    public function criarNotaDebito(Request $request, $documentoId)
    {
        try {
            Log::info('Iniciando criação de Nota de Débito', ['documento_id' => $documentoId]);

            // Buscar o documento origem
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if (!in_array($documento->tipo_documento, ['FT', 'FR'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nota de Débito só pode ser gerada a partir de FT ou FR. Tipo recebido: ' . $documento->tipo_documento
                ], 422);
            }

            $dados = $request->validate([
                'itens' => 'required|array|min:1',
                'itens.*.produto_id' => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao' => 'required|string',
                'itens.*.quantidade' => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva' => 'required|numeric|min:0',
                'motivo' => 'nullable|string|max:500'
            ]);

            $nd = $this->documentoService->criarNotaDebito($documento, $dados);

            Log::info('Nota de Débito criada com sucesso', [
                'nd_id' => $nd->id,
                'nd_numero' => $nd->numero_documento
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Nota de Débito emitida com sucesso',
                'data' => $nd
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('Documento não encontrado para ND:', ['id' => $documentoId]);

            return response()->json([
                'success' => false,
                'message' => 'Documento de origem não encontrado'
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $e->errors()
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erro ao criar Nota de Débito:', [
                'documento_id' => $documentoId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao emitir Nota de Débito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Vincular adiantamento (FA) a fatura (FT)
     */
    public function vincularAdiantamento(Request $request, $adiantamentoId)
    {
        try {
            // Buscar o adiantamento
            $adiantamento = $this->documentoService->buscarDocumento($adiantamentoId);

            if ($adiantamento->tipo_documento !== 'FA') {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas Faturas de Adiantamento (FA) podem ser vinculadas. Tipo recebido: ' . $adiantamento->tipo_documento
                ], 422);
            }

            $dados = $request->validate([
                'fatura_id' => 'required|uuid|exists:documentos_fiscais,id',
                'valor' => 'required|numeric|min:0.01|max:' . $adiantamento->total_liquido
            ]);

            $fatura = $this->documentoService->buscarDocumento($dados['fatura_id']);

            if ($fatura->tipo_documento !== 'FT') {
                return response()->json([
                    'success' => false,
                    'message' => 'O destino deve ser uma Fatura (FT). Tipo recebido: ' . $fatura->tipo_documento
                ], 422);
            }

            $resultado = $this->documentoService->vincularAdiantamento($adiantamento, $fatura, $dados['valor']);

            return response()->json([
                'success' => true,
                'message' => 'Adiantamento vinculado com sucesso',
                'data' => $resultado
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao vincular adiantamento:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao vincular adiantamento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancelar documento fiscal
     */
    public function cancelar(Request $request, $documentoId)
    {
        try {
            // Buscar o documento
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if ($documento->estado === 'cancelado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Documento já se encontra cancelado'
                ], 422);
            }

            $dados = $request->validate([
                'motivo' => 'required|string|min:10|max:500'
            ]);

            $documento = $this->documentoService->cancelarDocumento($documento, $dados['motivo']);

            return response()->json([
                'success' => true,
                'message' => 'Documento cancelado com sucesso',
                'data' => $documento
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao cancelar documento:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Listar recibos de um documento (FT ou FA)
     */
    public function listarRecibos($documentoId)
    {
        try {
            $documento = $this->documentoService->buscarDocumento($documentoId);

            if (!in_array($documento->tipo_documento, ['FT', 'FA'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas Faturas (FT) e Faturas de Adiantamento (FA) possuem recibos. Tipo recebido: ' . $documento->tipo_documento
                ], 422);
            }

            $recibos = $documento->recibos()->with('user')->get();

            return response()->json([
                'success' => true,
                'message' => 'Recibos carregados com sucesso',
                'data' => $recibos
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao listar recibos:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar recibos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar adiantamentos pendentes de um cliente
     */
    public function adiantamentosPendentes(Request $request)
    {
        try {
            $dados = $request->validate([
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255' // Para cliente avulso
            ]);

            $query = DocumentoFiscal::where('tipo_documento', 'FA')
                ->whereIn('estado', ['emitido', 'parcialmente_paga']);

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (!empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            $adiantamentos = $query->get();

            return response()->json([
                'success' => true,
                'message' => 'Adiantamentos pendentes carregados',
                'data' => $adiantamentos
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao listar adiantamentos:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar adiantamentos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar proformas pendentes de um cliente
     */
    public function proformasPendentes(Request $request)
    {
        try {
            $dados = $request->validate([
                'cliente_id' => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255' // Para cliente avulso
            ]);

            $query = DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', 'emitido');

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (!empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            $proformas = $query->get();

            return response()->json([
                'success' => true,
                'message' => 'Proformas pendentes carregadas',
                'data' => $proformas
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao listar proformas:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar proformas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar alertas de documentos
     */
    public function alertas()
    {
        try {
            // FA emitidos com data de vencimento ultrapassada
            $vencidos = DocumentoFiscal::where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->where('data_vencimento', '<', now())
                ->with('cliente')
                ->get();

            // FT pendentes com adiantamentos vinculados
            $faturasComAdiantamentosPendentes = DocumentoFiscal::whereIn('tipo_documento', ['FT'])
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->whereHas('faturasAdiantamento', function ($q) {
                    $q->where('estado', 'emitido');
                })
                ->with(['cliente', 'faturasAdiantamento'])
                ->get();

            // Proformas pendentes
            $proformasPendentes = DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', 'emitido')
                ->where('data_emissao', '<', now()->subDays(30)) // Proformas com mais de 30 dias
                ->with('cliente')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Alertas de documentos fiscais',
                'data' => [
                    'adiantamentos_vencidos' => [
                        'total' => $vencidos->count(),
                        'items' => $vencidos
                    ],
                    'faturas_com_adiantamentos_pendentes' => [
                        'total' => $faturasComAdiantamentosPendentes->count(),
                        'items' => $faturasComAdiantamentosPendentes
                    ],
                    'proformas_pendentes' => [
                        'total' => $proformasPendentes->count(),
                        'items' => $proformasPendentes
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar alertas:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar alertas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Processar expiração de adiantamentos (endpoint para cron/job)
     */
    public function processarExpirados()
    {
        try {
            $count = $this->documentoService->processarAdiantamentosExpirados();

            return response()->json([
                'success' => true,
                'message' => "Processamento concluído. {$count} adiantamentos expirados.",
                'data' => ['expirados' => $count]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao processar expirados:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao processar adiantamentos expirados: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter resumo/dashboard de documentos
     */
    public function dashboard(Request $request)
    {
        try {
            $hoje = now();
            $inicioMes = $hoje->copy()->startOfMonth();

            $resumo = [
                'faturas_emitidas_mes' => DocumentoFiscal::where('tipo_documento', 'FT')
                    ->whereBetween('data_emissao', [$inicioMes, $hoje])
                    ->count(),

                'faturas_pendentes' => DocumentoFiscal::where('tipo_documento', 'FT')
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->count(),

                'total_pendente_cobranca' => DocumentoFiscal::where('tipo_documento', 'FT')
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->sum('total_liquido') - DocumentoFiscal::where('tipo_documento', 'RC')
                    ->where('estado', '!=', 'cancelado')
                    ->sum('total_liquido'),

                'adiantamentos_pendentes' => DocumentoFiscal::where('tipo_documento', 'FA')
                    ->where('estado', 'emitido')
                    ->count(),

                'proformas_pendentes' => DocumentoFiscal::where('tipo_documento', 'FP')
                    ->where('estado', 'emitido')
                    ->count(),

                'documentos_cancelados_mes' => DocumentoFiscal::where('estado', 'cancelado')
                    ->whereBetween('data_cancelamento', [$inicioMes, $hoje])
                    ->count(),

                'total_vendas_mes' => DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR', 'RC'])
                    ->whereBetween('data_emissao', [$inicioMes, $hoje])
                    ->count(),

                'total_nao_vendas_mes' => DocumentoFiscal::whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                    ->whereBetween('data_emissao', [$inicioMes, $hoje])
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data' => $resumo
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar dashboard:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NOVO: Obter evolução mensal de documentos fiscais
     * Endpoint: GET /api/dashboard/evolucao-mensal
     */
    public function evolucaoMensal(Request $request)
    {
        try {
            $ano = $request->input('ano', now()->year);

            // Validar ano
            if (!is_numeric($ano) || $ano < 2020 || $ano > 2100) {
                $ano = now()->year;
            }

            $evolucao = [];

            // Para cada mês do ano
            for ($mes = 1; $mes <= 12; $mes++) {
                $inicioMes = now()->setDate($ano, $mes, 1)->startOfMonth();
                $fimMes = now()->setDate($ano, $mes, 1)->endOfMonth();

                // Total de vendas (FT, FR, RC) no mês
                $totalVendas = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FR', 'RC'])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes])
                    ->where('estado', '!=', 'cancelado')
                    ->sum('total_liquido');

                // Total de não-vendas (FP, FA, NC, ND, FRt) no mês
                $totalNaoVendas = DocumentoFiscal::whereIn('tipo_documento', ['FP', 'FA', 'NC', 'ND', 'FRt'])
                    ->whereBetween('data_emissao', [$inicioMes, $fimMes])
                    ->where('estado', '!=', 'cancelado')
                    ->sum('total_liquido');

                // Total pendente no final do mês (FT e FA emitidas ou parcialmente pagas)
                $totalPendente = DocumentoFiscal::whereIn('tipo_documento', ['FT', 'FA'])
                    ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                    ->where('data_emissao', '<=', $fimMes)
                    ->sum('total_liquido');

                $evolucao[] = [
                    'mes' => $mes,
                    'ano' => (int) $ano,
                    'total_vendas' => (float) $totalVendas,
                    'total_nao_vendas' => (float) $totalNaoVendas,
                    'total_pendente' => (float) $totalPendente
                ];
            }

            return response()->json([
                'success' => true,
                'message' => 'Evolução mensal carregada com sucesso',
                'data' => [
                    'ano' => (int) $ano,
                    'evolucao' => $evolucao
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar evolução mensal:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar evolução mensal: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NOVO: Obter estatísticas de pagamentos
     * Endpoint: GET /api/dashboard/estatisticas-pagamentos
     */
    public function estatisticasPagamentos(Request $request)
    {
        try {
            $hoje = now();
            $inicioMes = $hoje->copy()->startOfMonth();
            $inicioAno = $hoje->copy()->startOfYear();

            // Por método de pagamento (apenas recibos e faturas-recibo pagas)
            $porMetodo = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
                ->where('estado', '!=', 'cancelado')
                ->whereBetween('data_emissao', [$inicioMes, $hoje])
                ->select('metodo_pagamento', DB::raw('COUNT(*) as quantidade'), DB::raw('SUM(total_liquido) as total'))
                ->groupBy('metodo_pagamento')
                ->get()
                ->mapWithKeys(function ($item) {
                    $metodo = $item->metodo_pagamento ?? 'nao_informado';
                    return [$metodo => [
                        'quantidade' => $item->quantidade,
                        'total' => (float) $item->total
                    ]];
                });

            // Total pago no mês
            $totalPagoMes = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
                ->where('estado', '!=', 'cancelado')
                ->whereBetween('data_emissao', [$inicioMes, $hoje])
                ->sum('total_liquido');

            // Total pago no ano
            $totalPagoAno = DocumentoFiscal::whereIn('tipo_documento', ['RC', 'FR'])
                ->where('estado', '!=', 'cancelado')
                ->whereBetween('data_emissao', [$inicioAno, $hoje])
                ->sum('total_liquido');

            $estatisticas = [
                'por_metodo' => $porMetodo,
                'total_pago_mes' => (float) $totalPagoMes,
                'total_pago_ano' => (float) $totalPagoAno,
                'media_por_dia_mes' => (float) round($totalPagoMes / max($hoje->day, 1), 2),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de pagamentos carregadas com sucesso',
                'data' => ['estatisticas' => $estatisticas]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar estatísticas de pagamentos:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar estatísticas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NOVO: Obter alertas de documentos pendentes
     * Endpoint: GET /api/dashboard/alertas-pendentes
     */
    public function alertasPendentes()
    {
        try {
            $hoje = now();

            // Adiantamentos vencidos (FA com data de vencimento ultrapassada)
            $adiantamentosVencidos = DocumentoFiscal::where('tipo_documento', 'FA')
                ->where('estado', 'emitido')
                ->whereNotNull('data_vencimento')
                ->where('data_vencimento', '<', $hoje)
                ->with(['cliente'])
                ->orderBy('data_vencimento', 'asc')
                ->limit(10)
                ->get();

            // Faturas com adiantamentos pendentes (FT que têm FA vinculados mas não totalmente utilizados)
            $faturasComAdiantamentosPendentes = DocumentoFiscal::where('tipo_documento', 'FT')
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->whereHas('faturasAdiantamento', function ($query) {
                    $query->whereIn('estado', ['emitido', 'parcialmente_paga']);
                })
                ->with(['cliente', 'faturasAdiantamento' => function ($query) {
                    $query->whereIn('estado', ['emitido', 'parcialmente_paga']);
                }])
                ->orderBy('data_emissao', 'desc')
                ->limit(10)
                ->get();

            // Proformas pendentes (FP emitidas há mais de 7 dias)
            $proformasPendentes = DocumentoFiscal::where('tipo_documento', 'FP')
                ->where('estado', 'emitido')
                ->where('data_emissao', '<', $hoje->copy()->subDays(7))
                ->with(['cliente'])
                ->orderBy('data_emissao', 'asc')
                ->limit(10)
                ->get();

            // Faturas pendentes de pagamento (vencidas)
            $faturasVencidas = DocumentoFiscal::where('tipo_documento', 'FT')
                ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                ->whereNotNull('data_vencimento')
                ->where('data_vencimento', '<', $hoje)
                ->with(['cliente'])
                ->orderBy('data_vencimento', 'asc')
                ->limit(10)
                ->get();

            $alertas = [
                'adiantamentos_vencidos' => [
                    'total' => DocumentoFiscal::where('tipo_documento', 'FA')
                        ->where('estado', 'emitido')
                        ->whereNotNull('data_vencimento')
                        ->where('data_vencimento', '<', $hoje)
                        ->count(),
                    'items' => $adiantamentosVencidos
                ],
                'faturas_com_adiantamentos_pendentes' => [
                    'total' => DocumentoFiscal::where('tipo_documento', 'FT')
                        ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                        ->whereHas('faturasAdiantamento', function ($query) {
                            $query->whereIn('estado', ['emitido', 'parcialmente_paga']);
                        })
                        ->count(),
                    'items' => $faturasComAdiantamentosPendentes
                ],
                'proformas_pendentes' => [
                    'total' => DocumentoFiscal::where('tipo_documento', 'FP')
                        ->where('estado', 'emitido')
                        ->where('data_emissao', '<', $hoje->copy()->subDays(7))
                        ->count(),
                    'items' => $proformasPendentes
                ],
                'faturas_vencidas' => [
                    'total' => DocumentoFiscal::where('tipo_documento', 'FT')
                        ->whereIn('estado', ['emitido', 'parcialmente_paga'])
                        ->whereNotNull('data_vencimento')
                        ->where('data_vencimento', '<', $hoje)
                        ->count(),
                    'items' => $faturasVencidas
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Alertas carregados com sucesso',
                'data' => ['alertas' => $alertas]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao carregar alertas pendentes:', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar alertas: ' . $e->getMessage()
            ], 500);
        }
    }
}
