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
     | HELPERS DE ESCOPO  (evita IDOR)
     | ================================================================ */

    /**
     * Devolve [User, isSuperAdmin, empresaId(s)]
     * Funciona tanto em contexto landlord_api (admin_empresa / super_admin)
     * como em contexto tenant (auth.tenant).
     */
    private function contexto(Request $request): array
    {
        $user = auth('landlord_api')->user()
            ?? auth('tenant')->user()
            ?? $request->user();

        abort_if(!$user, 401, 'Não autenticado.');

        $isSuperAdmin = in_array($user->role ?? null, ['super_admin'], true);

        // ─── CASO (a): coluna empresa_id no próprio utilizador ─────
        $empresaId = $user->empresa_id ?? null;

        // ─── CASO (b): ligação por pivot (descomenta e apaga o caso a) ─
        // $empresaIds = method_exists($user, 'empresas')
        //     ? $user->empresas()->pluck('empresas.id')->all()
        //     : [];

        return [$user, $isSuperAdmin, $empresaId];
    }

    /**
     * Aplica o filtro de empresa a uma query de Pagamento.
     * super_admin → sem filtro. Outros → apenas a(s) sua(s) empresa(s).
     */
    private function escopo(Request $request, $query)
    {
        [$user, $isSuperAdmin, $empresaId] = $this->contexto($request);

        if ($isSuperAdmin) {
            return $query;
        }

        // CASO (a)
        abort_unless($empresaId, 403, 'Utilizador sem empresa associada.');
        return $query->where('empresa_id', $empresaId);

        // CASO (b) — substitui as duas linhas acima por:
        // $empresaIds = method_exists($user, 'empresas')
        //     ? $user->empresas()->pluck('empresas.id')->all()
        //     : [];
        // abort_if(empty($empresaIds), 403, 'Utilizador sem empresa associada.');
        // return $query->whereIn('empresa_id', $empresaIds);
    }

    /* ================================================================
     | LISTAR
     | ================================================================ */
    public function index(Request $request)
    {
        try {
            $query = $this->escopo(
                $request,
                Pagamento::with(['subscricao', 'empresa', 'plano'])
            );

            // Os filtros abaixo ficam limitados pelo escopo acima
            if ($request->filled('subscricao_id')) {
                $query->where('subscricao_id', $request->subscricao_id);
            }
            if ($request->filled('empresa_id')) {
                $query->where('empresa_id', $request->empresa_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            return response()->json([
                'pagamentos' => $query->orderByDesc('created_at')->get(),
            ]);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::index] Erro', [
                'mensagem' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /* ================================================================
     | PENDENTES  (só super_admin — rota em grupo super_admin)
     | ================================================================ */
    public function pendentes(Request $request)
    {
        $pagamentos = Pagamento::with(['subscricao', 'empresa', 'plano'])
            ->whereIn('status', ['pendente', 'em_analise'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['pagamentos' => $pagamentos]);
    }

    /* ================================================================
     | MOSTRAR
     | ================================================================ */
    public function show(Request $request, $id)
    {
        try {
            $pagamento = $this->escopo(
                $request,
                Pagamento::with(['subscricao', 'empresa', 'plano'])
            )->findOrFail($id);

            return response()->json([
                'message'   => 'Pagamento encontrado',
                'pagamento' => [
                    'id'                => $pagamento->id,
                    'empresa_id'        => $pagamento->empresa_id,
                    'subscricao_id'     => $pagamento->subscricao_id,
                    'plano_id'          => $pagamento->plano_id,
                    'valor'             => $pagamento->valor,
                    'metodo_pagamento'  => $pagamento->metodo_pagamento,
                    'referencia'        => $pagamento->referencia,
                    'status'            => $pagamento->status,
                    'motivo_rejeicao'   => $pagamento->motivo_rejeicao,
                    'comprovativo_path' => $pagamento->comprovativo_path,
                    'historico_status'  => $pagamento->historico_status ?? [],
                    'data_pagamento'    => $pagamento->data_pagamento?->toISOString(),
                    'created_at'        => $pagamento->created_at?->toISOString(),
                    'updated_at'        => $pagamento->updated_at?->toISOString(),
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[PagamentoLandlordController::show] Erro', [
                'pagamento_id' => $id,
                'mensagem'     => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro interno'], 500);
        }
    }

    /* ================================================================
     | CRIAR  (tenant cria o seu próprio pagamento)
     | ================================================================ */
    public function store(Request $request)
    {
        try {
            [$user, $isSuperAdmin, $empresaId] = $this->contexto($request);

            $validated = $request->validate([
                'empresa_id'       => $isSuperAdmin
                                        ? 'required|exists:empresas,id'
                                        : 'nullable|exists:empresas,id',
                'plano_id'         => 'required|exists:planos,id',
                'valor'            => 'required|numeric|min:0.01',
                'metodo_pagamento' => 'required|string|in:transferencia,multicaixa,cartao_credito',
                'referencia'       => 'nullable|string|max:100',
            ]);

            // Não-super-admin só pode criar para a própria empresa
            if (!$isSuperAdmin) {
                abort_unless($empresaId, 403, 'Sem empresa associada.');
                $validated['empresa_id'] = $empresaId;
            }

            $pagamento = Pagamento::create([
                'id'               => (string) Str::uuid(),
                'empresa_id'       => $validated['empresa_id'],
                'plano_id'         => $validated['plano_id'],
                'valor'            => $validated['valor'],
                'metodo_pagamento' => $validated['metodo_pagamento'],
                'referencia'       => $validated['referencia'] ?? Str::random(8),
                'status'           => 'pendente',
                'data_pagamento'   => null,
                'subscricao_id'    => null,
                'historico_status' => [
                    [
                        'status' => 'pendente',
                        'data'   => now()->toIso8601String(),
                        'por'    => $user->email ?? 'sistema',
                        'motivo' => 'Pagamento criado',
                    ],
                ],
            ]);

            return response()->json([
                'message'   => 'Pagamento criado com sucesso',
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

            [$user] = $this->contexto($request);

            $pagamento = $this->escopo(
                $request,
                Pagamento::with(['empresa', 'plano'])
            )->findOrFail($id);

            if (!in_array($pagamento->status, ['pendente', 'rejeitado'], true)) {
                return response()->json([
                    'message' => 'Não é possível enviar comprovativo para este estado.',
                ], 422);
            }

            $path = $request->file('comprovativo')->store('comprovativos', 'public');
            $pagamento->comprovativo_path = $path;
            $pagamento->status            = 'em_analise';
            $pagamento->motivo_rejeicao   = null;

            $pagamento->registarStatus(
                'em_analise',
                por:    $user->email ?? 'sistema',
                motivo: 'Comprovativo enviado',
            );

            $pagamento->save();

            // Notifica os super admins (destino correto)
            try {
                $nomeEmpresa    = $pagamento->empresa?->nome ?? 'Empresa desconhecida';
                $valorFormatado = number_format($pagamento->valor, 2, ',', '.');
                $planoNome      = $pagamento->plano?->nome ?? '—';

                NotificacaoService::enviarParaSuperAdmins(
                    titulo:     "Novo comprovativo: {$nomeEmpresa}",
                    mensagem:   "A empresa \"{$nomeEmpresa}\" enviou um comprovativo de pagamento de {$valorFormatado} AOA (plano {$planoNome}). Aguarda análise.",
                    tipo:       'warning',
                    tipoEvento: 'comprovativo_recebido',
                    dados: [
                        'Empresa'    => $nomeEmpresa,
                        'Plano'      => $planoNome,
                        'Valor'      => "{$valorFormatado} AOA",
                        'Referência' => $pagamento->codigo_transacao ?? '—',
                    ],
                    url:       "/landlord/pagamentos-plano/{$pagamento->id}",
                    empresaId: $pagamento->empresa_id,
                );
            } catch (\Throwable $e) {
                Log::error('[uploadComprovativo] Falha na notificação', [
                    'pagamento_id' => $id,
                    'erro'         => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message'   => 'Comprovativo enviado com sucesso. Aguarde análise.',
                'pagamento' => $pagamento,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[uploadComprovativo] Erro', [
                'pagamento_id' => $id,
                'mensagem'     => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro ao processar upload'], 500);
        }
    }

    /* ================================================================
     | CONFIRMAR  (só super_admin — rota no grupo super_admin)
     | ================================================================ */
    public function confirmarPagamento(Request $request, $id)
    {
        try {
            [$user] = $this->contexto($request);

            $result = DB::transaction(function () use ($id, $user) {
                $pagamento = Pagamento::lockForUpdate()
                    ->with(['empresa', 'plano'])
                    ->findOrFail($id);

                if ($pagamento->status === 'pago') {
                    return response()->json([
                        'message'        => 'Pagamento já confirmado anteriormente',
                        'subscricao_id'  => $pagamento->subscricao_id,
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

                $pagamento->status         = 'pago';
                $pagamento->data_pagamento = now();

                $pagamento->registarStatus(
                    'pago',
                    por:    $user->email ?? 'landlord',
                    motivo: 'Pagamento confirmado',
                );

                if (!$pagamento->subscricao_id) {
                    $plano         = Plano::findOrFail($pagamento->plano_id);
                    $duracaoMeses  = $plano->duracao_meses ?? 1;

                    $subscricao = Subscricao::create([
                        'id'                   => (string) Str::uuid(),
                        'empresa_id'           => $pagamento->empresa_id,
                        'plano_id'             => $plano->id,
                        'data_inicio'          => now(),
                        'data_fim'             => now()->addMonths($duracaoMeses),
                        'status'               => 'ativa',
                        'forma_pagamento'      => $pagamento->metodo_pagamento,
                        'renovacao_automatica' => true,
                    ]);

                    $pagamento->subscricao_id = $subscricao->id;
                } else {
                    $subscricao    = $pagamento->subscricao;
                    $duracaoMeses  = $subscricao->plano->duracao_meses ?? 1;
                    $subscricao->data_fim = Carbon::parse($subscricao->data_fim)->addMonths($duracaoMeses);
                    $subscricao->status   = 'ativa';
                    $subscricao->save();
                }

                $pagamento->save();

                Notificacao::where('empresa_id', $pagamento->empresa_id)
                    ->where('tipo_evento', 'comprovativo_recebido')
                    ->where('lida', false)
                    ->update(['lida' => true, 'lida_em' => now()]);

                try {
                    $pagamento->loadMissing('empresa', 'plano');
                    $nomeEmpresa    = $pagamento->empresa?->nome ?? '—';
                    $planoNome      = $pagamento->plano?->nome ?? '—';
                    $valorFormatado = number_format($pagamento->valor, 2, ',', '.');
                    $dataFim        = $subscricao->data_fim
                        ? Carbon::parse($subscricao->data_fim)->format('d/m/Y')
                        : '—';

                    NotificacaoService::enviarParaSuperAdmins(
                        titulo:     "Pagamento confirmado: {$nomeEmpresa}",
                        mensagem:   "O pagamento de {$valorFormatado} AOA da empresa \"{$nomeEmpresa}\" foi confirmado. Plano \"{$planoNome}\" ativo até {$dataFim}.",
                        tipo:       'success',
                        tipoEvento: 'pagamento_confirmado',
                        dados: [
                            'Empresa'    => $nomeEmpresa,
                            'Plano'      => $planoNome,
                            'Valor'      => "{$valorFormatado} AOA",
                            'Válido até' => $dataFim,
                        ],
                        url:       "/landlord/empresas/{$pagamento->empresa_id}",
                        empresaId: $pagamento->empresa_id,
                    );
                } catch (\Throwable $e) {
                    Log::error('[confirmarPagamento] Falha na notificação', [
                        'pagamento_id' => $id,
                        'erro'         => $e->getMessage(),
                    ]);
                }

                return response()->json([
                    'message'       => 'Pagamento confirmado e assinatura ativada',
                    'subscricao_id' => $pagamento->subscricao_id,
                ]);
            });

            return $result;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[confirmarPagamento] Erro', [
                'pagamento_id' => $id,
                'mensagem'     => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro ao confirmar pagamento'], 500);
        }
    }

    /* ================================================================
     | REJEITAR  (só super_admin)
     | ================================================================ */
    public function rejeitarPagamento(Request $request, $id)
    {
        try {
            $request->validate([
                'motivo' => 'required|string|max:500',
            ]);

            [$user] = $this->contexto($request);

            $pagamento = Pagamento::with(['empresa', 'plano'])->findOrFail($id);

            if ($pagamento->status === 'pago') {
                return response()->json([
                    'message' => 'Pagamento já confirmado, não pode ser rejeitado.',
                ], 422);
            }

            if ($pagamento->status === 'rejeitado') {
                return response()->json([
                    'message'          => 'Este pagamento já foi rejeitado.',
                    'motivo_rejeicao'  => $pagamento->motivo_rejeicao,
                ], 422);
            }

            $pagamento->status          = 'rejeitado';
            $pagamento->motivo_rejeicao = $request->motivo;

            $pagamento->registarStatus(
                'rejeitado',
                por:    $user->email ?? 'landlord',
                motivo: $request->motivo,
            );

            $pagamento->save();

            Notificacao::where('empresa_id', $pagamento->empresa_id)
                ->where('tipo_evento', 'comprovativo_recebido')
                ->where('lida', false)
                ->update(['lida' => true, 'lida_em' => now()]);

            try {
                $nomeEmpresa = $pagamento->empresa?->nome ?? '—';
                $planoNome   = $pagamento->plano?->nome ?? '—';

                NotificacaoService::enviarParaSuperAdmins(
                    titulo:     "Pagamento rejeitado: {$nomeEmpresa}",
                    mensagem:   "O pagamento do plano \"{$planoNome}\" da empresa \"{$nomeEmpresa}\" foi rejeitado.\n\nMotivo: {$request->motivo}",
                    tipo:       'danger',
                    tipoEvento: 'pagamento_rejeitado',
                    dados: [
                        'Empresa' => $nomeEmpresa,
                        'Plano'   => $planoNome,
                        'Motivo'  => $request->motivo,
                    ],
                    url:       "/landlord/empresas/{$pagamento->empresa_id}",
                    empresaId: $pagamento->empresa_id,
                );
            } catch (\Throwable $e) {
                Log::error('[rejeitarPagamento] Falha na notificação', [
                    'pagamento_id' => $id,
                    'erro'         => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message'   => 'Pagamento rejeitado com sucesso.',
                'pagamento' => $pagamento,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Pagamento não encontrado'], 404);
        } catch (\Exception $e) {
            Log::error('[rejeitarPagamento] Erro', [
                'pagamento_id' => $id,
                'mensagem'     => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Erro ao rejeitar pagamento'], 500);
        }
    }

    /* ================================================================
     | ELIMINAR  (só super_admin)
     | ================================================================ */
    public function destroy(Request $request, $id)
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
     | UPDATE
     | ================================================================ */
    public function update(Request $request, $id)
    {
        return response()->json(['message' => 'Use os endpoints específicos'], 405);
    }
}