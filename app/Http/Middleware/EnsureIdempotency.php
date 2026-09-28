<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Header Idempotency-Key wajib. Permintaan ulang dengan kunci & isi yang sama mengembalikan
 * respons pertama (header Idempotent-Replayed: true) sehingga tidak ada pesanan/tagihan ganda.
 */
class EnsureIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if ($key === '' || strlen($key) > 100 || ! preg_match('/^[A-Za-z0-9_\-:.]+$/', $key)) {
            return response()->json([
                'message' => 'Header Idempotency-Key wajib diisi (maks 100 karakter, huruf/angka/-/_).',
                'errors' => ['Idempotency-Key' => ['Header Idempotency-Key wajib diisi.']],
            ], 422);
        }

        $scope = $request->user('sanctum')?->getMorphClass().':'.$request->user('sanctum')?->getKey();
        $cacheKey = 'idempotency:'.hash('sha256', $scope.'|'.$request->method().'|'.$request->path().'|'.$key);
        $fingerprint = hash('sha256', $request->getContent().json_encode($request->query()));

        if ($cached = Cache::get($cacheKey)) {
            return $this->replay($cached, $fingerprint);
        }

        try {
            return Cache::lock($cacheKey.':lock', 30)->block(5, function () use ($request, $next, $cacheKey, $fingerprint) {
                if ($cached = Cache::get($cacheKey)) {
                    return $this->replay($cached, $fingerprint);
                }

                $response = $next($request);

                if ($response->getStatusCode() < 500 && $response->getStatusCode() !== 429) {
                    Cache::put($cacheKey, [
                        'fingerprint' => $fingerprint,
                        'status' => $response->getStatusCode(),
                        'body' => $response->getContent(),
                    ], now()->addHours((int) config('kamee.idempotency_ttl_hours')));
                }

                return $response;
            });
        } catch (LockTimeoutException) {
            return response()->json(['message' => 'Permintaan yang sama sedang diproses. Coba lagi sebentar.'], 409);
        }
    }

    private function replay(array $cached, string $fingerprint): Response
    {
        if ($cached['fingerprint'] !== $fingerprint) {
            return response()->json([
                'message' => 'Idempotency-Key sudah dipakai untuk permintaan dengan isi berbeda.',
                'errors' => ['Idempotency-Key' => ['Gunakan Idempotency-Key baru untuk permintaan berbeda.']],
            ], 422);
        }

        return JsonResponse::fromJsonString($cached['body'], $cached['status'], ['Idempotent-Replayed' => 'true']);
    }
}
