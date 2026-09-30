import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-primary font-heading text-sm font-semibold text-on-primary", className)}>
      {initials || "K"}
    </span>
  );
}
