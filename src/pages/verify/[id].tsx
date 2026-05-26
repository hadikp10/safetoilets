import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";
import { Restroom } from "@/types";
import { compressImage } from "@/lib/imageCompressor";
import { useToast } from "@/hooks/useToast";

export default function VerifyPage() {
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const { user, isAuthenticated, loading: authLoading } = useSupabase();

  // Navigation & Loading states
  const [restroom, setRestroom] = useState<Restroom | null>(null);
  const [loadingRestroom, setLoadingRestroom] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Ratings (pre-filled with current averages rounded)
  const [cleanliness, setCleanliness] = useState(3);
  const [smell, setSmell] = useState(3);
  const [lighting, setLighting] = useState(3);
  const [womenSafety, setWomenSafety] = useState(3);
  const [waterAvailability, setWaterAvailability] = useState(3);

  // Step 2: Facilities
  const [hasSoap, setHasSoap] = useState(false);
  const [hasMirror, setHasMirror] = useState(false);
  const [hasSanitary, setHasSanitary] = useState(false);

  // Step 3: Photo
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    // Auth redirect
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading]);

  const fetchRestroom = async (restroomId: string) => {
    try {
      const { data, error } = await supabase
        .from("restrooms")
        .select("*")
        .eq("id", restroomId)
        .single();
      
      if (error) throw error;
      
      const r = data as Restroom;
      setRestroom(r);
      
      // Pre-fill ratings
      setCleanliness(r.avg_cleanliness > 0 ? Math.round(r.avg_cleanliness) : 3);
      setSmell(r.avg_smell > 0 ? Math.round(r.avg_smell) : 3);
      setLighting(r.avg_lighting > 0 ? Math.round(r.avg_lighting) : 3);
      setWomenSafety(r.avg_women_safety > 0 ? Math.round(r.avg_women_safety) : 3);
      setWaterAvailability(r.avg_water_availability > 0 ? Math.round(r.avg_water_availability) : 3);

      // Pre-fill facilities
      setHasSoap(r.has_soap);
      setHasMirror(r.has_mirror);
      setHasSanitary(r.has_sanitary_disposal);
    } catch (err) {
      console.error("Error loading restroom for verification:", err);
      toast.error("Toilet not found.");
      router.push("/");
    } finally {
      setLoadingRestroom(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestroom(id as string);
    }
  }, [id]);

  const handleNext = () => {
    setErrorMsg(null);
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setStep(prev => prev - 1);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select a valid image file.");
        triggerHaptic([30, 20, 30]);
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restroom || !user) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      let uploadedImageUrl: string | null = null;

      // 1. Upload photo if selected
      if (photo) {
        const compressedBlob = await compressImage(photo);
        const fileName = `${restroom.id}/${Date.now()}-verify.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("restroom-photos")
          .upload(fileName, compressedBlob, {
            contentType: "image/jpeg",
            cacheControl: "3600",
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("restroom-photos")
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      }

      // 2. Insert verification row
      const { error: dbError } = await supabase
        .from("restroom_verifications")
        .insert({
          restroom_id: restroom.id,
          user_id: user.id,
          cleanliness,
          smell,
          lighting,
          women_safety: womenSafety,
          water_availability: waterAvailability,
          has_soap: hasSoap,
          has_mirror: hasMirror,
          has_sanitary_disposal: hasSanitary,
          image_url: uploadedImageUrl,
        });

      if (dbError) throw dbError;

      // 3. Update restroom updated_at timestamp to now
      const { error: updateError } = await supabase
        .from("restrooms")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", restroom.id);

      if (updateError) throw updateError;

      // Success
      triggerHaptic(50);
      toast.success("✓ Verified. Thank you!");
      router.push(`/toilet/${restroom.id}`);
    } catch (err) {
      console.error("Verification submit error:", err);
      setErrorMsg((err as Error).message || "Failed to submit verification.");
      triggerHaptic([30, 20, 30]);
      setSubmitting(false);
    }
  };

  const renderRatingSelectors = (
    label: string,
    value: number,
    setValue: (val: number) => void
  ) => {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
          <span>{label}</span>
          <span className="font-bold text-stone-900 dark:text-stone-50">{value} / 5</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setValue(num)}
              className={`flex-1 h-10 rounded-xl font-bold border transition-colors active:scale-[0.97] ${
                value === num
                  ? "bg-brand-green text-white border-brand-green shadow-button"
                  : "bg-white dark:bg-stone-900 border-[#E7E5E4] dark:border-stone-800 text-stone-600 dark:text-stone-400"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (loadingRestroom || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-brand-green" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!restroom) return null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-8 px-4 flex flex-col justify-center animate-fadeIn">
      <div className="max-w-md w-full mx-auto bg-white dark:bg-stone-900 rounded-3xl shadow-card border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
              Verify Toilet
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 max-w-[280px] truncate">
              {restroom.name}
            </p>
          </div>
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider bg-surface-muted dark:bg-stone-800 px-2.5 py-1 rounded-full">
            Step {step} of 3
          </span>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Ratings */}
        {step === 1 && (
          <div className="p-6 flex flex-col gap-5">
            {renderRatingSelectors("Cleanliness", cleanliness, setCleanliness)}
            {renderRatingSelectors("Smell Level (1 = heavy, 5 = fresh)", smell, setSmell)}
            {renderRatingSelectors("Lighting Quality", lighting, setLighting)}
            {renderRatingSelectors("Women Safety rating", womenSafety, setWomenSafety)}
            {renderRatingSelectors("Water Availability", waterAvailability, setWaterAvailability)}

            <div className="flex gap-3 mt-4">
              <Link
                href={`/toilet/${restroom.id}`}
                className="flex-1 h-[52px] border-[1.5px] border-brand-green text-brand-green font-semibold rounded-2xl flex items-center justify-center hover:bg-[#DCFCE7] active:scale-[0.97] transition-all text-sm"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-[52px] bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-2xl shadow-button active:scale-[0.97] transition-all text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Facilities Checklist */}
        {step === 2 && (
          <div className="p-6 flex flex-col gap-6">
            <div className="bg-surface-muted dark:bg-stone-850/50 rounded-xl p-4 border border-[#E7E5E4] dark:border-stone-800 flex flex-col gap-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Verify Amenities Present
              </h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none text-text-primary dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={hasSoap}
                    onChange={(e) => setHasSoap(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-brand-green focus:ring-brand-green dark:border-stone-700 dark:bg-stone-800"
                  />
                  Soap Available
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none text-text-primary dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={hasMirror}
                    onChange={(e) => setHasMirror(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-brand-green focus:ring-brand-green dark:border-stone-700 dark:bg-stone-800"
                  />
                  Mirror Installed
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none text-text-primary dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={hasSanitary}
                    onChange={(e) => setHasSanitary(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-brand-green focus:ring-brand-green dark:border-stone-700 dark:bg-stone-800"
                  />
                  Sanitary Pad Box / Bin
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-[52px] border-[1.5px] border-brand-green text-brand-green font-semibold rounded-2xl hover:bg-[#DCFCE7] active:scale-[0.97] transition-all text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-[52px] bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-2xl shadow-button active:scale-[0.97] transition-all text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Photo Upload & Submission */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Upload Latest Photo (Optional)
              </h4>
              
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative w-full h-36 rounded-2xl bg-surface-muted dark:bg-stone-850 overflow-hidden border border-[#E7E5E4] dark:border-stone-800 flex items-center justify-center">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 active:scale-[0.97] transition-transform"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-[#E7E5E4] dark:border-stone-800 hover:border-stone-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-text-secondary active:scale-[0.97] transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider">Tap to Take Photo</span>
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-[52px] border-[1.5px] border-brand-green text-brand-green font-semibold rounded-2xl hover:bg-[#DCFCE7] active:scale-[0.97] transition-all text-sm"
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 h-[52px] bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-2xl shadow-button active:scale-[0.97] transition-all flex items-center justify-center text-sm"
                disabled={submitting}
              >
                {submitting ? (
                  <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                ) : (
                  "Verify & Submit"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
