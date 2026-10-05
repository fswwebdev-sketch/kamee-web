<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

abstract class Controller
{
    use AuthorizesRequests;

    public const MAX_PER_PAGE = 50;

    /** Nilai ?per_page= yang aman (1–50). */
    protected function perPage(Request $request, int $default = 15): int
    {
        return max(1, min(self::MAX_PER_PAGE, (int) $request->integer('per_page', $default)));
    }
}
