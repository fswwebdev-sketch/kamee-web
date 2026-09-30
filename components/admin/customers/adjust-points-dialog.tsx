"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { applyServerErrors } from "@/lib/admin/form";
import { useAdminSave } from "@/lib/admin/queries";
import type { AdminCustomer } from "@/lib/admin/types";
import type { LoyaltyTransaction } from "@/types/api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX = 100_000;

const schema = z.object({
  direction: z.enum(["add", "subtract"]),
  amount: z
    .string()
    .trim()
    .min(1, "Jumlah poin wajib diisi.")
    .pipe(
      z.coerce
        .number({ invalid_type_error: "Jumlah poin harus angka." })
        .int("Jumlah poin harus bilangan bulat.")
        .min(1, "Jumlah poin minimal 1.")
        .max(MAX, `Jumlah poin maksimal ${formatNumber(MAX)}.`),
    ),
  note: z.string().trim().min(3, "Catatan wajib diisi (minimal 3 karakter).").max(255, "Catatan maksimal 255 karakter."),
});
type Input = z.input<typeof schema>;
type Output = z.output<typeof schema>;

function AdjustForm({ customer, onDone }: { customer: AdminCustomer; onDone: () => void }) {
  const save = useAdminSave<LoyaltyTransaction>("customers");
  const form = useForm<Input, unknown, Output>({ resolver: zodResolver(schema), defaultValues: { direction: "add", amount: "", note: "" } });
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = form;

  const direction = watch("direction");
  const rawAmount = Number(watch("amount"));
  const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? Math.floor(rawAmount) : 0;
  const delta = direction === "add" ? amount : -amount;
  const after = customer.points_balance + delta;
  const overdraw = after < 0;

  // Backend memakai field "points"; di form dipetakan ke "amount".
  const setServerError: UseFormSetError<Input> = (field, err, opt) => setError(String(field) === "points" ? "amount" : field, err, opt);

  const submit = handleSubmit(async (v) => {
    const points = v.direction === "add" ? v.amount : -v.amount;
    if (customer.points_balance + points < 0) {
      setError("amount", { type: "manual", message: `Pengurangan melebihi saldo poin (${formatNumber(customer.points_balance)}).` });
      return;
    }
    const { ok } = await confirm({
      title: `${points > 0 ? "Tambah" : "Kurangi"} ${formatNumber(Math.abs(points))} poin?`,
      description: `Saldo ${customer.name} berubah dari ${formatNumber(customer.points_balance)} menjadi ${formatNumber(customer.points_balance + points)} poin. Koreksi tercatat di riwayat poin dan tidak dapat dihapus.`,
      confirmLabel: "Simpan koreksi",
      tone: points < 0 ? "danger" : "primary",
    });
    if (!ok) return;
    save.mutate(
      { path: `customers/${customer.id}/points-adjust`, method: "POST", body: { points, note: v.note } },
      { onSuccess: onDone, onError: (e) => applyServerErrors(e, setServerError, "Gagal mengoreksi poin") },
    );
  });

  const segment = (value: "add" | "subtract", label: string, Icon: typeof Plus) => (
    <button
      type="button"
      role="radio"
      aria-checked={direction === value}
      onClick={() => setValue("direction", value)}
      className={cn(
        "flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
        direction === value ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink",
      )}
    >
      <Icon className="size-4" aria-hidden="true" /> {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div>
        <p id="adjust-dir" className="mb-1.5 text-sm font-medium text-ink">Jenis koreksi</p>
        <div role="radiogroup" aria-labelledby="adjust-dir" className="flex gap-1 rounded-xl bg-cream p-1">
          {segment("add", "Tambah poin", Plus)}
          {segment("subtract", "Kurangi poin", Minus)}
        </div>
      </div>
      <Input
        label="Jumlah poin"
        required
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX}
        step={1}
        error={errors.amount?.message}
        hint={`Antara 1 dan ${formatNumber(MAX)} poin.`}
        {...register("amount")}
        autoFocus
      />
      <Textarea
        label="Catatan"
        required
        rows={3}
        maxLength={255}
        placeholder="mis. Kompensasi pesanan terlambat"
        hint="Wajib — tampil di riwayat poin pelanggan."
        error={errors.note?.message}
        {...register("note")}
      />
      <div className={cn("rounded-xl border p-3.5 text-sm", overdraw ? "border-danger/40 bg-danger/5" : "border-line bg-cream/60")} aria-live="polite">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted">Pratinjau saldo</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 tabular-nums text-ink">
          <span>{formatNumber(customer.points_balance)}</span>
          <span className={cn("font-semibold", delta > 0 && "text-success", delta < 0 && "text-danger")}>
            {delta >= 0 ? "+" : "−"} {formatNumber(Math.abs(delta))}
          </span>
          <span aria-hidden="true">→</span>
          <span className="font-heading text-lg font-bold">{formatNumber(after)} poin</span>
        </p>
        {overdraw && <p className="mt-1 text-caption text-danger">Saldo tidak boleh negatif.</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending} disabled={overdraw}>Simpan koreksi</Button>
      </div>
    </form>
  );
}

export function AdjustPointsDialog({ customer, open, onClose }: { customer: AdminCustomer; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Koreksi poin" description={`${customer.name} · saldo saat ini ${formatNumber(customer.points_balance)} poin`} size="sm">
      {open && <AdjustForm customer={customer} onDone={onClose} />}
    </Dialog>
  );
}
