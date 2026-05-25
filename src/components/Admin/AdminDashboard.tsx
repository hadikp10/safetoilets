import { useState, useEffect } from "react";
import Link from "next/link";
import { Restroom, Report, Profile } from "@/types";
import { supabase } from "@/lib/supabase";

interface AdminDashboardProps {
  currentProfile: Profile;
}

export default function AdminDashboard({ currentProfile }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"reports" | "restrooms" | "users">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search filter for users
  const [searchEmail, setSearchEmail] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch reports sorted by pending
      const { data: repData, error: repError } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (repError) throw repError;
      setReports(repData as Report[]);

      // 2. Fetch all restrooms (including hidden ones)
      const { data: restData, error: restError } = await supabase
        .from("restrooms")
        .select("*")
        .order("created_at", { ascending: false });
      if (restError) throw restError;
      setRestrooms(restData as Restroom[]);

      // 3. Fetch profiles
      const { data: profData, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .limit(100);
      if (profError) throw profError;
      setProfiles(profData as Profile[]);
    } catch (err) {
      setErrorMsg((err as Error).message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, callback: () => Promise<void>) => {
    setActionLoading(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await callback();
      setSuccessMsg("Action completed successfully.");
      await fetchData();
    } catch (err) {
      setErrorMsg((err as Error).message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // Report Actions
  const handleResolveReport = (reportId: string, status: "resolved" | "dismissed") => {
    handleAction(`report-${reportId}`, async () => {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", reportId);
      if (error) throw error;
      
      // Log admin action
      await supabase.from("admin_actions").insert({
        admin_id: currentProfile.id,
        action: "resolve_report",
        target_id: reportId,
        details: `Report status set to ${status}`,
      });
    });
  };

  // Restroom visibility visibility toggle
  const handleToggleHideRestroom = (restroom: Restroom) => {
    handleAction(`hide-${restroom.id}`, async () => {
      const { error } = await supabase
        .from("restrooms")
        .update({ is_hidden: !restroom.is_hidden })
        .eq("id", restroom.id);
      if (error) throw error;

      // Log admin action
      await supabase.from("admin_actions").insert({
        admin_id: currentProfile.id,
        action: restroom.is_hidden ? "unhide_restroom" : "hide_restroom",
        target_id: restroom.id,
        details: `Restroom visible set to ${restroom.is_hidden}`,
      });
    });
  };

  // Delete restroom completely
  const handleDeleteRestroom = (restroomId: string) => {
    if (!confirm("Are you absolutely sure you want to delete this toilet listing? This will also delete all associated ratings and verifications.")) return;
    handleAction(`delete-${restroomId}`, async () => {
      const { error } = await supabase
        .from("restrooms")
        .delete()
        .eq("id", restroomId);
      if (error) throw error;

      // Log admin action
      await supabase.from("admin_actions").insert({
        admin_id: currentProfile.id,
        action: "delete_restroom",
        target_id: restroomId,
      });
    });
  };

  // Restore previous image
  const handleRestoreBackupImage = (restroom: Restroom) => {
    if (!restroom.backup_image_url) {
      alert("No backup image exists for this restroom.");
      return;
    }
    handleAction(`restore-img-${restroom.id}`, async () => {
      // Swap public and backup image URL
      const { error } = await supabase
        .from("restrooms")
        .update({
          public_image_url: restroom.backup_image_url,
          backup_image_url: restroom.public_image_url,
        })
        .eq("id", restroom.id);
      
      if (error) throw error;

      await supabase.from("admin_actions").insert({
        admin_id: currentProfile.id,
        action: "restore_image",
        target_id: restroom.id,
        details: `Swapped public image (${restroom.public_image_url}) with backup (${restroom.backup_image_url})`,
      });
    });
  };

  // User Ban toggle
  const handleToggleBanUser = (profile: Profile) => {
    const actionWord = profile.is_banned ? "unban" : "ban";
    if (!confirm(`Are you sure you want to ${actionWord} user ${profile.email}?`)) return;
    handleAction(`ban-${profile.id}`, async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: !profile.is_banned })
        .eq("id", profile.id);
      if (error) throw error;

      await supabase.from("admin_actions").insert({
        admin_id: currentProfile.id,
        action: profile.is_banned ? "unban_user" : "ban_user",
        target_id: profile.id,
      });
    });
  };

  const filteredProfiles = profiles.filter((p) =>
    p.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header section */}
      <div className="flex justify-between items-center mb-8 border-b border-stone-200 dark:border-stone-850 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-stone-500 font-semibold mt-0.5">
            Logged in as Admin: {currentProfile.email}
          </p>
        </div>
        <Link href="/" className="h-10 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 rounded-xl font-bold flex items-center justify-center text-xs transition-colors">
          Return to App
        </Link>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-250 text-xs font-bold mb-6">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-250 text-xs font-bold mb-6">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-850 mb-6">
        {[
          { key: "reports", label: `Reports (${reports.filter((r) => r.status === "pending").length})` },
          { key: "restrooms", label: `Toilets (${restrooms.length})` },
          { key: "users", label: `Users (${profiles.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "reports" | "restrooms" | "users")}
            className={`px-4 py-3 font-extrabold text-sm border-b-2 -mb-[2px] transition-colors ${
              activeTab === tab.key
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <svg className="animate-spin h-8 w-8 text-black dark:text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <>
          {/* TAB 1: REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <p className="text-sm italic text-stone-400 text-center py-8">No flag reports submitted yet.</p>
              ) : (
                reports.map((report) => {
                  const relatedRestroom = restrooms.find((r) => r.id === report.restroom_id);
                  return (
                    <div
                      key={report.id}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 uppercase border border-rose-200 dark:border-rose-900">
                            Reason: {report.reason.replace("_", " ")}
                          </span>
                          <h3 className="font-bold text-base mt-2 text-stone-900 dark:text-stone-50">
                            Toilet: {relatedRestroom?.name || "Deleted Restroom"}
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Reported on: {new Date(report.created_at).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                            report.status === "pending"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                              : report.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <p className="text-stone-700 dark:text-stone-300 text-xs leading-relaxed bg-stone-50 dark:bg-stone-850 p-3 rounded-lg border border-stone-100 dark:border-stone-800/40">
                        Details: &ldquo;{report.details || "No explanation details provided."}&rdquo;
                      </p>

                      {report.status === "pending" && (
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                            onClick={() => handleResolveReport(report.id, "dismissed")}
                            className="h-9 px-4 border border-stone-200 dark:border-stone-800 text-xs font-bold rounded-xl active:scale-95 transition-transform"
                            disabled={!!actionLoading}
                          >
                            Dismiss Report
                          </button>
                          <button
                            onClick={() => handleResolveReport(report.id, "resolved")}
                            className="h-9 px-4 bg-black text-white dark:bg-white dark:text-black text-xs font-bold rounded-xl active:scale-95 transition-transform"
                            disabled={!!actionLoading}
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: TOILETS LIST */}
          {activeTab === "restrooms" && (
            <div className="space-y-4">
              {restrooms.map((restroom) => (
                <div
                  key={restroom.id}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 flex gap-4"
                >
                  {/* Small avatar image */}
                  <div className="w-16 h-16 rounded-lg bg-stone-100 dark:bg-stone-850 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 dark:border-stone-800">
                    {restroom.public_image_url ? (
                      <img src={restroom.public_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-stone-400">NO IMAGE</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-base text-stone-900 dark:text-stone-50 truncate">
                          {restroom.name}
                        </h3>
                        <p className="text-xs text-stone-500 truncate">{restroom.location_name}</p>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        {restroom.is_hidden && (
                          <span className="bg-rose-50 text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-rose-200">
                            HIDDEN
                          </span>
                        )}
                        <span className="bg-stone-100 dark:bg-stone-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Score: {restroom.overall_score.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-stone-100 dark:border-stone-850/60">
                      {/* Hide/Unhide */}
                      <button
                        onClick={() => handleToggleHideRestroom(restroom)}
                        className={`h-8 px-3 rounded-lg text-xs font-bold active:scale-95 transition-transform ${
                          restroom.is_hidden
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-50 border border-stone-250 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300"
                        }`}
                        disabled={actionLoading === `hide-${restroom.id}`}
                      >
                        {restroom.is_hidden ? "Show Toilet" : "Hide Toilet"}
                      </button>

                      {/* Restore Image */}
                      {restroom.backup_image_url && (
                        <button
                          onClick={() => handleRestoreBackupImage(restroom)}
                          className="h-8 px-3 bg-stone-50 border border-stone-250 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                          disabled={actionLoading === `restore-img-${restroom.id}`}
                        >
                          Restore Backup Image
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteRestroom(restroom.id)}
                        className="h-8 px-3 bg-rose-50 text-rose-700 border border-rose-250 rounded-lg text-xs font-bold active:scale-95 transition-transform ml-auto"
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
            <div className="space-y-4">
              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Search user profiles by email address..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full h-11 border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>

              {filteredProfiles.length === 0 ? (
                <p className="text-sm italic text-stone-400 text-center py-8">No profiles found.</p>
              ) : (
                filteredProfiles.map((prof) => (
                  <div
                    key={prof.id}
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-stone-905 dark:text-stone-50">
                        {prof.full_name || "Anonymous User"}
                      </h4>
                      <p className="text-xs text-stone-450 dark:text-stone-500 mt-0.5">{prof.email}</p>
                      
                      <div className="flex gap-1.5 mt-2">
                        {prof.is_admin && (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            ADMIN
                          </span>
                        )}
                        {prof.is_banned && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            BANNED
                          </span>
                        )}
                      </div>
                    </div>

                    {!prof.is_admin && (
                      <button
                        onClick={() => handleToggleBanUser(prof)}
                        className={`h-9 px-4 rounded-xl text-xs font-bold active:scale-95 transition-transform ${
                          prof.is_banned
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
                            : "bg-rose-50 text-rose-700 border border-rose-250"
                        }`}
                        disabled={actionLoading === `ban-${prof.id}`}
                      >
                        {prof.is_banned ? "Unban User" : "Ban User"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
