<?php

namespace App\Services\Admin;

use App\Exceptions\BusinessException;
use App\Models\Category;
use App\Models\OptionGroup;
use Illuminate\Support\Facades\DB;

class CatalogService
{
    /** Simpan grup opsi beserta daftar opsinya (opsi yang tidak dikirim akan dihapus). */
    public function saveOptionGroup(array $data, ?OptionGroup $group = null): OptionGroup
    {
        return DB::transaction(function () use ($data, $group) {
            $group ??= new OptionGroup;
            $group->fill(collect($data)->except('options')->all())->save();

            if (array_key_exists('options', $data)) {
                $keep = [];
                foreach (array_values($data['options']) as $i => $option) {
                    $model = isset($option['id']) ? $group->options()->find($option['id']) : null;
                    $attributes = ['name' => $option['name'], 'price_delta' => $option['price_delta'], 'sort_order' => $i];
                    $model ? $model->update($attributes) : $model = $group->options()->create($attributes);
                    $keep[] = $model->id;
                }
                $group->options()->whereNotIn('id', $keep)->delete();
            }

            return $group->load('options');
        });
    }

    public function deleteCategory(Category $category): void
    {
        if ($category->products()->withTrashed()->exists()) {
            throw BusinessException::field('category', 'Kategori masih memiliki produk. Pindahkan atau nonaktifkan kategori ini.');
        }

        $category->delete();
    }
}
