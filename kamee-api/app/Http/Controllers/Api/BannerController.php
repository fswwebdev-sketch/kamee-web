<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BannerResource;
use App\Models\Banner;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Konten
 *
 * @unauthenticated
 */
class BannerController extends Controller
{
    /**
     * Banner aktif.
     *
     * @queryParam placement string Posisi banner. Example: home
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return BannerResource::collection(
            Banner::query()->running()
                ->where('placement', $request->string('placement', 'home')->toString())
                ->orderBy('sort_order')
                ->get()
        );
    }
}
