"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useLocation, isCoordsInKerala } from "@/lib/hooks/useLocation";
import { useToast } from "@/context/ToastContext";
import MapSkeleton from "@/components/Map/MapSkeleton";
import imageCompression from "browser-image-compression";
import { Restroom } from "@/types";

const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function AddToiletPage() {
  const { isAuthenticated, loading: authLoading } = useSupabase();
  const { showToast } = useToast();
  const router = useRouter();

  // Location detection hook
  const { latitude: gpsLat, longitude: gpsLng, error: gpsError, loading: gpsLoading, getPosition } = useLocation();

  // Wizard state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<"compressing" | "scrubbing" | "securing" | null>(null);
  const [nextBtnShake, setNextBtnShake] = useState(false);

  // Form Fields
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [type, setType] = useState("Public Toilet");
  const [toiletType, setToiletType] = useState("European");
  const [genderAccess, setGenderAccess] = useState("Both");
  const [accessibilityAnswer, setAccessibilityAnswer] = useState<"yes" | "no" | null>(null);
  const [isAccessible, setIsAccessible] = useState(false);

  // Initial Ratings
  const [cleanliness, setCleanliness] = useState(0);
  const [smell, setSmell] = useState(0);
  const [lighting, setLighting] = useState(0);
  const [womenSafety, setWomenSafety] = useState(0);
  const [waterAvailability, setWaterAvailability] = useState(0);

  // Facilities Checklist
  const [hasSoap, setHasSoap] = useState(false);
  const [hasMirror, setHasMirror] = useState(false);
  const [hasSanRoot, setHasSanRoot] = useState(false);

  // Image Upload & Progress
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Duplicate toilet states
  const [duplicateToilet, setDuplicateToilet] = useState<{ id: string; name: string; latitude: number; longitude: number } | null>(null);
  const [dismissedDuplicate, setDismissedDuplicate] = useState(false);

  // Guard routing check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      sessionStorage.setItem("authRedirectPath", "/add");
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // GPS auto-detect trigger on entering Step 1
  useEffect(() => {
    if (step === 1 && latitude === null && longitude === null && !gpsLoading) {
      getPosition();
    }
  }, [step, getPosition, latitude, longitude, gpsLoading]);

  // Update form fields when GPS finishes
  useEffect(() => {
    if (gpsLat && gpsLng && latitude === null && longitude === null) {
      setLatitude(gpsLat);
      setLongitude(gpsLng);
    }
  }, [gpsLat, gpsLng, latitude, longitude]);

  // Duplicate check
  useEffect(() => {
    if (latitude && longitude) {
      const checkDuplicate = async () => {
        try {
          const { supabase } = await import("@/lib/supabase");
          const delta = 0.00045; // ~50m in degrees
          const { data } = await supabase
            .from("restrooms")
            .select("id, name, latitude, longitude")
            .eq("is_hidden", false)
            .gte("latitude", latitude - delta)
            .lte("latitude", latitude + delta)
            .gte("longitude", longitude - delta)
            .lte("longitude", longitude + delta);

          if (data && data.length > 0) {
            setDuplicateToilet(data[0]);
          } else {
            setDuplicateToilet(null);
          }
        } catch (err) {
          console.error("Duplicate check failed:", err);
        }
      };
      checkDuplicate();
    }
  }, [latitude, longitude]);

  // Restore state from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("add_toilet_form_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.step) setStep(parsed.step);
          if (parsed.latitude) setLatitude(parsed.latitude);
          if (parsed.longitude) setLongitude(parsed.longitude);
          if (parsed.name) setName(parsed.name);
          if (parsed.locationName) setLocationName(parsed.locationName);
          if (parsed.type) setType(parsed.type);
          if (parsed.toiletType) setToiletType(parsed.toiletType);
          if (parsed.genderAccess) setGenderAccess(parsed.genderAccess);
          if (parsed.accessibilityAnswer) {
            setAccessibilityAnswer(parsed.accessibilityAnswer);
            setIsAccessible(parsed.accessibilityAnswer === "yes");
          }
          if (parsed.cleanliness) setCleanliness(parsed.cleanliness);
          if (parsed.smell) setSmell(parsed.smell);
          if (parsed.lighting) setLighting(parsed.lighting);
          if (parsed.womenSafety) setWomenSafety(parsed.womenSafety);
          if (parsed.waterAvailability) setWaterAvailability(parsed.waterAvailability);
          if (parsed.hasSoap !== undefined) setHasSoap(parsed.hasSoap);
          if (parsed.hasMirror !== undefined) setHasMirror(parsed.hasMirror);
          if (parsed.hasSanRoot !== undefined) setHasSanRoot(parsed.hasSanRoot);
        } catch (e) {
          console.warn("Failed to parse saved state", e);
        }
      }
    }
  }, []);

  // Save State
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stateObj = {
        step,
        latitude,
        longitude,
        name,
        locationName,
        type,
        toiletType,
        genderAccess,
        accessibilityAnswer,
        cleanliness,
        smell,
        lighting,
        womenSafety,
        waterAvailability,
        hasSoap,
        hasMirror,
        hasSanRoot,
      };
      sessionStorage.setItem("add_toilet_form_state", JSON.stringify(stateObj));
    }
  }, [
    step,
    latitude,
    longitude,
    name,
    locationName,
    type,
    toiletType,
    genderAccess,
    accessibilityAnswer,
    cleanliness,
    smell,
    lighting,
    womenSafety,
    waterAvailability,
    hasSoap,
    hasMirror,
    hasSanRoot,
  ]);

  if (authLoading) {
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

  const triggerShake = () => {
    setNextBtnShake(true);
    setTimeout(() => setNextBtnShake(false), 400);
  };

  const handleNext = () => {
    setErrorMsg(null);

    if (step === 1) {
      if (!latitude || !longitude) {
        setErrorMsg("Please drop a pin on the map.");
        triggerShake();
        return;
      }
      if (!isCoordsInKerala(latitude, longitude)) {
        setErrorMsg("Coordinates are outside Kerala state bounds.");
        triggerShake();
        return;
      }
      setStep(2);
    } 
    else if (step === 2) {
      if (!name.trim()) {
        setErrorMsg("Please enter a restroom title.");
        triggerShake();
        return;
      }
      if (!locationName.trim()) {
        setErrorMsg("Please enter an address or area name.");
        triggerShake();
        return;
      }
      if (!type) {
        setErrorMsg("Please select a restroom type.");
        triggerShake();
        return;
      }
      setStep(3);
    } 
    else if (step === 3) {
      if (!genderAccess) {
        setErrorMsg("Please select gender access.");
        triggerShake();
        return;
      }
      setStep(4);
    } 
    else if (step === 4) {
      if (!toiletType) {
        setErrorMsg("Please select a toilet style.");
        triggerShake();
        return;
      }
      setStep(5);
    } 
    else if (step === 5) {
      if (accessibilityAnswer === null) {
        setErrorMsg("Please select wheelchair accessibility.");
        triggerShake();
        return;
      }
      setStep(6);
    } 
    else if (step === 6) {
      if (cleanliness < 1 || smell < 1 || lighting < 1 || womenSafety < 1 || waterAvailability < 1) {
        setErrorMsg("Please select at least 1 star for all rating categories.");
        triggerShake();
        return;
      }
      setStep(7);
    } 
    else if (step === 7) {
      setStep(8);
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setStep((prev) => prev - 1);
  };

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
        setErrorMsg("File must be an image type.");
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await compressAndSubmit(photo);
  };

  const compressAndSubmit = async (fileToUpload: File | null) => {
    setLoading(true);
    setErrorMsg(null);
    setUploadProgress(0);

    try {
      let photoBase64: string | null = null;

      if (fileToUpload) {
        if (!fileToUpload.type.startsWith("image/")) {
          throw new Error("Uploaded file must be an image.");
        }
        if (fileToUpload.size > 5 * 1024 * 1024) {
          throw new Error("File exceeds 5MB size limit.");
        }

        setPrivacyStatus("compressing");
        setUploadProgress(10);

        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        const compressed = await imageCompression(fileToUpload, options);

        setPrivacyStatus("scrubbing");
        setUploadProgress(30);

        photoBase64 = await getBase64(compressed);
        setPrivacyStatus("securing");
        setUploadProgress(50);
      }

      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/toilets");
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
              reject(new Error(err.error || "Failed to submit toilet."));
            } catch {
              reject(new Error("Failed to submit toilet."));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network connection error."));
      });

      xhr.send(
        JSON.stringify({
          name,
          location_name: locationName,
          latitude,
          longitude,
          type,
          toilet_type: toiletType,
          gender_access: genderAccess,
          is_accessible: isAccessible,
          cleanliness,
          smell,
          lighting,
          women_safety: womenSafety,
          water_availability: waterAvailability,
          has_soap: hasSoap,
          has_mirror: hasMirror,
          has_sanitary: hasSanRoot,
          photoBase64,
        })
      );

      const responseData = await responsePromise;
      setUploadProgress(100);
      setPrivacyStatus(null);
      setSubmitDone(true);

      showToast("✓ Toilet added! Thank you for contributing.", "success");
      sessionStorage.removeItem("add_toilet_form_state");

      setTimeout(() => {
        router.push(`/toilet/${responseData.id}`);
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

  const renderStarSelector = (
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
            {value > 0 ? `${value}.0` : "—"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#191919] flex flex-col gap-6 max-w-md mx-auto pb-[env(safe-area-inset-bottom)] page-scroll animate-fadeIn text-left">
      
      {/* Step Header */}
      <div className="flex flex-col pt-6 px-4">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#999999]">
            Step {step} of 8
          </span>
          <button
            onClick={() => router.push("/")}
            disabled={loading}
            className="text-[13px] text-[#6B6B6B] hover:text-[#191919] font-medium min-h-[36px]"
          >
            Cancel
          </button>
        </div>
        <h1 className="text-[20px] font-semibold text-[#191919] tracking-tight leading-snug mt-1">
          {step === 1 && "Select location"}
          {step === 2 && "Restroom details"}
          {step === 3 && "Gender access"}
          {step === 4 && "Toilet style"}
          {step === 5 && "Wheelchair accessibility"}
          {step === 6 && "Quality ratings"}
          {step === 7 && "Amenities checklist"}
          {step === 8 && "Photo upload"}
        </h1>
      </div>

      {/* Thin document progress style */}
      <div className="w-full h-[2px] bg-[#E9E9E7] relative">
        <div 
          className="h-full bg-[#2F9E44] transition-all duration-300"
          style={{ width: `${(step / 8) * 100}%` }}
        />
      </div>

      {errorMsg && (
        <div className="mx-4 bg-[#FFF0F0] border border-[#E03131]/30 text-[#C21010] p-3 rounded-lg text-xs font-semibold animate-fadeIn">
          {errorMsg}
        </div>
      )}

      {/* Inner Step Layout - wrapped with horizontal margins */}
      <div className="px-4 flex-1 flex flex-col gap-4">
        
        {/* STEP 1: Select Location */}
        {step === 1 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              Drag the pin to place it exactly where the restroom is located.
            </p>

            <div className="w-full h-[52vh] rounded-[20px] overflow-hidden border border-[#E9E9E7] relative bg-[#F7F7F5] flex items-center justify-center">
              {gpsLoading && !latitude ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-4 border-[#2F9E44] border-t-transparent animate-spin"></div>
                  <span className="text-xs text-[#6B6B6B]">Detecting GPS location...</span>
                </div>
              ) : (
                <MapView
                  toilets={[]}
                  selectedToilet={null}
                  onSelectToilet={() => {}}
                  userCoords={latitude && longitude ? { latitude, longitude } : null}
                  isAddingMode={true}
                  onLocationSelect={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              )}
            </div>

            {latitude && longitude && (
              <div className="bg-[#F7F7F5] rounded-xl p-3 text-center text-xs font-mono border border-[#E9E9E7] text-[#6B6B6B]">
                Position: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </div>
            )}

            {gpsError && (
              <div className="text-xs text-[#C21010] font-semibold bg-[#FFF0F0] p-2.5 rounded-lg border border-[#E03131]/10 text-center">
                📍 GPS detection failed. Tap on the map to place the pin manually.
              </div>
            )}

            {duplicateToilet && !dismissedDuplicate && (
              <div className="bg-[#FFF4E6] border border-[#E67700]/30 text-[#B85C00] p-3 rounded-lg text-xs font-semibold flex flex-col gap-2 animate-fadeIn">
                <div className="flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <div className="flex flex-col text-left">
                    <span>A toilet was already added nearby.</span>
                    <span className="text-[#6B6B6B] font-medium">({duplicateToilet.name})</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <Link href={`/toilet/${duplicateToilet.id}`} target="_blank" className="bg-[#E67700] hover:bg-[#B85C00] text-white px-3 py-1.5 rounded-lg font-medium text-center transition-colors">
                    View existing
                  </Link>
                  <button type="button" onClick={() => setDismissedDuplicate(true)} className="bg-white px-3 py-1.5 rounded-lg border border-[#E9E9E7] text-[#6B6B6B] font-medium transition-colors hover:bg-[#EFEEEB]">
                    Continue
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleNext}
              className={`bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-all shadow-button mt-4 ${nextBtnShake ? "animate-shake" : ""}`}
            >
              Confirm Location
            </button>
          </div>
        )}

        {/* STEP 2: Name, Address and Category selection */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-widest uppercase text-[#999999] block">Restroom Name</label>
              <input
                type="text"
                placeholder="e.g. Kozhikode Beach Public Toilet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 border border-[#E9E9E7] bg-white rounded-lg px-4 text-[14px] text-[#191919] focus:outline-none focus:border-[#2F9E44] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-widest uppercase text-[#999999] block">Address / Area Name</label>
              <input
                type="text"
                placeholder="e.g. Beach Road (Near Main Walkway)"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full h-11 border border-[#E9E9E7] bg-white rounded-lg px-4 text-[14px] text-[#191919] focus:outline-none focus:border-[#2F9E44] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-widest uppercase text-[#999999] block">Bathroom Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-11 border border-[#E9E9E7] bg-white rounded-lg px-4 text-[14px] text-[#191919] focus:outline-none focus:border-[#2F9E44] transition-colors"
              >
                <option value="Public Toilet">Public Toilet</option>
                <option value="Petrol Pump">Petrol Pump</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Mall">Mall</option>
                <option value="Railway / Bus Station">Railway / Bus Station</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="bg-transparent border border-[#E9E9E7] text-[#191919] text-[14px] font-medium h-[46px] w-full rounded-xl hover:bg-[#EFEEEB] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={`bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Gender Access */}
        {step === 3 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-[#6B6B6B] leading-relaxed -mt-2">Who is allowed to access this toilet?</p>

            <div className="flex flex-col border border-[#E9E9E7] rounded-lg overflow-hidden divide-y divide-[#E9E9E7]">
              {["Men", "Women", "Unisex", "Both"].map((access) => (
                <button
                  key={access}
                  type="button"
                  onClick={() => setGenderAccess(access)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors duration-100 text-left ${
                    genderAccess === access ? "bg-[#EBFBEE]" : "bg-white"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      genderAccess === access ? "border-[#2F9E44] bg-[#2F9E44]" : "border-[#D3D3CF] bg-white"
                    }`}
                  >
                    {genderAccess === access && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[14px] text-[#191919] font-normal">{access}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="bg-transparent border border-[#E9E9E7] text-[#191919] text-[14px] font-medium h-[46px] w-full rounded-xl hover:bg-[#EFEEEB] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={`bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Toilet Style */}
        {step === 4 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-[#6B6B6B] leading-relaxed -mt-2">What physical toilet type is installed?</p>

            <div className="flex flex-col border border-[#E9E9E7] rounded-lg overflow-hidden divide-y divide-[#E9E9E7]">
              {["Indian", "European", "Both"].map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setToiletType(style)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors duration-100 text-left ${
                    toiletType === style ? "bg-[#EBFBEE]" : "bg-white"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      toiletType === style ? "border-[#2F9E44] bg-[#2F9E44]" : "border-[#D3D3CF] bg-white"
                    }`}
                  >
                    {toiletType === style && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[14px] text-[#191919] font-normal">{style}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="bg-transparent border border-[#E9E9E7] text-[#191919] text-[14px] font-medium h-[46px] w-full rounded-xl hover:bg-[#EFEEEB] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={`bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Accessibility */}
        {step === 5 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-[#6B6B6B] leading-relaxed -mt-2">Is there step-free access, wide doors, or grab rails?</p>

            <div className="flex flex-col border border-[#E9E9E7] rounded-lg overflow-hidden divide-y divide-[#E9E9E7]">
              {[
                { key: "yes", val: true, label: "Yes, Wheelchair Accessible ♿" },
                { key: "no", val: false, label: "No / Unsure" }
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setAccessibilityAnswer(opt.key as "yes" | "no");
                    setIsAccessible(opt.val);
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors duration-100 text-left ${
                    accessibilityAnswer === opt.key ? "bg-[#EBFBEE]" : "bg-white"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      accessibilityAnswer === opt.key ? "border-[#2F9E44] bg-[#2F9E44]" : "border-[#D3D3CF] bg-white"
                    }`}
                  >
                    {accessibilityAnswer === opt.key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[14px] text-[#191919] font-normal">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="bg-transparent border border-[#E9E9E7] text-[#191919] text-[14px] font-medium h-[46px] w-full rounded-xl hover:bg-[#EFEEEB] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={`bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Star Ratings */}
        {step === 6 && (
          <div className="flex-1 flex flex-col gap-6">
            <p className="text-xs text-[#6B6B6B] leading-relaxed -mt-2">Rate each category (minimum 1 star required for each).</p>

            <div className="space-y-6">
              {renderStarSelector("Cleanliness", cleanliness, setCleanliness)}
              {renderStarSelector("Smell Level", smell, setSmell)}
              {renderStarSelector("Lighting", lighting, setLighting)}
              {renderStarSelector("Women Safety", womenSafety, setWomenSafety)}
              {renderStarSelector("Water Supply", waterAvailability, setWaterAvailability)}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="bg-transparent border border-[#E9E9E7] text-[#191919] text-[14px] font-medium h-[46px] w-full rounded-xl hover:bg-[#EFEEEB] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={`bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: Amenities Checklist */}
        {step === 7 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-[#6B6B6B] leading-relaxed -mt-2">Select all facilities present inside the restroom.</p>

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
                  checked={hasSanRoot}
                  onChange={(e) => setHasSanRoot(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D3D3CF] text-[#2F9E44] focus:ring-[#2F9E44]/20"
                />
                <span className="text-[14px] font-normal text-[#191919]">Sanitary Pad Disposal Box</span>
              </label>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="bg-transparent border border-[#E9E9E7] text-[#191919] text-[14px] font-medium h-[46px] w-full rounded-xl hover:bg-[#EFEEEB] transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#191919] hover:bg-[#2F9E44] text-white text-[14px] font-medium h-[46px] w-full rounded-xl transition-colors shadow-button"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 8: Photo upload */}
        {step === 8 && (
          <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-[#6B6B6B] leading-relaxed -mt-2">Provide a clear photo to help others locate this toilet.</p>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              id="add-toilet-file"
              className="hidden"
              disabled={loading}
            />
            
            {photoPreview ? (
              <div className="relative w-full h-40 rounded-lg bg-[#F7F7F5] overflow-hidden border border-[#E9E9E7] flex items-center justify-center">
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
                onClick={() => document.getElementById("add-toilet-file")?.click()}
                disabled={loading}
                className="w-full h-28 border-2 border-dashed border-[#E9E9E7] hover:border-[#2F9E44] rounded-lg flex flex-col items-center justify-center gap-1.5 text-[#6B6B6B] hover:bg-[#F7F7F5] transition-all min-h-[44px]"
              >
                <span className="text-2xl">📸</span>
                <span className="text-xs font-semibold">Tap to Take / Select Photo</span>
              </button>
            )}

            {/* Notion thin progress bar */}
            {uploadProgress > 0 && (
              <div className="w-full bg-[#E9E9E7] h-[2px] overflow-hidden mt-2">
                <div
                  className="bg-[#2F9E44] h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handlePrev}
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
                ) : !photo ? (
                  "Skip & Submit"
                ) : (
                  "Submit Toilet"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Privacy processing Overlay */}
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
