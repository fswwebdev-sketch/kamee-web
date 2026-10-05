<?php

namespace App\Services;

use App\Enums\LoyaltyTransactionType as Type;
use App\Exceptions\BusinessException;
use App\Models\Customer;
use App\Models\LoyaltyTier;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Poin loyalitas:
 * - earn  : saat pesanan selesai, dari nilai belanja (tanpa ongkir & biaya layanan) × multiplier tier.
 * - redeem: saat checkout, 1 poin = point_value rupiah, maks points_max_redeem_percent dari belanja.
 * - expire: FIFO — pemakaian poin selalu mengurangi poin yang paling awal didapat.
 */
class LoyaltyService
{
    public function __construct(private readonly SettingService $settings) {}

    public function tierFor(int $lifetimeSpend): ?LoyaltyTier
    {
        return LoyaltyTier::query()->where('min_spend', '<=', $lifetimeSpend)->orderByDesc('min_spend')->first();
    }

    public function nextTier(Customer $customer): ?LoyaltyTier
    {
        return LoyaltyTier::query()->where('min_spend', '>', $customer->lifetime_spend)->orderBy('min_spend')->first();
    }

    public function pointValue(): int
    {
        return max(1, $this->settings->int('point_value'));
    }

    /** Hitung poin yang akan didapat dari sebuah pesanan. */
    public function pointsForOrder(Order $order, ?Customer $customer = null): int
    {
        $customer ??= $order->customer;
        $eligibleSpend = max(0, $order->total - $order->delivery_fee - $order->service_fee);
        $perAmount = max(1, $this->settings->int('points_earn_per_amount'));
        $multiplier = $customer?->tier?->point_multiplier ?? 1.0;

        return (int) floor(intdiv($eligibleSpend, $perAmount) * $multiplier);
    }

    /**
     * Tambah poin & total belanja saat pesanan selesai. Idempoten per pesanan.
     */
    public function earnForOrder(Order $order): ?LoyaltyTransaction
    {
        if ($order->customer_id === null) {
            return null;
        }

        return DB::transaction(function () use ($order) {
            $customer = Customer::query()->with('tier')->lockForUpdate()->findOrFail($order->customer_id);

            if (LoyaltyTransaction::query()->where('order_id', $order->id)->where('type', Type::Earn)->exists()) {
                return null;
            }

            $points = $this->pointsForOrder($order, $customer);

            $customer->lifetime_spend += $order->total;
            $customer->tier_id = $this->tierFor($customer->lifetime_spend)?->id ?? $customer->tier_id;

            $transaction = null;
            if ($points > 0) {
                $transaction = $this->record($customer, Type::Earn, $points, $order, "Poin dari pesanan {$order->code}", $this->expiryDate());
            }

            $customer->save();

            return $transaction;
        });
    }

    /**
     * Validasi penukaran poin; mengembalikan nilai potongan (rupiah).
     */
    public function validateRedeem(Customer $customer, int $points, int $payable, string $field = 'points'): int
    {
        $min = $this->settings->int('points_min_redeem');

        if ($points < $min) {
            throw BusinessException::field($field, "Minimal penukaran {$min} poin.");
        }

        if ($points > $customer->points_balance) {
            throw BusinessException::field($field, "Poin tidak mencukupi. Saldo Anda {$customer->points_balance} poin.");
        }

        $max = $this->maxRedeemable($customer, $payable);
        if ($points > $max) {
            throw BusinessException::field($field, "Maksimal {$max} poin dapat ditukar untuk pesanan ini.");
        }

        return $points * $this->pointValue();
    }

    public function maxRedeemable(Customer $customer, int $payable): int
    {
        $percent = min(100, max(0, $this->settings->int('points_max_redeem_percent')));
        $byAmount = intdiv(intdiv($payable * $percent, 100), $this->pointValue());

        return max(0, min($customer->points_balance, $byAmount));
    }

    /** Simulasi penukaran poin untuk /me/points/redeem-preview. */
    public function preview(Customer $customer, int $points, int $subtotal): array
    {
        $max = $this->maxRedeemable($customer, $subtotal);
        $applied = min(max(0, $points), $max);
        $value = $applied * $this->pointValue();

        return [
            'requested_points' => $points,
            'applicable_points' => $applied,
            'max_points' => $max,
            'point_value' => $this->pointValue(),
            'discount' => $value,
            'subtotal_after' => max(0, $subtotal - $value),
            'balance' => $customer->points_balance,
            'balance_after' => $customer->points_balance - $applied,
            'message' => $applied < $points
                ? "Hanya {$applied} poin yang dapat ditukar untuk belanja ini."
                : "Tukar {$applied} poin untuk potongan Rp".number_format($value, 0, ',', '.').'.',
        ];
    }

    public function redeemForOrder(Customer $customer, int $points, Order $order): LoyaltyTransaction
    {
        return DB::transaction(function () use ($customer, $points, $order) {
            $locked = Customer::query()->lockForUpdate()->findOrFail($customer->id);

            if ($points > $locked->points_balance) {
                throw BusinessException::field('redeem_points', 'Poin tidak mencukupi.');
            }

            $tx = $this->record($locked, Type::Redeem, -$points, $order, "Tukar poin untuk pesanan {$order->code}");
            $locked->save();
            $customer->points_balance = $locked->points_balance;

            return $tx;
        });
    }

    /** Kembalikan poin yang ditukar saat pesanan dibatalkan. Idempoten per pesanan. */
    public function refundRedeemForOrder(Order $order): ?LoyaltyTransaction
    {
        $redeemed = (int) -LoyaltyTransaction::query()->where('order_id', $order->id)->where('type', Type::Redeem)->sum('points');
        $refunded = (int) LoyaltyTransaction::query()->where('order_id', $order->id)->where('type', Type::Adjust)->where('points', '>', 0)->sum('points');
        $points = $redeemed - $refunded;

        if ($points <= 0 || $order->customer_id === null) {
            return null;
        }

        return DB::transaction(function () use ($order, $points) {
            $customer = Customer::query()->lockForUpdate()->findOrFail($order->customer_id);
            $tx = $this->record($customer, Type::Adjust, $points, $order, "Pengembalian poin pesanan {$order->code}", $this->expiryDate());
            $customer->save();

            return $tx;
        });
    }

    /** Koreksi poin manual oleh Super Admin (tercatat). */
    public function adjust(Customer $customer, int $points, string $note, ?User $by = null): LoyaltyTransaction
    {
        if ($points === 0) {
            throw BusinessException::field('points', 'Jumlah poin tidak boleh 0.');
        }

        return DB::transaction(function () use ($customer, $points, $note, $by) {
            $locked = Customer::query()->lockForUpdate()->findOrFail($customer->id);

            if ($locked->points_balance + $points < 0) {
                throw BusinessException::field('points', "Koreksi melebihi saldo poin ({$locked->points_balance}).");
            }

            $suffix = $by ? " (oleh {$by->name})" : '';
            $tx = $this->record($locked, Type::Adjust, $points, null, $note.$suffix, $points > 0 ? $this->expiryDate() : null);
            $locked->save();

            return $tx;
        });
    }

    /**
     * Kedaluwarsakan poin secara FIFO.
     *
     * Poin kredit (earn / adjust positif) diurutkan menurut tanggal kedaluwarsa. Semua debit
     * (redeem, expire, adjust negatif) dianggap memakai kredit tertua lebih dulu, sehingga
     * sisa poin yang sudah lewat masa berlaku = total kredit kedaluwarsa − total debit.
     */
    public function expireFor(Customer $customer): int
    {
        return DB::transaction(function () use ($customer) {
            $locked = Customer::query()->lockForUpdate()->findOrFail($customer->id);

            $expiredCredits = (int) $locked->loyaltyTransactions()
                ->whereIn('type', [Type::Earn, Type::Adjust])->where('points', '>', 0)
                ->whereNotNull('expires_at')->where('expires_at', '<=', now())
                ->sum('points');

            $debits = (int) -$locked->loyaltyTransactions()->where('points', '<', 0)->sum('points');

            $toExpire = min($locked->points_balance, max(0, $expiredCredits - $debits));

            if ($toExpire <= 0) {
                return 0;
            }

            $this->record($locked, Type::Expire, -$toExpire, null, 'Poin kedaluwarsa');
            $locked->save();

            return $toExpire;
        });
    }

    /** Dijalankan scheduler harian. Mengembalikan total poin yang kedaluwarsa. */
    public function expireAll(): int
    {
        $total = 0;

        Customer::query()
            ->where('points_balance', '>', 0)
            ->whereHas('loyaltyTransactions', fn ($q) => $q->where('points', '>', 0)->where('expires_at', '<=', now()))
            ->chunkById(200, function ($customers) use (&$total) {
                foreach ($customers as $customer) {
                    $total += $this->expireFor($customer);
                }
            });

        return $total;
    }

    /** Poin yang akan kedaluwarsa dalam N hari ke depan (untuk info pelanggan). */
    public function expiringSoon(Customer $customer, int $days = 30): int
    {
        $credits = (int) $customer->loyaltyTransactions()->where('points', '>', 0)
            ->whereNotNull('expires_at')->where('expires_at', '<=', now()->addDays($days))->sum('points');
        $debits = (int) -$customer->loyaltyTransactions()->where('points', '<', 0)->sum('points');

        return min($customer->points_balance, max(0, $credits - $debits));
    }

    private function record(Customer $customer, Type $type, int $points, ?Order $order, string $note, $expiresAt = null): LoyaltyTransaction
    {
        $customer->points_balance += $points;

        return LoyaltyTransaction::create([
            'customer_id' => $customer->id,
            'order_id' => $order?->id,
            'type' => $type,
            'points' => $points,
            'balance_after' => $customer->points_balance,
            'expires_at' => $expiresAt,
            'note' => $note,
        ]);
    }

    private function expiryDate()
    {
        return now()->addMonths(max(1, $this->settings->int('points_expiry_months')));
    }
}
