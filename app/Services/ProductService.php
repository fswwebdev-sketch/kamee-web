<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductService
{
    public function create(array $data, ?UploadedFile $image = null): Product
    {
        return DB::transaction(function () use ($data, $image) {
            $product = new Product(Arr::except($data, ['option_group_ids']));
            if ($image) {
                $product->image = $image->store('products', 'public');
            }
            $product->save();
            $this->syncOptionGroups($product, $data['option_group_ids'] ?? null);

            return $product->load('category', 'optionGroups.options', 'images');
        });
    }

    public function update(Product $product, array $data, ?UploadedFile $image = null): Product
    {
        return DB::transaction(function () use ($product, $data, $image) {
            $product->fill(Arr::except($data, ['option_group_ids']));
            if ($image) {
                $old = $product->image;
                $product->image = $image->store('products', 'public');
                if ($old) {
                    Storage::disk('public')->delete($old);
                }
            }
            $product->save();
            $this->syncOptionGroups($product, $data['option_group_ids'] ?? null);

            return $product->load('category', 'optionGroups.options', 'images');
        });
    }

    /** @param list<UploadedFile> $files */
    public function addImages(Product $product, array $files, ?string $alt = null): array
    {
        $start = (int) $product->images()->max('sort_order') + 1;

        return array_map(fn (UploadedFile $file, int $i) => $product->images()->create([
            'path' => $file->store('products/gallery', 'public'),
            'alt' => $alt ?? $product->name,
            'sort_order' => $start + $i,
        ]), $files, array_keys($files));
    }

    public function deleteImage(ProductImage $image): void
    {
        Storage::disk('public')->delete($image->path);
        $image->delete();
    }

    /** @param list<int> $ids urutan baru seluruh gambar galeri */
    public function reorderImages(Product $product, array $ids): void
    {
        DB::transaction(function () use ($product, $ids) {
            foreach ($ids as $i => $id) {
                $product->images()->whereKey($id)->update(['sort_order' => $i]);
            }
        });
    }

    /**
     * @param  Collection<int, Product>  $products
     */
    public function bulk(Collection $products, string $action): int
    {
        return DB::transaction(function () use ($products, $action) {
            foreach ($products as $product) {
                match ($action) {
                    'activate' => $product->update(['is_active' => true]),
                    'deactivate' => $product->update(['is_active' => false]),
                    'feature' => $product->update(['is_featured' => true]),
                    'unfeature' => $product->update(['is_featured' => false]),
                    'best_seller' => $product->update(['is_best_seller' => true]),
                    'unbest_seller' => $product->update(['is_best_seller' => false]),
                    'delete' => $product->delete(),
                };
            }

            return $products->count();
        });
    }

    /** Tandai produk tersedia / habis di outlet tertentu. */
    public function setAvailability(Outlet $outlet, Product $product, bool $available): void
    {
        $outlet->products()->syncWithoutDetaching([
            $product->id => ['is_available' => $available, 'updated_at' => now()],
        ]);
    }

    private function syncOptionGroups(Product $product, ?array $groupIds): void
    {
        if ($groupIds === null) {
            return;
        }

        $product->optionGroups()->sync(collect($groupIds)->values()->mapWithKeys(fn ($id, $i) => [$id => ['sort_order' => $i]])->all());
    }
}
