<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $resetLink,
        public string $empresaNome
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Redefinição de Senha - ' . $this->empresaNome,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reset-password',
            with: [
                'resetLink' => $this->resetLink,
                'empresa'   => $this->empresaNome,
            ]
        );
    }
}