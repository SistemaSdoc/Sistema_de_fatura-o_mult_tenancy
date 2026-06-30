<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TemporaryPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $temporaryPassword,
        public string $empresaNome,
        public string $loginUrl
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: ' Nova senha temporária - ' . $this->empresaNome,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.temporary-password',
            with: [
                'password' => $this->temporaryPassword,
                'empresa'  => $this->empresaNome,
                'loginUrl' => $this->loginUrl,
            ]
        );
    }
}