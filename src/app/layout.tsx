import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/auth-provider";
import { Toaster } from "@/components/ui/sonner";

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
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
