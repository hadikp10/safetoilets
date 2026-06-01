import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";
import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "SafeToilets | Kerala",
  description: "Find clean public toilets near you in Kerala",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SafeToilets",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  themeColor: "#16A34A",
};

import { ToastProvider } from "@/context/ToastContext";
import { cn } from "@/lib/utils";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={cn("h-full", "font-sans", dmSans.variable, dmMono.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="h-full bg-surface-bg dark:bg-dark-bg text-text-primary dark:text-text-inverse">
        <ToastProvider>
          {children}
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}
