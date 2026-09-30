"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** Minta alasan/catatan (mis. pembatalan pesanan) */
  input?: { label: string; placeholder?: string; required?: boolean; multiline?: boolean };
  /** Ketik teks ini untuk konfirmasi (aksi berisiko tinggi) */
  typeToConfirm?: string;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((v: { ok: boolean; value: string }) => void) | null;
  ask: (o: ConfirmOptions) => Promise<{ ok: boolean; value: string }>;
  settle: (ok: boolean, value?: string) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  ask: (options) =>
    new Promise((resolve) => {
      get().resolve?.({ ok: false, value: "" });
      set({ open: true, options, resolve });
    }),
  settle: (ok, value = "") => {
    get().resolve?.({ ok, value });
    set({ open: false, resolve: null });
  },
}));

/**
 * Konfirmasi sebelum aksi destruktif:
 *   const { ok } = await confirm({ title: "Hapus produk?", tone: "danger" })
 *   const { ok, value } = await confirm({ title: "Batalkan pesanan?", input: { label: "Alasan", required: true } })
 */
export function confirm(options: ConfirmOptions) {
  return useConfirmStore.getState().ask(options);
}

export function ConfirmHost() {
  const { open, options, settle } = useConfirmStore();
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setValue("");
      setTyped("");
      setTouched(false);
    }
  }, [open]);

  if (!options) return null;
  const tone = options.tone ?? "danger";
  const inputMissing = Boolean(options.input?.required) && value.trim().length === 0;
  const typeMissing = Boolean(options.typeToConfirm) && typed.trim() !== options.typeToConfirm;

  const submit = () => {
    setTouched(true);
    if (inputMissing || typeMissing) return;
    settle(true, value.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={() => settle(false)}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          {tone === "danger" && (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger/12 text-danger">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
          )}
          {options.title}
        </span>
      }
      description={options.description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => settle(false)}>{options.cancelLabel ?? "Batal"}</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={submit} disabled={touched && (inputMissing || typeMissing)} data-autofocus={!options.input && !options.typeToConfirm ? true : undefined}>
            {options.confirmLabel ?? (tone === "danger" ? "Ya, hapus" : "Lanjutkan")}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        {options.input &&
          (options.input.multiline ? (
            <Textarea
              label={options.input.label}
              placeholder={options.input.placeholder}
              required={options.input.required}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              error={touched && inputMissing ? `${options.input.label} wajib diisi.` : undefined}
              data-autofocus
              maxLength={255}
            />
          ) : (
            <Input
              label={options.input.label}
              placeholder={options.input.placeholder}
              required={options.input.required}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              error={touched && inputMissing ? `${options.input.label} wajib diisi.` : undefined}
              data-autofocus
              maxLength={255}
            />
          ))}
        {options.typeToConfirm && (
          <Input
            label={<>Ketik <strong>{options.typeToConfirm}</strong> untuk konfirmasi</>}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            error={touched && typeMissing ? "Teks konfirmasi belum sesuai." : undefined}
          />
        )}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
