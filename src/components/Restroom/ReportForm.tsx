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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-[2rem] sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
            Report Incorrect Info
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-400"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
            <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
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
                  className={`h-11 px-3 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-colors ${
                    reason === item.value
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "bg-white dark:bg-stone-900 border-stone-250 dark:border-stone-800 text-stone-700 dark:text-stone-300"
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
            <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Provide Details
            </label>
            <textarea
              required
              rows={4}
              maxLength={400}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please describe exactly what is wrong or incorrect with this toilet listing..."
              className="w-full rounded-xl border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 p-3 text-xs leading-relaxed focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-none placeholder-stone-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 border border-stone-200 dark:border-stone-850 dark:text-stone-300 font-bold rounded-xl active:scale-95 transition-transform text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center text-sm"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
