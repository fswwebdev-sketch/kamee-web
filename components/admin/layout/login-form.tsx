"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { adminApi } from "@/lib/admin/api";
import { adminKeys } from "@/lib/admin/queries";
import type { AdminUser } from "@/lib/admin/types";
import { isApiError } from "@/lib/api";
import { env } from "@/lib/env";

const schema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
  remember: z.boolean(),
});
type Values = z.infer<typeof schema>;

/** Hanya izinkan redirect internal ke /admin (cegah open redirect). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/admin") && !next.startsWith("//") && !next.startsWith("/admin/login") ? next : "/admin";
}

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(params.get("expired") ? "Sesi Anda berakhir. Silakan masuk kembali." : null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const submit = async (v: Values) => {
    setFormError(null);
    try {
      const res = await adminApi<{ data: { user: AdminUser } }>("auth/login", { method: "POST", body: v });
      qc.setQueryData(adminKeys.me, res.data.user);
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (e) {
      if (isApiError(e) && e.status === 422 && e.field("email")) setError("email", { message: e.field("email") });
      else if (isApiError(e) && e.status === 429) setFormError(`Terlalu banyak percobaan. Coba lagi dalam ${e.retryAfter ?? 60} detik.`);
      else setFormError(isApiError(e) ? e.message : "Tidak dapat masuk. Periksa koneksi Anda.");
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="mt-8 flex flex-col gap-4">
      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-ink">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          {formError}
        </p>
      )}
      <Input label="Email" type="email" autoComplete="username" required autoFocus error={errors.email?.message} {...register("email")} />
      <Input
        label="Kata sandi"
        type={show ? "text" : "password"}
        autoComplete="current-password"
        required
        error={errors.password?.message}
        suffix={
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={show} className="grid size-9 place-items-center rounded-lg text-muted hover:text-ink">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...register("password")}
      />
      <Checkbox label="Ingat saya di perangkat ini" description="Sesi bertahan 30 hari. Jangan centang di komputer bersama." {...register("remember")} />
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">Masuk</Button>

      {env.mocking && (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-surface p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-ink"><Info className="size-4 text-primary" aria-hidden="true" /> Mode demo (mock)</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li><span className="font-medium text-ink">superadmin@kamee.id</span> — Super Admin</li>
            <li><span className="font-medium text-ink">admin.cikokol@kamee.id</span> — Admin Outlet</li>
            <li>Kata sandi: <span className="font-medium text-ink">password</span></li>
          </ul>
        </div>
      )}
    </form>
  );
}
