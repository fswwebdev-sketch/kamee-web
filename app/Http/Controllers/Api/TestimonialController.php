<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Konten
 *
 * @unauthenticated
 */
class TestimonialController extends Controller
{
    /** Ulasan unggulan untuk homepage (rating ≥ 4 dengan komentar). */
    public function index(): AnonymousResourceCollection
    {
        return ReviewResource::collection(
            Review::query()->published()->where('rating', '>=', 4)->whereNotNull('comment')
                ->with('customer:id,name', 'product:id,name,slug')
                ->latest()->limit(10)->get()
        );
    }
}
