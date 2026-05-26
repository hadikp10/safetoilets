import { useState, useCallback } from "react";

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  isWithinKerala: boolean;
}

export const KERALA_BOUNDS = {
  minLat: 8.0,
  maxLat: 13.0,
  minLng: 74.5,
  maxLng: 77.8,
};

export const KERALA_CENTER = {
  latitude: 9.9816,
  longitude: 76.2999,
};

export function isCoordsInKerala(lat: number, lng: number): boolean {
  return (
    lat >= KERALA_BOUNDS.minLat &&
    lat <= KERALA_BOUNDS.maxLat &&
    lng >= KERALA_BOUNDS.minLng &&
    lng <= KERALA_BOUNDS.maxLng
  );
}

export function useLocation(options?: PositionOptions) {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    isWithinKerala: false,
  });

  const getPosition = useCallback(() => {
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
            errorMsg = "Location access was denied.";
            break;
          case 2:
            errorMsg = "Location access was denied. Please enable location settings.";
            break;
          case 3:
            errorMsg = "Getting your location is taking longer than usual. Please check your GPS signal and connection.";
            break;
        }
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
        ...options,
      }
    );
  }, [options]);

  return { ...state, getPosition, setState };
}
