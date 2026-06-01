"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSupabase } from "@/hooks/useSupabase";
import { Restroom, Report, Profile } from "@/types";
import { ArrowLeft, Star, AlertTriangle } from "lucide-react";

export default function AdminPage() {
  const { profile, loading, isAuthenticated, isAdmin } = useSupabase();
  const router = useRouter();
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setAuthTimeout(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  const [activeTab, setActiveTab] = useState<"reports" | "toilets" | "users">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchEmail, setSearchEmail] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Guard routing check
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("authRedirectPath", "/admin");
        }
        router.replace("/login");
      } else if (profile && !isAdmin) {
        // Only redirect once profile has loaded — avoids false redirect
        // when profile is still in-flight (e.g. React Strict Mode race)
        router.replace("/");
      }
    }
  }, [loading, isAuthenticated, isAdmin, profile, router]);

  const fetchAdminData = async () => {
    setDataLoading(true);
    setErrorMsg(null);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch reports, toilets, and users in parallel from our API route handlers (Section 9c)
      const [reportsRes, toiletsRes, usersRes] = await Promise.all([
        fetch("/api/admin/reports", { headers }),
        fetch("/api/admin/toilets", { headers }),
        fetch("/api/admin/users", { headers }),
      ]);

      if (!reportsRes.ok || !toiletsRes.ok || !usersRes.ok) {
        throw new Error("Failed to load admin logs.");
      }

      const repData = await reportsRes.json();
      const restData = await toiletsRes.json();
      const profData = await usersRes.json();

      setReports(repData);
      setRestrooms(restData);
      setProfiles(profData);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || "Failed to fetch admin backend.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchAdminData();
    }
  }, [isAuthenticated, isAdmin]);

  const handleAction = async (id: string, callback: () => Promise<void>) => {
    setActionLoading(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await callback();
      setSuccessMsg("Action completed successfully.");
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = (reportId: string, status: "resolved" | "dismissed") => {
    handleAction(`report-${reportId}`, async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reportId, status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to resolve report.");
      }
    });
  };

  const handleToggleHideRestroom = (restroom: Restroom) => {
    handleAction(`hide-${restroom.id}`, async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/toilets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          restroomId: restroom.id,
          isHidden: !restroom.is_hidden,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update restroom visibility.");
      }
    });
  };

  const handleRestoreBackupImage = (restroom: Restroom) => {
    if (!restroom.backup_image_url) return;
    handleAction(`restore-img-${restroom.id}`, async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/toilets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          restroomId: restroom.id,
          restoreBackupImage: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to restore backup image.");
      }
    });
  };

  const handleDeleteRestroom = (restroomId: string) => {
    setConfirmAction({
      message: "Are you absolutely sure you want to delete this toilet listing? This will also delete all associated ratings and verifications. This action cannot be undone.",
      onConfirm: () => {
        handleAction(`delete-${restroomId}`, async () => {
          const { supabase } = await import("@/lib/supabase");
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const res = await fetch(`/api/admin/toilets?restroomId=${restroomId}`, {
            method: "DELETE",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to delete restroom.");
          }
        });
      }
    });
  };

  const handleToggleBanUser = (prof: Profile) => {
    const actionWord = prof.is_banned ? "unban" : "ban";
    setConfirmAction({
      message: `Are you sure you want to ${actionWord} user ${prof.email}?`,
      onConfirm: () => {
        handleAction(`ban-${prof.id}`, async () => {
          const { supabase } = await import("@/lib/supabase");
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              profileId: prof.id,
              isBanned: !prof.is_banned,
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to update user ban status.");
          }
        });
      }
    });
  };

  if (authTimeout) {
    return (
      <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto font-sans">
        <div className="w-12 h-12 text-text-secondary bg-surface-muted rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-text-secondary" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900">Authentication Timeout</h3>
        <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
          Retrieving your login status is taking longer than usual. Please check your connection or try signing in again.
        </p>
        <div className="flex flex-col gap-2 w-full mt-6">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => window.location.reload()}
            className="w-full h-[40px] bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium rounded-xl transition-colors shadow-button"
          >
            Retry Loading
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/")}
            className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
          >
            Browse Without Account
          </motion.button>
        </div>
      </div>
    );
  }

  if (loading || (isAuthenticated && !profile)) {
    // Show spinner while auth is loading OR while profile is being fetched
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 text-brand-green" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin || !profile) {
    return null; // Let guard handle routing
  }

  const filteredProfiles = profiles.filter((p) =>
    p.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-surface-bg px-4 py-8 text-left"
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4 border-b border-neutral-200 pb-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            onClick={() => router.back()}
            className="w-8 h-8 rounded-[14px] bg-white border border-neutral-200 flex items-center justify-center shadow-button text-neutral-900 hover:bg-neutral-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </motion.button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold text-neutral-900 tracking-tight">
                Admin Dashboard
              </h1>
              <span className="bg-brand-greenLight text-brand-greenText text-xs font-normal tracking-wide uppercase px-2 py-0.5 rounded-[14px] border border-brand-green/20">
                Moderator
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-0.5">
              Active: {profile.email}
            </p>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-brand-greenLight border border-brand-green/20 text-brand-greenDark p-3 rounded-[14px] text-xs font-normal mb-2 animate-fadeIn">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-brand-greenVeryLight border border-brand-green/20 text-text-secondary p-3 rounded-[14px] text-xs font-normal mb-2 animate-fadeIn">
            {errorMsg}
          </div>
        )}

        {/* Segmented control tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-[14px] border border-neutral-200 mb-2">
          {([
            { key: "reports", label: `Reports (${reports.filter((r) => r.status === "pending").length})` },
            { key: "toilets", label: `Toilets (${restrooms.length})` },
            { key: "users", label: `Users (${profiles.length})` },
          ] as const).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <motion.button
                key={tab.key}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.08 }}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-1.5 text-xs rounded-lg transition min-h-[36px] ${
                  isActive
                    ? "bg-white text-neutral-900 border border-neutral-200 shadow-sm font-semibold"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {dataLoading ? (
          <div className="py-12 flex justify-center items-center">
            <svg className="animate-spin h-5 w-5 text-brand-green" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-4">
            {/* TAB 1: REPORTS */}
            {activeTab === "reports" && (
              <>
                {reports.length === 0 ? (
                  <p className="text-sm italic text-neutral-600 text-center py-8">No flag reports submitted yet.</p>
                ) : (
                  <div className="bg-white border border-neutral-200 rounded-[20px] overflow-hidden divide-y divide-neutral-200 shadow-card">
                    {reports.map((report) => {
                      const relatedRestroom = restrooms.find((r) => r.id === report.restroom_id);
                      return (
                        <div
                          key={report.id}
                          className="p-4 flex flex-col gap-3 hover:bg-neutral-50/50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-normal tracking-wide uppercase px-2 py-0.5 rounded-[14px] bg-surface-muted text-text-secondary border border-border">
                                  Reason: {report.reason.replace("_", " ")}
                                </span>
                                <span
                                  className={`text-[10px] font-normal tracking-wide uppercase px-2 py-0.5 rounded-[14px] border ${
                                    report.status === "pending"
                                      ? "bg-brand-greenVeryLight text-brand-greenDark border-brand-green/20"
                                      : report.status === "resolved"
                                      ? "bg-brand-greenLight text-brand-greenDark border-brand-green/20"
                                      : "bg-neutral-100 text-neutral-600 border-neutral-200"
                                  }`}
                                >
                                  {report.status}
                                </span>
                              </div>
                              <h3 className="font-semibold text-[14px] text-neutral-900 mt-1">
                                Toilet: {relatedRestroom?.name || "Deleted Restroom"}
                              </h3>
                              <p className="text-[11px] text-neutral-400 font-mono">
                                Reported on: {new Date(report.created_at).toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>

                          <div className="bg-neutral-100 border-l-2 border-neutral-400 p-2.5 rounded-r-lg text-xs text-neutral-600 italic font-mono">
                            Details: &ldquo;{report.details || "No explanation details provided."}&rdquo;
                          </div>

                          {report.status === "pending" && (
                            <div className="flex gap-2 justify-end mt-1">
                              <motion.button
                                whileTap={{ scale: 0.96 }}
                                transition={{ duration: 0.08 }}
                                onClick={() => handleResolveReport(report.id, "dismissed")}
                                className="h-8 px-4 text-xs bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-[14px] transition-colors font-medium"
                                disabled={!!actionLoading}
                              >
                                Dismiss Report
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.96 }}
                                transition={{ duration: 0.08 }}
                                onClick={() => handleResolveReport(report.id, "resolved")}
                                className="h-8 px-4 text-xs bg-brand-green hover:bg-brand-greenDark text-white rounded-[14px] transition-colors font-medium shadow-button"
                                disabled={!!actionLoading}
                              >
                                Mark Resolved
                              </motion.button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: TOILETS LIST */}
            {activeTab === "toilets" && (
              <div className="bg-white border border-neutral-200 rounded-[20px] overflow-hidden divide-y divide-neutral-200 shadow-card">
                {restrooms.map((restroom) => (
                  <div
                    key={restroom.id}
                    className="p-4 flex gap-4 hover:bg-neutral-50/50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-neutral-200/50 relative">
                      {restroom.public_image_url ? (
                        <img src={restroom.public_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-normal text-neutral-400">NO IMAGE</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-semibold text-[14px] text-neutral-900 truncate leading-snug">{restroom.name}</h3>
                          <p className="text-[12px] text-neutral-600 truncate">{restroom.location_name}</p>
                        </div>

                        <div className="flex gap-1.5 flex-shrink-0">
                          {restroom.is_hidden && (
                            <span className="bg-surface-muted text-text-secondary border border-border text-[10px] font-normal tracking-wide uppercase px-1.5 py-0.5 rounded-[14px]">
                              HIDDEN
                            </span>
                          )}
                          <span className="bg-neutral-100 border border-neutral-200 text-neutral-600 text-[10px] font-normal tracking-wide uppercase px-1.5 py-0.5 rounded-[14px] font-mono flex items-center gap-0.5">
                            Score: {restroom.overall_score.toFixed(1)} <Star className="w-3 h-3 fill-current text-brand-green" />
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-200 items-center">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          transition={{ duration: 0.08 }}
                          onClick={() => handleToggleHideRestroom(restroom)}
                          className="h-8 px-3 text-xs bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-[14px] transition-colors font-medium"
                          disabled={actionLoading === `hide-${restroom.id}`}
                        >
                          {restroom.is_hidden ? "Show Toilet" : "Hide Toilet"}
                        </motion.button>

                        {restroom.backup_image_url && (
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            transition={{ duration: 0.08 }}
                            onClick={() => handleRestoreBackupImage(restroom)}
                            className="h-8 px-3 text-xs bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-[14px] transition-colors font-medium"
                            disabled={actionLoading === `restore-img-${restroom.id}`}
                          >
                            Restore Backup Image
                          </motion.button>
                        )}

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          transition={{ duration: 0.08 }}
                          onClick={() => handleDeleteRestroom(restroom.id)}
                          className="h-8 px-3 text-xs bg-white border border-border text-text-secondary hover:bg-surface-muted rounded-[14px] transition-colors font-medium ml-auto"
                          disabled={actionLoading === `delete-${restroom.id}`}
                        >
                          Delete
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: USERS MODERATION */}
            {activeTab === "users" && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Search user profiles by email address..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full h-12 border border-surface-border bg-white placeholder-text-disabled rounded-xl px-4 text-xs text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all shadow-sm"
                  />
                </div>

                {filteredProfiles.length === 0 ? (
                  <p className="text-sm italic text-neutral-600 text-center py-8">No profiles found.</p>
                ) : (
                  <div className="bg-white border border-neutral-200 rounded-[20px] overflow-hidden divide-y divide-neutral-200 shadow-card">
                    {filteredProfiles.map((prof) => (
                      <div
                        key={prof.id}
                        className="p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold text-[14px] text-neutral-900">
                            {prof.full_name || "Anonymous User"}
                          </h4>
                          <p className="text-xs text-neutral-600 font-mono mt-0.5">{prof.email}</p>
                          
                          <div className="flex gap-1.5 mt-2">
                            {prof.is_admin && (
                              <span className="bg-brand-greenLight text-brand-greenDark border border-brand-green/20 text-[9px] font-normal tracking-wide uppercase px-1.5 py-0.5 rounded-[14px]">
                                ADMIN
                              </span>
                            )}
                            {prof.is_banned && (
                              <span className="bg-surface-muted text-text-secondary border border-border text-[9px] font-normal tracking-wide uppercase px-1.5 py-0.5 rounded-[14px]">
                                BANNED
                              </span>
                            )}
                          </div>
                        </div>

                        {!prof.is_admin && (
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            transition={{ duration: 0.08 }}
                            onClick={() => handleToggleBanUser(prof)}
                            className={`h-8 px-3 text-xs rounded-[14px] transition-colors font-medium border ${
                              prof.is_banned
                                ? "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                : "bg-white border-border text-text-secondary hover:bg-surface-muted"
                            }`}
                            disabled={actionLoading === `ban-${prof.id}`}
                          >
                            {prof.is_banned ? "Unban User" : "Ban User"}
                          </motion.button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Confirm Dialog Modal Overlay */}
      {confirmAction && (
        <div className="fixed inset-0 z-[110] bg-neutral-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[20px] p-5 border border-border shadow-card flex flex-col gap-4 text-center animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-surface-muted border border-border flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5 text-text-secondary" />
            </div>
            <h3 className="font-semibold text-neutral-900 text-base">Are you sure?</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-2 mt-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="flex-1 h-[52px] text-xs bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-[14px] font-medium"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="flex-1 h-[52px] text-xs bg-brand-green hover:bg-brand-greenDark text-white rounded-[14px] font-medium shadow-button"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Confirm
              </motion.button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
