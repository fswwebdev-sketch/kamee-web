<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreContactRequest;
use App\Models\Contact;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;

/**
 * @group Konten
 *
 * @unauthenticated
 */
class ContactController extends Controller
{
    /** Kirim form kontak (dilindungi captcha Turnstile). */
    public function store(StoreContactRequest $request): JsonResponse
    {
        $data = $request->safe()->except('turnstile_token');
        $data['phone'] = isset($data['phone']) ? Phone::normalize($data['phone']) : null;

        Contact::create($data);

        return response()->json(['message' => 'Terima kasih, pesan Anda sudah kami terima. Tim Kamee akan segera menghubungi Anda.'], 201);
    }
}
