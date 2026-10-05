<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/** Driver produksi via Fonnte (https://fonnte.com). */
class FonnteWhatsApp implements WhatsAppService
{
    public function __construct(private readonly string $token, private readonly string $url) {}

    public function send(string $phone, string $message): bool
    {
        try {
            $response = Http::asForm()
                ->withHeaders(['Authorization' => $this->token])
                ->timeout(15)
                ->retry(2, 500, throw: false)
                ->post($this->url, [
                    'target' => $phone,
                    'message' => $message,
                    'countryCode' => '62',
                ]);

            $ok = $response->successful() && (bool) $response->json('status', false);

            if (! $ok) {
                Log::warning('Fonnte gagal mengirim pesan', ['phone' => $phone, 'response' => $response->json() ?? $response->body()]);
            }

            return $ok;
        } catch (Throwable $e) {
            Log::error('Fonnte error: '.$e->getMessage(), ['phone' => $phone]);

            return false;
        }
    }
}
