<?php

namespace App\Mail;

use App\Models\Notificacao;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NotificacaoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Notificacao $notificacao,
        public string $nomeDestinatario = 'Utilizador',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[FaturaJá] ' . $this->notificacao->titulo,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.notificacao',
            with: [
                'notificacao' => $this->notificacao,
                'nome' => $this->nomeDestinatario,
            ],
        );
    }
}