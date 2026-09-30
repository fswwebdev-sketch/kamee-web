/** Persentase kontribusi gaya Indonesia: 34,5% */
export function formatShare(v: number): string {
  return `${v.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}
