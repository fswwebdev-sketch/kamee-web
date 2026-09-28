<?php

use App\Exceptions\BusinessException;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureCustomer;
use App\Http\Middleware\EnsureIdempotency;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\Exceptions\InvalidQuery;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api/v1', 'middleware' => ['api', 'auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [ForceJsonResponse::class]);
        $middleware->alias([
            'customer' => EnsureCustomer::class,
            'admin' => EnsureAdmin::class,
            'idempotent' => EnsureIdempotency::class,
        ]);
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->dontReport([BusinessException::class]);

        $exceptions->render(fn (AuthenticationException $e, Request $request) => response()->json([
            'message' => 'Sesi tidak valid atau Anda belum masuk.',
        ], 401));

        $exceptions->render(function (AccessDeniedHttpException|AuthorizationException $e, Request $request) {
            $message = $e->getMessage();

            return response()->json([
                'message' => $message && $message !== 'This action is unauthorized.' ? $message : 'Anda tidak memiliki akses untuk tindakan ini.',
            ], 403);
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => $e->getPrevious() instanceof ModelNotFoundException || $request->route() !== null
                    ? 'Data tidak ditemukan.'
                    : 'Endpoint tidak ditemukan.',
            ], 404);
        });

        $exceptions->render(fn (MethodNotAllowedHttpException $e, Request $request) => $request->is('api/*')
            ? response()->json(['message' => 'Metode HTTP tidak didukung untuk endpoint ini.'], 405)
            : null);

        $exceptions->render(fn (ThrottleRequestsException $e) => response()->json([
            'message' => 'Terlalu banyak permintaan. Coba lagi dalam '.($e->getHeaders()['Retry-After'] ?? 60).' detik.',
        ], 429, $e->getHeaders()));

        $exceptions->render(fn (InvalidQuery $e) => response()->json([
            'message' => 'Parameter query tidak valid: '.$e->getMessage(),
        ], 400));

        $exceptions->render(function (HttpException $e, Request $request) {
            if (! $request->is('api/*') || $e->getStatusCode() < 500 || config('app.debug')) {
                return null;
            }

            return response()->json(['message' => 'Terjadi kesalahan pada server. Silakan coba lagi.'], $e->getStatusCode());
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') || config('app.debug') || $e instanceof HttpException
                || $e instanceof ValidationException || $e instanceof BusinessException) {
                return null;
            }

            return response()->json(['message' => 'Terjadi kesalahan pada server. Silakan coba lagi.'], 500);
        });
    })->create();
