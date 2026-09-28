<?php

namespace App\Models;

use App\Enums\ContactStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Contact extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = ['name', 'email', 'phone', 'subject', 'message', 'status'];

    protected $attributes = ['status' => 'new'];

    protected function casts(): array
    {
        return ['status' => ContactStatus::class];
    }
}
