<?php

namespace App\Exceptions;

class PaymentGatewayException extends BusinessException
{
    public function __construct(string $detail = '')
    {
        parent::__construct(
            'Gagal menghubungi penyedia pembayaran. Silakan coba lagi.'.($detail !== '' && config('app.debug') ? " ({$detail})" : ''),
            [],
            502,
        );
    }
}
