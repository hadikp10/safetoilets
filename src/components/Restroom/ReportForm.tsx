import { useState } from "react";
import { Restroom } from "@/types";
import { supabase } from "@/lib/supabase";

interface ReportFormProps {
  restroom: Restroom;
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ReportReason = "wrong_image" | "fake_restroom" | "closed_restroom" | "incorrect_information";

export default function ReportForm({
  restroom,
  userId,
  onClose,
  onSuccess,
}: ReportFormProps) {
  const [reason, setReason] = useState<ReportReason>("incorrect_information");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from("reports").insert({
        restroom_id: restroom.id,
        user_id: userId, // Optional, can be null for anonymous reports
        reason,
        details: details.trim() || null,
        status: "pending",
      });

      if (error) throw error;
      onSuccess();
    } catch (err) {
      console.error("Report submit error:", err);
      setErrorMsg((err as Error).message || "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-float flex flex-col border border-stone-200 dark:border-stone-800">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
            Report Incorrect Info
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-400"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Reason Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Reason for Report
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "incorrect_information", label: "Wrong Details" },
                { value: "closed_restroom", label: "Toilet Closed" },
                { value: "fake_restroom", label: "Fake Restroom" },
                { value: "wrong_image", label: "Wrong Image" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setReason(item.value as ReportReason)}
                  className={`h-11 px-3 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-all active:scale-[0.97] ${
                    reason === item.value
                      ? "bg-brand-green text-white border-brand-green shadow-button"
                      : "bg-surface-muted dark:bg-stone-800 border-[#E7E5E4] dark:border-stone-750 text-text-secondary"
                  }`}
                >
                  <span>{item.label}</span>
                  {reason === item.value && (
                    <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation Textarea */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Provide Details
            </label>
            <textarea
              required
              rows={4}
              maxLength={400}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please describe exactly what is wrong or incorrect with this toilet listing..."
              className="w-full rounded-xl border border-[#E7E5E4] dark:border-stone-850 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 p-3 text-xs leading-relaxed focus:outline-none focus:border-brand-green transition-colors resize-none placeholder-stone-400 font-medium"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[52px] border-[1.5px] border-brand-green text-brand-green font-semibold rounded-2xl hover:bg-[#DCFCE7] active:scale-[0.97] transition-all duration-150 text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-[52px] bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-2xl shadow-button active:scale-[0.97] transition-all duration-150 flex items-center justify-center text-sm"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
              ) : (
                "Submit Report"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
