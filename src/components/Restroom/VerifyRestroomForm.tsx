import { useState, useRef } from "react";
import { Restroom } from "@/types";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompressor";

interface VerifyRestroomFormProps {
  restroom: Restroom;
  userId: string;
  onClose: () => void;
  onSuccess: (updatedRestroom: Restroom) => void;
}

export default function VerifyRestroomForm({
  restroom,
  userId,
  onClose,
  onSuccess,
}: VerifyRestroomFormProps) {
  // Ratings
  const [cleanliness, setCleanliness] = useState(3);
  const [smell, setSmell] = useState(3);
  const [lighting, setLighting] = useState(3);
  const [womenSafety, setWomenSafety] = useState(3);
  const [waterAvailability, setWaterAvailability] = useState(3);

  // Facilities
  const [hasSoap, setHasSoap] = useState(restroom.has_soap);
  const [hasMirror, setHasMirror] = useState(restroom.has_mirror);
  const [hasSanitary, setHasSanitary] = useState(restroom.has_sanitary_disposal);

  // Photo
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select a valid image file.");
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      let uploadedImageUrl: string | null = null;

      // 1. Upload photo if selected
      if (photo) {
        // Run client-side EXIF removal & compression
        const compressedBlob = await compressImage(photo);
        
        const fileName = `${restroom.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        
        // Upload to Supabase Storage Bucket 'restroom-photos'
        const { error: uploadError } = await supabase.storage
          .from("restroom-photos")
          .upload(fileName, compressedBlob, {
            contentType: "image/jpeg",
            cacheControl: "3600",
          });

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("restroom-photos")
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      }

      // 2. Insert verification log row in Supabase DB
      // Trigger function public.update_restroom_averages will auto update restrooms table!
      const { error: dbError } = await supabase
        .from("restroom_verifications")
        .insert({
          restroom_id: restroom.id,
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

      if (dbError) throw dbError;

      // 3. Query the updated restroom details to return to parent
      const { data: updatedData, error: fetchError } = await supabase
        .from("restrooms")
        .select("*")
        .eq("id", restroom.id)
        .single();

      if (fetchError) throw fetchError;

      onSuccess(updatedData as Restroom);
    } catch (err) {
      console.error("Verification error:", err);
      // Handles rate limit exception or RLS failure
      setErrorMsg((err as Error).message || "Failed to submit verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderRatingSelectors = (
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
              className={`flex-1 h-9 rounded-lg font-bold border transition-colors ${
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
        
        {/* Form Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
            Verify & Update Toilet
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

        <form onSubmit={submitVerification} className="p-6 flex-1 flex flex-col gap-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Ratings Grid */}
          <div className="flex flex-col gap-4">
            {renderRatingSelectors("Cleanliness", cleanliness, setCleanliness)}
            {renderRatingSelectors("Smell Level (1 = heavy, 5 = fresh)", smell, setSmell)}
            {renderRatingSelectors("Lighting Quality", lighting, setLighting)}
            {renderRatingSelectors("Women Safety rating", womenSafety, setWomenSafety)}
            {renderRatingSelectors("Water Availability", waterAvailability, setWaterAvailability)}
          </div>

          {/* Facilities Checkboxes */}
          <div className="bg-stone-50 dark:bg-stone-850/50 rounded-xl p-4 border border-stone-100 dark:border-stone-800 flex flex-col gap-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Check Facilities Present
            </h4>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none">
                <input
                  type="checkbox"
                  checked={hasSoap}
                  onChange={(e) => setHasSoap(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-black focus:ring-black dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                Soap Available
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none">
                <input
                  type="checkbox"
                  checked={hasMirror}
                  onChange={(e) => setHasMirror(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-black focus:ring-black dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                Mirror Installed
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold select-none">
                <input
                  type="checkbox"
                  checked={hasSanitary}
                  onChange={(e) => setHasSanitary(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-black focus:ring-black dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                Sanitary Pad Box / Bin
              </label>
            </div>
          </div>

          {/* Camera Capture / Photo Upload */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Upload Latest Toilet Photo (Optional)
            </h4>
            
            <input
              type="file"
              accept="image/*"
              capture="environment" // Hints mobile browser to open rear camera directly
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative w-full h-32 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden border border-stone-200 dark:border-stone-800 flex items-center justify-center">
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
                onClick={() => fileInputRef.current?.click()}
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

          {/* Form Actions */}
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
                "Submit Update"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
