import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-4 md:mb-6", className)}>
      <div className="min-w-0">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-caption text-muted">
              {breadcrumb.map((b, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
                  {b.href ? <Link href={b.href} className="hover:text-ink hover:underline">{b.label}</Link> : <span aria-current="page">{b.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="font-heading text-2xl font-bold text-ink md:text-[1.75rem] md:leading-9">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface shadow-soft", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 md:px-5">
          <div>
            {title && <h2 className="font-heading text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-caption text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-4 md:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
