<?php

namespace App\Providers;

use App\Services\Payments\FakeGateway;
use App\Services\Payments\MidtransGateway;
use App\Services\SettingService;
use App\Services\WhatsApp\ArrayWhatsApp;
use App\Services\WhatsApp\FonnteWhatsApp;
use App\Services\WhatsApp\LogWhatsApp;
use App\Services\WhatsApp\WhatsAppService;
use App\Support\Phone;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SettingService::class);

        $this->app->singleton(WhatsAppService::class, fn () => match (config('services.whatsapp.driver')) {
            'fonnte' => new FonnteWhatsApp((string) config('services.fonnte.token'), (string) config('services.fonnte.url')),
            'array' => new ArrayWhatsApp,
            default => new LogWhatsApp,
        });

        $this->app->bind(MidtransGateway::class, fn () => new MidtransGateway(
            (string) config('services.midtrans.server_key'),
            (string) config('services.midtrans.base_url'),
            config('services.midtrans.callback_url'),
        ));

        $this->app->bind(FakeGateway::class, fn () => new FakeGateway((string) config('app.key')));
    }

    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        $this->configurePagination();
        $this->configureRateLimiting();
    }

    /** Format paginasi: { data, meta: { page, per_page, total, last_page } } */
    private function configurePagination(): void
    {
        JsonResource::macro('paginationInformation', function ($request, array $paginated, array $default) {
            return ['meta' => [
                'page' => $paginated['current_page'],
                'per_page' => (int) $paginated['per_page'],
                'total' => $paginated['total'],
                'last_page' => $paginated['last_page'],
            ]];
        });
    }

    private function configureRateLimiting(): void
    {
        $tooMany = fn (string $message) => fn (Request $request, array $headers) => response()->json([
            'message' => $message.' Coba lagi dalam '.($headers['Retry-After'] ?? 60).' detik.',
        ], 429, $headers);

        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user('sanctum')?->getKey() ? 'u:'.$request->user('sanctum')->getMorphClass().$request->user('sanctum')->getKey() : $request->ip())
            ->response($tooMany('Terlalu banyak permintaan.')));

        RateLimiter::for('otp', fn (Request $request) => [
            Limit::perMinutes((int) config('kamee.otp.decay_minutes'), (int) config('kamee.otp.max_requests'))
                ->by('otp:'.Phone::normalize((string) $request->input('phone')))
                ->response($tooMany('Permintaan OTP sudah mencapai batas 3 kali dalam 10 menit.')),
            Limit::perMinutes(10, 10)->by('otp-ip:'.$request->ip())
                ->response($tooMany('Terlalu banyak permintaan OTP dari perangkat ini.')),
        ]);

        RateLimiter::for('otp-verify', fn (Request $request) => Limit::perMinutes(10, 10)
            ->by('otp-verify:'.Phone::normalize((string) $request->input('phone')))
            ->response($tooMany('Terlalu banyak percobaan verifikasi OTP.')));

        RateLimiter::for('voucher', fn (Request $request) => Limit::perMinute(10)
            ->by('voucher:'.($request->user('sanctum')?->getKey() ?? $request->ip()))
            ->response($tooMany('Terlalu banyak percobaan kode voucher.')));

        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute((int) config('kamee.admin_rate_limit', 300))
            ->by($request->user('sanctum')?->getKey() ? 'admin:'.$request->user('sanctum')->getKey() : 'admin-ip:'.$request->ip())
            ->response($tooMany('Terlalu banyak permintaan.')));
        RateLimiter::for('admin-login', fn (Request $request) => Limit::perMinute(5)
            ->by('admin-login:'.strtolower((string) $request->input('email')).'|'.$request->ip())
            ->response($tooMany('Terlalu banyak percobaan login.')));

        RateLimiter::for('contact', fn (Request $request) => Limit::perMinutes(10, 5)
            ->by('contact:'.$request->ip())
            ->response($tooMany('Terlalu banyak pesan terkirim.')));
    }
}
