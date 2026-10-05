<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Log;

/** Driver pengembangan: pesan hanya ditulis ke log. */
class LogWhatsApp implements WhatsAppService
{
    public function send(string $phone, string $message): bool
    {
        Log::channel(config('logging.default'))->info('[WhatsApp] ke '.$phone, ['message' => $message]);

        return true;
    }
}
