"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { useChartColors } from "@/components/admin/dashboard/chart-colors";
import type { FinanceSummary } from "@/lib/admin/finance-types";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { formatDay } from "./shared";

interface Datum {
  date: string;
  income: number;
  sales: number;
  other: number;
  expense: number;
}

/** Warna pengeluaran dari token --color-danger (Recharts butuh nilai warna nyata). */
function useDangerColor() {
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#C62828");
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--color-danger").trim();
    if (v) setColor(v);
  }, [resolvedTheme]);
  return color;
}

function DailyTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload as Datum;
  return (
    <div className="min-w-48 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lift">
      <p className="text-caption text-muted">{formatDay(d.date, { weekday: "long", day: "numeric", month: "long" })}</p>
      <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
        <dt className="text-muted">Penjualan</dt>
        <dd className="text-right text-ink">{formatRupiah(d.sales)}</dd>
        <dt className="text-muted">Pemasukan lain</dt>
        <dd className="text-right text-ink">{formatRupiah(d.other)}</dd>
        <dt className="font-semibold text-ink">Total masuk</dt>
        <dd className="text-right font-semibold text-ink">{formatRupiah(d.income)}</dd>
        <dt className="font-semibold text-ink">Keluar</dt>
        <dd className="text-right font-semibold text-danger">{formatRupiah(d.expense)}</dd>
      </dl>
    </div>
  );
}

/** Kolom harian: pemasukan (penjualan + pemasukan lain) vs pengeluaran. */
export default function FinanceChart({ daily }: { daily: FinanceSummary["daily"] }) {
  const c = useChartColors();
  const danger = useDangerColor();
  const data: Datum[] = daily.map((d) => ({ date: d.date, sales: d.sales, other: d.other_income, income: d.sales + d.other_income, expense: d.expense }));
  const axis = { stroke: c.grid, tick: { fill: c.axis, fontSize: 12 }, tickLine: false, axisLine: { stroke: c.grid } } as const;
  const ticks = data.length > 14 ? Math.ceil(data.length / 10) - 1 : 0;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%" barGap={2}>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="date" {...axis} interval={ticks} minTickGap={8} tickFormatter={(v: string) => formatDay(v, { day: "numeric", month: "short" })} />
        <YAxis {...axis} axisLine={false} width={64} allowDecimals={false} tickFormatter={(v: number) => formatRupiahCompact(v)} />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.35 }} content={<DailyTooltip />} />
        <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: c.axis }} />
        <Bar dataKey="income" name="Pemasukan" fill={c.series} maxBarSize={20} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="expense" name="Pengeluaran" fill={danger} maxBarSize={20} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
