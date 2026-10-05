<?php

namespace App\Services\WhatsApp;

/** Driver pengujian: pesan disimpan di memori agar bisa diperiksa. */
class ArrayWhatsApp implements WhatsAppService
{
    /** @var list<array{phone:string, message:string}> */
    public array $sent = [];

    public function send(string $phone, string $message): bool
    {
        $this->sent[] = ['phone' => $phone, 'message' => $message];

        return true;
    }

    public function lastTo(string $phone): ?string
    {
        foreach (array_reverse($this->sent) as $row) {
            if ($row['phone'] === $phone) {
                return $row['message'];
            }
        }

        return null;
    }
}
