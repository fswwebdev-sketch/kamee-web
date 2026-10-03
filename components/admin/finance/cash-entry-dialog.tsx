"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/field";
import { applyServerErrors } from "@/lib/admin/form";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type BookMethod, type CashCategory, type CashEntry, type CashType } from "@/lib/admin/finance-types";
import { useSaveCashEntry } from "@/lib/admin/finance-queries";
import { MethodPicker, RupiahInput, Segmented, todayYmd } from "./shared";

const schema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi."),
    type: z.enum(["income", "expense"]),
    category: z.string().min(1, "Pilih kategori."),
    description: z.string().trim().min(2, "Keterangan minimal 2 karakter.").max(255, "Keterangan maksimal 255 karakter."),
    amount: z.number({ invalid_type_error: "Nominal wajib diisi.", required_error: "Nominal wajib diisi." }).int().min(1, "Nominal minimal Rp1.").nullable(),
    method: z.enum(["cash", "qris", "bank_transfer"]),
    bank: z.string().trim().max(50, "Nama bank maksimal 50 karakter."),
    counterparty: z.string().trim().max(100, "Maksimal 100 karakter."),
    note: z.string().trim().max(500, "Catatan maksimal 500 karakter."),
  })
  .superRefine((v, ctx) => {
    if (v.amount == null) ctx.addIssue({ code: "custom", path: ["amount"], message: "Nominal wajib diisi." });
    const cats = v.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!cats.some((c) => c.value === v.category)) ctx.addIssue({ code: "custom", path: ["category"], message: "Pilih kategori yang sesuai jenis." });
  });
type Values = z.infer<typeof schema>;

function defaults(entry: CashEntry | null, type: CashType): Values {
  if (entry)
    return {
      date: entry.date.slice(0, 10),
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      method: entry.method,
      bank: entry.bank ?? "",
      counterparty: entry.counterparty ?? "",
      note: entry.note ?? "",
    };
  return { date: todayYmd(), type, category: type === "income" ? "penjualan" : "operasional", description: "", amount: null, method: "cash", bank: "", counterparty: "", note: "" };
}

function CashEntryForm({ entry, initialType, onDone }: { entry: CashEntry | null; initialType: CashType; onDone: () => void }) {
  const save = useSaveCashEntry();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(entry, initialType) });
  const { register, handleSubmit, watch, setValue, setError, control, formState: { errors } } = form;
  const type = watch("type");
  const method = watch("method");
  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = handleSubmit((v) =>
    save.mutate(
      {
        id: entry?.id,
        body: {
          date: v.date,
          type: v.type,
          category: v.category as CashCategory,
          description: v.description,
          amount: v.amount!,
          method: v.method,
          bank: v.method === "bank_transfer" ? v.bank || null : null,
          counterparty: v.counterparty || null,
          note: v.note || null,
        },
      },
      { onSuccess: onDone, onError: (e) => applyServerErrors(e, setError, "Gagal menyimpan catatan kas") },
    ),
  );

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Segmented<CashType>
        label="Jenis"
        value={type}
        onChange={(t) => {
          setValue("type", t);
          const list = t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
          if (!list.some((c) => c.value === form.getValues("category"))) setValue("category", list[0]!.value);
        }}
        options={[
          { value: "income", label: "Uang masuk", icon: <ArrowDownCircle className="size-4 text-success" aria-hidden="true" /> },
          { value: "expense", label: "Uang keluar", icon: <ArrowUpCircle className="size-4 text-danger" aria-hidden="true" /> },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Tanggal" type="date" required error={errors.date?.message} {...register("date")} />
        <Select label="Kategori" required error={errors.category?.message} {...register("category")}>
          {cats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      </div>
      <Input label="Keterangan" required placeholder={type === "income" ? "mis. Penjualan — Nur" : "mis. Beli es batu"} maxLength={255} error={errors.description?.message} {...register("description")} />
      <Controller
        control={control}
        name="amount"
        render={({ field }) => <RupiahInput label="Nominal" required value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={errors.amount?.message} />}
      />
      <MethodPicker method={method} bank={watch("bank")} onMethod={(m: BookMethod) => setValue("method", m)} onBank={(b) => setValue("bank", b)} bankError={errors.bank?.message} />
      <Input label={type === "income" ? "Dari (opsional)" : "Dibayar ke (opsional)"} placeholder="Nama orang / toko" maxLength={100} error={errors.counterparty?.message} {...register("counterparty")} />
      <Textarea label="Catatan (opsional)" rows={2} maxLength={500} error={errors.note?.message} {...register("note")} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending}>{entry ? "Simpan perubahan" : "Simpan catatan"}</Button>
      </div>
    </form>
  );
}

export function CashEntryDialog({ open, entry, initialType = "expense", onClose }: { open: boolean; entry: CashEntry | null; initialType?: CashType; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={entry ? "Ubah catatan kas" : "Catat uang masuk/keluar"} size="md">
      {open && <CashEntryForm key={entry?.id ?? `new-${initialType}`} entry={entry} initialType={initialType} onDone={onClose} />}
    </Dialog>
  );
}
