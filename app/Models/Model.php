<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model as Eloquent;

/**
 * Model dasar aplikasi: seluruh atribut dilindungi kecuali yang dideklarasikan $fillable.
 */
abstract class Model extends Eloquent
{
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format(DATE_ATOM);
    }
}
