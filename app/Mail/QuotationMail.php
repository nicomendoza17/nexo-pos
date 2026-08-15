<?php

namespace App\Mail;

use App\Models\Quotation;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class QuotationMail extends Mailable
{
    public function __construct(public Quotation $quotation, public string $pdfContent)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Cotización {$this->quotation->code} — " . config('company.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.quotation',
            with: ['quotation' => $this->quotation],
        );
    }

    public function attachments(): array
    {
        return [
            \Illuminate\Mail\Mailables\Attachment::fromData(
                fn () => $this->pdfContent,
                "{$this->quotation->code}.pdf"
            )->withMime('application/pdf'),
        ];
    }
}