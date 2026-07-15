<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notificacao;
use App\Http\Controllers;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LandlordNotificacaoController extends Controller
{
    /**
     * Listar notificações do landlord autenticado
     * (globais + específicas do usuário)
     */
    public function index(Request $request)
    {
        $userId = Auth::id();

        $notificacoes = Notificacao::where(function ($query) use ($userId) {
            $query->whereNull('user_id')      // globais
                  ->orWhere('user_id', $userId); // específicas
        })
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'data' => $notificacoes
        ]);
    }

    /**
     * Marcar uma notificação como lida
     */
    public function marcarLida($id)
    {
        $notificacao = Notificacao::findOrFail($id);

        // Verificar se o usuário tem permissão para marcar esta notificação
        // (se for global ou sua própria)
        if ($notificacao->user_id !== null && $notificacao->user_id !== Auth::id()) {
            abort(403, 'Não autorizado');
        }

        $notificacao->update(['lida' => true]);

        return response()->json(['message' => 'Notificação marcada como lida']);
    }

    /**
     * Marcar todas as notificações do usuário como lidas
     */
    public function marcarTodasLidas(Request $request)
    {
        $userId = Auth::id();

        Notificacao::where(function ($query) use ($userId) {
            $query->whereNull('user_id')
                  ->orWhere('user_id', $userId);
        })
        ->where('lida', false)
        ->update(['lida' => true]);

        return response()->json(['message' => 'Todas as notificações marcadas como lidas']);
    }
}