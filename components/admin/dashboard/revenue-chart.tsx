"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { RevenuePoint } from "@/lib/admin/types";
import { formatNumber, formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useChartColors } from "./chart-colors";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function periodLabel(period: string, interval: "day" | "month", long = false): string {
  const [y, m, d] = period.split("-").map(Number) as [number, number, number?];
  if (interval === "month") return long ? `${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${String(y).slice(2)}`;
  if (long) {
    return new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  return `${d} ${MONTHS[m - 1]}`;
}

function ChartTooltip({ active, payload, interval }: Partial<TooltipContentProps<number, string>> & { interval: "day" | "month" }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload as RevenuePoint;
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lift">
      <p className="text-caption text-muted">{periodLabel(p.period, interval, true)}</p>
      <p className="mt-1 font-heading text-base font-semibold text-ink">{formatRupiah(p.revenue)}</p>
      <p className="text-caption text-muted">{formatNumber(p.orders)} pesanan dibayar</p>
    </div>
  );
}

/**
 * Pendapatan per periode (satu seri, satu sumbu).
 * Harian: area (garis 2px + wash 10%) dengan crosshair. Bulanan: kolom ≤24px, ujung membulat 4px.
 */
export default function RevenueChart({ data, interval, height = 280 }: { data: RevenuePoint[]; interval: "day" | "month"; height?: number }) {
  const c = useChartColors();
  const axis = { stroke: c.grid, tick: { fill: c.axis, fontSize: 12 }, tickLine: false, axisLine: { stroke: c.grid } } as const;
  const yAxis = <YAxis {...axis} axisLine={false} width={64} tickFormatter={(v: number) => formatRupiahCompact(v)} allowDecimals={false} />;
  const grid = <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="0" />;
  const tooltip = <Tooltip cursor={interval === "day" ? { stroke: c.axis, strokeWidth: 1 } : { fill: c.grid, opacity: 0.35 }} content={<ChartTooltip interval={interval} />} />;
  const ticks = data.length > 16 ? Math.ceil(data.length / 8) - 1 : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {interval === "day" ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {grid}
          <XAxis dataKey="period" {...axis} interval={ticks} tickFormatter={(v: string) => periodLabel(v, "day")} minTickGap={8} />
          {yAxis}
          {tooltip}
          <Area
            type="monotone"
            dataKey="revenue"
            name="Pendapatan"
            stroke={c.series}
            strokeWidth={2}
            fill={c.series}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 5, fill: c.series, stroke: c.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {grid}
          <XAxis dataKey="period" {...axis} tickFormatter={(v: string) => periodLabel(v, "month")} />
          {yAxis}
          {tooltip}
          <Bar dataKey="revenue" name="Pendapatan" fill={c.series} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
