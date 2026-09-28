<?php

namespace App\Exceptions;

use App\Enums\OrderStatus;

class InvalidOrderTransition extends BusinessException
{
    public static function between(OrderStatus $from, OrderStatus $to, ?string $reason = null): self
    {
        $message = $reason ?? "Status pesanan tidak dapat diubah dari \"{$from->label()}\" ke \"{$to->label()}\".";

        return new self($message, ['status' => [$message]]);
    }
}
