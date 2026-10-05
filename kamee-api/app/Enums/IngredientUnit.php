<?php

namespace App\Enums;

enum IngredientUnit: string
{
    use Concerns;

    case Ml = 'ml';
    case Gram = 'gram';
    case Pcs = 'pcs';
}
