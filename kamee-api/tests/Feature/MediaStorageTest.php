<?php

use App\Models\Category;
use App\Models\Product;
use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function useSupabaseDisk(): void
{
    config([
        'filesystems.media_disk' => 'supabase',
        'filesystems.disks.supabase.key' => 'kunci-uji',
        'filesystems.disks.supabase.secret' => 'rahasia-uji',
        'filesystems.disks.supabase.endpoint' => 'https://abcd.storage.supabase.co/storage/v1/s3',
        'filesystems.disks.supabase.url' => 'https://abcd.supabase.co/storage/v1/object/public/kamee',
    ]);
    Storage::forgetDisk('supabase');
}

it('membentuk URL publik Supabase Storage dari path relatif', function () {
    useSupabaseDisk();

    expect(Media::diskName())->toBe('supabase')
        ->and(Media::url('products/kopi.jpg'))->toBe('https://abcd.supabase.co/storage/v1/object/public/kamee/products/kopi.jpg')
        ->and(Media::url('https://placehold.co/800.png'))->toBe('https://placehold.co/800.png')
        ->and(Media::url(null))->toBeNull()
        ->and(config('filesystems.disks.supabase.use_path_style_endpoint'))->toBeTrue();
});

it('mengunggah gambar produk ke disk Supabase dan menyajikan URL publiknya', function () {
    useSupabaseDisk();
    Storage::fake('supabase', ['url' => 'https://abcd.supabase.co/storage/v1/object/public/kamee']);
    Storage::fake('public');
    actingAsAdmin(superAdmin());

    $response = $this->post('/api/v1/admin/products', [
        'category_id' => Category::factory()->create()->id, 'name' => 'Es Kopi Aren', 'base_price' => 24000,
        'image' => UploadedFile::fake()->image('aren.jpg'),
    ], ['Accept' => 'application/json'])->assertCreated();

    $path = Product::find($response->json('data.id'))->image;
    Storage::disk('supabase')->assertExists($path);
    Storage::disk('public')->assertMissing($path);
    expect($path)->toStartWith('products/')
        ->and($response->json('data.image_url'))->toBe("https://abcd.supabase.co/storage/v1/object/public/kamee/{$path}");

    // Mengganti gambar menghapus berkas lama.
    $this->post("/api/v1/admin/products/{$response->json('data.id')}", [
        '_method' => 'PATCH', 'image' => UploadedFile::fake()->image('baru.jpg'),
    ], ['Accept' => 'application/json'])->assertOk();
    Storage::disk('supabase')->assertMissing($path);
});

it('tidak menghapus apa pun untuk URL absolut', function () {
    Storage::fake('public');
    Storage::disk('public')->put('banners/a.jpg', 'x');

    Media::delete('https://placehold.co/a.jpg');
    Media::delete(null);
    Media::delete('banners/a.jpg');

    Storage::disk('public')->assertMissing('banners/a.jpg');
});
