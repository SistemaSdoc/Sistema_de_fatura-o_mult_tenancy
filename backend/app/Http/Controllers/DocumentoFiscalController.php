<?php

namespace App\Http\Controllers;

use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use App\Services\AuditLogger;
use App\Services\DocumentoFiscalService;
use App\Services\ImpressoraTermicaService;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\SvgWriter;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * DocumentoFiscalController
 *
 * ✅ SUPORTA AMBOS OS MODOS:
 * - 'colectivo' → Shared DB (com tenant_id)
 * - 'singular' → Tenant DB (banco dedicado)
 */
class DocumentoFiscalController extends Controller
{
    protected DocumentoFiscalService $documentoService;
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?object $tenantUser = null;

    public function __construct(DocumentoFiscalService $documentoService)
    {
        $this->documentoService = $documentoService;

        // ✅ Obtém da sessão (prioridade)
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');

        Log::debug('[DocumentoFiscalController] Inicializado', [
            'modo' => $this->modo,
            'empresa_id' => $this->empresa?->id,
        ]);
    }

    /* =====================================================================
     | HELPERS
     | ================================================================== */


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

    protected function queryDocumentosFiscais()
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant();
        }
        return TenantDocumentoFiscal::query();
    }

    protected function buscarDocumento(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->first();
        }

        if ($comTrashed) {
            return TenantDocumentoFiscal::withTrashed()->where('id', $id)->first();
        }
        return TenantDocumentoFiscal::where('id', $id)->first();
    }

    protected function buscarDocumentoOrFail(string $id, bool $comTrashed = false)
    {
        if ($this->isColectivo()) {
            $query = SharedDocumentoFiscal::doTenant();
            if ($comTrashed) {
                $query = $query->withTrashed();
            }
            return $query->where('id', $id)->firstOrFail();
        }

        if ($comTrashed) {
            return TenantDocumentoFiscal::withTrashed()->where('id', $id)->firstOrFail();
        }
        return TenantDocumentoFiscal::where('id', $id)->firstOrFail();
    }

    protected function queryAdiantamentosPendentes()
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant()->adiantamentosPendentes();
        }
        return TenantDocumentoFiscal::adiantamentosPendentes();
    }

    protected function queryProformasPendentes()
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant()->proformasPendentes();
        }
        return TenantDocumentoFiscal::proformasPendentes();
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO - CORRIGIDA ✅
     | ================================================================== */

    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[DocumentoFiscalController] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[DocumentoFiscalController] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // ✅ Atualiza o modo
        $this->modo = $this->empresa->modo ?? 'colectivo';

        // 2️⃣ Obtém o landlord user
        $landlordUser = Auth::guard('landlord')->user();

        // 3️⃣ Fallback
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[DocumentoFiscalController] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[DocumentoFiscalController] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[DocumentoFiscalController] Acesso verificado com sucesso', [
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

    protected function obterEmpresaAtual(): ?array
    {
        if ($this->empresa) {
            return $this->empresa->toArray();
        }

        $dbName = config('database.connections.tenant.database');
        if ($dbName) {
            $empresa = Empresa::on('landlord')->where('db_name', $dbName)->first();
            if ($empresa) {
                return $empresa->toArray();
            }
        }

        return null;
    }

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        return $this->modo;
    }

    /**
     * ✅ Obtém o tenantUser, verificando se está carregado
     */
    protected function getTenantUser(): ?object
    {
        if (!$this->tenantUser) {
            try {
                $this->verificarAcessoUsuario();
            } catch (\Exception $e) {
                Log::warning('[DocumentoFiscalController] Não foi possível carregar tenantUser', [
                    'error' => $e->getMessage(),
                ]);
                return null;
            }
        }
        return $this->tenantUser;
    }

    /* =====================================================================
     | MÉTODOS DO CONTROLLER (MANTIDOS OS NOMES)
     | ================================================================== */

    public function index(Request $request): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $filtros = $request->validate([
                'tipo'                    => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado'                  => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'cliente_id'              => 'nullable|uuid|exists:clientes,id',
                'cliente_nome'            => 'nullable|string|max:255',
                'data_inicio'             => 'nullable|date',
                'data_fim'                => 'nullable|date',
                'pendentes'               => 'nullable|in:0,1,true,false',
                'adiantamentos_pendentes' => 'nullable|in:0,1,true,false',
                'proformas_pendentes'     => 'nullable|in:0,1,true,false',
                'apenas_vendas'           => 'nullable|in:0,1,true,false',
                'apenas_nao_vendas'       => 'nullable|in:0,1,true,false',
                'per_page'                => 'nullable|integer|min:1|max:100',
                'page'                    => 'nullable|integer|min:1',
                'search'                  => 'nullable|string|max:255',
                'com_retencao'            => 'nullable|in:0,1,true,false',
                'tipo_item'               => 'nullable|in:produto,servico',
            ]);

            $booleans = [
                'apenas_vendas',
                'apenas_nao_vendas',
                'pendentes',
                'adiantamentos_pendentes',
                'proformas_pendentes',
                'com_retencao'
            ];
            foreach ($booleans as $campo) {
                if (isset($filtros[$campo])) {
                    $filtros[$campo] = filter_var($filtros[$campo], FILTER_VALIDATE_BOOLEAN);
                }
            }

            $documentos = $this->documentoService->listarDocumentos($filtros);

            return response()->json([
                'success' => true,
                'message' => 'Lista de documentos carregada com sucesso',
                'data'    => $documentos,
                'modo'    => $modo,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao listar documentos', $e);
        }
    }

    public function show(string $id): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $documento = $this->documentoService->buscarDocumento($id);

            return response()->json([
                'success' => true,
                'message' => 'Documento carregado com sucesso',
                'data'    => ['documento' => $documento],
                'modo'    => $modo,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento não encontrado'], 404);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar documento', $e);
        }
    }

public function emitir(Request $request): JsonResponse
{
    $modo = $this->getModo();

    try {
        $this->verificarAcessoUsuario();

        $dados = $request->validate([
            'tipo_documento'             => 'required|in:FT,FR,FP,FA,NC,ND,RC,FRt',
            'venda_id'                   => 'nullable|uuid|exists:vendas,id',
            'cliente_id'                 => 'nullable|uuid|exists:clientes,id',
            'cliente_nome'               => 'nullable|string|max:255',
            'cliente_nif'                => 'nullable|string|max:14',
            'fatura_id'                  => 'nullable|uuid|exists:documentos_fiscais,id',
            'itens'                      => 'required_unless:tipo_documento,FA|array',
            'itens.*.produto_id'         => 'nullable|uuid|exists:produtos,id',
            'itens.*.descricao'          => 'required_with:itens|string',
            'itens.*.quantidade'         => 'required_with:itens|numeric|min:0.01',
            'itens.*.preco_unitario'     => 'required_with:itens|numeric|min:0',
            'itens.*.taxa_iva'           => 'required_with:itens|numeric|min:0|max:100',
            'itens.*.desconto'           => 'nullable|numeric|min:0',
            'itens.*.codigo_isencao'     => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
            'itens.*.taxa_retencao'      => 'nullable|numeric|in:0,2,5,6.5,10,15',
            'dados_pagamento'            => 'nullable|array',
            'dados_pagamento.metodo'     => 'required_with:dados_pagamento|in:transferencia,multibanco,dinheiro,cheque,cartao',
            'dados_pagamento.valor'      => 'required_with:dados_pagamento|numeric|min:0.01',
            'dados_pagamento.data'       => 'nullable|date',
            'dados_pagamento.referencia' => 'nullable|string|max:100',
            'motivo'                     => 'nullable|string|max:500',
            'data_vencimento'            => 'nullable|date',
            'referencia_externa'         => 'nullable|string|max:100',
            'nome_banco'                 => 'nullable|string|max:255',
            'iban'                       => 'nullable|string|max:34',
            'numero_conta'               => 'nullable|string|max:20',
        ]);

        // Log dos dados recebidos para debug
        Log::info('[DocumentoFiscalController] Dados recebidos para emissão', [
            'tipo_documento' => $dados['tipo_documento'],
            'cliente_id' => $dados['cliente_id'] ?? null,
            'cliente_nome' => $dados['cliente_nome'] ?? null,
            'nome_banco' => $dados['nome_banco'] ?? null,
            'iban' => $dados['iban'] ?? null,
            'numero_conta' => $dados['numero_conta'] ?? null,
            'total_itens' => count($dados['itens'] ?? []),
        ]);

        // Validação: cliente é obrigatório para FR (Fatura-Recibo)
        if (empty($dados['cliente_id']) && empty($dados['cliente_nome'])) {
            if ($dados['tipo_documento'] === 'FR') {
                return response()->json([
                    'success' => false,
                    'message' => 'Fatura-Recibo (FR) requer um cliente (seleccionado ou avulso)',
                ], 422);
            }
            $dados['cliente_nome'] = 'Consumidor Final';
        }

        // Emitir o documento com todos os dados
        $documento = $this->documentoService->emitirDocumento($dados);

        // Log do documento criado
        Log::info('[DocumentoFiscalController] Documento emitido com sucesso', [
            'documento_id' => $documento->id,
            'numero_documento' => $documento->numero_documento,
            'tipo_documento' => $documento->tipo_documento,
            'nome_banco_salvo' => $documento->nome_banco ?? null,
            'iban_salvo' => $documento->iban ?? null,
            'numero_conta_salvo' => $documento->numero_conta ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Documento emitido com sucesso',
            'data'    => $documento,
            'modo'    => $modo,
        ], 201);
        
    } catch (\Illuminate\Validation\ValidationException $e) {
        Log::warning('[DocumentoFiscalController] Erro de validação', [
            'errors' => $e->errors(),
            'modo' => $modo,
        ]);
        return response()->json([
            'success' => false, 
            'message' => 'Erro de validação', 
            'errors' => $e->errors()
        ], 422);
        
    } catch (\InvalidArgumentException $e) {
        Log::warning('[DocumentoFiscalController] Erro de argumento inválido', [
            'message' => $e->getMessage(),
            'modo' => $modo,
        ]);
        return response()->json([
            'success' => false, 
            'message' => $e->getMessage()
        ], 422);
        
    } catch (\Exception $e) {
        Log::error('[DocumentoFiscalController] Erro ao emitir documento', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'modo' => $modo,
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Erro ao emitir documento',
            'error' => $e->getMessage(),
            'modo' => $modo,
        ], 500);
    }
}

    public function gerarRecibo(Request $request, string $documentoId): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $documento = $this->documentoService->buscarDocumento($documentoId);

            if ($documento->tipo_documento === 'FP') {
                return response()->json([
                    'success' => false,
                    'message' => 'Proformas (FP) não podem gerar recibos diretamente.',
                ], 422);
            }

            if (!in_array($documento->tipo_documento, ['FT', 'FA'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Apenas Faturas (FT) e Faturas de Adiantamento (FA) podem gerar recibos. Tipo atual: {$documento->tipo_documento}",
                ], 422);
            }

            $valorPendente = $this->documentoService->calcularValorPendente($documento);

            $dados = $request->validate([
                'valor'            => "required|numeric|min:0.01|max:{$valorPendente}",
                'metodo_pagamento' => 'required|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'data_pagamento'   => 'nullable|date',
                'referencia'       => 'nullable|string|max:100',
            ]);

            $recibo = $this->documentoService->gerarRecibo($documento, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Recibo gerado com sucesso',
                'data'    => $recibo,
                'modo'    => $modo,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento não encontrado'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao gerar recibo', $e);
        }
    }

    public function criarNotaCredito(Request $request, string $documentoId): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $documento = $this->documentoService->buscarDocumento($documentoId);

            /**
             * VALIDAÇÕES PARA NOTA DE CRÉDITO (Angola)
             * 
             * NOTA DE CRÉDITO = DIMINUI o valor da fatura
             * Usos permitidos:
             * - Devolução total ou parcial de mercadoria
             * - Correção de erro no valor da fatura
             * - Desconto concedido após emissão
             * - Cancelamento de serviços não prestados
             * - Retificação de IVA incorreto
             */

            // 1. Verificar se o documento é uma Fatura (FT) ou Fatura-Recibo (FR)
            if (!in_array($documento->tipo_documento, ['FT', 'FR'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Crédito só pode ser emitida a partir de Fatura (FT) ou Fatura-Recibo (FR). Tipo atual: {$documento->tipo_documento}",
                ], 422);
            }

            // 2. Verificar se a fatura não está cancelada ou expirada
            if ($documento->estado === 'cancelado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Crédito para uma fatura cancelada',
                ], 422);
            }

            if ($documento->estado === 'expirado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Crédito para uma fatura expirada',
                ], 422);
            }

            // 3. Verificar se a fatura tem saldo disponível para crédito
            $valorTotalCreditos = $this->documentoService->calcularTotalCreditosEmitidos($documento);
            $valorMaximoCredito = $documento->total_liquido - $valorTotalCreditos;

            if ($valorMaximoCredito <= 0.01) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta fatura já possui créditos emitidos que cobrem todo o seu valor',
                    'data' => [
                        'total_fatura' => $documento->total_liquido,
                        'creditos_emitidos' => $valorTotalCreditos,
                        'saldo_disponivel' => $valorMaximoCredito
                    ]
                ], 422);
            }

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string',
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|min:0|max:100',
                'itens.*.codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                'motivo'                 => 'required|string|min:10|max:500', // Motivo obrigatório
            ]);

            /**
             * 4. Validar se o valor total da nota de crédito não ultrapassa
             *    o valor máximo permitido (saldo da fatura)
             */
            $valorTotalNC = 0;
            foreach ($dados['itens'] as $item) {
                $subtotal = $item['quantidade'] * $item['preco_unitario'];
                $iva = $subtotal * ($item['taxa_iva'] / 100);
                $valorTotalNC += $subtotal + $iva;
            }

            if ($valorTotalNC > $valorMaximoCredito) {
                return response()->json([
                    'success' => false,
                    'message' => "O valor total da Nota de Crédito (" . number_format($valorTotalNC, 2) . " Kz) excede o saldo disponível da fatura (" . number_format($valorMaximoCredito, 2) . " Kz)",
                    'data' => [
                        'total_fatura' => $documento->total_liquido,
                        'creditos_emitidos' => $valorTotalCreditos,
                        'saldo_disponivel' => $valorMaximoCredito,
                        'total_nc' => $valorTotalNC
                    ]
                ], 422);
            }

            /**
             * 5. A nota de crédito deve referenciar a fatura original
             */
            $dados['fatura_id'] = $documento->id;
            $dados['tipo_documento'] = 'NC';

            DB::beginTransaction();

            try {
                $nc = $this->documentoService->emitirDocumento($dados);

                /**
                 * 6. Após emitir, atualizar o estado da fatura original
                 */
                $this->documentoService->atualizarEstadoFaturaAposCredito($documento);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Nota de Crédito emitida com sucesso',
                    'data' => [
                        'nota_credito' => $nc,
                        'fatura_original' => [
                            'id' => $documento->id,
                            'numero' => $documento->numero_documento,
                            'valor_total' => $documento->total_liquido,
                            'creditos_emitidos' => $valorTotalCreditos + $valorTotalNC,
                            'saldo_restante' => $valorMaximoCredito - $valorTotalNC
                        ]
                    ]
                ], 201);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            return response()->json([
                'success' => true,
                'message' => 'Nota de Crédito emitida com sucesso',
                'data'    => $nc,
                'modo'    => $modo,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento de origem não encontrado'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao emitir Nota de Crédito', $e);
        }
    }

    public function criarNotaDebito(Request $request, string $documentoId): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $documento = $this->documentoService->buscarDocumento($documentoId);

            /**
             * VALIDAÇÕES PARA NOTA DE DÉBITO (Angola)
             * 
             * NOTA DE DÉBITO = AUMENTA o valor da fatura
             * Usos permitidos (de acordo com a lei):
             * 1. Cobrança de serviços adicionais não previstos
             * 2. Juros de mora (até 30 dias após vencimento)
             * 3. Multas contratuais
             * 4. Correção de preço para cima
             * 5. Custos adicionais (frete, taxas, comissões)
             * 6. Serviços complementares solicitados posteriormente
             * 
             * RESTRIÇÕES:
             * - Apenas FT (NÃO FR, FP, FA)
             * - Apenas serviços (NÃO produtos físicos)
             * - Prazo máximo de 30 dias após emissão
             * - Fatura não pode estar cancelada ou expirada
             * - Se fatura já paga, apenas para juros/multas
             */

            // 1. Verificar se o documento é uma Fatura (FT)
            if (!in_array($documento->tipo_documento, ['FT'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Débito só pode ser emitida a partir de Fatura (FT). Tipo atual: {$documento->tipo_documento}",
                ], 422);
            }

            // 2. Verificar se a fatura não está cancelada
            if ($documento->estado === 'cancelado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Débito para uma fatura cancelada',
                ], 422);
            }

            if ($documento->estado === 'expirado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Não é possível emitir Nota de Débito para uma fatura expirada',
                ], 422);
            }

            // 3. Validar prazo máximo de 30 dias
            $dataEmissao = new \DateTime($documento->data_emissao);
            $prazoMaximo = (clone $dataEmissao)->modify('+30 days');
            $hoje = new \DateTime();

            if ($hoje > $prazoMaximo) {
                return response()->json([
                    'success' => false,
                    'message' => "O prazo para emitir Nota de Débito é de até 30 dias após a emissão da fatura.\n" .
                        "Fatura emitida em: {$dataEmissao->format('d/m/Y')}\n" .
                        "Prazo máximo: {$prazoMaximo->format('d/m/Y')}\n" .
                        "Hoje: {$hoje->format('d/m/Y')}",
                ], 422);
            }

            // 4. Validar se a fatura já foi paga (neste caso, só permite juros/multas)
            $valorPago = $this->documentoService->calcularValorPago($documento);
            $faturaPaga = $documento->estado === 'paga' || $valorPago >= $documento->total_liquido;

            $dados = $request->validate([
                'itens'                  => 'required|array|min:1',
                'itens.*.produto_id'     => 'nullable|uuid|exists:produtos,id',
                'itens.*.descricao'      => 'required|string|min:5', // Descrição detalhada
                'itens.*.quantidade'     => 'required|numeric|min:0.01',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'itens.*.taxa_iva'       => 'required|numeric|min:0|max:100',
                'itens.*.codigo_isencao' => 'nullable|string|in:M00,M01,M02,M03,M04,M05,M06,M99',
                'itens.*.eh_servico'     => 'nullable|boolean',
                'motivo'                 => 'nullable|string|max:500',
            ]);

            /**
             * 5. VALIDAÇÃO: Os itens devem ser SERVIÇOS (não produtos físicos)
             * E para fatura paga, devem ser juros ou multas
             */
            $temServico = false;
            $temJurosOuMulta = false;
            $itensInvalidos = [];

            foreach ($dados['itens'] as $item) {
                $isServicoMarcado = filter_var($item['eh_servico'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                $isServicoDescricao = false;

                $descricaoLower = strtolower($item['descricao']);
                $palavrasServico = [
                    'serviço',
                    'servico',
                    'consulta',
                    'consultoria',
                    'manutenção',
                    'manutencao',
                    'instalação',
                    'instalacao',
                    'juro',
                    'multa',
                    'penalidade',
                    'taxa',
                    'comissão',
                    'comissao'
                ];
                foreach ($palavrasServico as $palavra) {
                    if (strpos($descricaoLower, $palavra) !== false) {
                        $isServicoDescricao = true;
                        break;
                    }
                }

                $produto = null;
                // Verifica se é serviço pelo produto_id
                if (!empty($item['produto_id'])) {
                    $produto = \App\Models\Tenant\Produto::find($item['produto_id']);
                    if ($produto && $produto->tipo !== 'servico') {
                        $itensInvalidos[] = $item['descricao'];
                    } elseif ($produto && $produto->tipo === 'servico') {
                        $temServico = true;
                    } elseif ($isServicoMarcado === true || $isServicoDescricao) {
                        $temServico = true;
                    }
                } else {
                    // Item avulso - verifica pela descrição
                    if ($isServicoMarcado === true || $isServicoDescricao) {
                        $temServico = true;
                    } else {
                        $itensInvalidos[] = $item['descricao'];
                    }
                }

                // Verifica se é juros ou multa (para fatura paga)
                if (
                    strpos($descricaoLower, 'juro') !== false ||
                    strpos($descricaoLower, 'juros') !== false ||
                    strpos($descricaoLower, 'multa') !== false ||
                    strpos($descricaoLower, 'penalidade') !== false
                ) {
                    $temJurosOuMulta = true;
                }
            }

            // 5.1 Se não tiver serviços válidos
            if (!$temServico) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Débito só pode ser usada para serviços.\n" .
                        "Os seguintes itens não são serviços: " . implode(', ', $itensInvalidos),
                ], 422);
            }

            // 5.2 Se tiver itens inválidos (produtos)
            if (!empty($itensInvalidos)) {
                return response()->json([
                    'success' => false,
                    'message' => "Nota de Débito não pode ser usada para produtos físicos.\n" .
                        "Os seguintes itens são produtos: " . implode(', ', $itensInvalidos) . "\n" .
                        "Use Nota de Débito apenas para serviços adicionais, juros ou multas.",
                ], 422);
            }

            // 5.3 Se fatura já está paga, exige que seja juros ou multa
            if ($faturaPaga && !$temJurosOuMulta) {
                return response()->json([
                    'success' => false,
                    'message' => "A fatura já está paga.\n" .
                        "Nota de Débito para fatura paga deve ser exclusivamente para:\n" .
                        "- Juros de mora\n" .
                        "- Multas contratuais\n" .
                        "Inclua 'juros' ou 'multa' na descrição dos itens.",
                ], 422);
            }

            /**
             * 6. Calcular valor total do débito
             */
            $valorTotalND = 0;
            foreach ($dados['itens'] as $item) {
                $subtotal = $item['quantidade'] * $item['preco_unitario'];
                $iva = $subtotal * ($item['taxa_iva'] / 100);
                $valorTotalND += $subtotal + $iva;
            }

            if ($valorTotalND <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'O valor total da Nota de Débito deve ser maior que zero.',
                ], 422);
            }

            /**
             * 7. A nota de débito deve referenciar a fatura original
             */
            $dados['fatura_id'] = $documento->id;
            $dados['tipo_documento'] = 'ND';

            DB::beginTransaction();

            try {
                $nd = $this->documentoService->emitirDocumento($dados);

                /**
                 * 8. Atualizar o estado da fatura original
                 */
                $novoValorTotal = $documento->total_liquido + $valorTotalND;

                // Se a fatura estava paga, passa a parcialmente_paga
                if ($documento->estado === 'paga') {
                    $documento->estado = 'parcialmente_paga';
                    $documento->save();
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Nota de Débito emitida com sucesso',
                    'data' => [
                        'nota_debito' => $nd,
                        'fatura_original' => [
                            'id' => $documento->id,
                            'numero' => $documento->numero_documento,
                            'valor_original' => $documento->total_liquido,
                            'valor_debito' => $valorTotalND,
                            'novo_valor_total' => $novoValorTotal,
                            'valor_pago_anterior' => $valorPago,
                            'saldo_pendente_atual' => $novoValorTotal - $valorPago,
                            'fatura_estava_paga' => $faturaPaga
                        ]
                    ]
                ], 201);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

            return response()->json([
                'success' => true,
                'message' => 'Nota de Débito emitida com sucesso',
                'data'    => $nd,
                'modo'    => $modo,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['success' => false, 'message' => 'Documento de origem não encontrado'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao emitir Nota de Débito', $e);
        }
    }

    public function vincularAdiantamento(Request $request, string $adiantamentoId): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $adiantamento = $this->documentoService->buscarDocumento($adiantamentoId);

            $dados = $request->validate([
                'fatura_id' => 'required|uuid|exists:documentos_fiscais,id',
                'valor'     => 'required|numeric|min:0.01|max:' . $adiantamento->total_liquido,
            ]);

            $fatura    = $this->documentoService->buscarDocumento($dados['fatura_id']);
            $resultado = $this->documentoService->vincularAdiantamento($adiantamento, $fatura, (float) $dados['valor']);

            return response()->json([
                'success' => true,
                'message' => 'Adiantamento vinculado com sucesso',
                'data'    => $resultado,
                'modo'    => $modo,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao vincular adiantamento', $e);
        }
    }

    public function cancelar(Request $request, string $documentoId): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $documento = $this->documentoService->buscarDocumento($documentoId);
            $dados     = $request->validate(['motivo' => 'required|string|min:10|max:500']);
            $resultado = $this->documentoService->cancelarDocumento($documento, $dados['motivo']);

            AuditLogger::log('Documento Cancelado', '❌', ['area' => 'Documentos Fiscais', 'detalhes' => ['documento_id' => $documento->id, 'numero' => $documento->numero]]);

            return response()->json([
                'success' => true,
                'message' => 'Documento cancelado com sucesso',
                'data'    => $resultado,
                'modo'    => $modo,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao cancelar documento', $e);
        }
    }

    public function listarRecibos(string $documentoId): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $documento = $this->documentoService->buscarDocumento($documentoId);

            if ($this->isColectivo()) {
                $recibos = SharedDocumentoFiscal::doTenant()
                    ->where('fatura_id', $documento->id)
                    ->where('tipo_documento', 'RC')
                    ->with('user')
                    ->get();
            } else {
                $recibos = TenantDocumentoFiscal::where('fatura_id', $documento->id)
                    ->where('tipo_documento', 'RC')
                    ->with('user')
                    ->get();
            }

            return response()->json([
                'success' => true,
                'message' => 'Recibos carregados com sucesso',
                'data'    => $recibos,
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar recibos', $e);
        }
    }

    public function adiantamentosPendentes(Request $request): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $dados = $request->validate([
                'cliente_id'   => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
            ]);

            $query = $this->queryAdiantamentosPendentes()->with('cliente');

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (!empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            return response()->json([
                'success' => true,
                'message' => 'Adiantamentos pendentes carregados',
                'data'    => $query->get(),
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar adiantamentos', $e);
        }
    }

    public function proformasPendentes(Request $request): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $dados = $request->validate([
                'cliente_id'   => 'nullable|uuid|exists:clientes,id',
                'cliente_nome' => 'nullable|string|max:255',
            ]);

            $query = $this->queryProformasPendentes()->with('cliente');

            if (!empty($dados['cliente_id'])) {
                $query->where('cliente_id', $dados['cliente_id']);
            } elseif (!empty($dados['cliente_nome'])) {
                $query->where('cliente_nome', 'like', '%' . $dados['cliente_nome'] . '%');
            }

            return response()->json([
                'success' => true,
                'message' => 'Proformas pendentes carregadas',
                'data'    => $query->get(),
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar proformas', $e);
        }
    }

    public function alertas(): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $alertas = $this->documentoService->alertasPendentes();

            return response()->json([
                'success' => true,
                'message' => 'Alertas de documentos fiscais',
                'data'    => ['alertas' => $alertas],
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao gerar alertas', $e);
        }
    }

    public function processarExpirados(): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $count = $this->documentoService->processarAdiantamentosExpirados();

            return response()->json([
                'success' => true,
                'message' => "Processamento concluído. {$count} adiantamentos expirados.",
                'data'    => ['expirados' => $count],
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao processar adiantamentos expirados', $e);
        }
    }

    public function dashboard(): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $resumo = $this->documentoService->dadosDashboard();

            return response()->json([
                'success' => true,
                'message' => 'Dashboard carregado com sucesso',
                'data'    => $resumo,
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar dashboard', $e);
        }
    }

    public function evolucaoMensal(Request $request): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $ano = (int) $request->input('ano', now()->year);
            if ($ano < 2020 || $ano > 2100) {
                $ano = now()->year;
            }

            $evolucao = $this->documentoService->evolucaoMensal($ano);

            return response()->json([
                'success' => true,
                'message' => 'Evolução mensal carregada com sucesso',
                'data'    => ['ano' => $ano, 'evolucao' => $evolucao],
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar evolução mensal', $e);
        }
    }

    public function estatisticasPagamentos(): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $estatisticas = $this->documentoService->estatisticasPagamentos();

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas de pagamentos carregadas com sucesso',
                'data'    => ['estatisticas' => $estatisticas],
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao carregar estatísticas de pagamentos', $e);
        }
    }

    public function imprimirTermica(string $id, ImpressoraTermicaService $impressoraService): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $user = Auth::guard('landlord')->user();

            if (!$impressoraService->testarConexao()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impressora USB não encontrada ou sem permissão.',
                ], 400);
            }

            if ($this->isColectivo()) {
                $documento = SharedDocumentoFiscal::doTenant()->with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            } else {
                $documento = TenantDocumentoFiscal::with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            }

            $dados = $this->documentoService->dadosParaPdf($documento);

            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                if ($this->isColectivo()) {
                    $docInfo = SharedDocumentoFiscal::doTenant()->with(['itens.produto', 'cliente'])->where('id', $documento->fatura_id)->first();
                } else {
                    $docInfo = TenantDocumentoFiscal::with(['itens.produto', 'cliente'])->where('id', $documento->fatura_id)->first();
                }
            } else {
                $docInfo = $documento;
            }

            $dados['itens']   = $docInfo->itens ?? [];
            $dados['docInfo'] = $docInfo;

            $impressoraService->imprimirDocumento($documento, $dados, $user);

            return response()->json([
                'success' => true,
                'id'      => $id,
                'message' => 'Documento impresso com sucesso',
                'modo'    => $modo,
            ]);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro na impressão térmica', $e);
        }
    }

    public function printA4(Request $request, string $id): \Illuminate\Contracts\View\View
    {
        try {
            $this->verificarAcessoUsuario();

            Log::info('printA4 called', ['id' => $id, 'modo' => $this->getModo()]);

            if ($this->isColectivo()) {
                $documento = SharedDocumentoFiscal::doTenant()->with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            } else {
                $documento = TenantDocumentoFiscal::with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            }

            $dados = $this->documentoService->dadosParaPdf($documento);

            $empresaArray = $this->obterEmpresaAtual() ?? [];
            $empresaArray['logo_base64'] = null;

            $logoPath = $empresaArray['logo'] ?? null;
            if (!extension_loaded('gd')) {
                $empresaArray['logo'] = null;
                Log::info('downloadPdf: logo ignorado porque a extensão PHP GD não está instalada');
            } elseif (!empty($logoPath)) {
                try {
                    if (Storage::disk('public')->exists($logoPath)) {
                        $logoConteudo = Storage::disk('public')->get($logoPath);
                        $logoMime = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (file_exists(public_path($logoPath))) {
                        $logoConteudo = file_get_contents(public_path($logoPath));
                        $logoMime = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    }
                } catch (\Throwable $logoErr) {
                    Log::warning('printA4: erro ao converter logo', ['error' => $logoErr->getMessage()]);
                }
            }

            $dados['empresa'] = $empresaArray;

            if (empty($dados['empresa']['endereco']) && !empty($dados['empresa']['morada'])) {
                $dados['empresa']['endereco'] = $dados['empresa']['morada'];
            }

            $documentoOrigem = null;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                if ($this->isColectivo()) {
                    $documentoOrigem = SharedDocumentoFiscal::doTenant()->with(['itens.produto', 'cliente'])->where('id', $documento->fatura_id)->first();
                } else {
                    $documentoOrigem = TenantDocumentoFiscal::with(['itens.produto', 'cliente'])->where('id', $documento->fatura_id)->first();
                }
            }

            $docInfo = $documentoOrigem ?? $documento;

            $qrCodeTexto = $dados['qr_code'] ?? null;
            $qrCodeImg = null;
            if ($qrCodeTexto) {
                try {
                    $qr = new QrCode(
                        $qrCodeTexto,
                        new Encoding('UTF-8'),
                        ErrorCorrectionLevel::Medium,
                        220,
                        6
                    );
                    $writer = new SvgWriter();
                    $result = $writer->write($qr, null, null, [
                        SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
                    ]);
                    $qrCodeImg = $result->getDataUri();
                } catch (\Throwable $e) {
                    Log::warning('printA4: erro ao gerar QR Code', ['error' => $e->getMessage()]);
                }
            }

            $proofUrl = $this->montarUrlDeProva($request, $id);
            $proofQrHtml = $documento->tipo_documento === 'FP'
                ? ''
                : $this->gerarQrHtml($proofUrl);

            return view('documentos.print-view', [
                'empresa'         => $dados['empresa'],
                'documento'       => $documento,
                'documentoOrigem' => $documentoOrigem,
                'docInfo'         => $docInfo,
                'itens'           => $docInfo->itens ?? [],
                'cliente'         => $dados['cliente'],
                'qr_code'         => $qrCodeTexto,
                'qr_code_img'     => $qrCodeImg,
                'qr_html'         => $this->gerarQrHtml($qrCodeTexto),
                'proof_url'       => $proofUrl,
                'proof_qr_html'   => $proofQrHtml,
                'descontoGlobal'  => $dados['desconto_global'] ?? 0,
                'troco'           => $dados['troco'] ?? 0,
                'temDesconto'     => ($dados['desconto_global'] ?? 0) > 0,
                'modo'            => $this->getModo(),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('printA4: documento não encontrado', ['id' => $id]);
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro no printA4', ['error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar impressão A4: ' . $e->getMessage());
        }
    }

    public function downloadPdf(string $id)
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            if ($this->isColectivo()) {
                $documento = SharedDocumentoFiscal::doTenant()->with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            } else {
                $documento = TenantDocumentoFiscal::with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            }

            $dados = $this->documentoService->dadosParaPdf($documento);
            $dados['qr_html'] = $this->gerarQrHtml($dados['qr_code'] ?? null);
            $dados['proof_url'] = $this->montarUrlDeProva(request(), $id);
            $dados['proof_qr_html'] = $this->gerarQrHtml($dados['proof_url']);

            $empresaArray = $this->obterEmpresaAtual() ?? [];
            $usaImagens = extension_loaded('gd');
            $empresaArray['logo_base64'] = null;

            if ($usaImagens) {
                $logoPath = $empresaArray['logo'] ?? null;
                if (!empty($logoPath)) {
                    try {
                        if (Storage::disk('public')->exists($logoPath)) {
                            $logoConteudo = Storage::disk('public')->get($logoPath);
                            $logoMime = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                            $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                        } elseif (file_exists(public_path($logoPath))) {
                            $logoConteudo = file_get_contents(public_path($logoPath));
                            $logoMime = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                            $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                        }
                    } catch (\Throwable $logoErr) {
                        Log::warning('downloadPdf: erro ao converter logo', ['error' => $logoErr->getMessage()]);
                    }
                }
            } else {
                // Sem GD, evitamos qualquer imagem no template para não quebrar o PDF.
                $empresaArray['logo'] = null;
            }

            $dados['empresa'] = $empresaArray;

            if (empty($dados['empresa']['endereco']) && !empty($dados['empresa']['morada'])) {
                $dados['empresa']['endereco'] = $dados['empresa']['morada'];
            }

            $pdf = Pdf::loadView('documentos.pdf', $dados)
                ->setPaper('a4', 'portrait')
                ->setOptions([
                    'defaultFont'          => 'DejaVu Sans',
                    'isRemoteEnabled'      => true,
                    'isHtml5ParserEnabled' => true,
                    'dpi'                  => 150,
                ]);

            return $pdf->download($this->nomePdfSeguro($documento->numero_documento));
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Documento não encontrado para download PDF', ['id' => $id]);
            return response()->json([
                'success' => false,
                'message' => 'Documento não encontrado'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Erro ao fazer download do PDF', ['id' => $id, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    public function publicProof(Request $request, string $id): \Illuminate\Contracts\View\View
    {
        try {
            $this->empresa = app('current.empresa');
            $this->modo = $this->empresa?->modo ?? session('tenant_modo', 'colectivo');

            $empresaArray = $this->obterEmpresaAtual();
            if (!$empresaArray) {
                abort(404, 'Empresa não identificada');
            }

            $empresaArray['logo_base64'] = null;
            $logoPath = $empresaArray['logo'] ?? null;
            if (!empty($logoPath)) {
                try {
                    if (Storage::disk('public')->exists($logoPath)) {
                        $logoConteudo = Storage::disk('public')->get($logoPath);
                        $logoMime = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (Storage::disk('local')->exists($logoPath)) {
                        $logoConteudo = Storage::disk('local')->get($logoPath);
                        $logoMime = Storage::disk('local')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (file_exists(public_path($logoPath))) {
                        $logoConteudo = file_get_contents(public_path($logoPath));
                        $logoMime = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    }
                } catch (\Throwable $logoErr) {
                    Log::warning('publicProof: erro ao converter logo', ['error' => $logoErr->getMessage()]);
                }
            }

            if ($this->modo === 'colectivo') {
                $documento = SharedDocumentoFiscal::doTenant()
                    ->with(['itens.produto', 'cliente', 'documentoOrigem', 'user'])
                    ->where('id', $id)
                    ->firstOrFail();
            } else {
                $documento = TenantDocumentoFiscal::with(['itens.produto', 'cliente', 'documentoOrigem', 'user'])
                    ->where('id', $id)
                    ->firstOrFail();
            }

            $documentoOrigem = null;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                if ($this->modo === 'colectivo') {
                    $documentoOrigem = SharedDocumentoFiscal::doTenant()
                        ->with(['itens.produto', 'cliente', 'user'])
                        ->where('id', $documento->fatura_id)
                        ->first();
                } else {
                    $documentoOrigem = TenantDocumentoFiscal::with(['itens.produto', 'cliente', 'user'])
                        ->where('id', $documento->fatura_id)
                        ->first();
                }
            }

            $docInfo = $documentoOrigem ?? $documento;
            $cliente = [
                'nome' => $docInfo->cliente_nome ?? $docInfo->cliente?->nome ?? 'Consumidor Final',
                'nif' => $docInfo->cliente_nif ?? $docInfo->cliente?->nif ?? null,
                'morada' => $docInfo->cliente?->endereco ?? $docInfo->cliente?->morada ?? null,
            ];

            $proofUrl = $request->fullUrl();

            return view('documentos.proof', [
                'empresa' => $empresaArray,
                'documento' => $documento,
                'documentoOrigem' => $documentoOrigem,
                'docInfo' => $docInfo,
                'itens' => collect($docInfo->itens ?? []),
                'cliente' => $cliente,
                'proof_url' => $proofUrl,
                'proof_qr_html' => $this->gerarQrHtml($proofUrl),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            abort(404, 'Documento não encontrado');
        } catch (\Throwable $e) {
            Log::error('Erro no publicProof', ['id' => $id, 'error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar comprovativo público');
        }
    }

    public function pdfViewer(Request $request, string $id): \Illuminate\Contracts\View\View
    {
        try {
            $this->verificarAcessoUsuario();

            Log::info('pdfViewer called', ['id' => $id, 'modo' => $this->getModo()]);

            if ($this->isColectivo()) {
                $documento = SharedDocumentoFiscal::doTenant()->with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            } else {
                $documento = TenantDocumentoFiscal::with(['itens.produto', 'cliente'])->where('id', $id)->firstOrFail();
            }

            $dados = $this->documentoService->dadosParaPdf($documento);

            $documentoOrigem = null;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                if ($this->isColectivo()) {
                    $documentoOrigem = SharedDocumentoFiscal::doTenant()->with(['itens.produto', 'cliente'])->where('id', $documento->fatura_id)->first();
                } else {
                    $documentoOrigem = TenantDocumentoFiscal::with(['itens.produto', 'cliente'])->where('id', $documento->fatura_id)->first();
                }
            }

            $docInfo = $documentoOrigem ?? $documento;

            $qrCodeTexto = $dados['qr_code'] ?? null;
            $qrCodeImg   = null;

            if ($qrCodeTexto && class_exists(QrCode::class)) {
                try {
                    $qrCode = new QrCode(
                        $qrCodeTexto,
                        new Encoding('UTF-8'),
                        ErrorCorrectionLevel::Medium,
                        220,
                        6
                    );
                    $writer    = new SvgWriter();
                    $result    = $writer->write($qrCode, null, null, [
                        SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
                    ]);
                    $qrCodeImg = $result->getDataUri();
                } catch (\Throwable $e) {
                    Log::warning('QR Code generation failed', ['error' => $e->getMessage()]);
                }
            }

            $empresaArray = $this->obterEmpresaAtual() ?? [];
            $empresaArray['logo_base64'] = null;

            $logoPath = $empresaArray['logo'] ?? null;
            if (!empty($logoPath)) {
                try {
                    if (Storage::disk('public')->exists($logoPath)) {
                        $logoConteudo           = Storage::disk('public')->get($logoPath);
                        $logoMime               = Storage::disk('public')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (Storage::disk('local')->exists($logoPath)) {
                        $logoConteudo           = Storage::disk('local')->get($logoPath);
                        $logoMime               = Storage::disk('local')->mimeType($logoPath) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    } elseif (file_exists(public_path($logoPath))) {
                        $logoConteudo           = file_get_contents(public_path($logoPath));
                        $logoMime               = mime_content_type(public_path($logoPath)) ?: 'image/jpeg';
                        $empresaArray['logo_base64'] = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
                    }
                } catch (\Throwable $logoErr) {
                    Log::warning('pdfViewer: erro ao converter logo para base64', [
                        'logo_path' => $logoPath,
                        'error'     => $logoErr->getMessage(),
                    ]);
                }
            }

            $proofUrl    = $this->montarUrlDeProva($request, $id);
            $proofQrHtml = $this->gerarQrHtml($proofUrl);

            return view('documentos.pdf-viewer', [
                'empresa'         => $empresaArray,
                'documento'       => $documento,
                'documentoOrigem' => $documentoOrigem,
                'docInfo'         => $docInfo,
                'itens'           => collect($docInfo->itens ?? []),
                'cliente'         => $dados['cliente'],
                'qr_code'         => $qrCodeTexto,
                'qr_code_img'     => $qrCodeImg,
                'qr_html'         => $this->gerarQrHtml($qrCodeTexto),
                'proof_url'       => $proofUrl,
                'proof_qr_html'   => $proofQrHtml,
                'modo'            => $this->getModo(),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            abort(404, 'Documento não encontrado');
        } catch (\Exception $e) {
            Log::error('Erro no pdfViewer', ['error' => $e->getMessage()]);
            abort(500, 'Erro ao gerar visualização do PDF');
        }
    }

    public function exportarExcel(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        try {
            $this->verificarAcessoUsuario();

            $filtros = $request->validate([
                'tipo'              => 'nullable|in:FT,FR,FP,FA,NC,ND,RC,FRt',
                'estado'            => 'nullable|in:emitido,paga,parcialmente_paga,cancelado,expirado',
                'cliente_id'        => 'nullable|uuid|exists:clientes,id',
                'data_inicio'       => 'nullable|date',
                'data_fim'          => 'nullable|date',
                'apenas_vendas'     => 'nullable|in:0,1,true,false',
                'apenas_nao_vendas' => 'nullable|in:0,1,true,false',
            ]);

            $dados = $this->documentoService->dadosParaExcel($filtros);
            $cabecalho = $dados['cabecalho'];
            $linhas    = $dados['linhas'];

            $spreadsheet = new Spreadsheet();
            $sheet       = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Documentos Fiscais');
            $sheet->fromArray([$cabecalho], null, 'A1');

            $ultimaColuna = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($cabecalho));

            $sheet->getStyle("A1:{$ultimaColuna}1")->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1a1a2e']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            if (!empty($linhas)) {
                $sheet->fromArray($linhas, null, 'A2');
            }

            foreach (range(1, count($cabecalho)) as $col) {
                $sheet->getColumnDimension(
                    \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col)
                )->setAutoSize(true);
            }

            $sheet->freezePane('A2');
            $nomeArquivo = 'documentos-fiscais-' . now()->format('Y-m-d') . '.xlsx';

            return response()->streamDownload(function () use ($spreadsheet) {
                (new Xlsx($spreadsheet))->save('php://output');
            }, $nomeArquivo, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$nomeArquivo}\"",
                'Cache-Control'       => 'max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao exportar Excel', ['error' => $e->getMessage()]);
            abort(500, 'Erro ao exportar Excel: ' . $e->getMessage());
        }
    }

    public function converterProforma(Request $request, string $proformaId): JsonResponse
    {
        $modo = $this->getModo();

        try {
            $this->verificarAcessoUsuario();

            $proforma = $this->documentoService->buscarDocumento($proformaId);

            if ($proforma->tipo_documento !== 'FP') {
                return response()->json([
                    'success' => false,
                    'message' => 'Este documento não é uma Proforma (FP). Tipo atual: ' . $proforma->tipo_documento,
                ], 422);
            }

            $dados = $request->validate([
                'tipo_destino' => 'required|in:FT,FR',
                'dados_pagamento' => 'required_if:tipo_destino,FR|nullable|array',
                'dados_pagamento.metodo' => 'required_if:tipo_destino,FR|in:transferencia,multibanco,dinheiro,cheque,cartao',
                'dados_pagamento.valor' => 'required_if:tipo_destino,FR|numeric|min:0.01|max:' . $proforma->total_liquido,
                'data_vencimento' => 'nullable|date|after_or_equal:today',
            ]);

            $documento = $this->documentoService->converterProforma($proforma, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Proforma convertida com sucesso para ' . ($dados['tipo_destino'] === 'FR' ? 'Fatura-Recibo' : 'Fatura'),
                'data' => $documento,
                'modo' => $modo,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'message' => 'Proforma não encontrada'], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Erro de validação', 'errors' => $e->errors()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return $this->erroInterno('Erro ao converter proforma', $e);
        }
    }

    /* =====================================================================
     | HELPERS PRIVADOS (MANTIDOS)
     | ================================================================== */

    private function gerarQrHtml(?string $qrCodeTexto): string
    {
        if (empty($qrCodeTexto)) {
            return '';
        }

        try {
            $qr = new QrCode(
                $qrCodeTexto,
                new Encoding('UTF-8'),
                ErrorCorrectionLevel::Medium,
                220,
                6
            );

            $writer = new SvgWriter();
            $result = $writer->write($qr, null, null, [
                SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
            ]);

            return $result->getString();
        } catch (\Throwable $e) {
            Log::warning('Falha ao gerar QR Code em SVG', ['error' => $e->getMessage()]);
            try {
                $qr = new QrCode(
                    $qrCodeTexto,
                    new Encoding('UTF-8'),
                    ErrorCorrectionLevel::Medium,
                    220,
                    6
                );

                $writer = new SvgWriter();
                $result = $writer->write($qr, null, null, [
                    SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
                ]);

                return $result->getString();
            } catch (\Throwable $e2) {
                Log::warning('Falha ao gerar QR Code em SVG', ['error' => $e2->getMessage()]);
                return '';
            }
        }
    }

    private function montarUrlDeProva(Request $request, string $id): string
    {
        $frontendUrl = env('APP_FRONTEND_URL');
        if (empty($frontendUrl)) {
            $scheme = $request->getScheme();
            $host = preg_replace('/:\d+$/', '', $request->getHost());
            $frontendUrl = sprintf('%s://%s:3000', $scheme, $host);
        }

        $empresaId = null;
        if ($request->attributes->has('current_tenant')) {
            $empresaId = $request->attributes->get('current_tenant')->id ?? null;
        } elseif ($request->attributes->has('current_empresa')) {
            $empresaId = $request->attributes->get('current_empresa')->id ?? null;
        }

        $url = rtrim($frontendUrl, '/') . '/' . ltrim($id, '/');
        if ($empresaId) {
            $url .= '?empresa=' . urlencode($empresaId);
        }

        return $url;
    }

    private function nomePdfSeguro(?string $nomeDocumento): string
    {
        $nomeDocumento = trim((string) $nomeDocumento);

        if ($nomeDocumento === '') {
            return 'documento.pdf';
        }

        $nomeDocumento = preg_replace('/[\\\\\\/]+/', '-', $nomeDocumento);
        $nomeDocumento = preg_replace('/[[:cntrl:]]+/', '', $nomeDocumento);
        $nomeDocumento = trim($nomeDocumento);

        return ($nomeDocumento ?: 'documento') . '.pdf';
    }

    private function erroInterno(string $mensagem, \Exception $e): JsonResponse
    {
        Log::error($mensagem . ':', [
            'error' => $e->getMessage(),
            'modo' => $this->getModo(),
        ]);
        return response()->json([
            'success' => false,
            'message' => $mensagem,
            'error'   => $e->getMessage(),
            'modo'    => $this->getModo(),
        ], 500);
    }
}
