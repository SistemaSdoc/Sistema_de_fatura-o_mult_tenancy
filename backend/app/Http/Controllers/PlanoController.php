<?php

namespace App\Http\Controllers;

use App\Models\Plano;
use App\Models\Feature;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlanoController extends Controller
{
    /**
     * Listar todos os planos (com suas features)
     */
    public function index()
    {
        $planos = Plano::with('features')->get();
        return response()->json($planos);
    }

    /**
     * Criar um novo plano
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:100|unique:planos',
            'descricao' => 'nullable|string',
            'valor_mensal' => 'required|numeric|min:0',
            'valor_anual' => 'nullable|numeric|min:0',
            'duracao_meses' => 'integer|min:1|default:1',
            'ativo' => 'boolean',
        ]);

        $plano = Plano::create([
            'id' => (string) Str::uuid(),
            ...$validated
        ]);

        return response()->json($plano, 201);
    }

    /**
     * Exibir um plano específico
     */
    public function show($id)
    {
        $plano = Plano::with('features')->findOrFail($id);
        return response()->json($plano);
    }

    /**
     * Atualizar um plano
     */
    public function update(Request $request, $id)
    {
        $plano = Plano::findOrFail($id);

        $validated = $request->validate([
            'nome' => ['sometimes', 'string', 'max:100', Rule::unique('planos')->ignore($plano->id)],
            'descricao' => 'nullable|string',
            'valor_mensal' => 'sometimes|numeric|min:0',
            'valor_anual' => 'nullable|numeric|min:0',
            'duracao_meses' => 'integer|min:1',
            'ativo' => 'boolean',
        ]);

        $plano->update($validated);

        return response()->json($plano);
    }

    /**
     * Remover um plano (soft delete? Se não tiver, pode deletar)
     */
    public function destroy($id)
    {
        $plano = Plano::findOrFail($id);
        // Verificar se existem assinaturas ativas para este plano
        if ($plano->subscricoes()->where('status', 'ativa')->exists()) {
            return response()->json(['message' => 'Não é possível excluir um plano com assinaturas ativas.'], 422);
        }
        $plano->delete();
        return response()->json(null, 204);
    }

    /**
     * Associar uma feature ao plano
     */
    public function attachFeature(Request $request, $planoId)
    {
        $plano = Plano::findOrFail($planoId);
        $validated = $request->validate([
            'feature_id' => 'required|exists:features,id',
            'quantidade' => 'required|integer|min:0',
            'unidade' => 'nullable|string|max:20',
        ]);

        $plano->features()->attach($validated['feature_id'], [
            'quantidade' => $validated['quantidade'],
            'unidade' => $validated['unidade']
        ]);

        return response()->json(['message' => 'Feature associada com sucesso.']);
    }

    /**
     * Remover uma feature do plano
     */
    public function detachFeature($planoId, $featureId)
    {
        $plano = Plano::findOrFail($planoId);
        $plano->features()->detach($featureId);
        return response()->json(['message' => 'Feature removida do plano.']);
    }

    /**
     * Listar planos ativos (para exibir na página de assinatura)
     */
public function ativos()
{
    return response()->json(
        Plano::where('ativo', true)
            ->with('features')
            ->orderBy('valor_mensal', 'asc')
            ->get()
    );
}
}