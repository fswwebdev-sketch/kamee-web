<?php

namespace Database\Seeders;

use App\Enums\BlogStatus;
use App\Models\Banner;
use App\Models\Blog;
use App\Models\BlogCategory;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Seeder;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $banners = [
            ['Ngopi Hemat 20%', 'Pakai kode KAMEEHEMAT untuk semua menu', '/promo'],
            ['Signature Baru: Klepon Latte', 'Rasa kue tradisional dalam secangkir kopi', '/menu/klepon-latte'],
            ['Gratis Ongkir se-Tangerang', 'Minimal belanja Rp50.000 dengan kode GRATISONGKIR', '/promo'],
        ];
        foreach ($banners as $i => [$title, $subtitle, $link]) {
            Banner::updateOrCreate(['title' => $title], [
                'subtitle' => $subtitle,
                'image_desktop' => 'https://placehold.co/1600x600/png?text='.rawurlencode($title),
                'image_mobile' => 'https://placehold.co/800x800/png?text='.rawurlencode($title),
                'link_url' => $link,
                'placement' => 'home',
                'sort_order' => $i,
                'starts_at' => now()->subMonth(),
                'ends_at' => now()->addMonths(2),
                'is_active' => true,
            ]);
        }

        $author = User::where('email', 'superadmin@kamee.id')->first();
        $categories = collect(['Tips Kopi', 'Cerita Kamee', 'Promo & Event'])
            ->map(fn ($name) => BlogCategory::firstOrCreate(['name' => $name]));

        $articles = [
            ['Cara Menyeduh Kopi Susu Aren ala Kamee di Rumah', 0],
            ['Mengenal Perbedaan Arabika dan Robusta', 0],
            ['5 Tips Menyimpan Biji Kopi agar Tetap Segar', 0],
            ['Cerita di Balik Klepon Latte', 1],
            ['Kenalan dengan Barista Kamee Karawaci', 1],
            ['Kamee Coffee Buka Outlet Baru di Cikokol', 2],
        ];
        foreach ($articles as $i => [$title, $cat]) {
            Blog::firstOrCreate(['title' => $title], [
                'blog_category_id' => $categories[$cat]->id,
                'author_id' => $author?->id,
                'excerpt' => "{$title} — simak selengkapnya di blog Kamee Coffee.",
                'content' => "<p>{$title}.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>",
                'cover' => 'https://placehold.co/1200x630/png?text='.rawurlencode($title),
                'status' => BlogStatus::Published,
                'published_at' => now()->subDays(40 - $i * 6),
            ]);
        }

        if (Contact::count() === 0) {
            Contact::factory()->count(3)->create();
        }
    }
}
