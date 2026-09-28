<?php

namespace App\Enums;

enum ContactStatus: string
{
    use Concerns;

    case New = 'new';
    case Read = 'read';
    case Replied = 'replied';
}
