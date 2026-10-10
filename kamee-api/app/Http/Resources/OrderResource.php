<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'channel' => $this->channel->value,
            'fulfillment' => $this->fulfillment->value,
            'fulfillment_label' => $this->fulfillment->label(),
            'outlet' => $this->whenLoaded('outlet', fn () => [
                'id' => $this->outlet->id, 'name' => $this->outlet->name, 'phone_wa' => $this->outlet->phone_wa, 'address' => $this->outlet->address,
            ]),
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'address' => $this->address,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'points_redeemed' => $this->points_redeemed,
            'points_discount' => max(0, $this->subtotal - $this->discount + $this->delivery_fee + $this->service_fee - $this->total),
            'delivery_fee' => $this->delivery_fee,
            'service_fee' => $this->service_fee,
            'total' => $this->total,
            'note' => $this->note,
            'cancelled_reason' => $this->cancelled_reason,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payment' => new PaymentResource($this->whenLoaded('latestPayment')),
            'timeline' => $this->whenLoaded('statusLogs', fn () => $this->statusLogs->map(fn ($log) => [
                'status' => $log->to_status,
                'note' => $log->note,
                'at' => $log->created_at?->toIso8601String(),
            ])),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
