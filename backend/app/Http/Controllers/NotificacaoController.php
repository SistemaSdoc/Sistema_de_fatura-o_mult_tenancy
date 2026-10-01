<?php

namespace App\Http\Controllers;

use App\Models\Notificacao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificacaoController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->user($request);
        if (!$user) return response()->json(['message' => 'Não autenticado'], 401);

        $limite = min((int) $request->query('limit', 50), 100);

        $notificacoes = Notificacao::doUser($user->id)
            ->orderByDesc('created_at')
            ->limit($limite)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $notificacoes,
            'meta' => [
                'nao_lidas' => Notificacao::doUser($user->id)->naoLidas()->count(),
                'total' => Notificacao::doUser($user->id)->count(),
            ],
        ]);
    }

    public function naoLidas(Request $request)
    {
        $user = $this->user($request);
        if (!$user) return response()->json(['message' => 'Não autenticado'], 401);

        $notificacoes = Notificacao::doUser($user->id)
            ->naoLidas()
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $notificacoes,
            'total' => $notificacoes->count(),
        ]);
    }

    public function marcarComoLida(Request $request, string $id)
    {
        $user = $this->user($request);
        if (!$user) return response()->json(['message' => 'Não autenticado'], 401);

        $notificacao = Notificacao::doUser($user->id)->find($id);
        if (!$notificacao) return response()->json(['message' => 'Não encontrada'], 404);

        if (!$notificacao->lida) {
            $notificacao->update([
                'lida' => true,
                'lida_em' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $notificacao->fresh(),
        ]);
    }

    public function marcarTodasComoLidas(Request $request)
    {
        $user = $this->user($request);
        if (!$user) return response()->json(['message' => 'Não autenticado'], 401);

        $total = Notificacao::doUser($user->id)
            ->naoLidas()
            ->update([
                'lida' => true,
                'lida_em' => now(),
            ]);

        return response()->json([
            'success' => true,
            'marcadas' => $total,
        ]);
    }

    public function eliminar(Request $request, string $id)
    {
        $user = $this->user($request);
        if (!$user) return response()->json(['message' => 'Não autenticado'], 401);

        $notificacao = Notificacao::doUser($user->id)->find($id);
        if (!$notificacao) return response()->json(['message' => 'Não encontrada'], 404);

        $notificacao->delete();

        return response()->json(['success' => true, 'message' => 'Notificação eliminada.']);
    }

    private function user(Request $request)
    {
        return Auth::guard('landlord_api')->user()
            ?? Auth::guard('landlord')->user()
            ?? $request->user();
    }
}