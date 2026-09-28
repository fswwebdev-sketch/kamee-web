<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use Illuminate\Http\Request;

/** @mixin Order */
class AdminOrderResource extends OrderResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'outlet_id' => $this->outlet_id,
            'customer_id' => $this->customer_id,
            'handled_by' => $this->whenLoaded('handler', fn () => $this->handler ? ['id' => $this->handler->id, 'name' => $this->handler->name] : null),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'status_logs' => $this->whenLoaded('statusLogs', fn () => $this->statusLogs->map(fn ($log) => [
                'from_status' => $log->from_status,
                'to_status' => $log->to_status,
                'note' => $log->note,
                'changed_by' => $log->user?->name,
                'at' => $log->created_at?->toIso8601String(),
            ])),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
