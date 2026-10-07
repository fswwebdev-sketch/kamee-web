<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Outlet;

/**
 * Ongkir berbasis jarak garis lurus (Haversine) dari outlet ke titik pengantaran.
 */
class DeliveryFeeService
{
    private const EARTH_RADIUS_KM = 6371.0;

    public function __construct(private readonly SettingService $settings) {}

    public function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return round(self::EARTH_RADIUS_KM * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
    }

    public function feeForDistance(float $distanceKm): int
    {
        // Mode ojol: ongkir GoSend/GrabExpress dibayar pembeli langsung ke driver, tidak ditagih di web.
        if ($this->settings->get('delivery_mode', 'ojol') === 'ojol') {
            return 0;
        }

        $base = $this->settings->int('delivery_base_fee');
        $baseKm = (float) $this->settings->get('delivery_base_km', 0);
        $perKm = $this->settings->int('delivery_per_km_fee');

        return $base + (int) ceil(max(0, $distanceKm - $baseKm)) * $perKm;
    }

    public function quote(Outlet $outlet, float $lat, float $lng): DeliveryQuote
    {
        $distance = $this->distanceKm((float) $outlet->lat, (float) $outlet->lng, $lat, $lng);
        $radius = (float) $outlet->delivery_radius_km;

        return new DeliveryQuote($distance, $this->feeForDistance($distance), $radius, $distance <= $radius);
    }

    /** Sama seperti quote(), tetapi menolak alamat di luar radius pengantaran. */
    public function quoteOrFail(Outlet $outlet, float $lat, float $lng): DeliveryQuote
    {
        $quote = $this->quote($outlet, $lat, $lng);

        if (! $quote->withinRadius) {
            throw BusinessException::field(
                'address',
                sprintf('Alamat berjarak %s km, di luar jangkauan pengantaran %s (maks %s km).',
                    $this->km($quote->distanceKm), $outlet->name, $this->km($quote->radiusKm)),
            );
        }

        return $quote;
    }

    private function km(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, ',', '.'), '0'), ',');
    }
}
