import { useEffect, useRef } from "react";
import type { Hospital } from "./hospitals";

let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve) => {
    (window as any).__gmapsInit = () => resolve();
    const script = document.createElement("script");
    script.setAttribute("data-gmaps-loader", "");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__gmapsInit`;
    script.async = true;
    document.head.appendChild(script);
  });
  return mapsPromise;
}

interface Props {
  hospital: Hospital;
  userLocation: { lat: number; lng: number };
}

export function HospitalCardMap({ hospital, userLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    let cancelled = false;

    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !containerRef.current) return;
      const G = (window as any).google.maps;

      const map = new G.Map(containerRef.current, {
        zoom: 13,
        center: userLocation,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      });

      const directionsService = new G.DirectionsService();
      const directionsRenderer = new G.DirectionsRenderer({
        map,
        polylineOptions: { strokeColor: "#1a73e8", strokeWeight: 5 },
      });

      directionsService.route(
        {
          origin: userLocation,
          destination: { lat: hospital.lat, lng: hospital.lng },
          travelMode: G.TravelMode.DRIVING,
        },
        (result: unknown, status: string) => {
          if (cancelled) return;
          if (status === "OK") {
            directionsRenderer.setDirections(result);
          } else {
            // Fallback to plain markers if Directions API not enabled
            new G.Marker({
              position: userLocation,
              map,
              title: "You are here",
              icon: {
                path: G.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              },
            });
            new G.Marker({
              position: { lat: hospital.lat, lng: hospital.lng },
              map,
              title: hospital.name,
            });
            const bounds = new G.LatLngBounds();
            bounds.extend(userLocation);
            bounds.extend({ lat: hospital.lat, lng: hospital.lng });
            map.fitBounds(bounds, { top: 20, bottom: 20, left: 20, right: 20 });
          }
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [hospital.lat, hospital.lng, hospital.name, hospital.place_id, userLocation]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "200px" }}
    />
  );
}

