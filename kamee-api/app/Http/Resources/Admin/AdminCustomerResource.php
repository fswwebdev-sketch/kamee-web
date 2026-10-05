<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\CustomerAddressResource;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\Request;

/** @mixin Customer */
class AdminCustomerResource extends CustomerResource
{
    private ?array $stats = null;

    /** Sertakan ringkasan transaksi (khusus halaman detail). */
    public function withStats(array $stats): static
    {
        $this->stats = $stats;

        return $this;
    }

    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'orders_count' => $this->whenCounted('orders'),
            'stats' => $this->when($this->stats !== null, $this->stats),
            'addresses' => CustomerAddressResource::collection($this->whenLoaded('addresses')),
        ];
    }
}
