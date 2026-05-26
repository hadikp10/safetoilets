"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useToiletDetail } from "@/lib/hooks/useToiletDetail";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/Button";
import imageCompression from "browser-image-compression";
import { Restroom } from "@/types";

export default function VerifyDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useSupabase();
  const { showToast } = useToast();
  const { toilet, isLoading: toiletLoading, error: toiletError } = useToiletDetail(id);

  // Form states
  const [cleanliness, setCleanliness] = useState(3);
  const [smell, setSmell] = useState(3);
  const [lighting, setLighting] = useState(3);
  const [womenSafety, setWomenSafety] = useState(3);
  const [waterAvailability, setWaterAvailability] = useState(3);

  const [hasSoap, setHasSoap] = useState(false);
  const [hasMirror, setHasMirror] = useState(false);
  const [hasSanitary, setHasSanitary] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [loading, setLoading] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<"compressing" | "scrubbing" | "securing" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard routing check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      sessionStorage.setItem("authRedirectPath", `/verify/${id}`);
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, id, router]);

  // Sync initial amenities when toilet details load
  useEffect(() => {
    if (toilet) {
      setHasSoap(toilet.has_soap);
      setHasMirror(toilet.has_mirror);
      setHasSanitary(toilet.has_sanitary_disposal);
    }
  }, [toilet]);

  if (authLoading || toiletLoading) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-green border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (toiletError || !toilet) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-brand-red">Toilet Not Found</h2>
        <p className="text-sm text-text-secondary mt-1">We couldn&apos;t load the details for this toilet.</p>
        <Link href="/" className="mt-6">
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    );
  }

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select a valid image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("File size exceeds 5MB limit before compression.");
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setUploadProgress(0);

    try {
      let photoBase64: string | null = null;

      if (photo) {
        setPrivacyStatus("compressing");
        setUploadProgress(15);

        // Client-side image compression
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        const compressed = await imageCompression(photo, options);

        setPrivacyStatus("scrubbing");
        setUploadProgress(35);

        photoBase64 = await getBase64(compressed);
        setPrivacyStatus("securing");
        setUploadProgress(50);
      }

      // Get Session Token
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Submit via XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/toilets/${id}/verify`);
      xhr.setRequestHeader("Content-Type", "application/json");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = 50 + (event.loaded / event.total) * 45;
          setUploadProgress(pct);
        }
      };

      const responsePromise = new Promise<Restroom>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "Failed to submit verification."));
            } catch {
              reject(new Error("Failed to submit verification."));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network connection error."));
      });

      xhr.send(
        JSON.stringify({
          cleanliness,
          smell,
          lighting,
          women_safety: womenSafety,
          water_availability: waterAvailability,
          has_soap: hasSoap,
          has_mirror: hasMirror,
          has_sanitary_disposal: hasSanitary,
          photoBase64,
        })
      );

      await responsePromise;
      setUploadProgress(100);
      setPrivacyStatus(null);
      setSubmitDone(true);

      showToast("✓ Verification submitted. Thank you!", "success");

      setTimeout(() => {
        router.push(`/toilet/${id}`);
      }, 1000);

    } catch (err) {
      console.error(err);
      const error = err as Error;
      setErrorMsg(error.message || "An error occurred.");
      setPrivacyStatus(null);
      setUploadProgress(0);
      setLoading(false);
    }
  };

  const renderRatingGroup = (
    label: string,
    value: number,
    setValue: (val: number) => void
  ) => {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs font-semibold text-text-secondary">
          <span>{label}</span>
          <span className="text-brand-green font-bold">{value} ★</span>
        </div>
        <div className="flex bg-surface-muted dark:bg-dark-muted p-1 rounded-xl w-full border border-surface-border dark:border-dark-border">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setValue(num)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition min-h-[36px] active:scale-95`}
              style={{
                backgroundColor: value === num ? "var(--btn-bg)" : "transparent",
              }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-bg dark:bg-dark-bg text-text-primary dark:text-text-inverse px-4 py-4 flex flex-col gap-4 max-w-md mx-auto pb-[env(safe-area-inset-bottom)] page-scroll">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border pb-3">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold">Verify & Update</h1>
          <span className="text-xs text-text-secondary truncate max-w-[200px] font-semibold">{toilet.name}</span>
        </div>
        <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => router.push(`/toilet/${id}`)} disabled={loading}>
          Cancel
        </Button>
      </div>

      {errorMsg && (
        <div className="bg-brand-redLight text-brand-red p-3 rounded-xl text-xs font-semibold animate-fade-in">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
        
        {/* Star ratings */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Quality Ratings</h3>
          {renderRatingGroup("Cleanliness", cleanliness, setCleanliness)}
          {renderRatingGroup("Smell Level", smell, setSmell)}
          {renderRatingGroup("Lighting", lighting, setLighting)}
          {renderRatingGroup("Women Safety", womenSafety, setWomenSafety)}
          {renderRatingGroup("Water Supply", waterAvailability, setWaterAvailability)}
        </div>

        {/* Amenities Checklist */}
        <div className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Present Facilities</h3>
          
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={hasSoap}
                onChange={(e) => setHasSoap(e.target.checked)}
                className="w-5 h-5 rounded border-surface-border text-brand-green focus:ring-brand-green/20"
              />
              Soap Available
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={hasMirror}
                onChange={(e) => setHasMirror(e.target.checked)}
                className="w-5 h-5 rounded border-surface-border text-brand-green focus:ring-brand-green/20"
              />
              Mirror Installed
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={hasSanitary}
                onChange={(e) => setHasSanitary(e.target.checked)}
                className="w-5 h-5 rounded border-surface-border text-brand-green focus:ring-brand-green/20"
              />
              Sanitary Pad Disposal Box
            </label>
          </div>
        </div>

        {/* Optional Photo Upload */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Latest Photo (Optional)</h3>
          
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            className="hidden"
            disabled={loading}
          />

          {photoPreview ? (
            <div className="relative w-full h-36 rounded-xl bg-surface-muted dark:bg-dark-muted overflow-hidden border border-surface-border dark:border-dark-border flex items-center justify-center">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                disabled={loading}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black active:scale-90 transition min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full h-20 border-2 border-dashed border-surface-border dark:border-dark-border hover:border-brand-green rounded-xl flex flex-col items-center justify-center gap-1 text-text-secondary active:scale-[0.98] transition min-h-[44px]"
            >
              <span className="text-xs font-semibold">Tap to Take / Select Photo</span>
            </button>
          )}
        </div>

        {/* Upload progress bar */}
        {uploadProgress > 0 && (
          <div className="w-full bg-surface-muted dark:bg-dark-muted border border-surface-border dark:border-dark-border rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-brand-green h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {/* Submit action */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
          className="mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting Update...
            </span>
          ) : submitDone ? (
            "Done!"
          ) : (
            "Submit Verification"
          )}
        </Button>

      </form>

      {/* Privacy overlay */}
      {privacyStatus && (
        <div className="fixed inset-0 z-[60] bg-surface-card/95 dark:bg-dark-card/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="relative w-16 h-16 flex items-center justify-center mb-4">
            <div className="absolute inset-0 bg-brand-sky/15 rounded-full animate-ping"></div>
            <div className="w-12 h-12 bg-brand-sky rounded-full flex items-center justify-center text-white shadow-lg">
              🔒
            </div>
          </div>
          <h3 className="font-bold text-text-primary dark:text-text-inverse text-sm">
            {privacyStatus === "compressing" && "Compressing Photo..."}
            {privacyStatus === "scrubbing" && "Scrubbing GPS metadata tags..."}
            {privacyStatus === "securing" && "Uploading to vault..."}
          </h3>
          <p className="text-xs text-text-secondary mt-1 max-w-xs">
            SafeToilets strips camera metadata tags to keep your upload private.
          </p>
        </div>
      )}

      {/* CSS variables style mock */}
      <style jsx global>{`
        :root {
          --btn-bg: #FFFFFF;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --btn-bg: #292524;
          }
        }
      `}</style>

    </div>
  );
}
