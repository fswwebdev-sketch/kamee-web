<?php

it('mengizinkan origin frontend yang terdaftar dan menolak origin lain', function () {
    config(['cors.allowed_origins' => ['https://kameecoffee.id'], 'cors.allowed_origins_patterns' => ['#^https://kamee-web-[a-z0-9-]+\.vercel\.app$#']]);

    $preflight = fn (string $origin) => $this->call('OPTIONS', '/api/v1/products', [], [], [], [
        'HTTP_ORIGIN' => $origin,
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,idempotency-key,content-type',
    ]);

    $preflight('https://kameecoffee.id')->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'https://kameecoffee.id')
        ->assertHeaderMissing('Access-Control-Allow-Credentials');
    $preflight('https://kamee-web-git-main-kamee.vercel.app')
        ->assertHeader('Access-Control-Allow-Origin', 'https://kamee-web-git-main-kamee.vercel.app');
    $preflight('https://jahat.example')->assertHeaderMissing('Access-Control-Allow-Origin');

    $this->getJson('/api/v1/categories', ['Origin' => 'https://kameecoffee.id'])->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', 'https://kameecoffee.id')
        ->assertHeader('Access-Control-Expose-Headers');
});
