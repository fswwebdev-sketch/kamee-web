<?php

namespace App\Services;

use App\Models\Order;
use Carbon\CarbonInterface;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Ekspor laporan penjualan ke XLSX (streaming, hemat memori). */
class ReportService
{
    public const HEADINGS = [
        'Kode', 'Tanggal', 'Outlet', 'Pelanggan', 'No. WA', 'Layanan', 'Kanal', 'Status',
        'Subtotal', 'Diskon', 'Poin Ditukar', 'Ongkir', 'Biaya Layanan', 'Total', 'Metode Bayar',
    ];

    public function salesXlsx(?int $outletId, CarbonInterface $from, CarbonInterface $to): StreamedResponse
    {
        $filename = sprintf('laporan-penjualan-%s_%s.xlsx', $from->format('Ymd'), $to->format('Ymd'));

        return response()->streamDownload(function () use ($outletId, $from, $to) {
            $writer = new Writer;
            $writer->openToFile('php://output');
            $writer->addRow(Row::fromValues(self::HEADINGS, (new Style)->setFontBold()));

            foreach ($this->rows($outletId, $from, $to) as $row) {
                $writer->addRow(Row::fromValues($row));
            }

            $writer->close();
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /** @return \Generator<int, list<string|int>> */
    public function rows(?int $outletId, CarbonInterface $from, CarbonInterface $to): \Generator
    {
        $query = Order::query()
            ->with(['outlet:id,name', 'latestPayment'])
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('id');

        foreach ($query->lazyById(500) as $order) {
            yield [
                $order->code,
                $order->created_at->format('Y-m-d H:i'),
                $order->outlet?->name ?? '-',
                $order->customer_name,
                $order->customer_phone,
                $order->fulfillment->label(),
                $order->channel->label(),
                $order->status->label(),
                $order->subtotal,
                $order->discount,
                $order->points_redeemed,
                $order->delivery_fee,
                $order->service_fee,
                $order->total,
                $order->latestPayment?->method->label() ?? '-',
            ];
        }
    }
}
