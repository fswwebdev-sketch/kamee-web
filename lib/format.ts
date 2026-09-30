const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("id-ID");

/** 22000 → "Rp22.000" (tanpa spasi, gaya umum e-commerce Indonesia). */
export function formatRupiah(value: number): string {
  return rupiah.format(Math.round(value)).replace(/\s/g, "");
}

export function formatNumber(value: number): string {
  return number.format(value);
}

const TZ = "Asia/Jakarta";

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, ...opts }).format(typeof iso === "string" ? new Date(iso) : iso);
}

export function formatDateTime(iso: string | Date) {
  return formatDate(iso, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
}

export function formatTime(iso: string | Date) {
  return formatDate(iso, { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
}

/** 754 detik → "12:34" */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** "07:00:00" / "07:00" → "07.00" */
export function formatHour(time: string) {
  return time.slice(0, 5).replace(":", ".");
}

/** Normalisasi nomor WA Indonesia ke 62xxxxxxxxxx. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function formatPhone(phone: string): string {
  const p = normalizePhone(phone);
  const local = `0${p.slice(2)}`;
  return local.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
}

export function pluralize(count: number, noun: string) {
  return `${formatNumber(count)} ${noun}`;
}
