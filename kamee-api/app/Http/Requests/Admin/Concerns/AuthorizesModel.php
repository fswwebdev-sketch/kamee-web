<?php

namespace App\Http\Requests\Admin\Concerns;

/**
 * Otorisasi dijalankan sebelum validasi: create bila route tidak membawa model, update bila ada.
 */
trait AuthorizesModel
{
    protected function canManage(string $modelClass, string $routeParameter): bool
    {
        $model = $this->route($routeParameter);

        return (bool) $this->user()?->can($model ? 'update' : 'create', $model ?? $modelClass);
    }
}
