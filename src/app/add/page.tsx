"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useLocation, isCoordsInKerala } from "@/lib/hooks/useLocation";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/Button";
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

  // Initial Ratings (initialized to 0 to force user rating, satisfying "no 0-star submission")
  const [cleanliness, setCleanliness] = useState(0);
  const [smell, setSmell] = useState(0);
  const [lighting, setLighting] = useState(0);
  const [womenSafety, setWomenSafety] = useState(0);
  const [waterAvailability, setWaterAvailability] = useState(0);

  // Facilities Checklist
  const [hasSoap, setHasSoap] = useState(false);
  const [hasMirror, setHasMirror] = useState(false);
  const [hasSanRoot, setHasSanRoot] = useState(false); // maps to has_sanitary_disposal

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

  // Duplicate Check (within 50 meters)
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

  // Restore State from sessionStorage on Mount
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

  // Save State to sessionStorage on Change
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
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-green border-t-transparent animate-spin"></div>
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

    // STEP 1: Coordinates validation
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
    // STEP 2: Name & Address & Type validation
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
    // STEP 3: Gender access
    else if (step === 3) {
      if (!genderAccess) {
        setErrorMsg("Please select gender access.");
        triggerShake();
        return;
      }
      setStep(4);
    } 
    // STEP 4: Toilet type
    else if (step === 4) {
      if (!toiletType) {
        setErrorMsg("Please select a toilet style.");
        triggerShake();
        return;
      }
      setStep(5);
    } 
    // STEP 5: Accessibility (Yes/No answered)
    else if (step === 5) {
      if (accessibilityAnswer === null) {
        setErrorMsg("Please select whether the toilet is wheelchair accessible.");
        triggerShake();
        return;
      }
      setStep(6);
    } 
    // STEP 6: Ratings (All 5 must be >= 1 star)
    else if (step === 6) {
      if (cleanliness < 1 || smell < 1 || lighting < 1 || womenSafety < 1 || waterAvailability < 1) {
        setErrorMsg("Please select at least 1 star for all rating categories.");
        triggerShake();
        return;
      }
      setStep(7);
    } 
    // STEP 7: Amenities Checklist (No validation needed)
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
        setErrorMsg("File size exceeds 5MB limit before compression.");
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
        // Validation check again just in case
        if (!fileToUpload.type.startsWith("image/")) {
          throw new Error("Uploaded file must be an image.");
        }
        if (fileToUpload.size > 5 * 1024 * 1024) {
          throw new Error("File exceeds 5MB size limit.");
        }

        setPrivacyStatus("compressing");
        setUploadProgress(10);

        // Client-side image compression
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

      // Read authorization token
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Submit via XMLHttpRequest to track progress
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
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs font-semibold text-text-secondary">
          <span>{label}</span>
          <span className="text-brand-green font-bold">{value > 0 ? `${value} ★` : "Select Rating"}</span>
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
          <h1 className="text-lg font-bold">Add New Toilet</h1>
          <span className="text-[10px] text-brand-green font-semibold uppercase tracking-wider">Step {step} of 8</span>
        </div>
        <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => router.push("/")} disabled={loading}>
          Cancel
        </Button>
      </div>

      {errorMsg && (
        <div className="bg-brand-redLight text-brand-red p-3 rounded-xl text-xs font-semibold animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Select Location (GPS / Map drop pin) */}
      {step === 1 && (
        <div className="flex-1 flex flex-col gap-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Drag the pin to place it exactly where the restroom is located physically.
          </p>

          <div className="w-full h-[50vh] rounded-2xl overflow-hidden border border-surface-border dark:border-dark-border relative bg-surface-muted dark:bg-dark-muted flex items-center justify-center">
            {gpsLoading && !latitude ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-4 border-brand-green border-t-transparent animate-spin"></div>
                <span className="text-xs text-text-secondary">Detecting GPS location...</span>
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
            <div className="bg-surface-muted dark:bg-dark-muted rounded-xl p-3 text-center text-xs font-mono border border-surface-border dark:border-dark-border">
              Confirm this location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </div>
          )}

          {gpsError && (
            <div className="text-xs text-brand-red font-semibold bg-brand-redLight p-2.5 rounded-xl text-center">
              📍 GPS detection failed. Tap on the map to place the pin manually.
            </div>
          )}

          {/* Duplicate Banner warning within 50m */}
          {duplicateToilet && !dismissedDuplicate && (
            <div className="bg-brand-yellowLight border border-brand-yellow/30 text-text-primary p-3 rounded-xl text-xs font-semibold flex flex-col gap-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <div className="flex flex-col">
                  <span>A toilet was already added nearby.</span>
                  <span className="text-text-secondary font-medium">({duplicateToilet.name})</span>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <Link href={`/toilet/${duplicateToilet.id}`} target="_blank" className="bg-brand-yellow text-text-inverse px-3 py-1.5 rounded-lg font-bold text-center">
                  View existing toilet
                </Link>
                <button type="button" onClick={() => setDismissedDuplicate(true)} className="bg-surface-card dark:bg-dark-card px-3 py-1.5 rounded-lg border border-surface-border dark:border-dark-border text-text-secondary font-bold">
                  Continue adding
                </button>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            onClick={handleNext}
            className={nextBtnShake ? "animate-shake" : ""}
          >
            Confirm Location
          </Button>
        </div>
      )}

      {/* STEP 2: Name, Address and Category selection */}
      {step === 2 && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Restroom Name</label>
            <input
              type="text"
              placeholder="e.g. Kozhikode Beach Public Toilet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-brand-green transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Address / Area Name</label>
            <input
              type="text"
              placeholder="e.g. Beach Road (Near Main Walkway)"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="h-12 border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-brand-green transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Bathroom Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-12 border border-surface-border dark:border-dark-border bg-surface-card dark:bg-dark-card rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-brand-green transition"
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
            <Button variant="secondary" fullWidth onClick={handlePrev}>
              Back
            </Button>
            <Button variant="primary" fullWidth onClick={handleNext} className={nextBtnShake ? "animate-shake" : ""}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Gender Access */}
      {step === 3 && (
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Gender Access</label>
          <p className="text-xs text-text-secondary leading-relaxed -mt-2">Who is allowed to access this toilet?</p>

          <div className="flex flex-col gap-2">
            {["Men", "Women", "Unisex", "Both"].map((access) => (
              <button
                key={access}
                type="button"
                onClick={() => setGenderAccess(access)}
                className={`w-full min-h-[48px] px-4 rounded-xl border text-sm font-semibold transition text-left flex items-center justify-between ${
                  genderAccess === access
                    ? "bg-brand-greenLight border-brand-green text-brand-green dark:bg-brand-green/20 dark:text-text-inverse"
                    : "bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverse"
                }`}
              >
                <span>{access}</span>
                {genderAccess === access && <span className="text-base">✓</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" fullWidth onClick={handlePrev}>
              Back
            </Button>
            <Button variant="primary" fullWidth onClick={handleNext} className={nextBtnShake ? "animate-shake" : ""}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Toilet Style */}
      {step === 4 && (
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Toilet Style</label>
          <p className="text-xs text-text-secondary leading-relaxed -mt-2">What physical toilet type is installed?</p>

          <div className="flex flex-col gap-2">
            {["Indian", "European", "Both"].map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setToiletType(style)}
                className={`w-full min-h-[48px] px-4 rounded-xl border text-sm font-semibold transition text-left flex items-center justify-between ${
                  toiletType === style
                    ? "bg-brand-greenLight border-brand-green text-brand-green dark:bg-brand-green/20 dark:text-text-inverse"
                    : "bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverse"
                }`}
              >
                <span>{style}</span>
                {toiletType === style && <span className="text-base">✓</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" fullWidth onClick={handlePrev}>
              Back
            </Button>
            <Button variant="primary" fullWidth onClick={handleNext} className={nextBtnShake ? "animate-shake" : ""}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Accessibility selection (Yes/No explicitly) */}
      {step === 5 && (
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Wheelchair Accessibility ♿</label>
          <p className="text-xs text-text-secondary leading-relaxed -mt-2">Is there step-free access, wide doors, or grab rails?</p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setAccessibilityAnswer("yes");
                setIsAccessible(true);
              }}
              className={`flex-1 min-h-[80px] rounded-2xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                accessibilityAnswer === "yes"
                  ? "bg-brand-greenLight border-brand-green text-brand-green dark:bg-brand-green/20 dark:text-text-inverse"
                  : "bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverse"
              }`}
            >
              <span className="text-2xl">♿</span>
              <span>Yes, Accessible</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccessibilityAnswer("no");
                setIsAccessible(false);
              }}
              className={`flex-1 min-h-[80px] rounded-2xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                accessibilityAnswer === "no"
                  ? "bg-brand-redLight border-brand-red text-brand-red dark:bg-brand-red/20 dark:text-text-inverse"
                  : "bg-surface-card dark:bg-dark-card border-surface-border dark:border-dark-border text-text-primary dark:text-text-inverse"
              }`}
            >
              <span className="text-2xl">❌</span>
              <span>No / Unsure</span>
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" fullWidth onClick={handlePrev}>
              Back
            </Button>
            <Button variant="primary" fullWidth onClick={handleNext} className={nextBtnShake ? "animate-shake" : ""}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6: Star Ratings (Cleanliness, Smell, Lighting, Safety, Water) */}
      {step === 6 && (
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Restroom Quality Ratings</label>
          <p className="text-xs text-text-secondary leading-relaxed -mt-2">Rate each category (minimum 1 star required for each).</p>

          <div className="space-y-4">
            {renderStarSelector("Cleanliness", cleanliness, setCleanliness)}
            {renderStarSelector("Smell Level", smell, setSmell)}
            {renderStarSelector("Lighting", lighting, setLighting)}
            {renderStarSelector("Women Safety", womenSafety, setWomenSafety)}
            {renderStarSelector("Water Supply", waterAvailability, setWaterAvailability)}
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" fullWidth onClick={handlePrev}>
              Back
            </Button>
            <Button variant="primary" fullWidth onClick={handleNext} className={nextBtnShake ? "animate-shake" : ""}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* STEP 7: Amenities checklist */}
      {step === 7 && (
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Amenities Available (Optional)</label>
          <p className="text-xs text-text-secondary leading-relaxed -mt-2">Select all facilities present inside the restroom.</p>

          <div className="bg-surface-muted dark:bg-dark-muted rounded-xl p-3 border border-surface-border dark:border-dark-border space-y-2">
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
                  checked={hasSanRoot}
                  onChange={(e) => setHasSanRoot(e.target.checked)}
                  className="w-5 h-5 rounded border-surface-border text-brand-green focus:ring-brand-green/20"
                />
                Sanitary Pad Disposal Box
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" fullWidth onClick={handlePrev}>
              Back
            </Button>
            <Button variant="primary" fullWidth onClick={handleNext}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* STEP 8: Photo upload & submission */}
      {step === 8 && (
        <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col gap-4">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Restroom Picture (Optional)</label>
          <p className="text-xs text-text-secondary leading-relaxed -mt-2">Provide a clear photo to help others locate this toilet.</p>

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
            <div className="relative w-full h-40 rounded-xl bg-surface-muted dark:bg-dark-muted overflow-hidden border border-surface-border dark:border-dark-border flex items-center justify-center">
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
              onClick={() => document.getElementById("add-toilet-file")?.click()}
              disabled={loading}
              className="w-full h-28 border-2 border-dashed border-surface-border dark:border-dark-border hover:border-brand-green rounded-xl flex flex-col items-center justify-center gap-1.5 text-text-secondary active:scale-[0.98] transition min-h-[44px]"
            >
              <span className="text-2xl">📸</span>
              <span className="text-xs font-semibold">Tap to Take / Select Photo</span>
            </button>
          )}

          {/* Simple Progress Bar (no text percentage) */}
          {uploadProgress > 0 && (
            <div className="w-full bg-surface-muted dark:bg-dark-muted border border-surface-border dark:border-dark-border rounded-full h-2.5 overflow-hidden mt-2">
              <div
                className="bg-brand-green h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" fullWidth onClick={handlePrev} disabled={loading}>
              Back
            </Button>

            {!photo ? (
              <Button
                variant="primary"
                fullWidth
                type="submit"
                disabled={loading}
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
                  "Skip & Submit"
                )}
              </Button>
            ) : (
              <Button
                variant="primary"
                fullWidth
                type="submit"
                disabled={loading}
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
                  "Submit Toilet"
                )}
              </Button>
            )}
          </div>
        </form>
      )}

      {/* Privacy processing Overlay */}
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

      {/* Tailwind colors CSS variables mock style to ensure buttons inside map elements look correct */}
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
