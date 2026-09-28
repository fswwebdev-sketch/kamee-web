<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\RequestOtpRequest;
use App\Http\Requests\Customer\VerifyOtpRequest;
use App\Http\Resources\CustomerResource;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Pelanggan: Autentikasi
 */
class AuthController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    /**
     * Minta OTP.
     *
     * Kode 6 digit dikirim ke WhatsApp. Maksimal 3 permintaan per nomor dalam 10 menit.
     *
     * @unauthenticated
     */
    public function requestOtp(RequestOtpRequest $request): JsonResponse
    {
        $result = $this->otp->request($request->string('phone'));

        return response()->json([
            'message' => 'Kode OTP sudah dikirim ke WhatsApp Anda.',
            'data' => $result,
        ]);
    }

    /**
     * Verifikasi OTP.
     *
     * Mengembalikan Bearer token pelanggan. Pelanggan baru otomatis terdaftar.
     *
     * @unauthenticated
     */
    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $result = $this->otp->verify($request->string('phone'), $request->string('code'), $request->input('name'));

        return response()->json([
            'message' => $result['is_new'] ? 'Selamat datang di Kamee Coffee!' : 'Berhasil masuk.',
            'data' => [
                'token' => $result['token'],
                'token_type' => 'Bearer',
                'is_new' => $result['is_new'],
                'customer' => new CustomerResource($result['customer']),
            ],
        ]);
    }

    /**
     * Keluar.
     *
     * Mencabut token yang sedang dipakai.
     *
     * @authenticated
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil keluar.']);
    }
}
