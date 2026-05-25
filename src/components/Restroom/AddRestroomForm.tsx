import { useState } from "react";
import { Restroom } from "@/types";
import { supabase } from "@/lib/supabase";
import { calculateDistance } from "./RestroomCard";
import { compressImage } from "@/lib/imageCompressor";

interface AddRestroomFormProps {
  userId: string;
  selectedLat: number;
  selectedLng: number;
  existingRestrooms: Restroom[];
  onClose: () => void;
  onSuccess: (newRestroom: Restroom) => void;
}

export default function AddRestroomForm({
  userId,
  selectedLat,
  selectedLng,
  existingRestrooms,
  onClose,
  onSuccess,
}: AddRestroomFormProps) {
  // Step navigation
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [type, setType] = useState<Restroom["type"]>("Public Toilet");
  const [toiletType, setToiletType] = useState<Restroom["toilet_type"]>("European");
  const [genderAccess, setGenderAccess] = useState<Restroom["gender_access"]>("Both");
  const [isAccessible, setIsAccessible] = useState(false);

  // Facilities
  const [hasSoap, setHasSoap] = useState(false);
  const [hasMirror, setHasMirror] = useState(false);
  const [hasSanitary, setHasSanitary] = useState(false);

  // Ratings
  const [cleanliness, setCleanliness] = useState(3);
  const [smell, setSmell] = useState(3);
  const [lighting, setLighting] = useState(3);
  const [womenSafety, setWomenSafety] = useState(3);
  const [waterAvailability, setWaterAvailability] = useState(3);

  // Image upload
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Duplicate Warning bypass flag
  const [bypassDuplicateWarning, setBypassDuplicateWarning] = useState(false);

  // 1. Validation Checks
  const isValidLocation = selectedLat !== 0 && selectedLng !== 0;
  
  // Find potential duplicates within 50 meters (0.05 km)
  const duplicateRestroom = existingRestrooms.find(
    (r) => calculateDistance(r.latitude, r.longitude, selectedLat, selectedLng) <= 0.05
  );

  const handleNext = () => {
    setErrorMsg(null);
    
    if (step === 1) {
      if (!isValidLocation) {
        setErrorMsg("Warning: Please select a valid location on the map.");
        return;
      }
      if (duplicateRestroom && !bypassDuplicateWarning) {
        // Show duplicate warning step / flag check
        return; // UI handles showing warning screen
      }
      setStep(2);
    } else if (step === 2) {
      if (!name.trim()) {
        setErrorMsg("Please enter a restroom title (e.g. Petrol Pump Restroom).");
        return;
      }
      if (!locationName.trim()) {
        setErrorMsg("Please enter an address or area name (e.g. Kozhikode Beach Road).");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setLoadingStage("Saving restroom location details...");
    setLoadingPercent(20);

    try {
      let uploadedImageUrl: string | null = null;
      let tempId: string | null = null;

      // 1. First insert the restroom row without public image to get UUID
      const { data: newRestroomData, error: dbError } = await supabase
        .from("restrooms")
        .insert({
          name: name.trim(),
          location_name: locationName.trim(),
          latitude: selectedLat,
          longitude: selectedLng,
          type,
          toilet_type: toiletType,
          gender_access: genderAccess,
          is_accessible: isAccessible,
          created_by: userId,
          overall_score: 0.00, 
        })
        .select()
        .single();

      if (dbError) throw dbError;
      tempId = newRestroomData.id;

      // 2. Upload image if selected
      if (photo && tempId) {
        setLoadingStage("Compressing photo (removing GPS metadata)...");
        setLoadingPercent(45);
        const compressedBlob = await compressImage(photo);
        
        setLoadingStage("Uploading photo to secure storage...");
        setLoadingPercent(75);
        const fileName = `${tempId}/${Date.now()}-upload.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("restroom-photos")
          .upload(fileName, compressedBlob, {
            contentType: "image/jpeg",
            cacheControl: "3600",
          });

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from("restroom-photos")
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      } else {
        setLoadingPercent(75);
      }

      // 3. Add initial restroom verification log row
      // This will automatically trigger `update_restroom_averages()` to populate restroom ratings cached scores
      setLoadingStage("Publishing rating verification...");
      setLoadingPercent(90);
      const { error: verifyError } = await supabase
        .from("restroom_verifications")
        .insert({
          restroom_id: tempId,
          user_id: userId,
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

      if (verifyError) throw verifyError;

      // 4. Fetch fully computed restroom data
      setLoadingStage("Finalizing map synchronization...");
      setLoadingPercent(100);
      const { data: finalRestroomData, error: fetchError } = await supabase
        .from("restrooms")
        .select("*")
        .eq("id", tempId)
        .single();

      if (fetchError) throw fetchError;

      // Introduce a tiny delay so the user sees the complete status bar animation
      await new Promise((resolve) => setTimeout(resolve, 600));

      onSuccess(finalRestroomData as Restroom);
    } catch (err) {
      console.error("Error creating restroom:", err);
      setErrorMsg((err as Error).message || "Could not add restroom. Please verify connection and try again.");
      setLoading(false);
      setLoadingStage("");
      setLoadingPercent(0);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const renderRatingGroup = (
    label: string,
    value: number,
    setValue: (val: number) => void
  ) => {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
          <span>{label}</span>
          <span className="font-bold text-black dark:text-white">{value} / 5</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setValue(num)}
              className={`flex-1 h-9 rounded-lg font-bold border transition-all ${
                value === num
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                  : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-[2rem] sm:rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
              Add New Toilet
            </h2>
            <span className="text-[10px] text-stone-450 dark:text-stone-500 font-bold uppercase tracking-wider mt-0.5">
              {loading ? "Publishing..." : `Step ${step} of 5`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:text-stone-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="p-8 flex flex-col items-center justify-center text-center my-6 animate-fade-in">
            {/* Progress Circular Bar */}
            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-stone-100 dark:text-stone-800"
                />
                {/* Active progress arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * loadingPercent) / 100}
                  className="text-black dark:text-white transition-all duration-300 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              {/* Central Text */}
              <span className="absolute text-sm font-black text-stone-900 dark:text-white">
                {loadingPercent}%
              </span>
            </div>

            <h3 className="text-sm font-extrabold text-stone-950 dark:text-white uppercase tracking-wider mb-2">
              Publishing Toilet
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-semibold max-w-[260px] leading-relaxed h-8">
              {loadingStage}
            </p>

            {/* Custom Visual Step List */}
            <div className="w-full max-w-[240px] mt-6 space-y-2.5 text-left border-t border-stone-100 dark:border-stone-800 pt-6">
              <div className="flex items-center gap-2.5 text-2xs font-bold uppercase tracking-wider">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                  loadingPercent > 20 
                    ? "bg-black border-black text-white dark:bg-white dark:text-black dark:border-white font-extrabold" 
                    : "border-stone-300 text-stone-450 dark:border-stone-700"
                }`}>
                  {loadingPercent > 20 ? "✓" : "1"}
                </div>
                <span className={loadingPercent >= 20 ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-stone-600"}>
                  Location Details
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-2xs font-bold uppercase tracking-wider">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                  !photo 
                    ? "bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800 dark:border-stone-700" 
                    : loadingPercent > 75 
                    ? "bg-black border-black text-white dark:bg-white dark:text-black dark:border-white font-extrabold" 
                    : "border-stone-300 text-stone-450 dark:border-stone-700"
                }`}>
                  {!photo ? "—" : loadingPercent > 75 ? "✓" : "2"}
                </div>
                <span className={!photo ? "text-stone-350 dark:text-stone-600 line-through font-normal" : loadingPercent >= 45 ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-stone-600"}>
                  Photo Upload {!photo && <span className="text-[9px] lowercase italic font-normal text-stone-400 dark:text-stone-600 ml-1">(skipped)</span>}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-2xs font-bold uppercase tracking-wider">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                  loadingPercent > 90 
                    ? "bg-black border-black text-white dark:bg-white dark:text-black dark:border-white font-extrabold" 
                    : "border-stone-300 text-stone-450 dark:border-stone-700"
                }`}>
                  {loadingPercent > 90 ? "✓" : "3"}
                </div>
                <span className={loadingPercent >= 90 ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-stone-600"}>
                  Verify & Rate
                </span>
              </div>
            </div>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Verify Location coordinates & Check Duplicates */}
        {!loading && step === 1 && (
          <div className="p-6 flex flex-col gap-5">
            <div className="bg-stone-50 dark:bg-stone-850/50 border border-stone-200 dark:border-stone-800 rounded-xl p-4 text-xs font-semibold">
              <p className="text-stone-500 dark:text-stone-400 mb-2">Picked Coordinates:</p>
              <p className="font-mono text-stone-900 dark:text-stone-100">
                Lat: {selectedLat.toFixed(6)}, Lng: {selectedLng.toFixed(6)}
              </p>
            </div>

            {duplicateRestroom && !bypassDuplicateWarning ? (
              <div className="bg-amber-50 border border-amber-250 text-amber-800 p-4 rounded-xl flex flex-col gap-3 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300">
                <div className="flex gap-2 items-start">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-bold text-xs">Duplicate Restroom Warning!</h4>
                    <p className="text-[11px] leading-relaxed mt-1">
                      Another restroom named <strong className="underline">{duplicateRestroom.name}</strong> is located within 50 meters of this location.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 px-3 text-[11px] font-bold border border-amber-300 rounded-lg active:scale-95 transition-transform"
                  >
                    Review Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setBypassDuplicateWarning(true)}
                    className="h-8 px-3 bg-amber-600 text-white text-[11px] font-bold rounded-lg active:scale-95 transition-transform"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 leading-relaxed">
                Confirm that the dropped pin matches the physical location of the toilet. Drag the pin on the map if you need to adjust coordinates.
              </p>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="h-12 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl active:scale-[0.98] transition-transform text-sm w-full mt-2"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2: Name and Address */}
        {!loading && step === 2 && (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Restroom Name
              </label>
              <input
                type="text"
                placeholder="e.g. Pump Restroom, Railway Station Toilet"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 px-4 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Location/Area Name
              </label>
              <input
                type="text"
                placeholder="e.g. Marine Drive (near walkway), Kochi"
                maxLength={100}
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="h-12 rounded-xl border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 px-4 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-12 border border-stone-200 dark:border-stone-800 dark:text-stone-300 font-bold rounded-xl active:scale-95 transition-transform text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-12 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl active:scale-95 transition-transform text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Basic Toilet Features */}
        {!loading && step === 3 && (
          <div className="p-6 flex flex-col gap-4">
            {/* Category Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Bathroom Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Restroom["type"])}
                className="h-12 rounded-xl border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 px-4 text-xs font-bold focus:outline-none"
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Petrol Pump">Petrol Pump</option>
                <option value="Mall">Mall</option>
                <option value="Railway / Bus Station">Railway / Bus Station</option>
                <option value="Public Toilet">Public Toilet</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Toilet style type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Toilet Style
              </label>
              <div className="flex gap-2">
                {["Indian", "European", "Both"].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setToiletType(style as Restroom["toilet_type"])}
                    className={`flex-1 h-10 rounded-xl border text-xs font-bold transition-colors ${
                      toiletType === style
                        ? "bg-black text-white border-black dark:bg-white dark:text-black"
                        : "bg-white dark:bg-stone-900 border-stone-250 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender Access */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Gender Access
              </label>
              <div className="flex gap-2">
                {["Men", "Women", "Unisex", "Both"].map((access) => (
                  <button
                    key={access}
                    type="button"
                    onClick={() => setGenderAccess(access as Restroom["gender_access"])}
                    className={`flex-1 h-10 rounded-xl border text-xs font-bold transition-colors ${
                      genderAccess === access
                        ? "bg-black text-white border-black dark:bg-white dark:text-black"
                        : "bg-white dark:bg-stone-900 border-stone-250 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {access === "Both" ? "M & F" : access}
                  </button>
                ))}
              </div>
            </div>

            {/* Wheelchair accessible */}
            <div className="flex flex-col gap-1.5 mt-2 bg-stone-50 dark:bg-stone-850/50 p-4 border border-stone-100 dark:border-stone-800 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none">
                <input
                  type="checkbox"
                  checked={isAccessible}
                  onChange={(e) => setIsAccessible(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-black focus:ring-black dark:border-stone-700 dark:bg-stone-800"
                />
                Wheelchair Accessible?
              </label>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-12 border border-stone-200 dark:border-stone-800 dark:text-stone-300 font-bold rounded-xl active:scale-95 transition-transform text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-12 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl active:scale-95 transition-transform text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Initial Ratings */}
        {!loading && step === 4 && (
          <div className="p-6 flex flex-col gap-4">
            {renderRatingGroup("Cleanliness", cleanliness, setCleanliness)}
            {renderRatingGroup("Smell Level (1 = heavy, 5 = fresh)", smell, setSmell)}
            {renderRatingGroup("Lighting Quality", lighting, setLighting)}
            {renderRatingGroup("Women Safety rating", womenSafety, setWomenSafety)}
            {renderRatingGroup("Water Availability", waterAvailability, setWaterAvailability)}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-12 border border-stone-200 dark:border-stone-800 dark:text-stone-300 font-bold rounded-xl active:scale-95 transition-transform text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-12 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl active:scale-95 transition-transform text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Facilities & Optional Photo Capture */}
        {!loading && step === 5 && (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            {/* Facilities checklist */}
            <div className="bg-stone-50 dark:bg-stone-850/50 rounded-xl p-4 border border-stone-100 dark:border-stone-800 flex flex-col gap-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Amenities Present
              </h4>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={hasSoap}
                    onChange={(e) => setHasSoap(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-black focus:ring-black dark:border-stone-700 dark:bg-stone-800"
                  />
                  Soap Available
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={hasMirror}
                    onChange={(e) => setHasMirror(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-black focus:ring-black dark:border-stone-700 dark:bg-stone-800"
                  />
                  Mirror Installed
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={hasSanitary}
                    onChange={(e) => setHasSanitary(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-black focus:ring-black dark:border-stone-700 dark:bg-stone-800"
                  />
                  Sanitary Pad Box / Bin
                </label>
              </div>
            </div>

            {/* Photo Capture */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Take Restroom Photo (Optional)
              </h4>
              
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                id="add-toilet-file-correct"
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative w-full h-32 rounded-xl bg-stone-100 dark:bg-stone-850 overflow-hidden border border-stone-200 dark:border-stone-800 flex items-center justify-center">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 active:scale-90 transition-transform"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById("add-toilet-file-correct")?.click()}
                  className="w-full h-24 border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-stone-500 dark:text-stone-400 active:scale-[0.99] transition-transform"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider">Tap to Take Photo</span>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 h-12 border border-stone-200 dark:border-stone-855 dark:text-stone-300 font-bold rounded-xl active:scale-95 transition-transform text-sm"
                disabled={loading}
              >
                Back
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
                  "Add Toilet"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
