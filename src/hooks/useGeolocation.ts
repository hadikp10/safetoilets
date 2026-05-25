import { useState } from "react";

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  isWithinKerala: boolean;
}

// Bounding box for Kerala state
export const KERALA_BOUNDS = {
  minLat: 8.0,
  maxLat: 13.0,
  minLng: 74.5,
  maxLng: 77.8,
};

// Central fallback coordinates (Kochi, Kerala) if user is outside Kerala or offline
export const KERALA_CENTER = {
  latitude: 9.9816,
  longitude: 76.2999,
};

/**
 * Checks if coordinates are within the geographic boundaries of Kerala.
 */
export function isCoordsInKerala(lat: number, lng: number): boolean {
  return (
    lat >= KERALA_BOUNDS.minLat &&
    lat <= KERALA_BOUNDS.maxLat &&
    lng >= KERALA_BOUNDS.minLng &&
    lng <= KERALA_BOUNDS.maxLng
  );
}

/**
 * Hook to request and manage browser GPS coordinates.
 */
export function useGeolocation(options?: PositionOptions) {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    isWithinKerala: false,
  });

  const getPosition = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser.",
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const inKerala = isCoordsInKerala(latitude, longitude);
        
        setState({
          latitude,
          longitude,
          accuracy,
          error: null,
          loading: false,
          isWithinKerala: inKerala,
        });
      },
      (error) => {
        let errorMsg = "Unable to retrieve your location.";
        switch (error.code) {
          case 1:
            errorMsg = "Location permission denied. Please allow location access in your browser settings.";
            break;
          case 2:
            errorMsg = "Location unavailable. Please make sure GPS is turned on.";
            break;
          case 3:
            errorMsg = "Location request timed out. Please try again.";
            break;
        }
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        ...options,
      }
    );
  };

  return { ...state, getPosition, setState };
}
