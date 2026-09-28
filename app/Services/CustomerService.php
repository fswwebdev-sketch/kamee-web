<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Exceptions\BusinessException;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class CustomerService
{
    /**
     * Salin item pesanan lama ke format keranjang. Opsi dicocokkan dari snapshot "Grup: Opsi";
     * produk yang sudah tidak dijual dilaporkan di "unavailable".
     */
    public function reorder(Order $order): array
    {
        $order->loadMissing('items.options');
        $products = Product::query()->with('optionGroups.options')->whereIn('id', $order->items->pluck('product_id')->filter())->get()->keyBy('id');

        $items = [];
        $unavailable = [];

        foreach ($order->items as $item) {
            $product = $products->get($item->product_id);

            if ($product === null || ! $product->is_active) {
                $unavailable[] = ['product_name' => $item->product_name, 'reason' => 'Produk sudah tidak dijual.'];

                continue;
            }

            $lookup = [];
            foreach ($product->optionGroups as $group) {
                foreach ($group->options as $option) {
                    $lookup["{$group->name}: {$option->name}"] = $option->id;
                }
            }

            $optionIds = [];
            $missing = [];
            foreach ($item->options as $snapshot) {
                isset($lookup[$snapshot->option_name]) ? $optionIds[] = $lookup[$snapshot->option_name] : $missing[] = $snapshot->option_name;
            }

            $items[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'qty' => $item->qty,
                'option_ids' => $optionIds,
                'note' => $item->note,
                'unit_price_now' => $product->base_price + $product->optionGroups->flatMap->options->whereIn('id', $optionIds)->sum('price_delta'),
                'missing_options' => $missing,
            ];
        }

        return [
            'outlet_id' => $order->outlet_id,
            'items' => $items,
            'unavailable' => $unavailable,
        ];
    }

    public function saveAddress(Customer $customer, array $data, ?CustomerAddress $address = null): CustomerAddress
    {
        return DB::transaction(function () use ($customer, $data, $address) {
            $makeDefault = (bool) ($data['is_default'] ?? false) || ! $customer->addresses()->exists();

            if ($makeDefault) {
                $customer->addresses()->when($address, fn ($q) => $q->whereKeyNot($address->id))->update(['is_default' => false]);
                $data['is_default'] = true;
            }

            if ($address === null) {
                return $customer->addresses()->create($data);
            }

            $address->update($data);

            return $address;
        });
    }

    public function deleteAddress(CustomerAddress $address): void
    {
        DB::transaction(function () use ($address) {
            $wasDefault = $address->is_default;
            $customer = $address->customer;
            $address->delete();

            if ($wasDefault) {
                $customer->addresses()->oldest('id')->first()?->update(['is_default' => true]);
            }
        });
    }

    /** Ringkasan transaksi untuk admin. */
    public function stats(Customer $customer): array
    {
        $orders = Order::query()->withoutGlobalScopes()->where('customer_id', $customer->id);

        return [
            'orders_count' => (clone $orders)->count(),
            'completed_orders' => (clone $orders)->where('status', OrderStatus::Completed)->count(),
            'total_spend' => (int) (clone $orders)->whereIn('status', OrderStatus::revenueStatuses())->sum('total'),
            'last_order_at' => (clone $orders)->max('created_at'),
        ];
    }

    public function assertOwns(Customer $customer, Order $order): void
    {
        if ($order->customer_id !== $customer->id) {
            throw new BusinessException('Pesanan tidak ditemukan.', [], 404);
        }
    }
}
