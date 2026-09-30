"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { presetRange, type PresetId } from "./filters";

/** Periode (preset/dari/sampai) disimpan di URL: ?periode=30d atau ?periode=custom&dari=…&sampai=… */
export function usePeriod(defaultPreset: Exclude<PresetId, "custom"> = "30d") {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = useMemo(() => {
    const preset = (sp.get("periode") as PresetId | null) ?? defaultPreset;
    if (preset === "custom") {
      const fallback = presetRange(defaultPreset);
      return { preset, from: sp.get("dari") ?? fallback.from, to: sp.get("sampai") ?? fallback.to };
    }
    try {
      return { preset, ...presetRange(preset) };
    } catch {
      return { preset: defaultPreset as PresetId, ...presetRange(defaultPreset) };
    }
  }, [sp, defaultPreset]);

  const set = useCallback(
    (v: { preset: PresetId; from: string; to: string }) => {
      const next = new URLSearchParams(sp.toString());
      if (v.preset === defaultPreset) next.delete("periode");
      else next.set("periode", v.preset);
      if (v.preset === "custom") {
        next.set("dari", v.from);
        next.set("sampai", v.to);
      } else {
        next.delete("dari");
        next.delete("sampai");
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [sp, router, pathname, defaultPreset],
  );

  return [value, set] as const;
}
