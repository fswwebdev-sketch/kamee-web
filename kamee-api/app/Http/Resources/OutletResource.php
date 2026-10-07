<?php

namespace App\Http\Resources;

use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Outlet */
class OutletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'address' => $this->address,
            'city' => $this->city,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'phone_wa' => $this->phone_wa,
            'open_time' => substr((string) $this->open_time, 0, 5),
            'close_time' => substr((string) $this->close_time, 0, 5),
            'open_days' => config('kamee.open_days_label'),
            'is_open' => $this->is_open,
            'is_open_now' => $this->isAcceptingOrders(),
            'delivery_radius_km' => $this->delivery_radius_km,
        ];
    }
}
