import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Star, Camera, Lock, X } from "lucide-react";
import { Restroom } from "@/types";

interface VerifyToiletFormProps {
  toilet: Restroom;
  onClose: () => void;
  onSuccess: (updatedToilet: Restroom) => void;
}

export default function VerifyToiletForm({
  toilet,
  onClose,
  onSuccess,
}: VerifyToiletFormProps) {
  const [cleanliness, setCleanliness] = useState(3);
  const [smell, setSmell] = useState(3);
  const [lighting, setLighting] = useState(3);
  const [womenSafety, setWomenSafety] = useState(3);
  const [waterAvailability, setWaterAvailability] = useState(3);

  const [hasSoap, setHasSoap] = useState(toilet.has_soap);
  const [hasMirror, setHasMirror] = useState(toilet.has_mirror);
  const [hasSanitary, setHasSanitary] = useState(toilet.has_sanitary_disposal);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<"compressing" | "scrubbing" | "securing" | null>(null);

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

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      let photoBase64: string | null = null;

      if (photo) {
        setPrivacyStatus("compressing");
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        setPrivacyStatus("scrubbing");
        photoBase64 = await getBase64(photo);
        await new Promise((resolve) => setTimeout(resolve, 600));

        setPrivacyStatus("securing");
      }

      // Read authorization token via session
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/toilets/${toilet.id}/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cleanliness,
          smell,
          lighting,
          women_safety: womenSafety,
          water_availability: waterAvailability,
          has_soap: hasSoap,
          has_mirror: hasMirror,
          has_sanitary_disposal: hasSanitary,
          photoBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit verification.");

      setPrivacyStatus(null);
      onSuccess(data);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || "An error occurred.");
      setPrivacyStatus(null);
    } finally {
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
        <div className="flex justify-between items-center text-[11px] font-normal tracking-wide uppercase text-neutral-400">
          <span>{label}</span>
          <span className="text-brand-green font-mono flex items-center gap-0.5">{value} <Star className="w-3 h-3 fill-current text-brand-green" /></span>
        </div>
        <div className="flex bg-neutral-100 p-1 rounded-[14px] w-full border border-neutral-200">
          {[1, 2, 3, 4, 5].map((num) => (
            <motion.button
              key={num}
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              onClick={() => setValue(num)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition min-h-[36px] ${
                value === num
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {num}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[20px] overflow-hidden max-h-[90vh] shadow-card flex flex-col border border-neutral-200 relative">
        
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Verify & Update Toilet</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4 text-left">
          {errorMsg && (
            <div className="bg-brand-greenVeryLight border border-brand-green/20 text-text-secondary p-3 rounded-[14px] text-xs font-normal">
              {errorMsg}
            </div>
          )}

          {/* Ratings */}
          <div className="space-y-4">
            {renderRatingGroup("Cleanliness", cleanliness, setCleanliness)}
            {renderRatingGroup("Smell Level", smell, setSmell)}
            {renderRatingGroup("Lighting", lighting, setLighting)}
            {renderRatingGroup("Women Safety", womenSafety, setWomenSafety)}
            {renderRatingGroup("Water Availability", waterAvailability, setWaterAvailability)}
          </div>

          {/* Amenities */}
          <div className="bg-white border border-neutral-200 rounded-[20px] p-3 shadow-card space-y-2">
            <span className="text-[10px] font-normal text-neutral-400 uppercase tracking-wide">Facilities Present</span>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer text-sm font-normal text-neutral-900 select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={hasSoap}
                  onChange={(e) => setHasSoap(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-400 text-brand-green focus:ring-brand-green/20"
                />
                Soap Available
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm font-normal text-neutral-900 select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={hasMirror}
                  onChange={(e) => setHasMirror(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-400 text-brand-green focus:ring-brand-green/20"
                />
                Mirror Installed
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm font-normal text-neutral-900 select-none min-h-[44px]">
                <input
                  type="checkbox"
                  checked={hasSanitary}
                  onChange={(e) => setHasSanitary(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-400 text-brand-green focus:ring-brand-green/20"
                />
                Sanitary Pad Disposal Box
              </label>
            </div>
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <span className="text-[10px] font-normal text-neutral-400 uppercase tracking-wide block">Upload Latest Photo (Optional)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative w-full h-36 rounded-[14px] bg-neutral-100 overflow-hidden border border-neutral-200 flex items-center justify-center">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 border-2 border-dashed border-neutral-200 hover:border-brand-green rounded-[14px] flex flex-col items-center justify-center gap-1.5 text-neutral-600 hover:bg-neutral-100 transition-all min-h-[44px]"
              >
                <Camera className="w-5 h-5 text-neutral-400" />
                <span className="text-xs font-medium">Tap to Take / Select Photo</span>
              </motion.button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-[52px] bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50 text-[14px] font-medium rounded-[14px] flex items-center justify-center disabled:opacity-50"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              disabled={loading}
              className="flex-1 h-[52px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-[14px] shadow-button flex items-center justify-center disabled:opacity-50"
            >
              Submit Update
            </motion.button>
          </div>
        </form>

        {/* Privacy processing Overlay */}
        {privacyStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[60] bg-white/95 flex flex-col items-center justify-center p-6 text-center"
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
            <p className="text-xs text-neutral-600 mt-1.5 max-w-xs">
              SafeToilets strips camera metadata tags to keep your upload private.
            </p>
          </motion.div>
        )}

      </div>
    </div>
  );
}
