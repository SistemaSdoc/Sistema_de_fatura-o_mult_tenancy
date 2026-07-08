<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use App\Models\Plano;
use App\Models\Empresa;
use App\Models\Pagamento;
use App\Models\Subscricao;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use App\Notifications\ComprovativoRecebido;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Log;

class PagamentoLandlordController extends Controller
{
    /**
     * Listar pagamentos com filtros
     */
    public function index(Request $request)
    {
        Log::info('[PagamentoLandlordController::index] Iniciada listagem', [
            'filtros' => $request->all(),
            'usuario' => auth('landlord')->user()?->email ?? 'desconhecido'
        ]);

        try {
            $query = Pagamento::with(['subscricao', 'empresa']);

            if ($request->has('subscricao_id')) {
                $query->where('subscricao_id', $request->subscricao_id);
            }
            if ($request->has('empresa_id')) {
                $query->where('empresa_id', $request->empresa_id);
            }
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $pagamentos = $query->get();

            Log::info('[PagamentoLandlordController::index] Listagem concluída', [
                'quantidade' => $pagamentos->count()
            ]);

            return response()->json([
                'pagamentos' => $pagamentos,
            ]);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::index] Erro', [
                'mensagem' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Mostrar um pagamento específico (inclui status e motivo de rejeição)
     */
    public function show($id)
    {
        Log::info('[PagamentoLandlordController::show] Buscando pagamento', [
            'pagamento_id' => $id,
            'usuario' => auth('landlord')->user()?->email ?? auth('sanctum')->user()?->email ?? 'desconhecido'
        ]);

        try {
            $pagamento = Pagamento::with(['subscricao', 'empresa'])->findOrFail($id);
            
            Log::info('[PagamentoLandlordController::show] Pagamento encontrado', [
                'pagamento_id' => $id,
                'status' => $pagamento->status,
                'empresa_id' => $pagamento->empresa_id
            ]);

            return response()->json([
                'message' => 'Pagamento encontrado',
                'pagamento' => [
                    'id' => $pagamento->id,
                    'empresa_id' => $pagamento->empresa_id,
                    'subscricao_id' => $pagamento->subscricao_id,
                    'plano_id' => $pagamento->plano_id,
                    'valor' => $pagamento->valor,
                    'metodo_pagamento' => $pagamento->metodo_pagamento,
                    'referencia' => $pagamento->referencia,
                    'status' => $pagamento->status,
                    'motivo_rejeicao' => $pagamento->motivo_rejeicao,
                    'comprovativo_path' => $pagamento->comprovativo_path,
                    'data_pagamento' => $pagamento->data_pagamento ? $pagamento->data_pagamento->toISOString() : null,
                    'created_at' => $pagamento->created_at->toISOString(),
                    'updated_at' => $pagamento->updated_at->toISOString(),
                ]
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[PagamentoLandlordController::show] Pagamento não encontrado', ['id' => $id]);
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::show] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erro interno ao buscar pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store - criar um novo pagamento (chamado pela empresa ao iniciar subscrição)
     */
    public function store(Request $request)
    {
        Log::info('[PagamentoLandlordController::store] Iniciando criação', [
            'dados' => $request->all(),
            'usuario' => auth('sanctum')->user()?->email ?? 'desconhecido'
        ]);

        try {
            $validated = $request->validate([
                'empresa_id' => 'required|exists:empresas,id',
                'plano_id' => 'required|exists:planos,id',
                'valor' => 'required|numeric|min:0.01',
                'metodo_pagamento' => 'required|string|in:transferencia,multicaixa,cartao_credito',
                'referencia' => 'nullable|string|max:100',
            ]);

            $pagamento = Pagamento::create([
                'id' => (string) Str::uuid(),
                'empresa_id' => $validated['empresa_id'],
                'plano_id' => $validated['plano_id'],
                'valor' => $validated['valor'],
                'metodo_pagamento' => $validated['metodo_pagamento'],
                'referencia' => $validated['referencia'] ?? Str::random(8),
                'status' => 'pendente',
                'data_pagamento' => null,
                'subscricao_id' => null,
            ]);

            Log::info('[PagamentoLandlordController::store] Pagamento criado', [
                'pagamento_id' => $pagamento->id,
                'empresa_id' => $pagamento->empresa_id,
                'valor' => $pagamento->valor
            ]);

            return response()->json([
                'message' => 'Pagamento criado com sucesso',
                'pagamento' => $pagamento,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[PagamentoLandlordController::store] Erro de validação', [
                'errors' => $e->errors()
            ]);
            throw $e;
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::store] Erro', [
                'mensagem' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Upload do comprovativo (empresa) → envia email para o admin
     */
    public function uploadComprovativo(Request $request, $id)
    {
        Log::info('[PagamentoLandlordController::uploadComprovativo] Iniciando upload', [
            'pagamento_id' => $id,
            'usuario' => auth('sanctum')->user()?->email ?? 'desconhecido'
        ]);

        try {
            $request->validate([
                'comprovativo' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);

            $pagamento = Pagamento::findOrFail($id);

            Log::debug('[PagamentoLandlordController::uploadComprovativo] Pagamento encontrado', [
                'pagamento_id' => $id,
                'status_atual' => $pagamento->status
            ]);

            if (!in_array($pagamento->status, ['pendente', 'rejeitado'])) {
                Log::warning('[PagamentoLandlordController::uploadComprovativo] Estado inválido', [
                    'pagamento_id' => $id,
                    'status' => $pagamento->status
                ]);
                return response()->json([
                    'message' => 'Não é possível enviar comprovativo para este estado.'
                ], 422);
            }

            // Guardar ficheiro
            $path = $request->file('comprovativo')->store('comprovativos', 'public');
            $pagamento->comprovativo_path = $path;
            $pagamento->status = 'em_analise';
            $pagamento->motivo_rejeicao = null;
            $pagamento->save();

            Log::info('[PagamentoLandlordController::uploadComprovativo] Ficheiro guardado e status atualizado', [
                'pagamento_id' => $id,
                'path' => $path,
                'novo_status' => 'em_analise'
            ]);

            // -- ENVIAR NOTIFICAÇÃO POR EMAIL AO ADMIN --
            $adminEmail = config('mail.admin_email');
            
            Log::info('[PagamentoLandlordController::uploadComprovativo] Tentando enviar notificação', [
                'para' => $adminEmail,
                'pagamento_id' => $id
            ]);

            try {
                Notification::route('mail', $adminEmail)
                    ->notify(new ComprovativoRecebido($pagamento));
                
                Log::info('[PagamentoLandlordController::uploadComprovativo] Notificação enviada com sucesso', [
                    'para' => $adminEmail,
                    'pagamento_id' => $id
                ]);
            } catch (\Exception $e) {
                Log::error('[PagamentoLandlordController::uploadComprovativo] Falha ao enviar notificação', [
                    'para' => $adminEmail,
                    'pagamento_id' => $id,
                    'erro' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // Não falha a requisição, apenas loga o erro
            }

            return response()->json([
                'message' => 'Comprovativo enviado com sucesso. Aguarde análise.',
                'pagamento' => $pagamento,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[PagamentoLandlordController::uploadComprovativo] Erro de validação', [
                'errors' => $e->errors()
            ]);
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[PagamentoLandlordController::uploadComprovativo] Pagamento não encontrado', [
                'pagamento_id' => $id
            ]);
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::uploadComprovativo] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erro ao processar upload',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Confirmar pagamento (admin) → cria/renova subscrição
     */
    public function confirmarPagamento($id)
    {
        Log::info('[PagamentoLandlordController::confirmarPagamento] Iniciando confirmação', [
            'pagamento_id' => $id,
            'usuario' => auth('landlord')->user()?->email ?? 'desconhecido'
        ]);

        try {
            $result = DB::transaction(function () use ($id) {
                $pagamento = Pagamento::lockForUpdate()->findOrFail($id);

                Log::debug('[PagamentoLandlordController::confirmarPagamento] Pagamento encontrado', [
                    'pagamento_id' => $id,
                    'status_atual' => $pagamento->status
                ]);

                if ($pagamento->status === 'pago') {
                    Log::info('[PagamentoLandlordController::confirmarPagamento] Pagamento já confirmado', [
                        'pagamento_id' => $id
                    ]);
                    return response()->json([
                        'message' => 'Pagamento já confirmado anteriormente',
                        'subscricao_id' => $pagamento->subscricao_id,
                    ]);
                }

                if ($pagamento->status !== 'em_analise') {
                    Log::warning('[PagamentoLandlordController::confirmarPagamento] Estado inválido para confirmação', [
                        'pagamento_id' => $id,
                        'status' => $pagamento->status
                    ]);
                    return response()->json([
                        'message' => 'Pagamento não pode ser confirmado neste estado'
                    ], 422);
                }

                // Atualiza status
                $pagamento->status = 'pago';
                $pagamento->data_pagamento = now();

                // Se não houver subscrição, cria uma nova
                if (!$pagamento->subscricao_id) {
                    $plano = Plano::findOrFail($pagamento->plano_id);
                    $duracaoMeses = $plano->duracao_meses ?? 1;

                    $subscricao = Subscricao::create([
                        'id' => (string) Str::uuid(),
                        'empresa_id' => $pagamento->empresa_id,
                        'plano_id' => $plano->id,
                        'data_inicio' => now(),
                        'data_fim' => now()->addMonths($duracaoMeses),
                        'status' => 'ativa',
                        'forma_pagamento' => $pagamento->metodo_pagamento,
                        'renovacao_automatica' => true,
                    ]);

                    $pagamento->subscricao_id = $subscricao->id;
                    
                    Log::info('[PagamentoLandlordController::confirmarPagamento] Nova subscrição criada', [
                        'pagamento_id' => $id,
                        'subscricao_id' => $subscricao->id,
                        'empresa_id' => $pagamento->empresa_id,
                        'plano_id' => $plano->id
                    ]);
                } else {
                    // Renovação: estende a data de fim
                    $subscricao = $pagamento->subscricao;
                    $duracaoMeses = $subscricao->plano->duracao_meses ?? 1;
                    $subscricao->data_fim = Carbon::parse($subscricao->data_fim)->addMonths($duracaoMeses);
                    $subscricao->status = 'ativa';
                    $subscricao->save();

                    Log::info('[PagamentoLandlordController::confirmarPagamento] Subscrição renovada', [
                        'pagamento_id' => $id,
                        'subscricao_id' => $subscricao->id,
                        'nova_data_fim' => $subscricao->data_fim->toISOString()
                    ]);
                }

                $pagamento->save();

                Log::info('[PagamentoLandlordController::confirmarPagamento] Confirmação concluída com sucesso', [
                    'pagamento_id' => $id,
                    'subscricao_id' => $pagamento->subscricao_id
                ]);

                return response()->json([
                    'message' => 'Pagamento confirmado e assinatura ativada',
                    'subscricao_id' => $pagamento->subscricao_id,
                ]);
            });

            return $result;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[PagamentoLandlordController::confirmarPagamento] Pagamento não encontrado', [
                'pagamento_id' => $id
            ]);
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::confirmarPagamento] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erro ao confirmar pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rejeitar pagamento (admin)
     */
    public function rejeitarPagamento(Request $request, $id)
    {
        Log::info('[PagamentoLandlordController::rejeitarPagamento] Iniciando rejeição', [
            'pagamento_id' => $id,
            'usuario' => auth('landlord')->user()?->email ?? 'desconhecido',
            'motivo' => $request->motivo ?? null
        ]);

        try {
            $request->validate([
                'motivo' => 'required|string|max:500',
            ]);

            $pagamento = Pagamento::findOrFail($id);

            Log::debug('[PagamentoLandlordController::rejeitarPagamento] Pagamento encontrado', [
                'pagamento_id' => $id,
                'status_atual' => $pagamento->status
            ]);

            if ($pagamento->status === 'pago') {
                Log::warning('[PagamentoLandlordController::rejeitarPagamento] Tentativa de rejeitar pagamento já pago', [
                    'pagamento_id' => $id
                ]);
                return response()->json([
                    'message' => 'Pagamento já confirmado, não pode ser rejeitado.'
                ], 422);
            }

            $pagamento->status = 'rejeitado';
            $pagamento->motivo_rejeicao = $request->motivo;
            $pagamento->save();

            Log::info('[PagamentoLandlordController::rejeitarPagamento] Pagamento rejeitado', [
                'pagamento_id' => $id,
                'motivo' => $request->motivo
            ]);

            return response()->json([
                'message' => 'Pagamento rejeitado com sucesso.',
                'pagamento' => $pagamento,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[PagamentoLandlordController::rejeitarPagamento] Erro de validação', [
                'errors' => $e->errors()
            ]);
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[PagamentoLandlordController::rejeitarPagamento] Pagamento não encontrado', [
                'pagamento_id' => $id
            ]);
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::rejeitarPagamento] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erro ao rejeitar pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete (apenas se não tiver subscrição activa)
     */
    public function destroy($id)
    {
        Log::info('[PagamentoLandlordController::destroy] Iniciando exclusão', [
            'pagamento_id' => $id,
            'usuario' => auth('landlord')->user()?->email ?? 'desconhecido'
        ]);

        try {
            $pagamento = Pagamento::findOrFail($id);

            if ($pagamento->subscricao_id && $pagamento->subscricao->status === 'ativa') {
                Log::warning('[PagamentoLandlordController::destroy] Impedido: pagamento com subscrição activa', [
                    'pagamento_id' => $id,
                    'subscricao_id' => $pagamento->subscricao_id
                ]);
                return response()->json([
                    'message' => 'Não é possível eliminar um pagamento de uma assinatura activa.'
                ], 422);
            }

            $pagamento->delete();

            Log::info('[PagamentoLandlordController::destroy] Pagamento excluído', [
                'pagamento_id' => $id
            ]);

            return response()->json(null, 204);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('[PagamentoLandlordController::destroy] Pagamento não encontrado', [
                'pagamento_id' => $id
            ]);
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::destroy] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erro ao excluir pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update genérico (se necessário)
     */
    public function update(Request $request, $id)
    {
        Log::info('[PagamentoLandlordController::update] Chamado método update (não implementado)', [
            'pagamento_id' => $id,
            'usuario' => auth('landlord')->user()?->email ?? 'desconhecido'
        ]);
        return response()->json(['message' => 'Use os endpoints específicos'], 405);
    }
}