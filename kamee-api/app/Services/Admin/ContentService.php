<?php

namespace App\Services\Admin;

use App\Enums\BlogStatus;
use App\Models\Banner;
use App\Models\Blog;
use App\Models\User;
use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;

class ContentService
{
    public function saveBanner(array $data, array $files, ?Banner $banner = null): Banner
    {
        $banner ??= new Banner;
        $banner->fill(Arr::except($data, ['image_desktop_file', 'image_mobile_file']));

        foreach (['image_desktop', 'image_mobile'] as $field) {
            if (($file = $files["{$field}_file"] ?? null) instanceof UploadedFile) {
                $banner->{$field} = Media::store($file, 'banners');
            }
        }

        $banner->save();

        return $banner;
    }

    /** Artikel yang diterbitkan tanpa tanggal otomatis memakai waktu sekarang. */
    public function saveBlog(array $data, ?UploadedFile $cover, User $author, ?Blog $blog = null): Blog
    {
        $blog ??= new Blog(['author_id' => $author->id]);
        $blog->fill(Arr::except($data, ['cover']));

        if ($cover) {
            Media::delete($blog->cover);
            $blog->cover = Media::store($cover, 'blogs');
        }

        if ($blog->status === BlogStatus::Published && $blog->published_at === null) {
            $blog->published_at = now();
        }

        $blog->save();

        return $blog->load('category', 'author');
    }
}
