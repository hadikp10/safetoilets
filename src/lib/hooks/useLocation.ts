"use client";

import { useState, useCallback } from "react";
import { logEvent } from "@/lib/utils/analytics";

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  isWithinKerala: boolean;
  attempt: number;
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

const fetchCoords = (options: PositionOptions): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
};

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    isWithinKerala: false,
    attempt: 0,
  });

  const getPosition = useCallback(async (isManual = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by your browser.";
      console.error(errorMsg);
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
        attempt: 0,
      }));
      return;
    }

    setState((prev) => ({ 
      ...prev, 
      loading: true, 
      error: null,
      attempt: 1 
    }));

    logEvent(isManual ? "Manual Retry Triggered" : "Location Request Started");

    const attempts = [
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }, // Attempt 1: cached-first
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },       // Attempt 2: fresh lock
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },       // Attempt 3: fresh lock
    ];

    let success = false;
    let finalError: GeolocationPositionError | null = null;

    for (let i = 0; i < attempts.length; i++) {
      const attemptNum = i + 1;
      
      if (attemptNum > 1) {
        setState((prev) => ({ ...prev, attempt: attemptNum }));
        logEvent("Automatic Retry Triggered", { attempt: attemptNum });
      }

      try {
        console.log(`[Geolocation] Attempt ${attemptNum} starting...`, attempts[i]);
        const position = await fetchCoords(attempts[i]);
        console.log(`[Geolocation] Attempt ${attemptNum} succeeded:`, position);

        const { latitude, longitude, accuracy } = position.coords;
        const inKerala = isCoordsInKerala(latitude, longitude);

        setState({
          latitude,
          longitude,
          accuracy,
          error: null,
          loading: false,
          isWithinKerala: inKerala,
          attempt: attemptNum,
        });

        logEvent("Location Success", {
          accuracy,
          attempt: attemptNum,
          isWithinKerala: inKerala ? "true" : "false",
        });

        success = true;
        break; // Exit retry loop on success
      } catch (error) {
        const geoError = error as GeolocationPositionError;
        console.error(`[Geolocation] Attempt ${attemptNum} failed with code ${geoError.code}:`, geoError.message);
        finalError = geoError;

        // Code 1 is PERMISSION_DENIED. If user actively denied, stop immediately
        if (geoError.code === 1) {
          logEvent("Location Denied");
          break;
        }

        if (geoError.code === 3) {
          logEvent("Location Timeout", { attempt: attemptNum });
        }
      }
    }

    if (!success) {
      let errorMsg = "We're having trouble getting your location right now.";
      if (finalError) {
        switch (finalError.code) {
          case 1:
            errorMsg = "Location access was denied. Please enable location settings.";
            break;
          case 2:
            errorMsg = "We're having trouble getting your location right now.";
            break;
          case 3:
            errorMsg = "Getting your location is taking longer than usual. Please check your GPS signal.";
            break;
        }
      }

      setState((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));

      logEvent("Final Failure", {
        reason: finalError ? finalError.message : "Unknown",
        code: finalError ? finalError.code : -1,
      });
    }
  }, []);

  return { ...state, getPosition, setState };
}
