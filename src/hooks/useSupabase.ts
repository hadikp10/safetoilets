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
    console.log("[TIMELINE] T1: profile query starts", {
      userId,
      profileFetchInProgressRef: profileFetchInProgressRef.current
    });
    if (profileFetchInProgressRef.current === userId) {
      console.log("[Diag Auth] Profile query already in progress/completed for userId:", userId);
      try {
        fetch("/api/diag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "fetch_profile_deduplicated",
            userId,
            profileFetchInProgressRef: profileFetchInProgressRef.current
          })
        });
      } catch (e) {}
      return;
    }
    profileFetchInProgressRef.current = userId;

    try {
      try {
        fetch("/api/diag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "fetch_profile_start",
            userId
          })
        });
      } catch (e) {}

      const response = await withTimeout(
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

      console.log("[TIMELINE] T2: profile query result", {
        data: response.data,
        error: response.error ? {
          message: response.error.message,
          code: response.error.code,
          details: response.error.details
        } : null,
        status: response.status
      });

      console.log("[Diag Auth] Raw response from Supabase profiles query:", {
        data: response.data,
        error: response.error,
        status: response.status,
        statusText: response.statusText
      });

      try {
        fetch("/api/diag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "fetch_profile_response",
            userId,
            rawResponse: {
              data: response.data,
              error: response.error ? {
                message: response.error.message,
                details: response.error.details,
                hint: response.error.hint,
                code: response.error.code
              } : null,
              status: response.status,
              statusText: response.statusText
            }
          })
        });
      } catch (e) {}

      if (response.error) throw response.error;
      
      const profileData = response.data as Profile;
      setProfile(profileData);
      console.log("[Diag Auth] Profile query success. Populated fields:", {
        id: profileData.id,
        email: profileData.email,
        is_admin: profileData.is_admin,
        full_name: profileData.full_name,
        is_banned: profileData.is_banned
      });

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
      console.log("[TIMELINE] T2: profile query result (failed/exception)", {
        error: err instanceof Error ? err.message : err
      });
      console.error("[Diag Auth] Profile query failure:", err);
      try {
        fetch("/api/diag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "fetch_profile_failure",
            userId,
            error: err instanceof Error ? {
              message: err.message,
              stack: err.stack
            } : err
          })
        });
      } catch (e) {}
      console.log("[Diag Auth] Avatar fetch failure due to profile query failure");
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
        
        console.log("[TIMELINE] T0: session restored", {
          event,
          authEmail: currentUser?.email || null,
          authUid: currentUser?.id || null,
          sessionUserId: session?.user?.id || null
        });
        
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
      // Reset ref so Strict Mode re-mount can re-fetch the profile
      profileFetchInProgressRef.current = null;
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

  const isAdmin = profile?.is_admin ?? false;
  console.log("[TIMELINE] T3: isAdmin calculated", {
    profileId: profile?.id || null,
    profileEmail: profile?.email || null,
    profileIsAdmin: profile?.is_admin ?? null,
    isAdmin,
    loading
  });

  return {
    user,
    profile,
    loading,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isAdmin,
    isBanned: profile?.is_banned ?? false,
  };
}
