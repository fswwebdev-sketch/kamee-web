<?php

namespace App\Services;

use App\Enums\FulfillmentType;
use App\Enums\OrderChannel;
use App\Services\Pricing\CartItem;
use App\Support\Phone;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final readonly class CreateOrderData
{
    /** @param list<CartItem> $items */
    public function __construct(
        public int $outletId,
        public string $customerName,
        public string $customerPhone,
        public FulfillmentType $fulfillment,
        public array $items,
        public ?string $address = null,
        public ?float $lat = null,
        public ?float $lng = null,
        public ?string $addressNote = null,
        public ?CarbonInterface $scheduledAt = null,
        public ?string $promoCode = null,
        public int $redeemPoints = 0,
        public ?string $note = null,
        public OrderChannel $channel = OrderChannel::Web,
    ) {}

    public static function fromArray(array $data, OrderChannel $channel = OrderChannel::Web): self
    {
        return new self(
            outletId: (int) $data['outlet_id'],
            customerName: trim($data['customer']['name']),
            customerPhone: Phone::normalize($data['customer']['phone']),
            fulfillment: FulfillmentType::from($data['fulfillment']),
            items: array_map(fn (array $i) => CartItem::fromArray($i), $data['items']),
            address: $data['address']['text'] ?? null,
            lat: isset($data['address']['lat']) ? (float) $data['address']['lat'] : null,
            lng: isset($data['address']['lng']) ? (float) $data['address']['lng'] : null,
            addressNote: $data['address']['note'] ?? null,
            scheduledAt: isset($data['scheduled_at']) ? Carbon::parse($data['scheduled_at']) : null,
            promoCode: $data['promo_code'] ?? null,
            redeemPoints: (int) ($data['redeem_points'] ?? 0),
            note: $data['note'] ?? null,
            channel: $channel,
        );
    }
}
