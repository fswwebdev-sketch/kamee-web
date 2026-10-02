<?php

namespace App\Services\Payments;

use App\Exceptions\BusinessException;
use Illuminate\Contracts\Container\Container;

/** Memilih driver gateway berdasarkan nama penyedia. */
class PaymentGatewayManager
{
    /** @var array<string, class-string<PaymentGateway>> */
    private array $drivers = [
        'manual' => ManualQrisGateway::class,
        'midtrans' => MidtransGateway::class,
        'fake' => FakeGateway::class,
    ];

    public function __construct(private readonly Container $container) {}

    public function default(): PaymentGateway
    {
        return $this->driver(config('kamee.payment_gateway'));
    }

    public function driver(string $name): PaymentGateway
    {
        $class = $this->drivers[$name] ?? throw new BusinessException('Penyedia pembayaran tidak dikenal.', [], 404);

        return $this->container->make($class);
    }
}
