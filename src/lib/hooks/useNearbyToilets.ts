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

export function useNearbyToilets(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null,
  activeFilters: string[]
) {
  const queryParams = new URLSearchParams();
  if (bounds) {
    queryParams.append("minLat", bounds.minLat.toString());
    queryParams.append("maxLat", bounds.maxLat.toString());
    queryParams.append("minLng", bounds.minLng.toString());
    queryParams.append("maxLng", bounds.maxLng.toString());
  }
  queryParams.append("filter", activeFilters.join(","));

  const url = `/api/toilets?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<Restroom[]>(url, apiFetch, {
    dedupingInterval: 60000, // 60s stale caching
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    toilets: data || [],
    error,
    isLoading,
    mutate,
  };
}
