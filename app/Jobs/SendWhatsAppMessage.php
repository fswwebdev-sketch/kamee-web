<?php

namespace App\Jobs;

use App\Services\WhatsApp\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendWhatsAppMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 60];

    public function __construct(public readonly string $phone, public readonly string $message)
    {
        $this->afterCommit();
    }

    public function handle(WhatsAppService $whatsApp): void
    {
        $whatsApp->send($this->phone, $this->message);
    }
}
