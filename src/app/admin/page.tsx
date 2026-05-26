"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/hooks/useSupabase";
import Button from "@/components/ui/Button";
import { Restroom, Report, Profile } from "@/types";

export default function AdminPage() {
  const { profile, loading, isAuthenticated, isAdmin } = useSupabase();
  const router = useRouter();

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
      } else if (!isAdmin) {
        router.replace("/");
      }
    }
  }, [loading, isAuthenticated, isAdmin, router]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex items-center justify-center">
        <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase animate-pulse">Loading Access Token...</span>
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
    <div className="max-w-4xl mx-auto px-4 py-8 relative pb-[env(safe-area-inset-bottom)] page-scroll">
      
      {/* Back Button (Section 6c) */}
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="text-brand-sky font-semibold text-sm hover:underline min-h-[44px] flex items-center"
        >
          ← Back
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-surface-border dark:border-dark-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Moderator Admin: {profile.email}</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-brand-greenLight border border-brand-green/10 text-brand-green p-3 rounded-xl text-xs font-semibold mb-6">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-brand-redLight border border-brand-red/10 text-brand-red p-3 rounded-xl text-xs font-semibold mb-6">
          {errorMsg}
        </div>
      )}

      {/* Segmented control tabs */}
      <div className="flex bg-surface-muted dark:bg-dark-muted p-1 rounded-2xl border border-surface-border dark:border-dark-border mb-6">
        {([
          { key: "reports", label: `Reports (${reports.filter((r) => r.status === "pending").length})` },
          { key: "toilets", label: `Toilets (${restrooms.length})` },
          { key: "users", label: `Users (${profiles.length})` },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition min-h-[44px] ${
                isActive
                  ? "bg-surface-card text-text-primary shadow-sm dark:bg-dark-card dark:text-text-inverse"
                  : "text-text-secondary hover:text-text-primary dark:hover:text-text-inverse"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {dataLoading ? (
        <div className="py-12 flex justify-center">
          <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase animate-pulse">Fetching Logs...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* TAB 1: REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <p className="text-sm italic text-text-secondary text-center py-8">No flag reports submitted yet.</p>
              ) : (
                reports.map((report) => {
                  const relatedRestroom = restrooms.find((r) => r.id === report.restroom_id);
                  return (
                    <div
                      key={report.id}
                      className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-4 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-redLight text-brand-red uppercase border border-brand-red/10">
                            Reason: {report.reason.replace("_", " ")}
                          </span>
                          <h3 className="font-semibold text-base mt-2 text-text-primary dark:text-text-inverse">
                            Toilet: {relatedRestroom?.name || "Deleted Restroom"}
                          </h3>
                          <p className="text-xs text-text-secondary mt-0.5">
                            Reported on: {new Date(report.created_at).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            report.status === "pending"
                              ? "bg-brand-yellowLight text-brand-yellow"
                              : report.status === "resolved"
                              ? "bg-brand-greenLight text-brand-green"
                              : "bg-surface-muted text-text-secondary dark:bg-dark-muted"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed bg-surface-muted dark:bg-dark-muted p-3 rounded-xl border border-surface-border dark:border-dark-border">
                        Details: &ldquo;{report.details || "No explanation details provided."}&rdquo;
                      </p>

                      {report.status === "pending" && (
                        <div className="flex gap-2 justify-end mt-2">
                          <Button
                            onClick={() => handleResolveReport(report.id, "dismissed")}
                            variant="secondary"
                            className="h-9 px-3 text-xs"
                            disabled={!!actionLoading}
                          >
                            Dismiss Report
                          </Button>
                          <Button
                            onClick={() => handleResolveReport(report.id, "resolved")}
                            variant="primary"
                            className="h-9 px-3 text-xs bg-brand-green text-text-inverse"
                            disabled={!!actionLoading}
                          >
                            Mark Resolved
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: TOILETS LIST */}
          {activeTab === "toilets" && (
            <div className="space-y-4">
              {restrooms.map((restroom) => (
                <div
                  key={restroom.id}
                  className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-4 flex gap-4"
                >
                  <div className="w-16 h-16 rounded-xl bg-surface-muted dark:bg-dark-muted overflow-hidden flex-shrink-0 flex items-center justify-center border border-surface-border dark:border-dark-border">
                    {restroom.public_image_url ? (
                      <img src={restroom.public_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] font-bold text-text-disabled">NO IMAGE</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-base truncate">{restroom.name}</h3>
                        <p className="text-xs text-text-secondary truncate">{restroom.location_name}</p>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        {restroom.is_hidden && (
                          <span className="bg-brand-redLight text-brand-red border border-brand-red/10 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            HIDDEN
                          </span>
                        )}
                        <span className="bg-surface-muted dark:bg-dark-muted text-text-secondary text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Score: {restroom.overall_score.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-surface-border dark:border-dark-border">
                      <Button
                        onClick={() => handleToggleHideRestroom(restroom)}
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        disabled={actionLoading === `hide-${restroom.id}`}
                      >
                        {restroom.is_hidden ? "Show Toilet" : "Hide Toilet"}
                      </Button>

                      {restroom.backup_image_url && (
                        <Button
                          onClick={() => handleRestoreBackupImage(restroom)}
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          disabled={actionLoading === `restore-img-${restroom.id}`}
                        >
                          Restore Backup Image
                        </Button>
                      )}

                      <Button
                        onClick={() => handleDeleteRestroom(restroom.id)}
                        variant="danger"
                        className="h-8 px-3 text-xs ml-auto"
                        disabled={actionLoading === `delete-${restroom.id}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: USERS MODERATION */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Search user profiles by email address..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full h-11 border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-green transition"
                />
              </div>

              {filteredProfiles.length === 0 ? (
                <p className="text-sm italic text-text-secondary text-center py-8">No profiles found.</p>
              ) : (
                filteredProfiles.map((prof) => (
                  <div
                    key={prof.id}
                    className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary dark:text-text-inverse">
                        {prof.full_name || "Anonymous User"}
                      </h4>
                      <p className="text-xs text-text-secondary mt-0.5">{prof.email}</p>
                      
                      <div className="flex gap-1.5 mt-2">
                        {prof.is_admin && (
                          <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                            ADMIN
                          </span>
                        )}
                        {prof.is_banned && (
                          <span className="bg-brand-redLight text-brand-red border border-brand-red/10 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                            BANNED
                          </span>
                        )}
                      </div>
                    </div>

                    {!prof.is_admin && (
                      <Button
                        onClick={() => handleToggleBanUser(prof)}
                        variant={prof.is_banned ? "secondary" : "danger"}
                        className="h-9 px-3 text-xs"
                        disabled={actionLoading === `ban-${prof.id}`}
                      >
                        {prof.is_banned ? "Unban User" : "Ban User"}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Confirm Dialog Modal Overlay */}
      {confirmAction && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card dark:bg-dark-card w-full max-w-sm rounded-2xl p-6 border border-surface-border dark:border-dark-border shadow-2xl flex flex-col gap-4 text-center animate-fade-in">
            <span className="text-3xl">⚠️</span>
            <h3 className="font-bold text-text-primary dark:text-text-inverse text-lg">Are you sure?</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-3 mt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-brand-red text-text-inverse"
                fullWidth
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
