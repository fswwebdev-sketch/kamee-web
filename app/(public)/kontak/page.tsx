import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { ContactForm } from "@/components/content/contact-form";
import { MapEmbed } from "@/components/content/map-embed";
import { InstagramIcon, TikTokIcon } from "@/components/layout/social-icons";
import { WhatsAppIcon } from "@/components/layout/whatsapp-float";
import { Breadcrumb, SectionHeader } from "@/components/ui/misc";
import { getOutlets } from "@/lib/data";
import { env } from "@/lib/env";
import { formatPhone } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { waLink } from "@/lib/whatsapp";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Kontak",
  description: "Hubungi Kamee Coffee lewat WhatsApp, Instagram, TikTok, email, atau form kontak untuk pesanan besar, kerja sama, dan masukan.",
  path: "/kontak",
});

export default async function ContactPage() {
  const outlets = await getOutlets();
  const main = outlets[0];
  const channels = [
    { href: waLink("Halo Kamee Coffee 👋"), label: "WhatsApp", value: formatPhone(env.whatsappNumber), Icon: WhatsAppIcon },
    { href: env.instagram, label: "Instagram", value: `@${env.instagram.split("/").filter(Boolean).pop()}`, Icon: InstagramIcon },
    { href: env.tiktok, label: "TikTok", value: env.tiktok.split("/").filter(Boolean).pop() ?? "", Icon: TikTokIcon },
    { href: `mailto:${env.email}`, label: "Email", value: env.email, Icon: Mail },
  ];
  return (
    <div className="container-page pt-24 pb-16 md:pt-28">
      <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Kontak" }]} />
      <SectionHeader as="h1" className="mt-3" title="Hubungi Kami" description="Pesanan besar untuk acara, kerja sama, atau sekadar menyapa — kami senang mendengar darimu." />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ContactForm />
        <aside className="flex flex-col gap-4">
          <ul className="grid grid-cols-2 gap-3">
            {channels.map(({ href, label, value, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary">
                  <Icon className="size-6 text-primary" />
                  <span className="text-sm font-semibold text-ink">{label}</span>
                  <span className="truncate text-caption text-muted">{value}</span>
                </a>
              </li>
            ))}
          </ul>
          {main && (
            <div className="overflow-hidden rounded-3xl border border-line bg-surface">
              <div className="relative h-60 bg-cream"><MapEmbed lat={main.lat} lng={main.lng} title={`Peta ${main.name}`} /></div>
              <p className="flex gap-2 p-4 text-sm text-muted"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{main.address}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
