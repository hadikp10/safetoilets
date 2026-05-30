import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "SafeToilets | Kerala",
  description: "Find clean public toilets near you in Kerala",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SafeToilets | Kerala",
  },
  openGraph: {
    title: "SafeToilets | Kerala",
    description: "Find clean public toilets near you in Kerala",
    url: "https://safetoilets.in",
    siteName: "SafeToilets",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeToilets | Kerala",
    description: "Find clean public toilets near you in Kerala",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  themeColor: "#16C47F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="h-full bg-neutral-50 text-neutral-900 font-sans">
        <ToastProvider>
          {children}
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}
