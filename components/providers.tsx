"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { isApiError } from "@/lib/api";
import { env } from "@/lib/env";
import { setMockReady } from "@/lib/mock-ready";
import "@/features/auth/store";

// Toaster dimuat setelah hidrasi (tidak ikut bundle kritis).
const Toaster = dynamic(() => import("@/components/ui/toast").then((m) => m.Toaster), { ssr: false });

// Mock MSW di browser dipasang sebelum komponen pertama melakukan fetch.
if (typeof window !== "undefined" && env.mocking) {
  setMockReady(
    import("@/mocks/browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass", quiet: true, serviceWorker: { url: "/mockServiceWorker.js" } }),
    ),
  );
}

const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

function makeClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => !(isApiError(error) && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionConfig reducedMotion="user">
            {children}
            <Toaster />
          </MotionConfig>
        </LazyMotion>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
