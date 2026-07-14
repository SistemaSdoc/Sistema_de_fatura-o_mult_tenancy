<?php

namespace App\Http\Controllers;

use App\Models\Feature;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FeatureController extends Controller
{
    public function index()
    {
        return response()->json(Feature::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:100|unique:features',
            'descricao' => 'nullable|string',
            'icone' => 'nullable|string|max:50',
            'ativo' => 'boolean',
        ]);

        $feature = Feature::create([
            'id' => (string) Str::uuid(),
            ...$validated
        ]);

        return response()->json($feature, 201);
    }

    public function show($id)
    {
        return response()->json(Feature::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $feature = Feature::findOrFail($id);

        $validated = $request->validate([
            'nome' => 'sometimes|string|max:100|unique:features,nome,' . $feature->id,
            'descricao' => 'nullable|string',
            'icone' => 'nullable|string|max:50',
            'ativo' => 'boolean',
        ]);

        $feature->update($validated);
        return response()->json($feature);
    }

    public function destroy($id)
    {
        $feature = Feature::findOrFail($id);
        // Verificar se há planos usando esta feature
        if ($feature->planos()->exists()) {
            return response()->json(['message' => 'Esta feature está associada a um plano e não pode ser removida.'], 422);
        }
        $feature->delete();
        return response()->json(null, 204);
    }
}