import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClient(req?: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    if (token) {
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    }
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
