"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSupabase } from "@/hooks/useSupabase";
import { useLocation, isCoordsInKerala } from "@/lib/hooks/useLocation";
import { useToast } from "@/context/ToastContext";
import MapSkeleton from "@/components/Map/MapSkeleton";
import imageCompression from "browser-image-compression";
import { Restroom } from "@/types";
import { ArrowLeft, Star, Camera, Lock, Check, MapPin, AlertTriangle } from "lucide-react";

const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function AddToiletPage() {
  const { isAuthenticated, loading: authLoading } = useSupabase();
  const { showToast } = useToast();
  const router = useRouter();
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        setAuthTimeout(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [authLoading]);

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
  const [open24Hours, setOpen24Hours] = useState("Not Sure");

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

  // Manual Search and Geolocation Onboarding states
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [showGpsIntro, setShowGpsIntro] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Guard routing check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      sessionStorage.setItem("authRedirectPath", "/add");
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // GPS auto-detect trigger on entering Step 1 (only after user dismisses intro and we haven't attempted yet)
  useEffect(() => {
    if (step === 1 && latitude === null && longitude === null && !gpsLoading && !gpsError && !gpsAttempted && !showGpsIntro) {
      setGpsAttempted(true);
      getPosition();
    }
  }, [step, getPosition, latitude, longitude, gpsLoading, gpsError, gpsAttempted, showGpsIntro]);

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
          if (parsed.open24Hours) setOpen24Hours(parsed.open24Hours);
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
        open24Hours,
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
    open24Hours,
    cleanliness,
    smell,
    lighting,
    womenSafety,
    waterAvailability,
    hasSoap,
    hasMirror,
    hasSanRoot,
  ]);

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
          <Link href="/" className="w-full">
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
            >
              Browse Without Account
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-brand-green" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5&countrycodes=in`
      );
      if (res.ok) {
        interface NominatimResult {
          display_name: string;
          lat: string;
          lon: string;
        }
        const data = await res.json() as NominatimResult[];
        const matches = data
          .map((item) => ({
            label: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }))
          .filter((item) => isCoordsInKerala(item.lat, item.lng));
        setSearchResults(matches);
        if (matches.length === 0) {
          setErrorMsg("No matching locations found in Kerala.");
        }
      } else {
        throw new Error("Geocoding service failed.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setErrorMsg("Failed to search. Check your connection.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (res: { label: string; lat: number; lng: number }) => {
    setLatitude(res.lat);
    setLongitude(res.lng);
    setSearchResults([]);
    setSearchQuery("");
  };

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
      setStep(7);
    }
    else if (step === 7) {
      if (cleanliness < 1 || smell < 1 || lighting < 1 || womenSafety < 1 || waterAvailability < 1) {
        setErrorMsg("Please select at least 1 star for all rating categories.");
        triggerShake();
        return;
      }
      setStep(8);
    } 
    else if (step === 8) {
      setStep(9);
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
          open_24_hours: open24Hours,
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
      sessionStorage.setItem("last_submitted_toilet_id", responseData.id);

      setTimeout(() => {
        router.push(`/toilet/${responseData.id}`);
      }, 2000);

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
        <span className="text-[11px] font-normal tracking-wide uppercase text-neutral-400">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((num) => (
              <motion.button
                key={num}
                type="button"
                onClick={() => setValue(num)}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="w-11 h-11 flex items-center justify-center focus:outline-none"
              >
                <Star
                  className={`w-6 h-6 fill-current ${
                    num <= value ? "text-brand-green" : "text-neutral-200"
                  }`}
                />
              </motion.button>
            ))}
          </div>
          <span className="font-mono text-base font-normal text-neutral-900 ml-2">
            {value > 0 ? `${value}.0` : "—"}
          </span>
        </div>
      </div>
    );
  };

  if (submitDone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto"
      >
        <div className="w-16 h-16 bg-brand-greenLight border border-brand-green/20 rounded-full flex items-center justify-center text-brand-greenText text-3xl shadow-card mb-4">
          <Check className="w-6 h-6 text-brand-green" />
        </div>
        <h2 className="text-[20px] font-semibold text-neutral-900">Restroom Submitted!</h2>
        <p className="text-[14px] text-neutral-600 mt-2 max-w-xs leading-relaxed">
          Thank you for contributing. Redirecting in 2 seconds...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col gap-3 sm:gap-6 max-w-md mx-auto pb-[env(safe-area-inset-bottom)] page-scroll text-left"
    >
      
      {/* Step Header */}
      <div className="flex flex-col pt-6 px-4">
        <div className="flex justify-between items-center">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            onClick={() => step > 1 ? handlePrev() : router.push("/")}
            disabled={loading}
            className="flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900 font-medium min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step > 1 ? "Back" : "Home"}</span>
          </motion.button>
          <span className="text-[11px] font-normal tracking-wide uppercase text-neutral-400">
            Step {step} of 9
          </span>
        </div>
        <h1 className="text-[20px] font-semibold text-neutral-900 tracking-tight leading-snug mt-1">
          {step === 1 && "Select location"}
          {step === 2 && "Restroom details"}
          {step === 3 && "Gender access"}
          {step === 4 && "Toilet style"}
          {step === 5 && "Wheelchair accessibility"}
          {step === 6 && "24 Hours open"}
          {step === 7 && "Quality ratings"}
          {step === 8 && "Amenities checklist"}
          {step === 9 && "Photo upload"}
        </h1>
      </div>

      {/* Thin document progress style */}
      <div className="w-full h-[2px] bg-neutral-200 relative">
        <div 
          className="h-full bg-brand-green transition-all duration-300"
          style={{ width: `${(step / 9) * 100}%` }}
        />
      </div>

      {errorMsg && (
        <div className="mx-4 bg-brand-greenVeryLight border border-brand-green/20 text-text-secondary p-3 rounded-[14px] text-xs font-normal">
          {errorMsg}
        </div>
      )}

      {/* Inner Step Layout - wrapped with horizontal margins */}
      <div className="px-4 flex-1 flex flex-col gap-2 sm:gap-4">
        
        {/* STEP 1: Select Location */}
        {step === 1 && (
          showGpsIntro ? (
            <div className="bg-white border border-neutral-200 p-5 rounded-[20px] flex flex-col gap-4 shadow-card mt-4 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-greenLight text-brand-greenDark flex items-center justify-center mx-auto">
                <MapPin className="w-5 h-5 text-brand-green" />
              </div>
              <h3 className="text-base font-medium text-neutral-900">Allow Location Access</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                SafeToilets needs GPS access to place the toilet pin accurately on the map. You can also search manually or drag the pin.
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => setShowGpsIntro(false)}
                  className="w-full h-[52px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-[14px] transition-colors shadow-button"
                >
                  Detect My Location
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => {
                    setShowGpsIntro(false);
                    setGpsAttempted(true); // Don't trigger GPS automatically
                  }}
                  className="w-full h-[52px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[14px] font-medium rounded-[14px] transition-colors"
                >
                  Enter Location Manually
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2 sm:gap-4 pb-20 sm:pb-0">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-normal tracking-wide uppercase text-neutral-400 block">
                  Search Location
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search place..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchPlaces();
                      }
                    }}
                    className="flex-1 h-12 border border-surface-border bg-white placeholder-text-disabled rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all shadow-sm"
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.08 }}
                    onClick={handleSearchPlaces}
                    disabled={searchLoading}
                    className="bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium h-12 px-4 rounded-xl transition-colors shadow-button"
                  >
                    {searchLoading ? "Searching..." : "Search"}
                  </motion.button>
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-neutral-200 rounded-[14px] bg-white overflow-hidden divide-y divide-neutral-200 shadow-card max-h-40 overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-neutral-50 text-neutral-900 transition-colors"
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[14px] text-neutral-600 leading-relaxed">
                Drag the pin to place it exactly where the restroom is located.
              </p>

              <div className="w-full h-[28vh] sm:h-[52vh] rounded-[20px] overflow-hidden border border-neutral-200 relative bg-neutral-100 flex items-center justify-center shadow-card">
              {gpsLoading && !latitude ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-4 border-brand-green border-t-transparent animate-spin"></div>
                  <span className="text-xs text-neutral-600">Detecting GPS location...</span>
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
              <div className="bg-neutral-100 rounded-[14px] p-3 text-center text-xs font-mono border border-neutral-200 text-neutral-600">
                Position: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </div>
            )}

            {gpsError && (
              <div className="text-xs text-text-secondary font-normal bg-brand-greenVeryLight p-2.5 rounded-[14px] border border-brand-green/10 text-center">
                GPS detection failed. Tap on the map to place the pin manually.
              </div>
            )}

            {duplicateToilet && !dismissedDuplicate && (
              <div className="bg-brand-greenVeryLight border border-brand-green/20 text-text-primary p-3 rounded-[20px] text-xs font-normal flex flex-col gap-2 shadow-card">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-brand-green flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col text-left">
                    <span>A toilet was already added nearby.</span>
                    <span className="text-text-secondary font-medium">({duplicateToilet.name})</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <Link href={`/toilet/${duplicateToilet.id}`} target="_blank" className="bg-brand-green hover:bg-brand-greenDark text-white px-3 py-1.5 rounded-[14px] font-medium text-center transition-colors">
                    View existing
                  </Link>
                  <motion.button 
                    type="button" 
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.08 }}
                    onClick={() => setDismissedDuplicate(true)} 
                    className="bg-white px-3 py-1.5 rounded-[14px] border border-neutral-200 text-neutral-600 font-medium transition-colors hover:bg-neutral-50"
                  >
                    Continue
                  </motion.button>
                </div>
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-neutral-50 px-4 py-3 z-10 border-t border-neutral-200/60 max-w-md mx-auto sm:relative sm:border-none sm:p-0 sm:mt-auto sm:z-0">
              <motion.button
                onClick={handleNext}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className={`bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-all shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Confirm Location
              </motion.button>
            </div>
          </div>
          )
        )}

        {/* STEP 2: Name, Address and Category selection */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-normal tracking-wide uppercase text-neutral-400 block">Restroom Name</label>
              <input
                type="text"
                placeholder="e.g. Kozhikode Beach Public Toilet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 border border-surface-border bg-white placeholder-text-disabled rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-normal tracking-wide uppercase text-neutral-400 block">Address / Area Name</label>
              <input
                type="text"
                placeholder="e.g. Beach Road (Near Main Walkway)"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full h-12 border border-surface-border bg-white placeholder-text-disabled rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-normal tracking-wide uppercase text-neutral-400 block">Bathroom Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-12 border border-surface-border bg-white rounded-xl px-4 text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1rem_center] bg-no-repeat pr-10"
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
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handleNext}
                className={`bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {/* STEP 3: Gender Access */}
        {step === 3 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-neutral-600 leading-relaxed -mt-2">Who is allowed to access this toilet?</p>

            <div className="flex flex-col border border-neutral-200 rounded-[14px] overflow-hidden divide-y divide-neutral-200">
              {["Men", "Women", "Unisex", "Both"].map((access) => (
                <motion.button
                  key={access}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => setGenderAccess(access)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors duration-100 text-left ${
                    genderAccess === access ? "bg-brand-greenLight" : "bg-white"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      genderAccess === access ? "border-brand-green bg-brand-green" : "border-neutral-400 bg-white"
                    }`}
                  >
                    {genderAccess === access && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[14px] text-neutral-900 font-normal">{access}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handleNext}
                className={`bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {/* STEP 4: Toilet Style */}
        {step === 4 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-neutral-600 leading-relaxed -mt-2">What physical toilet type is installed?</p>

            <div className="flex flex-col border border-neutral-200 rounded-[14px] overflow-hidden divide-y divide-neutral-200">
              {["Indian", "European", "Both"].map((style) => (
                <motion.button
                  key={style}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => setToiletType(style)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors duration-100 text-left ${
                    toiletType === style ? "bg-brand-greenLight" : "bg-white"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      toiletType === style ? "border-brand-green bg-brand-green" : "border-neutral-400 bg-white"
                    }`}
                  >
                    {toiletType === style && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[14px] text-neutral-900 font-normal">{style}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handleNext}
                className={`bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {/* STEP 5: Accessibility */}
        {step === 5 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-neutral-600 leading-relaxed -mt-2">Is there step-free access, wide doors, or grab rails?</p>

            <div className="flex flex-col border border-neutral-200 rounded-[14px] overflow-hidden divide-y divide-neutral-200">
              {[
                { key: "yes", val: true, label: "Yes, Wheelchair Accessible" },
                { key: "no", val: false, label: "No / Unsure" }
              ].map((opt) => (
                <motion.button
                  key={opt.key}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => {
                    setAccessibilityAnswer(opt.key as "yes" | "no");
                    setIsAccessible(opt.val);
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors duration-100 text-left ${
                    accessibilityAnswer === opt.key ? "bg-brand-greenLight" : "bg-white"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      accessibilityAnswer === opt.key ? "border-brand-green bg-brand-green" : "border-neutral-400 bg-white"
                    }`}
                  >
                    {accessibilityAnswer === opt.key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[14px] text-neutral-900 font-normal">{opt.label}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handleNext}
                className={`bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {/* STEP 6: 24 Hours open */}
        {step === 6 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-neutral-600 leading-relaxed -mt-2">Is this toilet open 24 hours?</p>

            <div className="flex flex-col border border-neutral-200 rounded-[14px] overflow-hidden divide-y divide-neutral-200">
              {["Yes", "No", "Not Sure"].map((option) => (
                <motion.button
                  key={option}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => setOpen24Hours(option)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors duration-100 text-left ${
                    open24Hours === option ? "bg-brand-greenLight" : "bg-white"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      open24Hours === option ? "border-brand-green bg-brand-green" : "border-neutral-400 bg-white"
                    }`}
                  >
                    {open24Hours === option && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[14px] text-neutral-900 font-normal">{option}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handleNext}
                className={`bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {/* STEP 7: Star Ratings */}
        {step === 7 && (
          <div className="flex-1 flex flex-col gap-6">
            <p className="text-xs text-neutral-600 leading-relaxed -mt-2">Rate each category (minimum 1 star required for each).</p>

            <div className="space-y-6">
              {renderStarSelector("Cleanliness", cleanliness, setCleanliness)}
              {renderStarSelector("Smell Level", smell, setSmell)}
              {renderStarSelector("Lighting", lighting, setLighting)}
              {renderStarSelector("Women Safety", womenSafety, setWomenSafety)}
              {renderStarSelector("Water Supply", waterAvailability, setWaterAvailability)}
            </div>

            <div className="flex gap-3 mt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handleNext}
                className={`bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button ${nextBtnShake ? "animate-shake" : ""}`}
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {/* STEP 8: Amenities Checklist */}
        {step === 8 && (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-neutral-600 leading-relaxed -mt-2">Select all facilities present inside the restroom.</p>

            <div className="flex flex-col border border-neutral-200 rounded-[14px] overflow-hidden divide-y divide-neutral-200">
              <label className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition select-none min-h-[40px]">
                <input
                  type="checkbox"
                  checked={hasSoap}
                  onChange={(e) => setHasSoap(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-400 text-brand-green focus:ring-brand-green/20"
                />
                <span className="text-[14px] font-normal text-neutral-900">Soap Available</span>
              </label>

              <label className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition select-none min-h-[40px]">
                <input
                  type="checkbox"
                  checked={hasMirror}
                  onChange={(e) => setHasMirror(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-400 text-brand-green focus:ring-brand-green/20"
                />
                <span className="text-[14px] font-normal text-neutral-900">Mirror Installed</span>
              </label>

              <label className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition select-none min-h-[40px]">
                <input
                  type="checkbox"
                  checked={hasSanRoot}
                  onChange={(e) => setHasSanRoot(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-400 text-brand-green focus:ring-brand-green/20"
                />
                <span className="text-[14px] font-normal text-neutral-900">Sanitary Pad Disposal Box</span>
              </label>
            </div>

            <div className="flex gap-3 mt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handleNext}
                className="bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button"
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {/* STEP 9: Photo upload */}
        {step === 9 && (
          <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col gap-4">
            <p className="text-xs text-neutral-600 leading-relaxed -mt-2">Provide a clear photo to help others locate this toilet.</p>

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
              <div className="relative w-full h-40 rounded-[14px] bg-neutral-100 overflow-hidden border border-neutral-200 flex items-center justify-center">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  disabled={loading}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black transition-colors"
                >
                  ✕
                </motion.button>
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={() => document.getElementById("add-toilet-file")?.click()}
                disabled={loading}
                className="w-full h-28 border-2 border-dashed border-neutral-200 hover:border-brand-green rounded-[14px] flex flex-col items-center justify-center gap-1.5 text-neutral-600 hover:bg-neutral-100 transition-all min-h-[44px]"
              >
                <Camera className="w-6 h-6 text-neutral-400" />
                <span className="text-xs font-medium">Tap to Take / Select Photo</span>
              </motion.button>
            )}

            {/* Notion thin progress bar */}
            {uploadProgress > 0 && (
              <div className="w-full bg-neutral-200 h-[2px] overflow-hidden mt-2">
                <div
                  className="bg-brand-green h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={handlePrev}
                disabled={loading}
                className="bg-transparent border border-neutral-200 text-neutral-900 text-[14px] font-medium h-[52px] w-full rounded-[14px] hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Back
              </motion.button>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                disabled={loading}
                className="bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium h-[52px] w-full rounded-[14px] transition-colors shadow-button disabled:opacity-50"
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
              </motion.button>
            </div>
          </form>
        )}
      </div>

      {/* Privacy processing Overlay */}
      {privacyStatus && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[120] bg-white/95 flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="relative w-16 h-16 flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-brand-green rounded-full flex items-center justify-center text-white shadow-button">
              <Lock className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="font-semibold text-neutral-900 text-sm">
            {privacyStatus === "compressing" && "Compressing Photo..."}
            {privacyStatus === "scrubbing" && "Scrubbing GPS metadata tags..."}
            {privacyStatus === "securing" && "Uploading to vault..."}
          </h3>
          <p className="text-xs text-neutral-600 mt-1.5 max-w-xs leading-relaxed">
            SafeToilets strips camera metadata tags to keep your upload private.
          </p>
        </motion.div>
      )}

    </motion.div>
  );
}
