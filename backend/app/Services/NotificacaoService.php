<?php

namespace App\Services;

use App\Mail\NotificacaoMail;
use App\Models\LandlordUser;
use App\Models\Notificacao;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class NotificacaoService
{
    /**
     * Cria uma notificação e tenta enviar por email.
     * Nunca rebenta — falhas são logadas.
     */
    public static function enviar(
        string $userId,
        string $titulo,
        string $mensagem,
        string $tipo = 'info',
        ?string $tipoEvento = null,
        array $dados = [],
        ?string $url = null,
        ?string $empresaId = null,
        bool $enviarEmail = true,
    ): ?Notificacao {
        try {
            $notificacao = Notificacao::create([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'empresa_id' => $empresaId,
                'titulo' => $titulo,
                'mensagem' => $mensagem,
                'tipo' => $tipo,
                'tipo_evento' => $tipoEvento,
                'dados' => $dados ?: null,
                'url' => $url,
                'lida' => false,
                'enviada_email' => false,
            ]);

            Log::info('[Notificacao] Criada', [
                'id' => $notificacao->id,
                'tipo_evento' => $tipoEvento,
                'user_id' => $userId,
            ]);

            if ($enviarEmail) {
                self::tentarEnviarEmail($notificacao);
            }

            return $notificacao;
        } catch (\Throwable $e) {
            Log::error('[Notificacao] Falha ao criar', [
                'erro' => $e->getMessage(),
                'titulo' => $titulo,
                'user_id' => $userId,
            ]);
            return null;
        }
    }

    /**
     * Notifica todos os super admins.
     */
    public static function enviarParaSuperAdmins(
        string $titulo,
        string $mensagem,
        string $tipo = 'info',
        ?string $tipoEvento = null,
        array $dados = [],
        ?string $url = null,
        ?string $empresaId = null,
    ): void {
        $admins = LandlordUser::query()
            ->where('role', 'super_admin')
            ->where('ativo', true)
            ->get();

        foreach ($admins as $admin) {
            self::enviar(
                userId: $admin->id,
                titulo: $titulo,
                mensagem: $mensagem,
                tipo: $tipo,
                tipoEvento: $tipoEvento,
                dados: $dados,
                url: $url,
                empresaId: $empresaId,
            );
        }
    }

    private static function tentarEnviarEmail(Notificacao $notificacao): void
    {
        try {
            $user = LandlordUser::find($notificacao->user_id);

            if (!$user || !$user->email) {
                $notificacao->update(['email_erro' => 'Utilizador sem email válido.']);
                return;
            }

            Mail::to($user->email)
                ->send(new NotificacaoMail($notificacao, $user->name ?? 'Utilizador'));

            $notificacao->update([
                'enviada_email' => true,
                'enviada_email_em' => now(),
                'email_erro' => null,
            ]);

            Log::info('[Notificacao] Email enviado', [
                'notificacao_id' => $notificacao->id,
                'para' => $user->email,
            ]);
        } catch (\Throwable $e) {
            Log::error('[Notificacao] Falha ao enviar email', [
                'notificacao_id' => $notificacao->id,
                'erro' => $e->getMessage(),
            ]);

            $notificacao->update(['email_erro' => $e->getMessage()]);
        }
    }
}