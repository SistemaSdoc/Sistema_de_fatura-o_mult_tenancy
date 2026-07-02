import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import AuditEventListener from "@/components/AuditEventListener";

export const metadata: Metadata = {
  title: {
    default: "FacturaJá — Sistema de Faturação",
    template: "%s | FacturaJá",
  },
  description: "FacturaJá — Sistema moderno de faturação e gestão empresarial",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt"
      suppressHydrationWarning
      className="h-full"
      style={{
        fontFamily: '"Georgia, serif',
      }}>
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <AuditEventListener />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
