<?php

namespace App\Models;

class OtpCode extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['phone_wa', 'code_hash', 'attempts', 'expires_at', 'used_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime', 'attempts' => 'integer'];
    }
}
