"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { env } from "@/lib/env";
import { formatCountdown, normalizePhone } from "@/lib/format";
import { useCountdown } from "@/lib/hooks";
import { useRequestOtp, useVerifyOtp } from "@/lib/queries/account";
import { otpRequestSchema } from "@/lib/schemas/forms";

const LENGTH = 6;

/** Login pelanggan tanpa kata sandi: OTP 6 digit via WhatsApp. */
export function OtpLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") && params.get("next")!.startsWith("/") ? params.get("next")! : "/akun";
  const [phone, setPhone] = useState<string | null>(null);
  const [masked, setMasked] = useState("");
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [name, setName] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const resendIn = useCountdown(resendAt);

  const form = useForm<{ phone: string }>({ resolver: zodResolver(otpRequestSchema) });

  const send = (value: string) =>
    requestOtp.mutate(normalizePhone(value), {
      onSuccess: (res) => {
        setPhone(normalizePhone(value));
        setMasked(res.data.phone);
        setResendAt(Date.now() + 60_000);
        setDigits(Array(LENGTH).fill(""));
        setCodeError(null);
        toast.success(res.message);
      },
      onError: (e) => {
        const msg = isApiError(e) ? e.field("phone") ?? e.message : "Gagal mengirim OTP.";
        if (phone) toast.error(msg);
        else form.setError("phone", { message: msg });
      },
    });

  useEffect(() => {
    if (phone) inputs.current[0]?.focus();
  }, [phone]);

  const verify = (code: string) => {
    if (!phone) return;
    verifyOtp.mutate(
      { phone, code, name: name || undefined },
      {
        onSuccess: (res) => {
          toast.success(res.message, { description: res.data.is_new ? "Akunmu sudah dibuat. Mulai kumpulkan poin!" : undefined });
          router.replace(next);
        },
        onError: (e) => {
          setCodeError(isApiError(e) ? e.field("code") ?? e.message : "Verifikasi gagal.");
          setDigits(Array(LENGTH).fill(""));
          inputs.current[0]?.focus();
        },
      },
    );
  };

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      // Tempel seluruh kode sekaligus
      const all = clean.slice(0, LENGTH).split("");
      const filled = Array.from({ length: LENGTH }, (_, k) => all[k] ?? "");
      setDigits(filled);
      inputs.current[Math.min(all.length, LENGTH - 1)]?.focus();
      if (all.length === LENGTH) verify(filled.join(""));
      return;
    }
    const nextDigits = [...digits];
    nextDigits[i] = clean;
    setDigits(nextDigits);
    setCodeError(null);
    if (clean && i < LENGTH - 1) inputs.current[i + 1]?.focus();
    if (nextDigits.every(Boolean)) verify(nextDigits.join(""));
  };

  if (!phone) {
    return (
      <form onSubmit={form.handleSubmit((v) => send(v.phone))} noValidate className="flex flex-col gap-4">
        <Input label="Nomor WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="0812-3456-7890" required hint="Kode OTP akan dikirim lewat WhatsApp." error={form.formState.errors.phone?.message} {...form.register("phone")} />
        <Button type="submit" size="lg" loading={requestOtp.isPending}>
          {!requestOtp.isPending && <MessageCircle className="size-5" aria-hidden="true" />} Kirim Kode OTP
        </Button>
        <p className="text-center text-caption text-muted">Dengan masuk, kamu menyetujui kebijakan privasi Kamee Coffee.</p>
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (digits.every(Boolean)) verify(digits.join(""));
        else setCodeError("Masukkan 6 digit kode OTP.");
      }}
      className="flex flex-col gap-5"
    >
      <button type="button" onClick={() => setPhone(null)} className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Ganti nomor
      </button>
      <p className="text-sm text-muted">Masukkan kode yang dikirim ke WhatsApp <b className="text-ink">{masked}</b>.</p>
      <fieldset aria-describedby={codeError ? "otp-error" : undefined}>
        <legend className="mb-2 text-sm font-medium text-ink">Kode OTP</legend>
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && inputs.current[i - 1]?.focus()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LENGTH}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={Boolean(codeError) || undefined}
              className="h-14 w-full min-w-0 rounded-xl border border-line bg-bg text-center font-heading text-2xl font-semibold text-ink focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 aria-[invalid=true]:border-danger"
            />
          ))}
        </div>
        {codeError && <p id="otp-error" role="alert" className="mt-2 text-caption text-danger">{codeError}</p>}
      </fieldset>
      <Input label="Nama (untuk pengguna baru)" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama panggilanmu" />
      <Button type="submit" size="lg" loading={verifyOtp.isPending}>Masuk</Button>
      <p className="text-center text-sm text-muted">
        Tidak menerima kode?{" "}
        {resendIn > 0 ? (
          <span>Kirim ulang dalam {formatCountdown(resendIn)}</span>
        ) : (
          <button type="button" onClick={() => send(phone)} className="font-semibold text-primary hover:underline" disabled={requestOtp.isPending}>Kirim ulang</button>
        )}
      </p>
      {env.mocking && <p className="rounded-xl bg-cream/70 p-3 text-center text-caption text-ink">Mode demo: kode OTP <b className="font-heading tracking-widest">123456</b></p>}
    </form>
  );
}
