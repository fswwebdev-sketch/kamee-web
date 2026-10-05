<?php

namespace App\Models;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }
}
