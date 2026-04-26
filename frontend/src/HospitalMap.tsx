import { useEffect, useRef } from 'react';
import type { Hospital } from './hospitals';

interface Props {
  hospitals: Hospital[];
  userLocation: { lat: number; lng: number };
}

export function HospitalMap({ hospitals, userLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const init = () => {
      if (!containerRef.current || !(window as any).google) return;
      const G = (window as any).google.maps;

      const map = new G.Map(containerRef.current, {
        center: userLocation,
        zoom: 12,
      });

      const bounds = new G.LatLngBounds();

      // Blue pin — user location
      new G.Marker({
        position: userLocation,
        map,
        title: 'You are here',
        icon: {
          path: G.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
      bounds.extend(userLocation);

      // Red numbered pins — hospitals
      hospitals.forEach(h => {
        const pos = { lat: h.lat, lng: h.lng };
        const marker = new G.Marker({
          position: pos,
          map,
          label: { text: String(h.rank), color: '#fff', fontWeight: 'bold' },
          icon: {
            path: G.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#EA4335',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          title: h.name,
        });
        bounds.extend(pos);

        const infoWindow = new G.InfoWindow({
          content: `<div style="font-size:13px;line-height:1.6">
            <b>${h.name}</b><br/>
            ETA: <b>${h.eta_label}</b> · ${h.distance_label}<br/>
            ${h.rating ? `${h.rating.toFixed(1)} ★<br/>` : ''}
            ${h.open_now ? '🟢 Open' : h.open_now === false ? '🔴 Closed' : ''}
          </div>`,
        });
        marker.addListener('click', () => infoWindow.open(map, marker));
      });

      map.fitBounds(bounds);
    };

    if ((window as any).google?.maps) {
      init();
    } else {
      (window as any).__initHospitalMap = init;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__initHospitalMap`;
      script.async = true;
      document.head.appendChild(script);
      return () => {
        if (document.head.contains(script)) document.head.removeChild(script);
        delete (window as any).__initHospitalMap;
      };
    }
  }, [hospitals, userLocation]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '400px', borderRadius: '8px', marginTop: '16px' }}
    />
  );
}
