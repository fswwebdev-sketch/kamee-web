<?php

namespace App\Events;

use App\Models\Order;

final class OrderBroadcastPayload
{
    public static function from(Order $order): array
    {
        return [
            'id' => $order->id,
            'code' => $order->code,
            'outlet_id' => $order->outlet_id,
            'status' => $order->status->value,
            'status_label' => $order->status->label(),
            'fulfillment' => $order->fulfillment->value,
            'channel' => $order->channel->value,
            'customer_name' => $order->customer_name,
            'total' => $order->total,
            'updated_at' => $order->updated_at?->toIso8601String(),
        ];
    }
}
