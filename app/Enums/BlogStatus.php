<?php

namespace App\Enums;

enum BlogStatus: string
{
    use Concerns;

    case Draft = 'draft';
    case Published = 'published';
}
