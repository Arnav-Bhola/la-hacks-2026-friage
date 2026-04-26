// src/hospitals.ts
import { useState, useCallback } from "react";

export interface Hospital {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  eta_label: string;
  distance_label: string;
  open_now: boolean | null;
  rating: number;
  rank: number;
  phone?: string;
  treatmentTypes?: string[];
  totalBeds?: number;
}

export interface Recommendation {
  recommended: { name: string; address: string; eta_label: string; reason: string };
  alternatives: { name: string; address: string; eta_label: string; reason: string }[];
  dispatchNote: string;
  severity: string;
  esi_level: number;  // ← add this
}

export function useHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findHospitals = useCallback(async (symptomSummary: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get user location (temporarily hardcoded to LA for because GPS is not working indoors)
      // const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      //   navigator.geolocation.getCurrentPosition(resolve, reject)
      // );
      // const lat = position.coords.latitude;
      // const lng = position.coords.longitude;

      const lat = 34.0522;
      const lng = -118.2437;

      setUserLocation({ lat, lng });

      // Call backend
      const res = await fetch("http://localhost:3001/api/hospitals", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ lat, lng }),  // minimal call, App.tsx handles the real call
});
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      setHospitals(data.hospitals);
      setRecommendation(data.recommendation);
    } catch (err: any) {
      setError(err.message || "Failed to find hospitals");
    } finally {
      setLoading(false);
    }
  }, []);

  const setResults = (data: {
    hospitals: Hospital[];
    recommendation: Recommendation;
    userLocation?: { lat: number; lng: number };
  }) => {
    setHospitals(data.hospitals);
    setRecommendation(data.recommendation);
    if (data.userLocation) setUserLocation(data.userLocation);
  };

  // add to return:
  return {
    findHospitals,
    hospitals,
    recommendation,
    userLocation,
    loading,
    error,
    setResults,
  };

}
