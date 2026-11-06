<?php

namespace App\Http\Controllers;

use App\Models\Shared\Impressora as SharedImpressora;
use App\Models\Tenant\Impressora as TenantImpressora;
use App\Services\ImpressoraTermicaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ImpressoraController extends Controller
{
    /** Helper: escolhe o model certo conforme o modo. */
    private function model(): string
    {
        $empresa = app('current.empresa');
        return ($empresa?->modo === 'singular')
            ? TenantImpressora::class
            : SharedImpressora::class;
    }

    private function query()
    {
        $model = $this->model();
        if ($model === SharedImpressora::class) {
            return SharedImpressora::doTenant();
        }
        return TenantImpressora::query();
    }

public function index(): JsonResponse
{
    return response()->json([
        'success' => true,
        'data'    => $this->query()->orderByDesc('is_default')->get(),
        'atual'   => session('impressora_queue'), // null se nunca escolheu nesta sessão
    ]);
}

    public function cupsDisponiveis(): JsonResponse
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            return response()->json(['success' => true, 'data' => []]);
        }

        exec('lpstat -a 2>&1', $out, $code);

        $queues = [];
        foreach ($out as $line) {
            if (preg_match('/^(\S+)\s+/', $line, $m)) {
                $queues[] = $m[1];
            }
        }

        return response()->json(['success' => true, 'data' => $queues]);
    }
public function store(Request $request): JsonResponse
{
    $data = Validator::make($request->all(), [
        'nome'  => 'required|string|max:255',
        'queue' => 'required|string|max:255',
        'tipo'  => 'nullable|in:cups,windows,usb',
    ])->validate();

    $model  = $this->model();
    $campos = [
        'nome'       => $data['nome'],
        'queue'      => $data['queue'],
        'tipo'       => $data['tipo'] ?? 'cups',
        'is_default' => $this->query()->count() === 0, // só a primeira fica padrão
        'ativo'      => true,
    ];

    if ($model === SharedImpressora::class) {
        $campos['tenant_id'] = app('current.empresa')?->id;
    }

    $impressora = $model::create($campos);

    return response()->json(['success' => true, 'data' => $impressora], 201);
}

public function definirDefault(string $id): JsonResponse
{
    $impressora = $this->query()->findOrFail($id);

    // 1. Limpa todas as defaults do tenant
    $this->query()->where('is_default', true)->update(['is_default' => false]);

    // 2. Define esta como default (update directo, evita cache do model)
    $this->query()->whereKey($impressora->getKey())->update([
        'is_default' => true,
        'ativo'      => true,
    ]);

    return response()->json([
        'success' => true,
        'data'    => $this->query()->find($impressora->getKey()),
    ]);
}

    public function update(Request $request, string $id): JsonResponse
    {
        $impressora = $this->query()->findOrFail($id);

        $data = Validator::make($request->all(), [
            'nome'  => 'sometimes|string|max:255',
            'queue' => 'sometimes|string|max:255',
            'ativo' => 'sometimes|boolean',
        ])->validate();

        $impressora->update($data);

        return response()->json(['success' => true, 'data' => $impressora->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->query()->findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }


    public function selecionar(Request $request): JsonResponse
    {
        $data = $request->validate(['queue' => 'required|string|max:255']);
        session(['impressora_queue' => $data['queue']]);

        return response()->json([
            'success' => true,
            'message' => 'Impressora selecionada',
            'queue'   => $data['queue'],
        ]);
    }

    public function testar(Request $request, ImpressoraTermicaService $service): JsonResponse
    {
        $data = $request->validate(['queue' => 'required|string|max:255']);
        $ok   = $service->testarConexao($data['queue']);

        return response()->json([
            'success' => $ok,
            'message' => $ok ? 'Impressora OK' : 'Impressora não encontrada ou inativa',
        ]);
    }
}