<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAddress extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['customer_id', 'label', 'address', 'lat', 'lng', 'note', 'is_default'];

    protected function casts(): array
    {
        return ['lat' => 'float', 'lng' => 'float', 'is_default' => 'boolean'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
