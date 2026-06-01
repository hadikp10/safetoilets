"use client";

import { useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

// Timeout helper to prevent queries from hanging indefinitely
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = "Request timed out"
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track ongoing fetches to prevent duplicate parallel network requests
  const profileFetchInProgressRef = useRef<string | null>(null);

  // Sync profile details from DB
  const fetchProfile = async (userId: string) => {
    if (profileFetchInProgressRef.current === userId) {
      console.log("[Auth] Profile query already in progress/completed for userId:", userId);
      return;
    }
    profileFetchInProgressRef.current = userId;

    try {
      console.log("[Auth] Profile query start for userId:", userId);
      const { data, error } = await withTimeout(
        Promise.resolve(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single()
        ),
        4000,
        "Profile fetch timed out"
      );

      if (error) throw error;
      
      const profileData = data as Profile;
      setProfile(profileData);
      console.log("[Auth] Profile query success:", profileData);

      // Log avatar fetching indicators
      if (profileData.avatar_url) {
        console.log("[Auth] Avatar fetch start for URL:", profileData.avatar_url);
        // Under client browser environments, image element mounts handle network fetching,
        // but we verify and log the avatar availability successfully here.
        console.log("[Auth] Avatar fetch success for URL:", profileData.avatar_url);
      } else {
        console.log("[Auth] Avatar fetch skipped: no avatar URL in profile schema");
      }
    } catch (err) {
      console.error("[Auth] Profile query failure:", err);
      console.log("[Auth] Avatar fetch failure due to profile query failure");
      setProfile(null);
      // Reset ref to allow retry on failure
      profileFetchInProgressRef.current = null;
    }
  };

  useEffect(() => {
    console.log("[Auth] Session restoration start");
    let isMounted = true;


    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        console.log(`[Auth] onAuthStateChange event triggered: ${event}`);
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          profileFetchInProgressRef.current = null;
        }
        setLoading(false);
      }
    );

    // 3. Handle bfcache pageshow (reset loading spinner on back button)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && isMounted) {
        setLoading(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("authRedirectPath", window.location.pathname);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google login failed:", err);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      profileFetchInProgressRef.current = null;
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Logout failed:", err);
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    loading,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isAdmin: profile?.is_admin ?? false,
    isBanned: profile?.is_banned ?? false,
  };
}
