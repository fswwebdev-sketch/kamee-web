import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true">
      <rect width="40" height="40" rx="12" className="fill-primary" />
      <circle cx="20" cy="20" r="11" className="fill-cream" />
      <circle cx="20" cy="20" r="8" fill="#96663F" />
      <path d="M20 13.5c-3.2 0-5.4 2.3-5.4 4.8 0 2.7 2.6 4.6 5.4 7.2 2.8-2.6 5.4-4.5 5.4-7.2 0-2.5-2.2-4.8-5.4-4.8Z" className="fill-cream" />
      <path d="M20 16v10" stroke="#96663F" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 rounded-xl", className)}>
      <LogoMark />
      <span className={cn("font-heading text-lg font-bold tracking-tight", inverted ? "text-white" : "text-ink")}>
        Kamee<span className={inverted ? "text-cream" : "text-primary"}> Coffee</span>
      </span>
    </Link>
  );
}
