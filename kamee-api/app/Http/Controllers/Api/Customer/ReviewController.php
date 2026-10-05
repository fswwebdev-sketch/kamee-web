<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;

/**
 * @group Pelanggan: Ulasan
 *
 * @authenticated
 */
class ReviewController extends Controller
{
    /**
     * Beri ulasan.
     *
     * Hanya untuk produk dari pesanan yang sudah selesai.
     */
    public function store(StoreReviewRequest $request, ReviewService $reviews): JsonResponse
    {
        $review = $reviews->create($request->user(), $request->safe()->except('photo'), $request->file('photo'));

        return (new ReviewResource($review->load('customer', 'product')))
            ->additional(['message' => 'Terima kasih atas ulasan Anda!'])
            ->response()
            ->setStatusCode(201);
    }
}
