<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use App\Models\Plano;
use App\Models\Pagamento;
use App\Models\Subscricao;
use App\Models\Notificacao;
use App\Services\NotificacaoService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PagamentoLandlordController extends Controller
{
    /* ================================================================
     | LISTAR
     | ================================================================ */
    public function index(Request $request)
    {
        try {
            $query = Pagamento::with(['subscricao', 'empresa', 'plano']);

            if ($request->has('subscricao_id')) {
                $query->where('subscricao_id', $request->subscricao_id);
            }
            if ($request->has('empresa_id')) {
                $query->where('empresa_id', $request->empresa_id);
            }
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $pagamentos = $query->orderByDesc('created_at')->get();

            return response()->json([
                'pagamentos' => $pagamentos,
            ]);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::index] Erro', [
                'mensagem' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /* ================================================================
     | MOSTRAR
     | ================================================================ */
    public function show($id)
    {
        try {
            $pagamento = Pagamento::with(['subscricao', 'empresa', 'plano'])->findOrFail($id);

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
                    'historico_status' => $pagamento->historico_status ?? [],   // 
                    'data_pagamento' => $pagamento->data_pagamento?->toISOString(),
                    'created_at' => $pagamento->created_at?->toISOString(),
                    'updated_at' => $pagamento->updated_at?->toISOString(),
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::show] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro interno'], 500);
        }
    }

    /* ================================================================
     | CRIAR
     | ================================================================ */
    public function store(Request $request)
    {
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
                'historico_status' => [
                    [
                        'status' => 'pendente',
                        'data'   => now()->toIso8601String(),
                        'por'    => 'sistema',
                        'motivo' => 'Pagamento criado',
                    ],
                ],
            ]);

            return response()->json([
                'message' => 'Pagamento criado com sucesso',
                'pagamento' => $pagamento,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::store] Erro', [
                'mensagem' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /* ================================================================
     | UPLOAD DE COMPROVATIVO
     | ================================================================ */
    public function uploadComprovativo(Request $request, $id)
    {
        try {
            $request->validate([
                'comprovativo' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);

            $pagamento = Pagamento::with(['empresa', 'plano'])->findOrFail($id);

            if (!in_array($pagamento->status, ['pendente', 'rejeitado'])) {
                return response()->json([
                    'message' => 'Não é possível enviar comprovativo para este estado.',
                ], 422);
            }

            // Guardar ficheiro
            $path = $request->file('comprovativo')->store('comprovativos', 'public');
            $pagamento->comprovativo_path = $path;
            $pagamento->status = 'em_analise';
            $pagamento->motivo_rejeicao = null;

            //  Histórico
            $pagamento->registarStatus(
                'em_analise',
                por: auth('sanctum')->user()?->email ?? 'empresa',
                motivo: 'Comprovativo enviado',
            );

            $pagamento->save();

            //  NOTIFICAÇÃO
            try {
                $nomeEmpresa = $pagamento->empresa?->nome ?? 'Empresa desconhecida';
                $valorFormatado = number_format($pagamento->valor, 2, ',', '.');
                $planoNome = $pagamento->plano?->nome ?? '—';

                NotificacaoService::enviarParaSuperAdmins(
                    titulo: "Novo comprovativo: {$nomeEmpresa}",
                    mensagem: "A empresa \"{$nomeEmpresa}\" enviou um comprovativo de pagamento de {$valorFormatado} AOA (plano {$planoNome}). Aguarda análise.",
                    tipo: 'warning',
                    tipoEvento: 'comprovativo_recebido',
                    dados: [
                        'Empresa'    => $nomeEmpresa,
                        'Plano'      => $planoNome,
                        'Valor'      => "{$valorFormatado} AOA",
                        'Referência' => $pagamento->codigo_transacao ?? '—',
                    ],
                    url: "/landlord/pagamentos-plano/{$pagamento->id}",
                    empresaId: $pagamento->empresa_id,
                );
            } catch (\Throwable $e) {
                Log::error('[uploadComprovativo] Falha na notificação', [
                    'pagamento_id' => $id,
                    'erro' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message' => 'Comprovativo enviado com sucesso. Aguarde análise.',
                'pagamento' => $pagamento,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[uploadComprovativo] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro ao processar upload'], 500);
        }
    }

    /* ================================================================
     | CONFIRMAR PAGAMENTO
     | ================================================================ */
    public function confirmarPagamento($id)
    {
        try {
            $result = DB::transaction(function () use ($id) {
                $pagamento = Pagamento::lockForUpdate()->with(['empresa', 'plano'])->findOrFail($id);

                if ($pagamento->status === 'pago') {
                    return response()->json([
                        'message' => 'Pagamento já confirmado anteriormente',
                        'subscricao_id' => $pagamento->subscricao_id,
                    ]);
                }

                if ($pagamento->status === 'rejeitado') {
                    return response()->json([
                        'message' => 'Pagamento rejeitado não pode ser confirmado. Peça novo upload de comprovativo.',
                    ], 422);
                }

                if ($pagamento->status !== 'em_analise') {
                    return response()->json([
                        'message' => 'Pagamento não pode ser confirmado neste estado',
                    ], 422);
                }

                // Atualiza status
                $pagamento->status = 'pago';
                $pagamento->data_pagamento = now();

                //  Histórico
                $pagamento->registarStatus(
                    'pago',
                    por: auth('landlord')->user()?->email ?? 'landlord',
                    motivo: 'Pagamento confirmado',
                );

                // Criar ou renovar subscrição
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
                } else {
                    $subscricao = $pagamento->subscricao;
                    $duracaoMeses = $subscricao->plano->duracao_meses ?? 1;
                    $subscricao->data_fim = Carbon::parse($subscricao->data_fim)->addMonths($duracaoMeses);
                    $subscricao->status = 'ativa';
                    $subscricao->save();
                }

                $pagamento->save();

                // Marcar notificações anteriores como lidas
                Notificacao::where('empresa_id', $pagamento->empresa_id)
                    ->where('tipo_evento', 'comprovativo_recebido')
                    ->where('lida', false)
                    ->update(['lida' => true, 'lida_em' => now()]);

                //  NOTIFICAÇÃO
                try {
                    $pagamento->loadMissing('empresa', 'plano');
                    $nomeEmpresa = $pagamento->empresa?->nome ?? '—';
                    $planoNome = $pagamento->plano?->nome ?? '—';
                    $valorFormatado = number_format($pagamento->valor, 2, ',', '.');
                    $dataFim = $subscricao->data_fim
                        ? Carbon::parse($subscricao->data_fim)->format('d/m/Y')
                        : '—';

                    NotificacaoService::enviarParaSuperAdmins(
                        titulo: "Pagamento confirmado: {$nomeEmpresa}",
                        mensagem: "O pagamento de {$valorFormatado} AOA da empresa \"{$nomeEmpresa}\" foi confirmado. Plano \"{$planoNome}\" ativo até {$dataFim}.",
                        tipo: 'success',
                        tipoEvento: 'pagamento_confirmado',
                        dados: [
                            'Empresa'    => $nomeEmpresa,
                            'Plano'      => $planoNome,
                            'Valor'      => "{$valorFormatado} AOA",
                            'Válido até' => $dataFim,
                        ],
                        url: "/landlord/empresas/{$pagamento->empresa_id}",
                        empresaId: $pagamento->empresa_id,
                    );
                } catch (\Throwable $e) {
                    Log::error('[confirmarPagamento] Falha na notificação', [
                        'pagamento_id' => $id,
                        'erro' => $e->getMessage(),
                    ]);
                }

                return response()->json([
                    'message' => 'Pagamento confirmado e assinatura ativada',
                    'subscricao_id' => $pagamento->subscricao_id,
                ]);
            });

            return $result;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[confirmarPagamento] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro ao confirmar pagamento'], 500);
        }
    }

    /* ================================================================
     | REJEITAR PAGAMENTO
     | ================================================================ */
    public function rejeitarPagamento(Request $request, $id)
    {
        try {
            $request->validate([
                'motivo' => 'required|string|max:500',
            ]);

            $pagamento = Pagamento::with(['empresa', 'plano'])->findOrFail($id);

            if ($pagamento->status === 'pago') {
                return response()->json([
                    'message' => 'Pagamento já confirmado, não pode ser rejeitado.',
                ], 422);
            }

            //  NOVO — bloquear rejeição duplicada
            if ($pagamento->status === 'rejeitado') {
                return response()->json([
                    'message' => 'Este pagamento já foi rejeitado.',
                    'motivo_rejeicao' => $pagamento->motivo_rejeicao,
                ], 422);
            }

            $pagamento->status = 'rejeitado';
            $pagamento->motivo_rejeicao = $request->motivo;

            //  Histórico
            $pagamento->registarStatus(
                'rejeitado',
                por: auth('landlord')->user()?->email ?? 'landlord',
                motivo: $request->motivo,
            );

            $pagamento->save();

            // Marcar notificações de comprovativo como lidas
            Notificacao::where('empresa_id', $pagamento->empresa_id)
                ->where('tipo_evento', 'comprovativo_recebido')
                ->where('lida', false)
                ->update(['lida' => true, 'lida_em' => now()]);

            //  NOTIFICAÇÃO
            try {
                $nomeEmpresa = $pagamento->empresa?->nome ?? '—';
                $planoNome = $pagamento->plano?->nome ?? '—';

                NotificacaoService::enviarParaSuperAdmins(
                    titulo: "Pagamento rejeitado: {$nomeEmpresa}",
                    mensagem: "O pagamento do plano \"{$planoNome}\" da empresa \"{$nomeEmpresa}\" foi rejeitado.\n\nMotivo: {$request->motivo}",
                    tipo: 'danger',
                    tipoEvento: 'pagamento_rejeitado',
                    dados: [
                        'Empresa' => $nomeEmpresa,
                        'Plano'   => $planoNome,
                        'Motivo'  => $request->motivo,
                    ],
                    url: "/landlord/empresas/{$pagamento->empresa_id}",
                    empresaId: $pagamento->empresa_id,
                );
            } catch (\Throwable $e) {
                Log::error('[rejeitarPagamento] Falha na notificação', [
                    'pagamento_id' => $id,
                    'erro' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message' => 'Pagamento rejeitado com sucesso.',
                'pagamento' => $pagamento,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[rejeitarPagamento] Erro', [
                'pagamento_id' => $id,
                'mensagem' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro ao rejeitar pagamento'], 500);
        }
    }

    /* ================================================================
     | ELIMINAR
     | ================================================================ */
    public function destroy($id)
    {
        try {
            $pagamento = Pagamento::findOrFail($id);

            if ($pagamento->subscricao_id && $pagamento->subscricao?->status === 'ativa') {
                return response()->json([
                    'message' => 'Não é possível eliminar um pagamento de uma assinatura activa.',
                ], 422);
            }

            $pagamento->delete();

            return response()->json(null, 204);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao excluir pagamento'], 500);
        }
    }

    /* ================================================================
     | UPDATE (não implementado)
     | ================================================================ */
    public function update(Request $request, $id)
    {
        return response()->json(['message' => 'Use os endpoints específicos'], 405);
    }
}