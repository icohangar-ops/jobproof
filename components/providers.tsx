"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { JobStoreProvider } from "@/components/job-store";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
      <JobStoreProvider>
        {children}
        <PwaRegister />
      </JobStoreProvider>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
