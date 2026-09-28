<?php

namespace App\Services\WhatsApp;

interface WhatsAppService
{
    /** Kirim pesan teks ke nomor WA (format 62xxx). Mengembalikan true bila diterima penyedia. */
    public function send(string $phone, string $message): bool;
}
