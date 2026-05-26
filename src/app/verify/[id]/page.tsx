"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useToiletDetail } from "@/lib/hooks/useToiletDetail";
import { useToast } from "@/context/ToastContext";
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-[#2F9E44]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (toiletError || !toilet) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto animate-fadeIn">
        <div className="w-10 h-10 border-[1.5px] border-[#D3D3CF] rounded-xl flex items-center justify-center text-xl text-[#999999] font-mono mb-4">
          ?
        </div>
        <h2 className="text-base font-medium text-[#191919]">Toilet Not Found</h2>
        <p className="text-sm text-[#6B6B6B] mt-1.5 leading-relaxed">We couldn&apos;t load the details for this toilet.</p>
        <Link href="/" className="mt-4">
          <button className="bg-[#191919] hover:bg-[#2F9E44] text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors">
            Return Home
          </button>
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
        setErrorMsg("File size exceeds 5MB limit.");
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

      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

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
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium tracking-widest uppercase text-[#999999]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setValue(num)}
                className="w-11 h-11 flex items-center justify-center text-[28px] focus:outline-none transition-transform active:scale-90"
                style={{ color: num <= value ? "#2F9E44" : "#E9E9E7" }}
              >
                ★
              </button>
            ))}
          </div>
          <span className="font-mono text-base font-semibold text-[#191919] ml-2">
            {value}.0
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#191919] flex flex-col gap-6 max-w-md mx-auto pb-[env(safe-area-inset-bottom)] page-scroll animate-fadeIn text-left">
      
      {/* Header */}
      <div className="flex flex-col pt-6 px-4">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#999999]">
            VERIFY & UPDATE
          </span>
          <button
            onClick={() => router.push(`/toilet/${id}`)}
            disabled={loading}
            className="text-[13px] text-[#6B6B6B] hover:text-[#191919] font-medium min-h-[36px]"
          >
            Cancel
          </button>
        </div>
        <h1 className="text-[20px] font-semibold text-[#191919] tracking-tight leading-snug mt-1 truncate">
          {toilet.name}
        </h1>
      </div>

      {/* Thin document progress style (100% since verification is single-page) */}
      <div className="w-full h-[2px] bg-[#2F9E44]"></div>

      {errorMsg && (
        <div className="mx-4 bg-[#FFF0F0] border border-[#E03131]/30 text-[#C21010] p-3 rounded-lg text-xs font-semibold animate-fadeIn">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 flex-1 flex flex-col gap-6">
        
        {/* Star ratings */}
        <div className="space-y-6">
          {renderRatingGroup("Cleanliness", cleanliness, setCleanliness)}
          {renderRatingGroup("Smell Level", smell, setSmell)}
          {renderRatingGroup("Lighting", lighting, setLighting)}
          {renderRatingGroup("Women Safety", womenSafety, setWomenSafety)}
          {renderRatingGroup("Water Supply", waterAvailability, setWaterAvailability)}
        </div>

        {/* Present Facilities checklist */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#999999]">
            Present Facilities
          </span>
          <div className="flex flex-col border border-[#E9E9E7] rounded-lg overflow-hidden divide-y divide-[#E9E9E7]">
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#EFEEEB] cursor-pointer transition select-none min-h-[40px]">
              <input
                type="checkbox"
                checked={hasSoap}
                onChange={(e) => setHasSoap(e.target.checked)}
                className="w-4 h-4 rounded border-[#D3D3CF] text-[#2F9E44] focus:ring-[#2F9E44]/20"
              />
              <span className="text-[14px] font-normal text-[#191919]">Soap Available</span>
            </label>

            <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#EFEEEB] cursor-pointer transition select-none min-h-[40px]">
              <input
                type="checkbox"
                checked={hasMirror}
                onChange={(e) => setHasMirror(e.target.checked)}
                className="w-4 h-4 rounded border-[#D3D3CF] text-[#2F9E44] focus:ring-[#2F9E44]/20"
              />
              <span className="text-[14px] font-normal text-[#191919]">Mirror Installed</span>
            </label>

            <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#EFEEEB] cursor-pointer transition select-none min-h-[40px]">
              <input
                type="checkbox"
                checked={hasSanitary}
                onChange={(e) => setHasSanitary(e.target.checked)}
                className="w-4 h-4 rounded border-[#D3D3CF] text-[#2F9E44] focus:ring-[#2F9E44]/20"
              />
              <span className="text-[14px] font-normal text-[#191919]">Sanitary Pad Disposal Box</span>
            </label>
          </div>
        </div>

        {/* Optional Photo Upload */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#999999]">
            Latest Photo (Optional)
          </span>
          
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
            <div className="relative w-full h-36 rounded-lg bg-[#F7F7F5] overflow-hidden border border-[#E9E9E7] flex items-center justify-center">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                disabled={loading}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full h-20 border-2 border-dashed border-[#E9E9E7] hover:border-[#2F9E44] rounded-lg flex flex-col items-center justify-center gap-1.5 text-[#6B6B6B] hover:bg-[#F7F7F5] transition-all min-h-[44px]"
            >
              <span className="text-2xl">📸</span>
              <span className="text-xs font-semibold">Tap to Take / Select Photo</span>
            </button>
          )}
        </div>

        {/* Thin progress bar */}
        {uploadProgress > 0 && (
          <div className="w-full bg-[#E9E9E7] h-[2px] overflow-hidden">
            <div
              className="bg-[#2F9E44] h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {/* Submit actions */}
        <div className="flex gap-3 pt-4 mb-8">
          <button
            type="button"
            onClick={() => router.push(`/toilet/${id}`)}
            disabled={loading}
            className="bg-transparent border border-[#E9E9E7] text-[#191919] text-[14px] font-medium h-[46px] w-full rounded-xl hover:bg-[#EFEEEB] transition-colors disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-colors shadow-button disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : submitDone ? (
              "Done!"
            ) : (
              "Submit Verification"
            )}
          </button>
        </div>

      </form>

      {/* Privacy overlay */}
      {privacyStatus && (
        <div className="fixed inset-0 z-[120] bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="relative w-16 h-16 flex items-center justify-center mb-4">
            <div className="absolute inset-0 bg-[#2F9E44]/10 rounded-full animate-ping"></div>
            <div className="w-12 h-12 bg-[#2F9E44] rounded-full flex items-center justify-center text-white shadow-lg">
              🔒
            </div>
          </div>
          <h3 className="font-semibold text-[#191919] text-sm">
            {privacyStatus === "compressing" && "Compressing Photo..."}
            {privacyStatus === "scrubbing" && "Scrubbing GPS metadata tags..."}
            {privacyStatus === "securing" && "Uploading to vault..."}
          </h3>
          <p className="text-xs text-[#6B6B6B] mt-1.5 max-w-xs leading-relaxed">
            SafeToilets strips camera metadata tags to keep your upload private.
          </p>
        </div>
      )}

    </div>
  );
}
