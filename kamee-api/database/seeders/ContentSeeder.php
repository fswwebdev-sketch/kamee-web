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
            ['Ngopi Hemat 5%', 'Pakai kode KAMEEHEMAT · min. belanja Rp50.000', '/promo'],
            ['Kame Manucano', 'Iced Americano dengan Manuka Honey — favorit pelanggan', '/menu/kame-manucano'],
            ['Potongan Rp10.000', 'Belanja min. Rp125.000 pakai kode NGOPI10K', '/promo'],
        ];
        foreach ($banners as $i => [$title, $subtitle, $link]) {
            Banner::updateOrCreate(['title' => $title], [
                'subtitle' => $subtitle,
                'image_desktop' => '/images/banners/banner-'.($i + 1).'.avif',
                'image_mobile' => '/images/banners/banner-'.($i + 1).'.avif',
                'link_url' => $link,
                'placement' => 'home',
                'sort_order' => $i,
                'starts_at' => now()->subMonth(),
                'ends_at' => now()->addMonths(2),
                'is_active' => true,
            ]);
        }

        $author = User::where('email', config('kamee.admin_email'))->first();
        $categories = collect(['Tips Kopi', 'Cerita Kamee', 'Promo & Event'])
            ->map(fn ($name) => BlogCategory::firstOrCreate(['name' => $name]));

        $articles = [
            ['Cara Membuat Kopi Susu Aren di Rumah', 0],
            ['Mengenal Perbedaan Arabika dan Robusta', 0],
            ['5 Tips Menyimpan Biji Kopi agar Tetap Segar', 0],
            ['Natural, Washed, atau Honey? Mengenal Proses Biji Kopi', 0],
            ['Cerita di Balik Kame Manucano', 1],
            ['Menu Akhir Pekan: Mont Blanc dan Cold Brew', 2],
        ];
        foreach ($articles as $i => [$title, $cat]) {
            Blog::firstOrCreate(['title' => $title], [
                'blog_category_id' => $categories[$cat]->id,
                'author_id' => $author?->id,
                'excerpt' => "{$title} — simak selengkapnya di blog Kamee Coffee.",
                'content' => "<p>{$title}.</p><p>Artikel demo untuk pengembangan. Ganti dengan konten asli melalui dashboard admin.</p>",
                'cover' => '/images/blog/blog-'.($i + 1).'.avif',
                'status' => BlogStatus::Published,
                'published_at' => now()->subDays(40 - $i * 6),
            ]);
        }

        // Pesan kontak contoh hanya untuk data demo.
        if (config('kamee.seed_demo') && Contact::count() === 0) {
            Contact::factory()->count(3)->create();
        }
    }
}
