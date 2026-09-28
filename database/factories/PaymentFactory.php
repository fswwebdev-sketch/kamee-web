<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Payment> */
class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'method' => PaymentMethod::Qris,
            'provider' => 'midtrans',
            'provider_ref' => 'KMC-'.Str::upper(Str::random(10)),
            'amount' => 50000,
            'status' => PaymentStatus::Pending,
            'qr_string' => '00020101021226620014COM.GO-JEK.WWW',
            'expires_at' => now()->addMinutes(15),
        ];
    }

    public function cash(): static
    {
        return $this->state([
            'method' => PaymentMethod::Cash, 'provider' => 'cash', 'provider_ref' => null,
            'qr_string' => null, 'expires_at' => null,
        ]);
    }
}
