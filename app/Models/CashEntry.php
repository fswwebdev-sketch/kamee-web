<?php

namespace App\Models;

use App\Enums\CashCategory;
use App\Enums\CashEntrySource;
use App\Enums\CashEntryType;
use App\Enums\PaymentMethod;
use App\Models\Scopes\OutletScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Baris buku kas (pemasukan/pengeluaran di luar pesanan sistem). */
#[ScopedBy(OutletScope::class)]
class CashEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'outlet_id', 'date', 'type', 'category', 'description', 'amount', 'method', 'bank',
        'counterparty', 'note', 'source', 'stock_purchase_id', 'created_by',
    ];

    protected $attributes = [
        'source' => 'manual',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'type' => CashEntryType::class,
            'category' => CashCategory::class,
            'method' => PaymentMethod::class,
            'source' => CashEntrySource::class,
            'amount' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function stockPurchase(): BelongsTo
    {
        return $this->belongsTo(StockPurchase::class);
    }

    public function isFromStockPurchase(): bool
    {
        return $this->source === CashEntrySource::StockPurchase;
    }
}
