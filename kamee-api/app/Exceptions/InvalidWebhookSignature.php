<?php

namespace App\Exceptions;

class InvalidWebhookSignature extends BusinessException
{
    public function __construct()
    {
        parent::__construct('Signature webhook tidak valid.', [], 403);
    }
}
