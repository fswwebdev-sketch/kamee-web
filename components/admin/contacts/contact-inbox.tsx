"use client";

import { ArrowLeft, CheckCheck, ChevronLeft, ChevronRight, Inbox, Mail, MessageCircle, Phone } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { useTableParams } from "@/components/admin/ui/use-table-params";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { errorMessage, useAdminItem, useAdminList, useAdminSave } from "@/lib/admin/queries";
import type { Contact, ContactStatus, Paginated } from "@/lib/admin/types";
import { formatDate, formatDateTime, formatPhone, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS: Record<ContactStatus, { label: string; tone: Tone }> = {
  new: { label: "Baru", tone: "warning" },
  read: { label: "Dibaca", tone: "neutral" },
  replied: { label: "Dibalas", tone: "success" },
};

const TABS = [
  { id: "", label: "Semua" },
  { id: "new", label: "Baru" },
  { id: "read", label: "Dibaca" },
  { id: "replied", label: "Dibalas" },
];

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  const today = formatDate(new Date(), { day: "numeric", month: "numeric", year: "numeric" });
  return formatDate(d, { day: "numeric", month: "numeric", year: "numeric" }) === today
    ? formatDate(d, { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":")
    : formatDate(d, { day: "numeric", month: "short" });
}

function MessageList({
  items,
  selectedId,
  onSelect,
  loading,
}: {
  items: Contact[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <ul className="divide-y divide-line" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="space-y-2 p-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-56" /><Skeleton className="h-3 w-full" /></li>
        ))}
      </ul>
    );
  }
  if (!items.length) {
    return <EmptyState className="py-14" title="Tidak ada pesan" description="Pesan dari formulir Kontak di website muncul di sini." />;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => {
        const active = c.id === selectedId;
        const unread = c.status === "new";
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "relative block w-full px-4 py-3.5 text-left transition hover:bg-cream/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                active && "bg-cream",
              )}
            >
              {active && <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />}
              <div className="flex items-baseline justify-between gap-3">
                <p className={cn("flex min-w-0 items-center gap-2 text-sm text-ink", unread ? "font-bold" : "font-medium")}>
                  {unread && <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />}
                  <span className="truncate">{c.name}</span>
                  {unread && <span className="sr-only">(belum dibaca)</span>}
                </p>
                <time dateTime={c.created_at} className="shrink-0 text-caption text-muted">{shortDate(c.created_at)}</time>
              </div>
              <p className={cn("mt-0.5 truncate text-sm", unread ? "font-semibold text-ink" : "text-ink/85")}>{c.subject}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-caption text-muted">{c.message}</p>
                {c.status === "replied" && <CheckCheck className="size-3.5 shrink-0 text-success" aria-label="Sudah dibalas" />}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MessageDetail({ id, fallback, onBack }: { id: number; fallback?: Contact; onBack: () => void }) {
  const item = useAdminItem<Contact>("contacts", id);
  const save = useAdminSave<Contact>("contacts", { silent: true });
  const marked = useRef(new Set<number>());
  const contact = item.data ?? fallback;

  // Membuka pesan baru → otomatis tandai "Dibaca".
  useEffect(() => {
    if (!contact || contact.status !== "new" || marked.current.has(contact.id)) return;
    marked.current.add(contact.id);
    save.mutate({ id: contact.id, body: { status: "read" } }, { onError: (e) => toast.error("Gagal menandai pesan dibaca", { description: errorMessage(e) }) });
  }, [contact, save]);

  if (item.isError && !contact) return <div className="p-6"><ErrorState onRetry={() => item.refetch()} /></div>;
  if (!contact) {
    return (
      <div className="space-y-3 p-5 md:p-6" aria-busy="true">
        <Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const greeting = `Halo ${contact.name},\n\nTerima kasih telah menghubungi Kamee Coffee.\n\n`;
  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}&body=${encodeURIComponent(greeting)}`;
  const wa = contact.phone ? `https://wa.me/${normalizePhone(contact.phone)}?text=${encodeURIComponent(`${greeting.trim()} Menanggapi pesan Anda tentang "${contact.subject}": `)}` : null;

  const markReplied = () =>
    save.mutate(
      { id: contact.id, body: { status: "replied" } },
      {
        onSuccess: () => toast.success("Pesan ditandai sudah dibalas"),
        onError: (e) => toast.error("Gagal memperbarui status", { description: errorMessage(e) }),
      },
    );

  return (
    <article className="flex h-full flex-col" aria-labelledby="contact-subject">
      <header className="border-b border-line p-4 md:p-5">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink lg:hidden">
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke daftar
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="contact-subject" className="min-w-0 font-heading text-xl font-semibold text-ink [overflow-wrap:anywhere]">{contact.subject}</h2>
          <ContactStatusBadge status={contact.status} />
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <div className="flex gap-2"><dt className="text-muted">Dari</dt><dd className="font-semibold text-ink">{contact.name}</dd></div>
          <div className="flex gap-2"><dt className="text-muted">Diterima</dt><dd className="text-ink">{formatDateTime(contact.created_at)}</dd></div>
          <div className="flex min-w-0 gap-2">
            <dt className="text-muted"><Mail className="size-4 translate-y-0.5" aria-label="Email" /></dt>
            <dd className="min-w-0 truncate"><a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></dd>
          </div>
          {contact.phone && (
            <div className="flex gap-2">
              <dt className="text-muted"><Phone className="size-4 translate-y-0.5" aria-label="Telepon" /></dt>
              <dd className="tabular-nums text-ink">{formatPhone(contact.phone)}</dd>
            </div>
          )}
        </dl>
      </header>
      <div className="flex-1 p-4 md:p-5">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">{contact.message}</p>
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-line p-4 md:px-5">
        <a href={mailto} className={buttonClasses("primary", "sm")}><Mail className="size-4" aria-hidden="true" /> Balas via email</a>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "sm")}>
            <MessageCircle className="size-4" aria-hidden="true" /> Balas via WhatsApp
          </a>
        )}
        {contact.status !== "replied" ? (
          <Button variant="outline" size="sm" onClick={markReplied} loading={save.isPending} className="sm:ml-auto">
            <CheckCheck className="size-4" aria-hidden="true" /> Tandai sudah dibalas
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success sm:ml-auto"><CheckCheck className="size-4" aria-hidden="true" /> Sudah dibalas</span>
        )}
      </footer>
    </article>
  );
}

export function ContactInbox() {
  const { params, update } = useTableParams({ perPage: 20, filterKeys: ["status", "pesan"] });
  const status = params.filters.status ?? "";
  const selectedId = params.filters.pesan ? Number(params.filters.pesan) : null;

  const query = useMemo(() => ({ page: params.page, per_page: params.perPage, "filter[status]": status || undefined }), [params.page, params.perPage, status]);
  const list = useAdminList<Contact>("contacts", query);
  const page = list.data as Paginated<Contact> | undefined;
  const items = page?.data ?? [];
  const meta = page?.meta;

  const select = (id: number | null) => update({ page: params.page, filters: { pesan: id == null ? null : String(id) } });

  return (
    <>
      <PageHeader title="Pesan Masuk" description="Pesan dari formulir Kontak di website." breadcrumb={[{ label: "Pelanggan" }, { label: "Pesan Masuk" }]} />
      <Tabs
        label="Filter status pesan"
        items={TABS}
        value={status}
        onChange={(v) => update({ filters: { status: v, pesan: null } })}
        className="mb-4 w-fit max-w-full"
      />
      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : (
        <div className="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:min-h-[560px] lg:grid-cols-[minmax(300px,380px)_1fr]">
          <section aria-label="Daftar pesan" className={cn("flex min-w-0 flex-col lg:border-r lg:border-line", selectedId != null && "hidden lg:flex")}>
            <div className={cn("flex-1", list.isFetching && !list.isPending && "opacity-70 transition-opacity")}>
              <MessageList items={items} selectedId={selectedId} onSelect={select} loading={list.isPending} />
            </div>
            {meta && meta.last_page > 1 && (
              <nav aria-label="Halaman pesan" className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-caption text-muted">
                <span>Hal. {meta.page} dari {meta.last_page} · {meta.total} pesan</span>
                <span className="flex gap-1">
                  <button type="button" aria-label="Halaman sebelumnya" disabled={meta.page <= 1} onClick={() => update({ page: meta.page - 1 })} className="grid size-9 place-items-center rounded-lg hover:bg-cream disabled:opacity-40">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button type="button" aria-label="Halaman berikutnya" disabled={meta.page >= meta.last_page} onClick={() => update({ page: meta.page + 1 })} className="grid size-9 place-items-center rounded-lg hover:bg-cream disabled:opacity-40">
                    <ChevronRight className="size-4" />
                  </button>
                </span>
              </nav>
            )}
          </section>
          <section aria-label="Isi pesan" className={cn("min-w-0", selectedId == null && "hidden lg:block")}>
            {selectedId != null ? (
              <MessageDetail key={selectedId} id={selectedId} fallback={items.find((c) => c.id === selectedId)} onBack={() => select(null)} />
            ) : (
              <div className="grid h-full place-items-center p-10 text-center">
                <div>
                  <Inbox className="mx-auto size-10 text-muted" aria-hidden="true" />
                  <p className="mt-3 font-heading font-semibold text-ink">Pilih pesan</p>
                  <p className="mt-1 text-sm text-muted">Isi pesan akan tampil di sini.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
