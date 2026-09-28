<?php

namespace App\Enums;

enum OptionGroupType: string
{
    use Concerns;

    case Single = 'single';
    case Multi = 'multi';
}
