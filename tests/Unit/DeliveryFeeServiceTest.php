<?php

use App\Exceptions\BusinessException;
use App\Services\DeliveryFeeService;
use App\Services\SettingService;

beforeEach(fn () => $this->service = app(DeliveryFeeService::class));

it('menghitung jarak dengan rumus Haversine', function () {
    // 1 derajat bujur di ekuator ≈ 111,19 km
    expect($this->service->distanceKm(0, 0, 0, 1))->toBe(111.19)
        ->and($this->service->distanceKm(-6.2, 106.6, -6.2, 106.6))->toBe(0.0);
});

it('menghitung ongkir bertingkat: tarif dasar lalu per km dibulatkan ke atas', function (float $km, int $fee) {
    expect($this->service->feeForDistance($km))->toBe($fee);
})->with([
    'di dalam jarak dasar' => [1.5, 8000],
    'tepat jarak dasar' => [2.0, 8000],
    'lebih 0,1 km' => [2.1, 10500],
    '4,6 km' => [4.6, 15500],
]);

it('memakai pengaturan ongkir dari super admin', function () {
    app(SettingService::class)->update(['delivery_base_fee' => 5000, 'delivery_per_km_fee' => 1000, 'delivery_base_km' => 1]);

    expect($this->service->feeForDistance(3.2))->toBe(8000);
});

it('menolak alamat di luar radius pengantaran outlet', function () {
    $outlet = outlet(['delivery_radius_km' => 3]);

    $near = $this->service->quote($outlet, -6.2100, 106.6400);
    expect($near->withinRadius)->toBeTrue()->and($near->fee)->toBe(8000);

    expect(fn () => $this->service->quoteOrFail($outlet, -6.30, 106.75))
        ->toThrow(BusinessException::class, 'di luar jangkauan pengantaran');
});
