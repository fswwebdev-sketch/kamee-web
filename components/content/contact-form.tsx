"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/format";
import { useSubmitContact } from "@/lib/queries/content";
import { contactSchema, type ContactValues } from "@/lib/schemas/forms";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

/** Form kontak (RHF + Zod) dengan Cloudflare Turnstile bila site key tersedia. */
export function ContactForm() {
  const submit = useSubmitContact();
  const [done, setDone] = useState(false);
  const [token, setToken] = useState<string>("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  const renderWidget = () => {
    if (!env.turnstileSiteKey || !widget.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widget.current, { sitekey: env.turnstileSiteKey, language: "id", callback: setToken, "expired-callback": () => setToken("") });
  };
  useEffect(renderWidget, []);

  const onSubmit = (values: ContactValues) => {
    if (env.turnstileSiteKey && !token) return toast.error("Selesaikan verifikasi captcha terlebih dahulu.");
    submit.mutate(
      { ...values, phone: values.phone ? normalizePhone(values.phone) : undefined, turnstile_token: token || undefined },
      {
        onSuccess: (res) => {
          setDone(true);
          reset();
          toast.success(res.message);
        },
        onError: (e) => {
          if (isApiError(e)) Object.entries(e.errors).forEach(([k, m]) => setError(k as keyof ContactValues, { message: m[0] }));
          toast.error(isApiError(e) ? e.message : "Pesan gagal dikirim.");
          window.turnstile?.reset(widgetId.current);
        },
      },
    );
  };

  if (done) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-8 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
        <h2 className="text-h3">Pesan terkirim!</h2>
        <p className="text-muted">Terima kasih, tim Kamee akan membalas melalui email atau WhatsApp dalam 1×24 jam.</p>
        <Button variant="secondary" onClick={() => setDone(false)}>Kirim pesan lain</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 md:p-7">
      {env.turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" onLoad={renderWidget} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nama" autoComplete="name" required error={errors.name?.message} {...register("name")} />
        <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
      </div>
      <Input label="Nomor WhatsApp (opsional)" type="tel" inputMode="tel" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
      <Input label="Subjek" required placeholder="Kerja sama, event, masukan…" error={errors.subject?.message} {...register("subject")} />
      <Textarea label="Pesan" required rows={5} error={errors.message?.message} {...register("message")} />
      {env.turnstileSiteKey && <div ref={widget} className="min-h-16" aria-label="Verifikasi captcha" />}
      <Button type="submit" size="lg" loading={submit.isPending} className="sm:w-fit">
        {!submit.isPending && <Send className="size-4" aria-hidden="true" />} Kirim Pesan
      </Button>
    </form>
  );
}
