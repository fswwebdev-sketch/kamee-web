import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">{eyebrow}</p>}
        <Heading className={cn("mt-2 text-ink", Heading === "h1" ? "text-h1" : "text-h2")}>{title}</Heading>
        {description && <p className="mt-3 text-body-lg text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ illustration, title, description, action, className }: { illustration?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center", className)}>
      {illustration}
      <h2 className="text-h3 text-ink">{title}</h2>
      {description && <p className="max-w-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Gagal memuat data", description = "Periksa koneksi internet Anda lalu coba lagi.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-3xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <p className="font-heading text-lg font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover">
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Breadcrumb({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-caption text-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {it.href ? (
              <Link href={it.href} className="rounded hover:text-primary">{it.label}</Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">{it.label}</span>
            )}
            {i < items.length - 1 && <ChevronRight className="size-3.5" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Ilustrasi cangkir kosong untuk empty state keranjang. */
export function EmptyCupIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" className={cn("h-32 w-36", className)} aria-hidden="true" fill="none">
      <ellipse cx="80" cy="124" rx="62" ry="10" className="fill-cream" />
      <path d="M36 52h80l-8 58a14 14 0 0 1-14 12H58a14 14 0 0 1-14-12l-8-58Z" className="fill-surface stroke-line" strokeWidth="4" />
      <path d="M116 64h8a14 14 0 0 1 0 28h-11" className="stroke-line" strokeWidth="6" strokeLinecap="round" />
      <path d="M62 30c0-8 8-8 8-16M82 32c0-8 8-8 8-16" className="stroke-primary/40" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 82c6 6 30 6 36 0" className="stroke-muted/50" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
