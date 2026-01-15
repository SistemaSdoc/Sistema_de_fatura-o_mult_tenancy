<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Pagamento;
use App\Models\Venda;
use App\Models\TenantUser;

class PagamentoController extends Controller
{
    // LISTAR PAGAMENTOS
    public function index()
    {
        $pagamentos = Pagamento::all();
        return response()->json($pagamentos);
    }

    // CRIAR PAGAMENTO
    public function store(Request $request)
    {
        $dados = $request->validate([
            'venda_id' => 'required|uuid',
            'user_id' => 'required|uuid',
            'metodo' => 'required|string|max:50',
            'valor_pago' => 'required|numeric|min:0',
            'troco' => 'nullable|numeric|min:0',
            'data' => 'nullable|date',
        ]);

        // Validação manual das relações dentro do tenant
        if (!Venda::find($dados['venda_id'])) {
            return response()->json(['message' => 'Venda não encontrada'], 422);
        }

        if (!TenantUser::find($dados['user_id'])) {
            return response()->json(['message' => 'Usuário não encontrado'], 422);
        }

        $pagamento = Pagamento::create($dados);
        return response()->json($pagamento, 201);
    }

    // MOSTRAR PAGAMENTO
    public function show($id)
    {
        $pagamento = Pagamento::findOrFail($id);
        return response()->json($pagamento);
    }

    // ATUALIZAR PAGAMENTO
    public function update(Request $request, $id)
    {
        $pagamento = Pagamento::findOrFail($id);

        $dados = $request->validate([
            'venda_id' => 'sometimes|required|uuid',
            'user_id' => 'sometimes|required|uuid',
            'metodo' => 'sometimes|required|string|max:50',
            'valor_pago' => 'sometimes|required|numeric|min:0',
            'troco' => 'nullable|numeric|min:0',
            'data' => 'nullable|date',
        ]);

        if (isset($dados['venda_id']) && !Venda::find($dados['venda_id'])) {
            return response()->json(['message' => 'Venda não encontrada'], 422);
        }

        if (isset($dados['user_id']) && !TenantUser::find($dados['user_id'])) {
            return response()->json(['message' => 'Usuário não encontrado'], 422);
        }

        $pagamento->update($dados);
        return response()->json($pagamento);
    }

    // DELETAR PAGAMENTO
    public function destroy($id)
    {
        $pagamento = Pagamento::findOrFail($id);
        $pagamento->delete();
        return response()->json(null, 204);
    }
}
