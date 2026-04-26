import { useState, useCallback } from 'react';
import type { TriageResult } from './triage';

export interface Hospital {
  place_id: string;
  name: string;
  address: string;
  rating: number;
  open_now: boolean | null;
  lat: number;
  lng: number;
  phone?: string | null;
  eta_seconds: number | null;
  eta_label: string;
  distance_label: string;
  score: number;
  specialty_match: boolean;
  rank: number;
}

export function useHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findHospitals = useCallback(async (triageResult: TriageResult) => {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        })
      );

      const { latitude: lat, longitude: lng } = pos.coords;
      const res = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triageResult, lat, lng }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setHospitals(data.hospitals);
      setUserLocation(data.userLocation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find hospitals');
    } finally {
      setLoading(false);
    }
  }, []);

  return { findHospitals, hospitals, userLocation, loading, error };
}
