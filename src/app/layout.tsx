import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SenderX — Cold Email Hiper-Personalizado con IA",
  description: "SenderX - Plataforma de cold email hiper-personalizado con IA para B2B. Motor SMTP/IMAP con throttle 40s, auto-backup safety net, cross-campaign duplicate detection.",
  keywords: ["SenderX", "cold email", "B2B", "IA", "hiper-personalizado", "outreach"],
  authors: [{ name: "SenderX" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
