<?php

namespace Database\Factories;

use App\Enums\FulfillmentType;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Outlet;
use App\Support\OrderCode;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Order> */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->numberBetween(2, 8) * 10000;

        return [
            'code' => OrderCode::generate(),
            'outlet_id' => Outlet::factory(),
            'customer_name' => fake()->name(),
            'customer_phone' => '628'.fake()->numerify('##########'),
            'fulfillment' => FulfillmentType::Pickup,
            'subtotal' => $subtotal,
            'discount' => 0,
            'points_redeemed' => 0,
            'delivery_fee' => 0,
            'service_fee' => 0,
            'total' => $subtotal,
            'channel' => OrderChannel::Web,
        ];
    }

    public function status(OrderStatus $status): static
    {
        return $this->state(fn () => ['status' => $status])->afterMaking(function (Order $order) use ($status) {
            $order->status = $status;
            if ($status === OrderStatus::Completed) {
                $order->paid_at ??= now();
                $order->completed_at ??= now();
            }
            if (in_array($status, [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped], true)) {
                $order->paid_at ??= now();
            }
        });
    }

    public function delivery(): static
    {
        return $this->state([
            'fulfillment' => FulfillmentType::Delivery,
            'address' => 'Jl. Merdeka No. 10, Tangerang',
            'lat' => -6.178,
            'lng' => 106.631,
        ]);
    }
}
