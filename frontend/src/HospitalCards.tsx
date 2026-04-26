import type { Hospital } from './hospitals';
import { HospitalCardMap } from './HospitalCardMap';

interface Props {
  hospitals: Hospital[];
  userLocation: { lat: number; lng: number } | null;
}

export function HospitalCards({ hospitals, userLocation }: Props) {
  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'stretch' }}>
      {hospitals.map(h => (
        <div
          key={h.place_id}
          style={{
            flex: '1 1 260px',
            minWidth: '240px',
            border: h.rank === 1 ? '2px solid #1a73e8' : '1px solid #e0e0e0',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: h.rank === 1
              ? '0 4px 12px rgba(26,115,232,0.2)'
              : '0 1px 4px rgba(0,0,0,0.08)',
            background: '#fff',
          }}
        >
          {/* Map */}
          {userLocation && (
            <HospitalCardMap hospital={h} userLocation={userLocation} />
          )}

          {/* Info */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {/* Rank + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: h.rank === 1 ? '#1a73e8' : '#EA4335',
                color: '#fff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '13px',
                flexShrink: 0,
              }}>
                {h.rank}
              </div>
              <div style={{ fontWeight: '600', fontSize: '15px', lineHeight: 1.3 }}>{h.name}</div>
            </div>

            {/* ETA */}
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#1a73e8', lineHeight: 1 }}>
              {h.eta_label}
            </div>
            <div style={{ color: '#666', fontSize: '13px' }}>{h.distance_label}</div>

            {/* Open/closed */}
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: h.open_now ? '#34a853' : h.open_now === false ? '#ea4335' : '#aaa' }}>●</span>{' '}
              {h.open_now ? 'Open now' : h.open_now === false ? 'Closed' : 'Hours unknown'}
            </div>

            {/* Rating */}
            {h.rating > 0 && (
              <div style={{ fontSize: '13px', color: '#555' }}>
                {'★'.repeat(Math.round(h.rating))}{'☆'.repeat(5 - Math.round(h.rating))} {h.rating.toFixed(1)}
              </div>
            )}

            {/* Beds */}
            {h.totalBeds != null && h.totalBeds > 0 && (
              <div style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>
                🛏 {h.totalBeds} beds
              </div>
            )}

            {/* Address */}
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{h.address}</div>

            {/* Phone (top result only) */}
            {h.phone && (
              <div style={{ fontSize: '13px', color: '#333' }}>
                <a href={`tel:${h.phone}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{h.phone}</a>
              </div>
            )}

            {/* Spacer + Navigate */}
            <div style={{ flex: 1 }} />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&destination_place_id=${h.place_id}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#1a73e8',
                color: '#fff',
                padding: '9px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '8px',
              }}
            >
              Navigate →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
