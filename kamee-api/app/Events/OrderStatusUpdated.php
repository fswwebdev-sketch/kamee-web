<?php

namespace App\Events;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Order $order, public ?OrderStatus $from, public ?string $note = null) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("outlet.{$this->order->outlet_id}"),
            new PrivateChannel("order.{$this->order->code}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.status_updated';
    }

    public function broadcastWith(): array
    {
        return OrderBroadcastPayload::from($this->order) + [
            'from_status' => $this->from?->value,
            'note' => $this->note,
        ];
    }
}
