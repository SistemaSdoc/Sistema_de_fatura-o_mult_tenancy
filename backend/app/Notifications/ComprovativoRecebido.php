<?php

namespace App\Notifications;

use App\Models\Pagamento;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ComprovativoRecebido extends Notification implements ShouldQueue
{
    use Queueable;

    protected $pagamento;

    public function __construct(Pagamento $pagamento)
    {
        $this->pagamento = $pagamento;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

public function toMail($notifiable)
{
    // URL absoluta para o frontend do landlord
    $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
    $url = $frontendUrl . '/landlord/pagamentos/' . $this->pagamento->id;

    return (new MailMessage)
        ->subject('Novo comprovativo de pagamento aguardando análise')
        ->greeting('Olá Admin,')
        ->line('A empresa com ID ' . $this->pagamento->empresa_id . ' enviou um comprovativo de pagamento para o plano ID ' . $this->pagamento->plano_id . '.')
        ->line('Valor: ' . number_format($this->pagamento->valor, 2, ',', '.') . ' AOA')
        ->action('Ver comprovativo', $url)
        ->line('Por favor, aceda ao painel para aprovar ou rejeitar o pagamento.');
}
}