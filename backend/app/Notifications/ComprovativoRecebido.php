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
    $pagamento = $this->pagamento;
    $empresa = $pagamento->empresa;
    $plano = $pagamento->plano;

    // URLs
    $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
    $url = $frontendUrl . '/landlord/pagamentos/' . $pagamento->id;

    // Formatação de valores
    $valorFormatado = number_format($pagamento->valor, 2, ',', '.');
    $dataPagamento = $pagamento->created_at->format('d/m/Y H:i');

    return (new MailMessage)
        ->subject('📄 Novo comprovativo de pagamento aguardando análise')
        ->greeting('Olá, Administrador!')
        ->line('Acabamos de receber um comprovativo de pagamento que aguarda a sua validação.')
        ->line('')
        ->line('**Detalhes do pagamento:**')
        ->line("- **Empresa:** {$empresa->nome}")
        ->line("- **Plano contratado:** {$plano->nome}")
        ->line("- **Valor pago:** **{$valorFormatado} AOA**")
        ->line("- **Data do envio:** {$dataPagamento}")
        ->line('')
        ->line('Clique no botão abaixo para visualizar o comprovativo e tomar a decisão (aprovar ou rejeitar).')
        ->action('🔍 Analisar comprovativo', $url)
        ->line('')
        ->line('⚠️ **Importante:** A empresa só terá acesso ao plano após a aprovação do pagamento.')
        ->line('')
        ->salutation('Equipa FaturaJA');
}
}