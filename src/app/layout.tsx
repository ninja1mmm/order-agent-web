import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/auth-provider";

export const metadata: Metadata = {
  title: "Supply Chain Agent",
  description: "Supply chain order processing agent - Phase 1",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
