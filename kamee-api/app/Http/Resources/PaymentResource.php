<?php

namespace App\Http\Resources;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Payment */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $manual = $this->provider === 'manual';

        return [
            'id' => $this->id,
            'method' => $this->method->value,
            // Pembayaran yang dicatat admin (konfirmasi manual / kasir) memakai label pembukuan: QRIS / Transfer BCA / Tunai.
            'method_label' => in_array($this->provider, ['manual', 'pos'], true)
                ? $this->method->bookLabelWithBank($this->raw_payload['bank'] ?? null)
                : $this->method->label(),
            'provider' => $this->provider,
            'reference' => $this->provider_ref,
            'amount' => $this->amount,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'qr_string' => $this->qr_string,
            'va_number' => $this->va_number,
            'bank' => $this->raw_payload['bank'] ?? null,
            'deeplink' => $this->deeplink(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            // QRIS statis (gateway manual): gambar QR + identitas merchant; null untuk penyedia lain.
            'qris_image_url' => $manual ? ($this->raw_payload['qris_image_url'] ?? null) : null,
            'merchant_name' => $manual ? ($this->raw_payload['merchant_name'] ?? null) : null,
            'nmid' => $manual ? ($this->raw_payload['nmid'] ?? null) : null,
            'requires_manual_confirmation' => $manual && $this->status === PaymentStatus::Pending,
        ];
    }
}
