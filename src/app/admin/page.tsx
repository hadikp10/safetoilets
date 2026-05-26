"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/hooks/useSupabase";
import { Restroom, Report, Profile } from "@/types";
import { ArrowLeft } from "lucide-react";

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <svg className="animate-spin h-5 w-5 text-[#2F9E44]" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-white px-4 py-8 animate-fadeIn text-left">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4 border-b border-[#E9E9E7] pb-4">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg bg-white border border-[#E9E9E7] flex items-center justify-center shadow-button text-[#191919] hover:bg-[#EFEEEB] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold text-[#191919] tracking-tight">
                Admin Dashboard
              </h1>
              <span className="bg-[#EBFBEE] text-[#1E6E2E] text-xs font-semibold px-2 py-0.5 rounded-md border border-[#2F9E44]/20">
                Moderator
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Active: {profile.email}
            </p>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-[#2F9E44]/10 border border-[#2F9E44]/30 text-[#1E6E2E] p-3 rounded-lg text-xs font-medium mb-2 animate-fadeIn">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-[#E03131]/10 border border-[#E03131]/30 text-[#C21010] p-3 rounded-lg text-xs font-medium mb-2 animate-fadeIn">
            {errorMsg}
          </div>
        )}

        {/* Segmented control tabs */}
        <div className="flex bg-[#F7F7F5] p-1 rounded-xl border border-[#E9E9E7] mb-2">
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
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition min-h-[36px] ${
                  isActive
                    ? "bg-white text-[#191919] border border-[#E9E9E7] shadow-sm font-semibold"
                    : "text-[#6B6B6B] hover:text-[#191919]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {dataLoading ? (
          <div className="py-12 flex justify-center items-center">
            <svg className="animate-spin h-5 w-5 text-[#2F9E44]" viewBox="0 0 24 24">
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
                  <p className="text-sm italic text-[#6B6B6B] text-center py-8">No flag reports submitted yet.</p>
                ) : (
                  <div className="bg-white border border-[#E9E9E7] rounded-xl overflow-hidden divide-y divide-[#E9E9E7]">
                    {reports.map((report) => {
                      const relatedRestroom = restrooms.find((r) => r.id === report.restroom_id);
                      return (
                        <div
                          key={report.id}
                          className="p-4 flex flex-col gap-3 hover:bg-[#F7F7F5]/50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FFF0F0] text-[#C21010] border border-[#E03131]/20 uppercase">
                                  Reason: {report.reason.replace("_", " ")}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border ${
                                    report.status === "pending"
                                      ? "bg-[#FFF4E6] text-[#B85C00] border-[#E67700]/30"
                                      : report.status === "resolved"
                                      ? "bg-[#EBFBEE] text-[#1E6E2E] border-[#2F9E44]/30"
                                      : "bg-[#F7F7F5] text-[#6B6B6B] border-[#E9E9E7]"
                                  }`}
                                >
                                  {report.status}
                                </span>
                              </div>
                              <h3 className="font-semibold text-[14px] text-[#191919] mt-1">
                                Toilet: {relatedRestroom?.name || "Deleted Restroom"}
                              </h3>
                              <p className="text-[11px] text-[#999999] font-mono">
                                Reported on: {new Date(report.created_at).toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>

                          <div className="bg-[#F7F7F5] border-l-2 border-[#D3D3CF] p-2.5 rounded-r-lg text-xs text-[#6B6B6B] italic font-mono">
                            Details: &ldquo;{report.details || "No explanation details provided."}&rdquo;
                          </div>

                          {report.status === "pending" && (
                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                onClick={() => handleResolveReport(report.id, "dismissed")}
                                className="h-8 px-3 text-xs bg-white border border-[#E9E9E7] text-[#6B6B6B] hover:bg-[#EFEEEB] rounded-lg transition-colors font-medium"
                                disabled={!!actionLoading}
                              >
                                Dismiss Report
                              </button>
                              <button
                                onClick={() => handleResolveReport(report.id, "resolved")}
                                className="h-8 px-3 text-xs bg-[#2F9E44] hover:bg-[#27822E] text-white rounded-lg transition-colors font-medium"
                                disabled={!!actionLoading}
                              >
                                Mark Resolved
                              </button>
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
              <div className="bg-white border border-[#E9E9E7] rounded-xl overflow-hidden divide-y divide-[#E9E9E7]">
                {restrooms.map((restroom) => (
                  <div
                    key={restroom.id}
                    className="p-4 flex gap-4 hover:bg-[#F7F7F5]/50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg bg-[#F7F7F5] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#E9E9E7]/50 relative">
                      {restroom.public_image_url ? (
                        <img src={restroom.public_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-medium text-[#999999]">NO IMAGE</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-semibold text-[14px] text-[#191919] truncate leading-snug">{restroom.name}</h3>
                          <p className="text-[12px] text-[#6B6B6B] truncate">{restroom.location_name}</p>
                        </div>

                        <div className="flex gap-1.5 flex-shrink-0">
                          {restroom.is_hidden && (
                            <span className="bg-[#FFF0F0] text-[#C21010] border border-[#E03131]/20 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                              HIDDEN
                            </span>
                          )}
                          <span className="bg-[#F7F7F5] border border-[#E9E9E7] text-[#6B6B6B] text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono">
                            Score: {restroom.overall_score.toFixed(1)} ★
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#E9E9E7] items-center">
                        <button
                          onClick={() => handleToggleHideRestroom(restroom)}
                          className="h-8 px-3 text-xs bg-white border border-[#E9E9E7] text-[#6B6B6B] hover:bg-[#EFEEEB] rounded-lg transition-colors font-medium"
                          disabled={actionLoading === `hide-${restroom.id}`}
                        >
                          {restroom.is_hidden ? "Show Toilet" : "Hide Toilet"}
                        </button>

                        {restroom.backup_image_url && (
                          <button
                            onClick={() => handleRestoreBackupImage(restroom)}
                            className="h-8 px-3 text-xs bg-white border border-[#E9E9E7] text-[#6B6B6B] hover:bg-[#EFEEEB] rounded-lg transition-colors font-medium"
                            disabled={actionLoading === `restore-img-${restroom.id}`}
                          >
                            Restore Backup Image
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteRestroom(restroom.id)}
                          className="h-8 px-3 text-xs bg-white border border-[#E03131]/30 text-[#C21010] hover:bg-[#FFF0F0] rounded-lg transition-colors font-medium ml-auto"
                          disabled={actionLoading === `delete-${restroom.id}`}
                        >
                          Delete
                        </button>
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
                    className="w-full h-10 border border-[#E9E9E7] bg-white rounded-lg px-3 text-xs font-normal text-[#191919] placeholder-[#999999] focus:outline-none focus:border-[#2F9E44] transition-colors"
                  />
                </div>

                {filteredProfiles.length === 0 ? (
                  <p className="text-sm italic text-[#6B6B6B] text-center py-8">No profiles found.</p>
                ) : (
                  <div className="bg-white border border-[#E9E9E7] rounded-xl overflow-hidden divide-y divide-[#E9E9E7]">
                    {filteredProfiles.map((prof) => (
                      <div
                        key={prof.id}
                        className="p-4 flex items-center justify-between hover:bg-[#F7F7F5]/50 transition-colors"
                      >
                        <div>
                          <h4 className="font-semibold text-[14px] text-[#191919]">
                            {prof.full_name || "Anonymous User"}
                          </h4>
                          <p className="text-xs text-[#6B6B6B] font-mono mt-0.5">{prof.email}</p>
                          
                          <div className="flex gap-1.5 mt-2">
                            {prof.is_admin && (
                              <span className="bg-[#EBFBEE] text-[#1E6E2E] border border-[#2F9E44]/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                ADMIN
                              </span>
                            )}
                            {prof.is_banned && (
                              <span className="bg-[#FFF0F0] text-[#C21010] border border-[#E03131]/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                BANNED
                              </span>
                            )}
                          </div>
                        </div>

                        {!prof.is_admin && (
                          <button
                            onClick={() => handleToggleBanUser(prof)}
                            className={`h-8 px-3 text-xs rounded-lg transition-colors font-medium border ${
                              prof.is_banned
                                ? "bg-white border-[#E9E9E7] text-[#6B6B6B] hover:bg-[#EFEEEB]"
                                : "bg-white border-[#E03131]/30 text-[#C21010] hover:bg-[#FFF0F0]"
                            }`}
                            disabled={actionLoading === `ban-${prof.id}`}
                          >
                            {prof.is_banned ? "Unban User" : "Ban User"}
                          </button>
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
        <div className="fixed inset-0 z-[110] bg-[#191919]/25 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 border border-[#E03131]/30 shadow-lg flex flex-col gap-4 text-center animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-[#FFF0F0] border border-[#E03131]/20 flex items-center justify-center mx-auto">
              <span className="text-sm font-semibold text-[#C21010]">⚠️</span>
            </div>
            <h3 className="font-semibold text-[#191919] text-base">Are you sure?</h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-2 mt-2">
              <button
                className="flex-1 h-9 text-xs bg-white border border-[#E9E9E7] text-[#6B6B6B] hover:bg-[#EFEEEB] rounded-lg transition-colors font-medium"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 h-9 text-xs bg-[#E03131] hover:bg-[#C21010] text-white rounded-lg transition-colors font-medium"
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
