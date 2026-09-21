import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Supply Chain Agent",
  description: "Supply chain order processing agent - Phase 1",
  icons: {
    icon: "/FRVIA.PA.ico",
    shortcut: "/FRVIA.PA.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          <AuthProvider>{children}</AuthProvider>
        </TooltipProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
