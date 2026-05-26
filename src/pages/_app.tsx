import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import Head from "next/head";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/hooks/useToast";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Register Service Worker for PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("SafeToilets Service Worker registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.warn("SafeToilets Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>SafeToilets</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta
          name="description"
          content="Help people find clean public toilets nearby using live crowd-verified data."
        />
      </Head>
      <ErrorBoundary>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </ErrorBoundary>
    </>
  );
}
