<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name' => 'Kamee Coffee API',
    'version' => 'v1',
    'docs' => url('/docs'),
]));
