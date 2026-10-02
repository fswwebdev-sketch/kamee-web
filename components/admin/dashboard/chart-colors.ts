"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export interface ChartColors {
  series: string;
  grid: string;
  axis: string;
  surface: string;
  ink: string;
}

const LIGHT: ChartColors = { series: "#04338B", grid: "#DCE3F0", axis: "#55627E", surface: "#F4F6FB", ink: "#0B1B3F" };

/**
 * Warna grafik dibaca dari token CSS (bagian 5) agar mode gelap memakai langkah warnanya sendiri.
 * Recharts butuh nilai warna nyata (bukan var()) untuk atribut SVG.
 */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(LIGHT);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    setColors({
      series: v("--color-primary", LIGHT.series),
      grid: v("--color-line", LIGHT.grid),
      axis: v("--color-muted", LIGHT.axis),
      surface: v("--color-surface", LIGHT.surface),
      ink: v("--color-ink", LIGHT.ink),
    });
  }, [resolvedTheme]);
  return colors;
}
