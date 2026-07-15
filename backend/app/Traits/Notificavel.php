<?php

namespace App\Traits;

use App\Models\Notificacao;

trait Notificavel
{
    /**
     * Criar uma notificação
     */
    public function criarNotificacao(string $titulo, string $mensagem, string $tipo = 'info', ?string $userId = null)
    {
        return Notificacao::create([
            'titulo' => $titulo,
            'mensagem' => $mensagem,
            'tipo' => $tipo,
            'lida' => false,
            'user_id' => $userId,
        ]);
    }

    /**
     * Notificação global (para todos os landlords)
     */
    public function notificarTodos(string $titulo, string $mensagem, string $tipo = 'info')
    {
        return $this->criarNotificacao($titulo, $mensagem, $tipo, null);
    }

    /**
     * Notificação para um landlord específico
     */
    public function notificarUsuario(string $userId, string $titulo, string $mensagem, string $tipo = 'info')
    {
        return $this->criarNotificacao($titulo, $mensagem, $tipo, $userId);
    }
}