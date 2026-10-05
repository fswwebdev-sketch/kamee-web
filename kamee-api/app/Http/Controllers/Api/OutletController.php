<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OutletResource;
use App\Models\Outlet;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Outlet & Pengantaran
 *
 * @unauthenticated
 */
class OutletController extends Controller
{
    /** Outlet beserta jam buka dan koordinat. */
    public function index(): AnonymousResourceCollection
    {
        return OutletResource::collection(Outlet::query()->orderBy('name')->get());
    }
}
