import Link from "next/link";
import { Clock, Mail, MapPin } from "lucide-react";
import { env } from "@/lib/env";
import { formatHour } from "@/lib/format";
import type { Outlet } from "@/types/api";
import { Logo } from "./logo";
import { InstagramIcon, TikTokIcon } from "./social-icons";
import { WhatsAppIcon } from "./whatsapp-float";

export function Footer({ outlets }: { outlets: Outlet[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-surface pb-24 md:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">Kopi berkualitas, suasana nyaman, dan camilan lezat untuk menemani harimu di Tangerang.</p>
          <div className="flex gap-2">
            {[
              { href: env.instagram, label: "Instagram Kamee Coffee", Icon: InstagramIcon },
              { href: env.tiktok, label: "TikTok Kamee Coffee", Icon: TikTokIcon },
              { href: `https://wa.me/${env.whatsappNumber}`, label: "WhatsApp Kamee Coffee", Icon: WhatsAppIcon },
            ].map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-full bg-cream text-ink transition hover:bg-primary hover:text-on-primary">
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-ink">Jelajahi</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted md:grid-cols-1">
            {[["/menu", "Menu"], ["/promo", "Promo"], ["/pesanan", "Lacak Pesanan"], ["/tentang", "Tentang Kami"], ["/blog", "Blog"], ["/kontak", "Kontak"]].map(([href, label]) => (
              <li key={href}><Link href={href!} className="rounded hover:text-primary">{label}</Link></li>
            ))}
          </ul>
        </div>
        {outlets.slice(0, 2).map((o) => (
          <div key={o.id}>
            <h2 className="font-heading text-base font-semibold text-ink">{o.name}</h2>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted">
              <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{o.address}</li>
              <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />Setiap hari {formatHour(o.open_time)}–{formatHour(o.close_time)} WIB</li>
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-caption text-muted md:flex-row md:items-center md:justify-between">
          <p>© {year} Kamee Coffee. Dibuat dengan ☕ di Tangerang.</p>
          <a href={`mailto:${env.email}`} className="inline-flex items-center gap-1.5 hover:text-primary"><Mail className="size-4" aria-hidden="true" />{env.email}</a>
        </div>
      </div>
    </footer>
  );
}
