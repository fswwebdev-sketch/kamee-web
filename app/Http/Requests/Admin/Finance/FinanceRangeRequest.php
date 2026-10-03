<?php

namespace App\Http\Requests\Admin\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

/** Periode laporan keuangan; default bulan berjalan (Asia/Jakarta). */
class FinanceRangeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'outlet_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => array_merge(['nullable', 'date_format:Y-m-d'], $this->filled('from') ? ['after_or_equal:from'] : []),
        ];
    }

    public function from(): Carbon
    {
        if ($from = $this->date('from', 'Y-m-d', config('app.timezone'))) {
            return $from->startOfDay();
        }

        // Hanya `to` yang diisi: mulai awal bulan dari tanggal akhir tsb.
        return $this->filled('to') ? $this->date('to', 'Y-m-d', config('app.timezone'))->startOfMonth() : now()->startOfMonth();
    }

    public function to(): Carbon
    {
        if ($to = $this->date('to', 'Y-m-d', config('app.timezone'))) {
            return $to->endOfDay();
        }

        // Hanya `from` yang diisi: sampai akhir bulan dari tanggal awal tsb.
        return $this->filled('from') ? $this->from()->endOfMonth() : now()->endOfMonth();
    }

    public function queryParameters(): array
    {
        return [
            'from' => ['description' => 'Tanggal awal (Y-m-d), default awal bulan ini.', 'example' => '2026-09-01'],
            'to' => ['description' => 'Tanggal akhir (Y-m-d), default akhir bulan ini.', 'example' => '2026-09-30'],
            'outlet_id' => ['description' => 'Filter outlet (diabaikan untuk Admin Outlet).', 'example' => 1],
        ];
    }
}
