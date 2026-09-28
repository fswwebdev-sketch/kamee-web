<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Exceptions\BusinessException;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ReviewService
{
    /** Ulasan hanya untuk produk dari pesanan milik pelanggan yang sudah selesai; satu ulasan per produk per pesanan. */
    public function create(Customer $customer, array $data, ?UploadedFile $photo = null): Review
    {
        $order = Order::query()->withoutGlobalScopes()->where('code', $data['order_code'])->where('customer_id', $customer->id)->first();

        if ($order === null) {
            throw BusinessException::field('order_code', 'Pesanan tidak ditemukan.');
        }

        if ($order->status !== OrderStatus::Completed) {
            throw BusinessException::field('order_code', 'Ulasan hanya dapat diberikan untuk pesanan yang sudah selesai.');
        }

        if (! $order->items()->where('product_id', $data['product_id'])->exists()) {
            throw BusinessException::field('product_id', 'Produk ini tidak ada di pesanan tersebut.');
        }

        if (Review::query()->where('order_id', $order->id)->where('product_id', $data['product_id'])->exists()) {
            throw BusinessException::field('product_id', 'Anda sudah memberi ulasan untuk produk ini.');
        }

        return DB::transaction(function () use ($customer, $order, $data, $photo) {
            $review = Review::create([
                'product_id' => $data['product_id'],
                'customer_id' => $customer->id,
                'order_id' => $order->id,
                'rating' => $data['rating'],
                'comment' => $data['comment'] ?? null,
                'photo' => $photo?->store('reviews', 'public'),
                'is_published' => true,
            ]);

            $this->refreshRating($review->product_id);

            return $review;
        });
    }

    public function refreshRating(int $productId): void
    {
        $stats = Review::query()->published()->where('product_id', $productId)
            ->selectRaw('COUNT(*) as total, AVG(rating) as average')->first();

        Product::withTrashed()->whereKey($productId)->update([
            'review_count' => (int) $stats->total,
            'rating_avg' => round((float) $stats->average, 1),
        ]);
    }
}
