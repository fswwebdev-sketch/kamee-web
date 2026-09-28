<?php

namespace App\Enums;

enum OrderChannel: string
{
    use Concerns;

    case Web = 'web';
    case WhatsApp = 'whatsapp';
    case Pos = 'pos';

    public function label(): string
    {
        return match ($this) {
            self::Web => 'Website',
            self::WhatsApp => 'WhatsApp',
            self::Pos => 'Kasir (POS)',
        };
    }
}
