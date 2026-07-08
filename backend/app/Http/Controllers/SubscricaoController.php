<?php

namespace App\Http\Controllers;

use App\Models\Subscricao;
use App\Models\Empresa;
use App\Models\Pagamento;
use App\Models\Plano;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SubscricaoController extends Controller
{
    public function clearCache($empresaId)
{
    $features = Feature::pluck('nome');
    foreach ($features as $nome) {
        Cache::forget("plano_feature_{$empresaId}_{$nome}");
    }
}
    /**
     * Listar assinaturas (filtradas por empresa se houver tenant na sessão)
     */
    public function index(Request $request)
    {
        $query = Subscricao::with(['empresa', 'plano']);

        // Se houver um tenant identificado na sessão, filtrar apenas as suas assinaturas
        $empresaId = session('tenant_id');
        if ($empresaId) {
            $query->where('empresa_id', $empresaId);
        }

        // Filtros adicionais (status, data)
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

    /**
     * Criar uma nova assinatura para a empresa autenticada (via sessão/tenant)
     */
public function store(Request $request)
{
    $user = $request->user();

    if (!$user) {
        return response()->json(['message' => 'Não autenticado'], 401);
    }

    $empresaId = $user->empresa_id ?: session('tenant_id');

    if (!$empresaId) {
        return response()->json(['message' => 'Empresa não identificada'], 401);
    }

    $validated = $request->validate([
        'plano_id' => 'required|exists:landlord.planos,id',
        'forma_pagamento' => 'nullable|string|max:50',
        'data_vencimento' => 'nullable|date',
        'renovacao' => 'nullable|boolean', //  Novo campo
    ]);

    $empresa = Empresa::findOrFail($empresaId);
    $plano = Plano::findOrFail($validated['plano_id']);
    $renovacao = $validated['renovacao'] ?? false;

    // Buscar subscrição ativa (se existir)
    $subscricaoAtiva = $empresa->subscricoes()->where('status', 'ativa')->first();

    //  Se NÃO for renovação e já tiver subscrição ativa, bloqueia
    if (!$renovacao && $subscricaoAtiva) {
        return response()->json(['message' => 'Já existe uma assinatura ativa.'], 422);
    }

    // Reutilizar pagamento pendente existente (se houver)
    $pagamentoPendente = Pagamento::where('empresa_id', $empresa->id)
        ->where('status', 'pendente')
        ->where('data_vencimento', '>=', Carbon::now())
        ->first();

    if ($pagamentoPendente) {
        return response()->json([
            'message' => 'Já existe um pagamento pendente para esta empresa.',
            'pagamento_id' => $pagamentoPendente->id,
            'referencia' => $pagamentoPendente->codigo_transacao,
            'valor' => $pagamentoPendente->valor,
            'metodo' => $pagamentoPendente->metodo_pagamento,
            'data_vencimento' => $pagamentoPendente->data_vencimento,
            'renovacao' => $renovacao,
        ], 200);
    }

    // Cria novo pedido de pagamento
    $pagamento = Pagamento::create([
        'id' => (string) Str::uuid(),
        'subscricao_id' => $subscricaoAtiva ? $subscricaoAtiva->id : null,
        'empresa_id' => $empresa->id,
        'plano_id' => $plano->id,
        'valor' => $plano->valor_mensal,
        'data_pagamento' => now(),
        'data_vencimento' => $validated['data_vencimento'] ?? Carbon::now()->addDays(5),
        'status' => 'pendente',
        'metodo_pagamento' => $validated['forma_pagamento'] ?? null,
        'codigo_transacao' => 'REF-' . strtoupper(Str::random(8)),
        'descricao' => $renovacao
            ? "Renovação do plano {$plano->nome}"
            : "Assinatura do plano {$plano->nome}",
        'parcelas' => 1,
    ]);

    return response()->json([
        'pagamento_id' => $pagamento->id,
        'status' => $pagamento->status,
        'referencia' => $pagamento->codigo_transacao,
        'valor' => $pagamento->valor,
        'metodo' => $pagamento->metodo_pagamento,
        'data_vencimento' => $pagamento->data_vencimento,
        'renovacao' => $renovacao,
    ], 201);
}
    /**
     * Exibir detalhes de uma assinatura
     */
    public function show($id)
    {
        $subscricao = Subscricao::with(['empresa', 'plano', 'pagamentos'])->findOrFail($id);
        return response()->json($subscricao);
    }

    /**
     * Atualizar dados da assinatura (trocar plano, renovar, etc)
     */
    public function update(Request $request, $id)
    {
        $subscricao = Subscricao::findOrFail($id);

        // Apenas assinaturas ativas podem ser alteradas
        if ($subscricao->status !== 'ativa') {
            return response()->json(['message' => 'Assinaturas não ativas não podem ser alteradas.'], 422);
        }

        $validated = $request->validate([
            'plano_id' => 'sometimes|exists:planos,id',
            'forma_pagamento' => 'nullable|string|max:50',
            'renovacao_automatica' => 'boolean',
        ]);

        // Se trocar de plano, recalcular data_fim com base na nova duração
        if (isset($validated['plano_id']) && $validated['plano_id'] != $subscricao->plano_id) {
            $novoPlano = Plano::findOrFail($validated['plano_id']);
            // Manter a data de início atual e recalcular o fim
            $dataInicio = $subscricao->data_inicio;
            $duracaoMeses = $novoPlano->duracao_meses ?? 1;
            $subscricao->data_fim = Carbon::parse($dataInicio)->addMonths($duracaoMeses);
            $subscricao->plano_id = $novoPlano->id;
        }

        $subscricao->fill($validated);
        $subscricao->save();

        return response()->json($subscricao);
    }

    /**
     * Cancelar assinatura (não deleta, apenas altera status)
     */
    public function cancel(Request $request, $id)
    {
        $subscricao = Subscricao::findOrFail($id);

        if ($subscricao->status === 'cancelada') {
            return response()->json(['message' => 'Esta assinatura já está cancelada.'], 422);
        }

        $subscricao->status = 'cancelada';
        $subscricao->cancelado_em = Carbon::now();
        $subscricao->save();

        // Evento de cancelamento
        // event(new AssinaturaCancelada($subscricao));

        return response()->json(['message' => 'Assinatura cancelada com sucesso.']);
    }

    /**
     * Renovar manualmente uma assinatura (extender data_fim)
     */
    public function renovar($id)
    {
        $subscricao = Subscricao::findOrFail($id);

        if ($subscricao->status !== 'ativa') {
            return response()->json(['message' => 'Apenas assinaturas ativas podem ser renovadas.'], 422);
        }

        // Adicionar o período do plano à data_fim atual
        $plano = $subscricao->plano;
        $duracaoMeses = $plano->duracao_meses ?? 1;
        $novaDataFim = Carbon::parse($subscricao->data_fim)->addMonths($duracaoMeses);

        $subscricao->data_fim = $novaDataFim;
        $subscricao->save();

        // Registrar um pagamento? Normalmente a renovação gera um pagamento.
        // Pode criar um pagamento automático aqui ou via webhook.

        return response()->json(['message' => 'Assinatura renovada com sucesso.', 'nova_data_fim' => $novaDataFim]);
    }

    /**
     * Verificar se uma empresa tem acesso a um recurso (feature)
     * Útil para autorização em outras partes do sistema
     */
    public function verificarFeature(Request $request)
    {
        $request->validate([
            'empresa_id' => 'required|exists:empresas,id',
            'feature_id' => 'required|exists:features,id',
        ]);

        $empresa = Empresa::findOrFail($request->empresa_id);
        $featureId = $request->feature_id;

        $temAcesso = $empresa->subscricao()
            ?->plano
            ?->features()
            ->where('feature_id', $featureId)
            ->exists() ?? false;

        return response()->json(['tem_acesso' => $temAcesso]);
    }

    /**
     * Cron job / comando para expirar assinaturas vencidas
     */
    public static function expirarAssinaturas()
    {
        $vencidas = Subscricao::where('status', 'ativa')
            ->where('data_fim', '<', Carbon::now())
            ->get();

        foreach ($vencidas as $sub) {
            $sub->status = 'expirada';
            $sub->save();
            // Disparar evento de expiração
        }

        return count($vencidas);
    }


/**
 * Obter a subscrição activa da empresa autenticada
 */
public function me(Request $request)
{
    // ✅ Obtém o utilizador do guard correto
    $user = $request->user('landlord_api') ?? Auth::guard('landlord_api')->user();

    Log::info('[SubscricaoController::me] Iniciando requisição', [
        'user_id' => $user?->id,
        'ip' => $request->ip(),
    ]);

    try {
        if (!$user) {
            Log::warning('[SubscricaoController::me] Utilizador não autenticado');
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $empresaId = $user->empresa_id ?: session('tenant_id');
        Log::debug('[SubscricaoController::me] Identificando empresa', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'empresa_id_from_user' => $user->empresa_id,
            'empresa_id_from_session' => session('tenant_id'),
            'empresa_id_final' => $empresaId,
        ]);

        if (!$empresaId) {
            Log::warning('[SubscricaoController::me] Empresa não identificada', [
                'user_id' => $user->id,
            ]);
            return response()->json(['message' => 'Empresa não identificada'], 401);
        }

        // Buscar subscrição activa (com plano e features)
        $subscricao = Subscricao::where('empresa_id', $empresaId)
            ->where('status', 'ativa')
            ->with(['plano' => function ($query) {
                $query->with('features');
            }])
            ->first();

        if (!$subscricao) {
            Log::info('[SubscricaoController::me] Nenhuma subscrição activa encontrada', [
                'empresa_id' => $empresaId,
                'user_id' => $user->id,
            ]);
            return response()->json(null, 404);
        }

        Log::info('[SubscricaoController::me] Subscrição activa encontrada', [
            'empresa_id' => $empresaId,
            'subscricao_id' => $subscricao->id,
            'plano_id' => $subscricao->plano_id,
            'plano_nome' => $subscricao->plano?->nome,
            'status' => $subscricao->status,
            'data_inicio' => $subscricao->data_inicio,
            'data_fim' => $subscricao->data_fim,
        ]);

        return response()->json([
            'subscricao' => $subscricao
        ]);

    } catch (\Exception $e) {
        Log::error('[SubscricaoController::me] Erro ao buscar subscrição', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'user_id' => $user?->id,
        ]);
        return response()->json([
            'message' => 'Erro ao buscar subscrição',
            'error' => $e->getMessage(),
        ], 500);
    }
}
}