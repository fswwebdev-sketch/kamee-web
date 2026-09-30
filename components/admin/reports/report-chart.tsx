"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { useChartColors } from "@/components/admin/dashboard/chart-colors";
import { periodLabel } from "@/components/admin/dashboard/revenue-chart";
import type { ReportGroup, ReportRow } from "@/lib/admin/types";
import { formatNumber, formatRupiah, formatRupiahCompact } from "@/lib/format";
import { formatShare } from "./report-format";

interface Datum extends ReportRow {
  /** Label ujung bar (nilai + kontribusi), hanya untuk bar horizontal */
  tip?: string;
}

function ReportTooltip({ active, payload, group }: Partial<TooltipContentProps<number, string>> & { group: ReportGroup }) {
  if (!active || !payload?.length) return null;
  const r = payload[0]!.payload as Datum;
  const period = group === "day" || group === "month";
  return (
    <div className="max-w-64 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-lift">
      <p className="text-caption text-muted">{r.label}</p>
      <p className="mt-1 font-heading text-base font-semibold text-ink">{formatRupiah(r.revenue)}</p>
      <p className="text-caption text-muted">
        {formatNumber(r.orders)} pesanan
        {r.qty != null && <> · {formatNumber(r.qty)} terjual</>}
        {!period && <> · {formatShare(r.share)} kontribusi</>}
      </p>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/**
 * Grafik laporan — satu seri (pendapatan), satu sumbu, warna primary dari token.
 * Hari/bulan: kolom ≤24px (area 2px + wash 10% bila titik terlalu rapat untuk kolom).
 * Produk/outlet/metode bayar: bar horizontal ≤24px, nilai + % kontribusi di ujung bar.
 */
export default function ReportChart({ rows, group, compact = false }: { rows: ReportRow[]; group: ReportGroup; compact?: boolean }) {
  const c = useChartColors();
  const axis = { stroke: c.grid, tick: { fill: c.axis, fontSize: 12 }, tickLine: false, axisLine: { stroke: c.grid } } as const;
  const grid = <CartesianGrid vertical={false} stroke={c.grid} />;

  if (group === "day" || group === "month") {
    const data = rows.map((r) => ({ ...r }));
    const dense = group === "day" && data.length > 62;
    const ticks = data.length > 16 ? Math.ceil(data.length / (compact ? 6 : 10)) - 1 : 0;
    const x = <XAxis dataKey="key" {...axis} interval={ticks} minTickGap={8} tickFormatter={(v: string) => periodLabel(v, group)} />;
    const y = <YAxis {...axis} axisLine={false} width={64} allowDecimals={false} tickFormatter={(v: number) => formatRupiahCompact(v)} />;
    const tooltip = <Tooltip cursor={dense ? { stroke: c.axis, strokeWidth: 1 } : { fill: c.grid, opacity: 0.35 }} content={<ReportTooltip group={group} />} />;
    return (
      <ResponsiveContainer width="100%" height={300}>
        {dense ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {grid}
            {x}
            {y}
            {tooltip}
            <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke={c.series} strokeWidth={2} fill={c.series} fillOpacity={0.1} dot={false} activeDot={{ r: 5, fill: c.series, stroke: c.surface, strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
            {grid}
            {x}
            {y}
            {tooltip}
            <Bar dataKey="revenue" name="Pendapatan" fill={c.series} maxBarSize={24} radius={[4, 4, 0, 0]} minPointSize={0} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    );
  }

  // Bar horizontal: urut pendapatan tertinggi; produk dibatasi top 10
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  const data: Datum[] = (group === "product" ? sorted.slice(0, 10) : sorted).map((r) => ({ ...r, tip: `${formatRupiahCompact(r.revenue)} · ${formatShare(r.share)}` }));
  const labelWidth = compact ? 128 : 168;
  const height = Math.max(120, data.length * 40 + 16);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 124, bottom: 0, left: 0 }} barCategoryGap="30%">
        <CartesianGrid horizontal={false} stroke={c.grid} />
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tickLine={false}
          axisLine={{ stroke: c.grid }}
          tick={({ x, y, payload }: { x: number | string; y: number | string; payload: { value: string } }) => (
            <text x={Number(x) - 8} y={Number(y)} dy={4} textAnchor="end" fill={c.ink} fontSize={13}>
              <title>{payload.value}</title>
              {truncate(payload.value, compact ? 16 : 20)}
            </text>
          )}
        />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.35 }} content={<ReportTooltip group={group} />} />
        <Bar dataKey="revenue" name="Pendapatan" fill={c.series} maxBarSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="tip"
            content={({ x, y, width, height, value }) => (
              // Satu baris di ujung bar (tanpa wrap), teks bertinta muted — bukan warna seri
              <text x={Number(x) + Number(width) + 8} y={Number(y) + Number(height) / 2} dy={4} fill={c.axis} fontSize={12} className="tabular-nums">
                {String(value)}
              </text>
            )}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
