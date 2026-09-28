<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

/** Filter periode & outlet untuk dashboard dan laporan. Default: 30 hari terakhir. */
class DateRangeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'outlet_id' => ['nullable', 'integer', 'exists:outlets,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'interval' => ['nullable', 'in:day,month'],
            'limit' => ['nullable', 'integer', 'between:1,50'],
        ];
    }

    public function from(): Carbon
    {
        return $this->date('from')?->startOfDay() ?? now()->subDays(29)->startOfDay();
    }

    public function to(): Carbon
    {
        return $this->date('to')?->endOfDay() ?? now()->endOfDay();
    }

    /** Admin Outlet selalu dikunci ke outlet miliknya. */
    public function outletId(): ?int
    {
        $user = $this->user();

        return $user->isOutletAdmin() ? $user->outlet_id : ($this->integer('outlet_id') ?: null);
    }

    public function queryParameters(): array
    {
        return [
            'outlet_id' => ['description' => 'Filter outlet (diabaikan untuk Admin Outlet).', 'example' => 1],
            'from' => ['description' => 'Tanggal awal (Y-m-d).', 'example' => '2026-09-01'],
            'to' => ['description' => 'Tanggal akhir (Y-m-d).', 'example' => '2026-09-28'],
            'interval' => ['description' => 'day | month (khusus revenue).', 'example' => 'day'],
            'limit' => ['description' => 'Jumlah produk (khusus top-products).', 'example' => 10],
        ];
    }
}
