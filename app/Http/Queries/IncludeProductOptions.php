<?php

namespace App\Http\Queries;

use Illuminate\Database\Eloquent\Builder;
use Spatie\QueryBuilder\Includes\IncludeInterface;

/** ?include=options → eager load grup opsi beserta opsinya. */
class IncludeProductOptions implements IncludeInterface
{
    public function __invoke(Builder $query, string $include): void
    {
        $query->with('optionGroups.options');
    }
}
