<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Pelanggaran aturan bisnis. Dirender sebagai { message, errors } dengan kode 422 (default).
 */
class BusinessException extends RuntimeException
{
    /** @param array<string, list<string>> $errors */
    public function __construct(string $message, protected array $errors = [], protected int $status = 422)
    {
        parent::__construct($message);
    }

    public static function field(string $field, string $message, int $status = 422): static
    {
        return new static($message, [$field => [$message]], $status);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function status(): int
    {
        return $this->status;
    }

    public function render(): JsonResponse
    {
        return response()->json(array_filter([
            'message' => $this->getMessage(),
            'errors' => $this->errors ?: null,
        ]), $this->status);
    }
}
