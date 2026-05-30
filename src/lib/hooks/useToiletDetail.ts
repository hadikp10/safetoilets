import useSWR from "swr";
import { Restroom } from "@/types";
import { supabase } from "@/lib/supabase";

async function apiFetch(url: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch data");
  }
  return res.json();
}

export function useToiletDetail(id: string | undefined, initialData?: Restroom | null) {
  const url = id ? `/api/toilets/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR<Restroom>(url, apiFetch, {
    fallbackData: initialData || undefined,
    dedupingInterval: 60000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    toilet: data || initialData || null,
    error,
    isLoading: isLoading && !data && !initialData,
    mutate,
  };
}
