"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useToiletDetail } from "@/lib/hooks/useToiletDetail";
import { useSupabase } from "@/hooks/useSupabase";
import { useToast } from "@/context/ToastContext";
import VerificationBadge from "@/components/toilet/VerificationBadge";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

// Dynamic map view for Leaflet SSR safety
const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => <div className="h-40 rounded-xl bg-surface-muted animate-pulse" />,
});

export default function ToiletDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { isAuthenticated, loginWithGoogle } = useSupabase();
  const { showToast } = useToast();
  const { toilet, isLoading, error } = useToiletDetail(id);

  // States
  const [imgError, setImgError] = useState(false);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportReason, setReportReason] = useState<string>("wrong_image");
  const [reportLoading, setReportLoading] = useState(false);

  // OS Native Maps Deep Linking (Section 5b)
  const handleGetDirections = () => {
    if (!toilet) return;
    const lat = toilet.latitude;
    const lng = toilet.longitude;
    
    let isAppleDevice = false;
    if (typeof window !== "undefined") {
      isAppleDevice =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    const daddr = `${lat},${lng}`;
    const url = isAppleDevice
      ? `maps://maps.apple.com/?daddr=${daddr}`
      : `https://www.google.com/maps/dir/?api=1&destination=${daddr}`;
    
    window.open(url, "_blank");
  };

  // Verify/Update Click Action (Section 5c)
  const handleVerifyClick = () => {
    if (isAuthenticated) {
      router.push(`/verify/${id}`);
    } else {
      setShowLoginSheet(true);
    }
  };

  // Submit Report Action (Section 5d)
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toilet) return;
    setReportLoading(true);
    try {
      const res = await fetch(`/api/toilets/${toilet.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });
      if (res.ok) {
        showToast("Report submitted.", "success");
        setShowReportSheet(false);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to submit report. Try again.", "error");
    } finally {
      setReportLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg p-4 space-y-4 animate-pulse">
        <div className="h-5 w-20 bg-surface-muted rounded-md" />
        <div className="h-[240px] w-full bg-surface-muted rounded-2xl" />
        <div className="h-14 w-full bg-surface-muted rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-surface-muted rounded-xl" />
          <div className="h-16 bg-surface-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // 404 Page Not Found (Section 5a)
  if (error || !toilet) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
        <span className="text-5xl mb-4">🚽</span>
        <h2 className="text-xl font-bold text-text-primary dark:text-text-inverse">This toilet couldn&apos;t be found.</h2>
        <p className="text-sm text-text-secondary mt-1 max-w-xs">It might have been removed by an admin or does not exist.</p>
        <Link href="/" className="mt-6">
          <Button variant="primary">Find Toilets Near Me</Button>
        </Link>
      </div>
    );
  }

  const renderStars = (score: number) => {
    const rounded = Math.round(score);
    return (
      <div className="flex gap-0.5 text-base">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rounded ? "text-brand-green" : "text-text-disabled dark:text-dark-muted"}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const imageUrl = toilet.public_image_url;

  return (
    <div className="min-h-screen bg-surface-bg dark:bg-dark-bg text-text-primary dark:text-text-inverse px-4 py-4 flex flex-col gap-4 max-w-md mx-auto pb-[env(safe-area-inset-bottom)] page-scroll">
      
      {/* Back Button (Section 6c - uses router.back()) */}
      <div className="flex items-center">
        <button
          onClick={() => router.back()}
          className="text-brand-sky font-semibold text-sm hover:underline min-h-[44px] flex items-center"
        >
          ← Back
        </button>
      </div>

      {/* Toilet Photo (Section 3d/7b - reserve space, onError fallback) */}
      <div className="w-full h-[240px] rounded-2xl overflow-hidden bg-surface-muted dark:bg-dark-muted border border-surface-border dark:border-dark-border flex items-center justify-center relative">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={toilet.name}
            fill
            sizes="(max-width: 768px) 100vw, 450px"
            className="object-cover"
            onError={() => setImgError(true)}
            priority
          />
        ) : (
          <div className="text-center p-4">
            <span className="text-4xl">📸</span>
            <p className="text-xs text-text-secondary mt-1 font-semibold">No photo yet — be the first</p>
          </div>
        )}
      </div>

      {/* Prominent Verification Badge */}
      <VerificationBadge updatedAt={toilet.updated_at} />

      {/* Basic Title Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight leading-tight">{toilet.name}</h1>
        <p className="text-sm text-text-secondary mt-0.5">{toilet.location_name}</p>
      </div>

      {/* Info Chips Row */}
      <div className="w-full overflow-x-auto no-scrollbar flex gap-2 py-0.5 whitespace-nowrap">
        <Badge variant="muted">{toilet.type}</Badge>
        <Badge variant="muted">{toilet.toilet_type} Style</Badge>
        <Badge variant="muted">Gender: {toilet.gender_access}</Badge>
        {toilet.is_accessible && <Badge variant="green">Accessible ♿</Badge>}
      </div>

      {/* Star Ratings Grid */}
      <div className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-4">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Community Reviews</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Cleanliness", val: toilet.avg_cleanliness },
            { label: "Smell Level", val: toilet.avg_smell },
            { label: "Lighting", val: toilet.avg_lighting },
            { label: "Women Safety", val: toilet.avg_women_safety },
            { label: "Water Supply", val: toilet.avg_water_availability },
          ].map((cat) => (
            <div key={cat.label} className="flex flex-col gap-0.5">
              <span className="text-xs text-text-secondary">{cat.label}</span>
              <div className="flex items-center gap-1.5">
                {renderStars(cat.val)}
                <span className="text-xs font-mono font-bold text-text-primary dark:text-text-inverse">
                  {cat.val > 0 ? cat.val.toFixed(1) : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Facilities Checklist */}
      <div className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-3">Facilities</h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className={`text-base ${toilet.has_soap ? "opacity-100" : "opacity-30"}`}>🧴</span>
            <span className={`text-xs font-semibold ${toilet.has_soap ? "text-brand-green" : "text-text-disabled line-through"}`}>
              Soap Available
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-base ${toilet.has_mirror ? "opacity-100" : "opacity-30"}`}>🪞</span>
            <span className={`text-xs font-semibold ${toilet.has_mirror ? "text-brand-green" : "text-text-disabled line-through"}`}>
              Mirror
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-base ${toilet.has_sanitary_disposal ? "opacity-100" : "opacity-30"}`}>🚺</span>
            <span className={`text-xs font-semibold ${toilet.has_sanitary_disposal ? "text-brand-green" : "text-text-disabled line-through"}`}>
              Sanitary Bin
            </span>
          </div>
        </div>
      </div>

      {/* Non-Interactive Mini Map */}
      <div className="w-full h-40 rounded-xl overflow-hidden border border-surface-border dark:border-dark-border relative bg-surface-muted dark:bg-dark-muted">
        <MapView
          toilets={[toilet]}
          selectedToilet={toilet}
          onSelectToilet={() => {}}
          userCoords={null}
          isAddingMode={false}
          interactive={false}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-2">
        <Button variant="primary" fullWidth onClick={handleGetDirections}>
          Get Directions
        </Button>
        <Button variant="outline" fullWidth onClick={handleVerifyClick}>
          Verify / Update Info
        </Button>
      </div>

      {/* Report Link */}
      <div className="text-center mt-3 mb-6">
        <button
          onClick={() => setShowReportSheet(true)}
          className="text-xs text-text-secondary underline hover:text-brand-red min-h-[44px] px-4"
        >
          Report incorrect information
        </button>
      </div>

      {/* Login Prompt Bottom Sheet (Section 5c) */}
      <BottomSheet
        isOpen={showLoginSheet}
        onClose={() => setShowLoginSheet(false)}
        title="Login Required"
      >
        <div className="flex flex-col items-center text-center p-4 gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center text-xl">
            🔒
          </div>
          <h4 className="font-bold text-sm text-text-primary dark:text-text-inverse">Login to contribute</h4>
          <p className="text-xs text-text-secondary leading-relaxed -mt-2">
            SafeToilets requires Google verification before allowing reviews or edits to prevent spam.
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              sessionStorage.setItem("authRedirectPath", `/verify/${id}`);
              loginWithGoogle();
            }}
            className="mt-2"
          >
            Continue with Google
          </Button>
        </div>
      </BottomSheet>

      {/* Report Bottom Sheet Radio Forms (Section 5d) */}
      <BottomSheet
        isOpen={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        title="Report Incorrect Information"
      >
        <form onSubmit={handleReportSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary">Please select the reason for reporting this restroom listing:</p>
          
          <div className="flex flex-col gap-1">
            {[
              { key: "wrong_image", label: "Wrong image" },
              { key: "fake_restroom", label: "Fake restroom" },
              { key: "closed_restroom", label: "Closed restroom" },
              { key: "incorrect_information", label: "Incorrect information" },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-surface-muted dark:hover:bg-dark-muted cursor-pointer transition select-none min-h-[44px]"
              >
                <input
                  type="radio"
                  name="report_reason"
                  value={opt.key}
                  checked={reportReason === opt.key}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-5 h-5 text-brand-green border-surface-border focus:ring-brand-green/20"
                />
                <span className="text-sm font-semibold text-text-primary dark:text-text-inverse">{opt.label}</span>
              </label>
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={reportLoading}
            className="mt-2"
          >
            {reportLoading ? "Submitting Report..." : "Submit Report"}
          </Button>
        </form>
      </BottomSheet>

    </div>
  );
}
