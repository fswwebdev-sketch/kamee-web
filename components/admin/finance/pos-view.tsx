"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Coffee, Plus, Printer, ShoppingBag, Trash2 } from "lucide-react";
import { ProductThumb } from "@/components/admin/catalog/product-thumb";
import { SearchInput } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { printReceipt } from "@/components/admin/orders/order-actions";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { BOOK_METHOD_LABEL, type BookMethod, type PosResult } from "@/lib/admin/finance-types";
import { useCreatePosOrder } from "@/lib/admin/finance-queries";
import { errorMessage, useAdminList } from "@/lib/admin/queries";
import type { AdminProduct, Category, OptionGroup } from "@/lib/admin/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { MethodPicker, RupiahInput, Segmented, methodText } from "./shared";

const MAX_QTY = 50;

interface PosProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
  categoryId: number | null;
  groups: OptionGroup[];
}

interface CartLine {
  key: string;
  product: PosProduct;
  optionIds: number[];
  optionLabel: string;
  unitPrice: number;
  qty: number;
  note: string;
}

function lineKey(productId: number, optionIds: number[], note: string) {
  return `${productId}:${[...optionIds].sort((a, b) => a - b).join(",")}:${note.trim().toLowerCase()}`;
}

/** Produk aktif + grup opsi (daftar produk admin memuat option_group_ids, grup diambil dari /option-groups). */
function usePosCatalog() {
  const products = useAdminList<AdminProduct>("products", { per_page: 100, "filter[is_active]": 1, sort: "name" });
  const groups = useAdminList<OptionGroup>("option-groups");
  const categories = useAdminList<Category>("categories");
  const items = useMemo<PosProduct[]>(() => {
    const groupById = new Map((groups.data?.data ?? []).map((g) => [g.id, g]));
    return (products.data?.data ?? [])
      .filter((p) => p.is_active && !p.deleted_at)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.base_price,
        image: p.image_url,
        categoryId: p.category_id ?? p.category?.id ?? null,
        // Grup lengkap (beserta opsi) diambil dari /option-groups; option_groups di daftar produk bisa tanpa opsi.
        groups: (p.option_group_ids ?? p.option_groups?.map((g) => g.id) ?? [])
          .map((id) => groupById.get(id))
          .filter((g): g is OptionGroup => Boolean(g) && (g?.options?.length ?? 0) > 0),
      }));
  }, [products.data, groups.data]);
  return {
    items,
    categories: (categories.data?.data ?? []).filter((c) => c.is_active !== false),
    loading: products.isLoading || groups.isLoading,
    error: products.isError || groups.isError,
    retry: () => {
      products.refetch();
      groups.refetch();
    },
  };
}

export function PosView() {
  const catalog = usePosCatalog();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [category, setCategory] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [picking, setPicking] = useState<PosProduct | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [result, setResult] = useState<PosResult | null>(null);
  // Isian pembayaran disimpan di sini agar tidak hilang saat sheet keranjang (ponsel) ditutup-buka
  const [pay, setPayState] = useState<PayState>(INITIAL_PAY);
  const setPay = (patch: Partial<PayState>) => setPayState((p) => ({ ...p, ...patch }));

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return catalog.items.filter((p) => (category == null || p.categoryId === category) && (!term || p.name.toLowerCase().includes(term)));
  }, [catalog.items, category, q]);

  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  const addLine = (product: PosProduct, optionIds: number[], qty: number, note: string) => {
    const options = product.groups.flatMap((g) => g.options).filter((o) => optionIds.includes(o.id));
    const unitPrice = product.price + options.reduce((s, o) => s + o.price_delta, 0);
    const key = lineKey(product.id, optionIds, note);
    setCart((c) => {
      const hit = c.find((l) => l.key === key);
      if (hit) return c.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
      return [...c, { key, product, optionIds, optionLabel: options.map((o) => o.name).join(", "), unitPrice, qty, note: note.trim() }];
    });
    toast.success(`${product.name}${options.length ? ` (${options.map((o) => o.name).join(", ")})` : ""} ×${qty} masuk keranjang`);
  };

  const onPick = (p: PosProduct) => {
    if (p.groups.length === 0) addLine(p, [], 1, "");
    else setPicking(p);
  };

  const panel = (
    <CartPanel
      cart={cart}
      total={total}
      pay={pay}
      setPay={setPay}
      onQty={(key, qty) => setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))))}
      onClear={() => setCart([])}
      onSuccess={(res) => {
        setResult(res);
        setCart([]);
        setCartOpen(false);
      }}
    />
  );

  return (
    <>
      <PageHeader title="Kasir" description="Catat pesanan yang dibayar langsung di outlet. Stok bahan terpotong otomatis sesuai resep." />

      <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start", !isDesktop && cart.length > 0 && "pb-24")}>
        <section aria-label="Menu" className="min-w-0">
          <div className="mb-3 flex flex-col gap-3">
            <SearchInput value={q} onChange={setQ} placeholder="Cari menu…" label="Cari menu" className="sm:max-w-none" />
            <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter kategori">
              <Chip selected={category == null} onClick={() => setCategory(null)}>Semua</Chip>
              {catalog.categories.map((c) => (
                <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Chip>
              ))}
            </div>
          </div>

          {catalog.error ? (
            <ErrorState description="Menu tidak dapat dimuat." onRetry={catalog.retry} />
          ) : catalog.loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState illustration={<Coffee className="size-10 text-muted" aria-hidden="true" />} title="Menu tidak ditemukan" description="Coba kata kunci atau kategori lain." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((p) => {
                const inCart = cart.filter((l) => l.product.id === p.id).reduce((s, l) => s + l.qty, 0);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPick(p)}
                      aria-label={`${p.name}, ${formatRupiah(p.price)}${inCart ? `, ${inCart} di keranjang` : ""}`}
                      className="relative flex h-full w-full flex-col gap-2 rounded-2xl border border-line bg-surface p-3 text-left shadow-soft transition hover:border-primary active:scale-[.98]"
                    >
                      <ProductThumb src={p.image} alt="" className="aspect-square size-auto w-full" sizes="(min-width: 1280px) 200px, 45vw" />
                      <span className="line-clamp-2 text-sm font-semibold text-ink">{p.name}</span>
                      <span className="mt-auto text-sm font-semibold text-primary tabular-nums">
                        {formatRupiah(p.price)}
                        {p.groups.some((g) => g.options.some((o) => o.price_delta > 0)) && <span className="font-normal text-muted"> +</span>}
                      </span>
                      {inCart > 0 && (
                        <span aria-hidden="true" className="absolute right-2 top-2 grid min-w-7 place-items-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">
                          {inCart}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {isDesktop && (
          <aside aria-label="Keranjang kasir" className="sticky top-20 flex max-h-[calc(100svh-6rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <h2 className="border-b border-line px-4 py-3.5 font-heading text-base font-semibold text-ink">
              Keranjang {count > 0 && <span className="text-muted">· {formatNumber(count)} item</span>}
            </h2>
            <div className="flex-1 overflow-y-auto p-4">{panel}</div>
          </aside>
        )}
      </div>

      {!isDesktop && cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift backdrop-blur md:left-[72px]">
          <button type="button" onClick={() => setCartOpen(true)} className="flex h-12 w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 font-semibold text-on-primary">
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden="true" /> {formatNumber(count)} item
            </span>
            <span className="tabular-nums">Bayar {formatRupiah(total)}</span>
          </button>
        </div>
      )}

      {!isDesktop && (
        <Dialog open={cartOpen} onClose={() => setCartOpen(false)} title="Keranjang" description={`${formatNumber(count)} item · ${formatRupiah(total)}`} size="md">
          {panel}
        </Dialog>
      )}

      <OptionDialog product={picking} onClose={() => setPicking(null)} onAdd={(ids, qty, note) => picking && addLine(picking, ids, qty, note)} />
      <SuccessDialog result={result} onClose={() => setResult(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ Pilih opsi */

function OptionDialog({ product, onClose, onAdd }: { product: PosProduct | null; onClose: () => void; onAdd: (optionIds: number[], qty: number, note: string) => void }) {
  return (
    <Dialog open={Boolean(product)} onClose={onClose} title={product?.name ?? ""} description={product ? `Harga dasar ${formatRupiah(product.price)}` : undefined} size="sm">
      {product && <OptionForm key={product.id} product={product} onClose={onClose} onAdd={onAdd} />}
    </Dialog>
  );
}

function OptionForm({ product, onClose, onAdd }: { product: PosProduct; onClose: () => void; onAdd: (optionIds: number[], qty: number, note: string) => void }) {
  // Grup wajib pilihan tunggal → opsi pertama terpilih (mis. Cup)
  const [selected, setSelected] = useState<Record<number, number[]>>(() =>
    Object.fromEntries(product.groups.map((g) => [g.id, g.type === "single" && g.is_required ? [[...g.options].sort((a, b) => a.sort_order - b.sort_order)[0]!.id] : []])),
  );
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const ids = Object.values(selected).flat();
  const missing = product.groups.filter((g) => g.is_required && (selected[g.id]?.length ?? 0) === 0);
  const unit = product.price + product.groups.flatMap((g) => g.options).filter((o) => ids.includes(o.id)).reduce((s, o) => s + o.price_delta, 0);

  const submit = () => {
    setTouched(true);
    if (missing.length) return;
    onAdd(ids, qty, note);
    onClose();
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {product.groups.map((g) => {
        const err = touched && missing.includes(g);
        return (
          <fieldset key={g.id} className="flex flex-col gap-2" aria-describedby={err ? `opt-${g.id}-err` : undefined}>
            <legend className="mb-2 text-sm font-semibold text-ink">
              {g.name} {g.is_required ? <span className="font-normal text-muted">(wajib)</span> : <span className="font-normal text-muted">(opsional)</span>}
            </legend>
            {[...g.options]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((o) => (
                <ChoiceCard
                  key={o.id}
                  name={`grp-${g.id}`}
                  value={String(o.id)}
                  type={g.type === "multi" ? "checkbox" : "radio"}
                  checked={selected[g.id]?.includes(o.id) ?? false}
                  onChange={(_, checked) =>
                    setSelected((s) => ({
                      ...s,
                      [g.id]: g.type === "multi" ? (checked ? [...(s[g.id] ?? []), o.id] : (s[g.id] ?? []).filter((x) => x !== o.id)) : [o.id],
                    }))
                  }
                  title={o.name}
                  description={formatRupiah(product.price + o.price_delta)}
                  trailing={o.price_delta > 0 ? <span className="text-caption font-semibold text-primary">+{formatRupiah(o.price_delta)}</span> : undefined}
                  className="py-2.5"
                />
              ))}
            {err && <p id={`opt-${g.id}-err`} role="alert" className="text-caption text-danger">Pilih {g.name.toLowerCase()} terlebih dahulu.</p>}
          </fieldset>
        );
      })}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">Jumlah</span>
        <QuantityStepper value={qty} onChange={(v) => setQty(Math.max(1, Math.min(MAX_QTY, v)))} label={product.name} max={MAX_QTY} />
      </div>
      <Input label="Catatan item (opsional)" placeholder="mis. less sugar, es dipisah" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />

      <Button type="submit" size="lg" className="w-full">
        <Plus className="size-4" aria-hidden="true" /> Tambah ke keranjang · {formatRupiah(unit * qty)}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ Keranjang & bayar */

interface PayState {
  customer: string;
  fulfillment: "dine_in" | "pickup";
  method: BookMethod;
  bank: string;
  received: number | null;
  note: string;
}
const INITIAL_PAY: PayState = { customer: "", fulfillment: "dine_in", method: "cash", bank: "", received: null, note: "" };

function CartPanel({
  cart,
  total,
  pay,
  setPay,
  onQty,
  onClear,
  onSuccess,
}: {
  cart: CartLine[];
  total: number;
  pay: PayState;
  setPay: (patch: Partial<PayState>) => void;
  onQty: (key: string, qty: number) => void;
  onClear: () => void;
  onSuccess: (res: PosResult) => void;
}) {
  const create = useCreatePosOrder();
  const { customer, fulfillment, method, bank, received, note } = pay;
  const setCustomer = (v: string) => setPay({ customer: v });
  const setFulfillment = (v: PayState["fulfillment"]) => setPay({ fulfillment: v });
  const setMethod = (v: BookMethod) => setPay({ method: v });
  const setBank = (v: string) => setPay({ bank: v });
  const setReceived = (v: number | null) => setPay({ received: v });
  const setNote = (v: string) => setPay({ note: v });
  const [error, setError] = useState<string | null>(null);

  const change = received != null ? received - total : 0;
  const short = method === "cash" && received != null && received < total;
  const quick = useMemo(() => {
    const opts = [20_000, 50_000, 100_000].filter((n) => n > total);
    // Pecahan berikutnya di atas total (mis. total Rp134.000 → Rp150.000)
    if (!opts.length && total > 0) opts.push(Math.ceil(total / 50_000) * 50_000 === total ? total + 50_000 : Math.ceil(total / 50_000) * 50_000);
    return opts;
  }, [total]);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <ShoppingBag className="size-10 text-muted" aria-hidden="true" />
        <p className="font-heading font-semibold text-ink">Keranjang kosong</p>
        <p className="max-w-60 text-sm text-muted">Ketuk menu di sebelah kiri untuk menambahkan pesanan.</p>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    if (short) {
      setError(`Uang diterima kurang ${formatRupiah(total - (received ?? 0))}.`);
      return;
    }
    if (method === "bank_transfer" && !bank.trim()) {
      setError("Isi nama bank untuk pembayaran transfer.");
      return;
    }
    create.mutate(
      {
        items: cart.map((l) => ({ product_id: l.product.id, qty: l.qty, option_ids: l.optionIds, note: l.note || null })),
        customer_name: customer.trim() || null,
        fulfillment,
        payment_method: method,
        bank: method === "bank_transfer" ? bank.trim() : null,
        cash_received: method === "cash" ? (received ?? total) : null,
        note: note.trim() || null,
      },
      {
        onSuccess: (res) => {
          setPay({ customer: "", note: "", received: null, bank: "" });
          onSuccess(res);
        },
        onError: (e) => {
          const msg = errorMessage(e);
          setError(msg);
          toast.error("Pesanan gagal disimpan", { description: msg });
        },
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <ul className="flex flex-col divide-y divide-line" aria-label="Item di keranjang">
        {cart.map((l) => {
          const label = `${l.product.name}${l.optionLabel ? ` (${l.optionLabel})` : ""}`;
          return (
            <li key={l.key} className="flex flex-col gap-2 py-3 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{l.product.name}</p>
                  {l.optionLabel && <p className="text-caption text-muted">{l.optionLabel}</p>}
                  {l.note && <p className="text-caption italic text-muted">“{l.note}”</p>}
                </div>
                <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">{formatRupiah(l.unitPrice * l.qty)}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-muted tabular-nums">@ {formatRupiah(l.unitPrice)}</span>
                <QuantityStepper value={l.qty} onChange={(v) => onQty(l.key, v)} label={label} size="sm" removable max={MAX_QTY} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-line pt-3">
        <button type="button" onClick={onClear} className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-danger hover:bg-danger/10 md:h-9">
          <Trash2 className="size-4" aria-hidden="true" /> Kosongkan
        </button>
        <p className="text-right">
          <span className="block text-caption text-muted">Total</span>
          <span className="font-heading text-xl font-bold text-ink tabular-nums" data-testid="pos-total">{formatRupiah(total)}</span>
        </p>
      </div>

      <Segmented
        label="Layanan"
        value={fulfillment}
        onChange={setFulfillment}
        options={[
          { value: "dine_in", label: "Makan di tempat" },
          { value: "pickup", label: "Bawa pulang" },
        ]}
      />
      <Input label="Nama pembeli (opsional)" placeholder="Pembeli langsung" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={100} autoComplete="off" />

      <MethodPicker method={method} bank={bank} onMethod={setMethod} onBank={setBank} />

      {method === "cash" && (
        <div className="flex flex-col gap-2">
          <RupiahInput label="Uang diterima" placeholder={new Intl.NumberFormat("id-ID").format(total)} value={received} onValueChange={setReceived} hint="Kosongkan bila uang pas." />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Nominal cepat">
            <QuickCash active={received === total} onClick={() => setReceived(total)}>Uang pas</QuickCash>
            {quick.map((n) => (
              <QuickCash key={n} active={received === n} onClick={() => setReceived(n)}>{formatRupiah(n)}</QuickCash>
            ))}
          </div>
          <div className={cn("flex items-center justify-between rounded-xl border p-3", short ? "border-danger/40 bg-danger/5" : "border-line bg-cream/60")} aria-live="polite">
            <span className="text-sm font-medium text-ink">{short ? "Kurang" : "Kembalian"}</span>
            <span className={cn("font-heading text-lg font-bold tabular-nums", short ? "text-danger" : "text-ink")} data-testid="pos-change">
              {formatRupiah(Math.abs(received == null ? 0 : change))}
            </span>
          </div>
        </div>
      )}

      <Input label="Catatan pesanan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={create.isPending} disabled={short}>
        Bayar {formatRupiah(total)}
      </Button>
    </form>
  );
}

function QuickCash({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("h-11 rounded-lg px-3.5 text-sm font-semibold tabular-nums transition md:h-9", active ? "bg-primary text-on-primary" : "bg-cream text-ink hover:bg-line")}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Berhasil */

function SuccessDialog({ result, onClose }: { result: PosResult | null; onClose: () => void }) {
  const [last, setLast] = useState<PosResult | null>(null);
  if (result && result !== last) setLast(result);
  const r = result ?? last;
  const order = r?.data;
  const method = (order?.payment?.method ?? "cash") as BookMethod;
  return (
    <Dialog
      open={Boolean(result)}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          Pesanan tersimpan
        </span>
      }
      description={r?.message}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {order && (
            <Button variant="outline" onClick={() => printReceipt(order.id)}>
              <Printer className="size-4" aria-hidden="true" /> Cetak struk
            </Button>
          )}
          <Button onClick={onClose} data-autofocus>
            <Plus className="size-4" aria-hidden="true" /> Pesanan baru
          </Button>
        </div>
      }
    >
      {order && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Kode pesanan</dt>
          <dd className="text-right font-mono font-semibold text-ink">{order.code}</dd>
          <dt className="text-muted">Pembeli</dt>
          <dd className="text-right text-ink">{order.customer_name}</dd>
          <dt className="text-muted">Metode</dt>
          <dd className="text-right text-ink">{BOOK_METHOD_LABEL[method] ? methodText(method, (order.payment as { bank?: string | null } | null)?.bank) : order.payment?.method_label}</dd>
          <dt className="text-muted">Total</dt>
          <dd className="text-right font-heading text-lg font-bold text-ink tabular-nums">{formatRupiah(order.total)}</dd>
          {method === "cash" && (
            <>
              <dt className="self-center text-muted">Kembalian</dt>
              <dd className="text-right font-heading text-2xl font-bold text-primary tabular-nums" data-testid="pos-result-change">{formatRupiah(r?.change ?? 0)}</dd>
            </>
          )}
        </dl>
      )}
    </Dialog>
  );
}
