<?php

namespace App\Services\WhatsApp;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Support\Rupiah;

/** Template pesan WhatsApp berbahasa Indonesia. */
class OrderMessages
{
    public function otp(string $code, int $ttlMinutes): string
    {
        return "Kode OTP Kamee Coffee Anda: *{$code}*\n\nBerlaku {$ttlMinutes} menit. Jangan bagikan kode ini kepada siapa pun.";
    }

    /** Pesan pesanan untuk dikirim pelanggan ke outlet (tautan wa.me). */
    public function orderSummary(Order $order): string
    {
        $order->loadMissing('items.options', 'outlet');
        $lines = ["Halo {$order->outlet->name}, saya mau pesan:", '', "*Kode:* {$order->code}"];

        foreach ($order->items as $i => $item) {
            $opts = $item->options->pluck('option_name')->implode(', ');
            $lines[] = ($i + 1).". {$item->product_name} x{$item->qty} — ".Rupiah::format($item->subtotal).($opts ? " ({$opts})" : '');
            if ($item->note) {
                $lines[] = "   Catatan: {$item->note}";
            }
        }

        $lines[] = '';
        $lines[] = 'Subtotal: '.Rupiah::format($order->subtotal);
        if ($order->discount > 0) {
            $lines[] = 'Diskon: -'.Rupiah::format($order->discount);
        }
        if ($order->delivery_fee > 0) {
            $lines[] = 'Ongkir: '.Rupiah::format($order->delivery_fee);
        }
        $lines[] = '*Total: '.Rupiah::format($order->total).'*';
        $lines[] = '';
        $lines[] = "Nama: {$order->customer_name}";
        $lines[] = 'Layanan: '.$order->fulfillment->label();
        if ($order->address) {
            $lines[] = "Alamat: {$order->address}";
        }
        if ($order->note) {
            $lines[] = "Catatan: {$order->note}";
        }

        return implode("\n", $lines);
    }

    public function orderCreated(Order $order): string
    {
        return "Terima kasih, {$order->customer_name}! Pesanan *{$order->code}* sebesar ".Rupiah::format($order->total)
            .' sudah kami terima. Selesaikan pembayaran dalam 15 menit agar pesanan diproses.';
    }

    public function statusUpdated(Order $order): ?string
    {
        $code = "*{$order->code}*";

        return match ($order->status) {
            OrderStatus::Paid => "Pembayaran pesanan {$code} berhasil. Pesanan akan segera kami siapkan ☕",
            OrderStatus::Processing => "Pesanan {$code} sedang disiapkan barista kami.",
            OrderStatus::Shipped => "Pesanan {$code} sedang dalam perjalanan ke alamat Anda 🛵",
            OrderStatus::Completed => "Pesanan {$code} selesai. Terima kasih sudah ngopi di Kamee! Jangan lupa beri ulasan ya.",
            OrderStatus::Cancelled => "Pesanan {$code} dibatalkan".($order->cancelled_reason ? ": {$order->cancelled_reason}" : '.'),
            default => null,
        };
    }
}
