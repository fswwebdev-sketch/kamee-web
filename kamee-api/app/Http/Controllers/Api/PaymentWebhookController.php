<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Webhook
 *
 * @unauthenticated
 */
class PaymentWebhookController extends Controller
{
    /**
     * Callback pembayaran.
     *
     * Signature diverifikasi (Midtrans: SHA512 order_id+status_code+gross_amount+server_key).
     * Idempoten: notifikasi berulang tidak mengubah data.
     *
     * @urlParam provider string midtrans | fake. Example: midtrans
     */
    public function __invoke(Request $request, string $provider, PaymentGatewayManager $gateways, PaymentService $payments): JsonResponse
    {
        $notification = $gateways->driver($provider)->parseWebhook($request);

        return response()->json(['message' => $payments->applyNotification($notification)]);
    }
}
