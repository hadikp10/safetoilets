import { track } from "@vercel/analytics";

export function logEvent(name: string, data?: Record<string, string | number | boolean>) {
  console.log(`[Analytics Event] ${name}`, data || "");
  try {
    track(name, data);
  } catch (err) {
    console.error("Vercel Analytics track error:", err);
  }
}
