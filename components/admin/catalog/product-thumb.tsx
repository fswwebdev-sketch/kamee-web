import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Thumbnail produk persegi. `unoptimized`: gambar dari storage API (AVIF/WebP) atau blob pratinjau lokal. */
export function ProductThumb({ src, alt, className, sizes = "48px" }: { src: string | null | undefined; alt: string; className?: string; sizes?: string }) {
  return (
    <div className={cn("relative size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-cream", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} unoptimized className="object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-muted" role="img" aria-label={`${alt} (tanpa gambar)`}>
          <ImageOff className="size-5" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
