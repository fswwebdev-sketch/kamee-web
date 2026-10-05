<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\CashEntryType;
use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Finance\CashEntryRequest;
use App\Http\Resources\Finance\CashEntryResource;
use App\Models\CashEntry;
use App\Support\AdminOutlet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Keuangan
 *
 * @authenticated
 *
 * Buku kas: pemasukan & pengeluaran di luar pesanan sistem. Entri dari belanja stok hanya bisa
 * diubah lewat menu Belanja stok.
 */
class CashEntryController extends Controller
{
    private const LOCKED_MESSAGE = 'Ubah lewat menu Belanja stok.';

    /**
     * Daftar entri kas + ringkasan (untuk seluruh filter, bukan hanya halaman).
     *
     * @queryParam from string Example: 2026-09-01
     * @queryParam to string Example: 2026-09-30
     * @queryParam type string income | expense. Example: expense
     * @queryParam method string cash | qris | bank_transfer. Example: cash
     * @queryParam category string Example: bahan_baku
     * @queryParam q string Cari keterangan / pihak terkait / catatan. Example: Nur
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', CashEntry::class);
        $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'type' => ['nullable', 'in:income,expense'],
            'method' => ['nullable', 'string', 'max:20'],
            'category' => ['nullable', 'string', 'max:30'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $outletId = AdminOutlet::filter($request);

        $query = CashEntry::query()
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('date', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('date', '<=', $request->input('to')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->filled('method'), fn ($q) => $q->where('method', $request->input('method')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->input('category')))
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = '%'.$request->input('q').'%';
                $q->where(fn ($w) => $w->whereLike('description', $term)
                    ->orWhereLike('counterparty', $term)
                    ->orWhereLike('note', $term));
            });

        $totals = (clone $query)->selectRaw('type, SUM(amount) as total')->groupBy('type')->pluck('total', 'type');
        $income = (int) ($totals[CashEntryType::Income->value] ?? 0);
        $expense = (int) ($totals[CashEntryType::Expense->value] ?? 0);

        $entries = $query->with('creator:id,name')
            ->orderByDesc('date')->orderByDesc('id')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return CashEntryResource::collection($entries)->additional([
            'summary' => ['income' => $income, 'expense' => $expense, 'balance' => $income - $expense],
        ]);
    }

    public function store(CashEntryRequest $request): JsonResponse
    {
        $entry = CashEntry::create($request->entryData() + [
            'outlet_id' => AdminOutlet::resolve($request),
            'source' => 'manual',
            'created_by' => $request->user()->id,
        ]);

        return (new CashEntryResource($entry->load('creator:id,name')))->additional(['message' => 'Catatan kas tersimpan.'])
            ->response()->setStatusCode(201);
    }

    public function show(CashEntry $cashEntry): CashEntryResource
    {
        $this->authorize('view', $cashEntry);

        return new CashEntryResource($cashEntry->load('creator:id,name'));
    }

    public function update(CashEntryRequest $request, CashEntry $cashEntry): CashEntryResource
    {
        $this->ensureManual($cashEntry);

        $cashEntry->update($request->entryData());

        return (new CashEntryResource($cashEntry->refresh()->load('creator:id,name')))->additional(['message' => 'Catatan kas diperbarui.']);
    }

    public function destroy(CashEntry $cashEntry): JsonResponse
    {
        $this->authorize('delete', $cashEntry);
        $this->ensureManual($cashEntry);

        $cashEntry->delete();

        return response()->json(['message' => 'Catatan kas dihapus.']);
    }

    private function ensureManual(CashEntry $entry): void
    {
        if ($entry->isFromStockPurchase()) {
            throw BusinessException::field('source', self::LOCKED_MESSAGE);
        }
    }
}
