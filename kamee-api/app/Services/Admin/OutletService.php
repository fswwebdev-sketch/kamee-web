<?php

namespace App\Services\Admin;

use App\Exceptions\BusinessException;
use App\Models\Order;
use App\Models\Outlet;
use App\Services\SettingService;
use App\Support\Phone;

class OutletService
{
    public function __construct(private readonly SettingService $settings) {}

    public function save(array $data, ?Outlet $outlet = null): Outlet
    {
        if (isset($data['phone_wa'])) {
            $data['phone_wa'] = Phone::normalize($data['phone_wa']);
        }

        if ($outlet === null) {
            $data['open_time'] ??= $this->settings->get('default_open_time');
            $data['close_time'] ??= $this->settings->get('default_close_time');
            $outlet = new Outlet;
        }

        $outlet->fill($data)->save();

        return $outlet;
    }

    public function delete(Outlet $outlet): void
    {
        if (Order::query()->withoutGlobalScopes()->where('outlet_id', $outlet->id)->exists()) {
            throw BusinessException::field('outlet', 'Outlet sudah memiliki pesanan dan tidak dapat dihapus. Tutup outlet sebagai gantinya.');
        }

        $outlet->delete();
    }
}
