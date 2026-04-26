require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const Groq = require('groq-sdk');

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

app.post('/api/analyze-tags', async (req, res) => {
  const { source, tag_definitions } = req.body;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  const credentials = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v2/analysis/${CLOUDINARY_CLOUD_NAME}/analyze/ai_vision_tagging`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({ source, tag_definitions }),
      }
    );

    const data = await response.json();
    if (!response.ok) console.error('Cloudinary error:', response.status, JSON.stringify(data));
    else fs.writeFileSync('dummy_response.json', JSON.stringify(data, null, 2));
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Cloudinary API' });
  }
});

function buildPatientDescription(tags) {
  const tagSet = new Set(tags.map(t => t.name));
  const parts = [];

  // Wound type (most specific wins)
  if (tagSet.has('gunshot-wound'))      parts.push('gunshot wound present');
  else if (tagSet.has('stab-wound'))    parts.push('stab wound present');
  else if (tagSet.has('avulsion'))      parts.push('avulsion injury');
  else if (tagSet.has('laceration'))    parts.push('laceration present');
  else if (tagSet.has('cut'))           parts.push('minor cut present');
  else if (tagSet.has('abrasion'))      parts.push('abrasion present');
  else if (tagSet.has('puncture-wound')) parts.push('puncture wound present');
  else if (tagSet.has('burn'))          parts.push('burn injury present');

  // Bleeding severity
  if (tagSet.has('hemorrhage'))               parts.push('severe hemorrhage');
  else if (tagSet.has('blood-pooling'))        parts.push('blood pooling at scene');
  else if (tagSet.has('blood-soaked-bandage')) parts.push('bandage fully soaked with blood');
  else if (tagSet.has('bleeding'))             parts.push('active bleeding');
  else if (tagSet.has('blood'))                parts.push('blood visible');

  // Consciousness
  if (tagSet.has('unconscious') || tagSet.has('unresponsive'))
    parts.push('patient unconscious and unresponsive');
  else if (tagSet.has('altered-mental-status') || tagSet.has('confusion'))
    parts.push('patient showing altered mental status');

  // Skin signs
  if (tagSet.has('cyanosis'))     parts.push('cyanosis present — possible airway compromise');
  else if (tagSet.has('pale-skin')) parts.push('patient appears pale');
  if (tagSet.has('diaphoresis'))  parts.push('patient diaphoretic');

  // Body location
  const locations = ['head', 'neck', 'chest', 'abdomen', 'arm', 'leg'].filter(t => tagSet.has(t));
  if (locations.length) parts.push(`injury located on: ${locations.join(', ')}`);

  // Mechanism
  if (tagSet.has('vehicle-collision'))    parts.push('mechanism: vehicle collision');
  else if (tagSet.has('fall-from-height')) parts.push('mechanism: fall from height');

  // Already treated (de-escalates)
  if (tagSet.has('pressure-dressing')) parts.push('pressure dressing already applied');
  if (tagSet.has('splint'))            parts.push('splint in place');
  if (tagSet.has('cervical-collar'))   parts.push('cervical collar applied');

  return parts.length > 0
    ? parts.join('. ') + '.'
    : 'No specific injury indicators detected.';
}

app.post('/api/triage', async (req, res) => {
  const { tags } = req.body;
  const imageDescription = buildPatientDescription(tags);

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a medical triage AI for first responders.
Return ONLY valid JSON. When in doubt, escalate severity.
Use ESI levels 1-5. ESI 1-2 = trauma/emergency, 3 = urgent_care_er, 4 = urgent_care_clinic, 5 = primary_care.`,
        },
        {
          role: 'user',
          content: `Triage this patient: "${imageDescription}"
Return exactly:
{
  "esi_level": <1-5>,
  "severity": <"critical"|"high"|"moderate"|"low"|"minimal">,
  "care_type": <"trauma"|"emergency"|"urgent_care_er"|"urgent_care_clinic"|"primary_care">,
  "specialty": <string>,
  "hospital_search_keyword": <string>,
  "reasoning": <one sentence>,
  "immediate_actions": [<string>],
  "do_not_delay_for": [<string>]
}`,
        },
      ],
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error('Groq error:', err);
    res.status(500).json({ error: 'Triage failed' });
  }
});

// ── Google Maps: Hospital Routing ─────────────────────────────────────────

const ESI_CONFIG = {
  1: { keyword: 'trauma center level 1', type: 'hospital', radius: 20000 },
  2: { keyword: 'emergency room',        type: 'hospital', radius: 15000 },
  3: { keyword: 'urgent care emergency', type: 'hospital', radius: 10000 },
  4: { keyword: 'urgent care',           type: 'doctor',   radius: 8000  },
  5: { keyword: 'primary care clinic',   type: 'doctor',   radius: 5000  },
};

function parseDurationSeconds(dur) {
  if (!dur) return null;
  const m = String(dur).match(/^(\d+)s$/);
  return m ? parseInt(m[1]) : null;
}

function formatDuration(s) {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`;
  const h = Math.floor(mins / 60), r = mins % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function formatDistance(m) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

async function findNearbyHospitals(triageResult, lat, lng) {
  const config = ESI_CONFIG[triageResult.esi_level] || ESI_CONFIG[3];
  let textQuery = config.keyword;
  if (triageResult.esi_level >= 4 && triageResult.specialty) {
    textQuery = `${textQuery} ${triageResult.specialty}`;
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours,places.businessStatus,places.types',
    },
    body: JSON.stringify({
      textQuery,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: config.radius },
      },
      maxResultCount: 20,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Places API: ${data.error?.message || res.status}`);

  return (data.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text || '',
    address: p.formattedAddress || '',
    rating: p.rating ?? 0,
    open_now: p.regularOpeningHours?.openNow ?? null,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    types: p.types || [],
  }));
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getETAs(lat, lng, hospitals) {
  if (!hospitals.length) return [];

  try {
    const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition',
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } }],
        destinations: hospitals.map(h => ({
          waypoint: { location: { latLng: { latitude: h.lat, longitude: h.lng } } },
        })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    const text = await res.text();
    if (!text) throw new Error('empty response');
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error?.message || res.status);

    const elements = Array.isArray(data) ? data : [];
    return hospitals.map((h, i) => {
      const el = elements.find(e => e.destinationIndex === i && e.condition === 'ROUTE_EXISTS');
      const etaSeconds = el ? parseDurationSeconds(el.duration) : null;
      return {
        ...h,
        eta_seconds: etaSeconds,
        eta_label: etaSeconds !== null ? formatDuration(etaSeconds) : 'Unknown',
        distance_label: el?.distanceMeters != null ? formatDistance(el.distanceMeters) : 'Unknown',
      };
    });
  } catch (err) {
    console.warn('Routes API unavailable, falling back to straight-line estimates:', err.message);
    return hospitals.map(h => {
      const meters = haversineMeters(lat, lng, h.lat, h.lng);
      const etaSeconds = Math.round(meters / (40000 / 3600)); // assume 40 km/h
      return {
        ...h,
        eta_seconds: etaSeconds,
        eta_label: formatDuration(etaSeconds) + ' (est.)',
        distance_label: formatDistance(Math.round(meters)) + ' (est.)',
      };
    });
  }
}

async function getHospitalPhone(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'nationalPhoneNumber,internationalPhoneNumber',
    },
  });
  const data = await res.json();
  if (!res.ok) return null;
  return data.nationalPhoneNumber || data.internationalPhoneNumber || null;
}

function isAppropriateForEsi(placeName, types, esiLevel) {
  if (esiLevel >= 4) {
    // Exclude full hospitals — they'll have 'hospital' in their types
    if (types.includes('hospital')) return false;
    // Also catch by name for places that may not have typed correctly
    const name = placeName.toLowerCase();
    const erKeywords = ['emergency room', 'trauma center', 'level i ', 'level 1 '];
    if (erKeywords.some(kw => name.includes(kw))) return false;
  }
  return true;
}

function rankHospitals(hospitals, triageResult) {
  const esiLevel = triageResult.esi_level;
  const specialty = (triageResult.specialty || '').toLowerCase();

  // 1. Deduplicate by address (same building listed multiple times)
  const deduped = hospitals.filter((h, i, arr) =>
    arr.findIndex(x => x.address === h.address) === i
  );

  // 2. Hard filters — wrong care type, closed, too far for critical
  let filtered = deduped.filter(h => {
    if (h.open_now === false) return false;
    if (!isAppropriateForEsi(h.name, h.types || [], esiLevel)) return false;
    if (esiLevel <= 2 && h.eta_seconds !== null && h.eta_seconds > 1800) return false;
    return true;
  });

  // Fallback: if all got filtered, relax only the ESI-appropriateness check
  if (!filtered.length) {
    filtered = deduped.filter(h => h.open_now !== false);
  }
  if (!filtered.length) filtered = deduped;

  const maxEta = Math.max(...filtered.map(h => h.eta_seconds || 0), 1);

  return filtered
    .map(h => {
      const specialtyMatch = specialty
        ? h.name.toLowerCase().includes(specialty) || (h.address || '').toLowerCase().includes(specialty)
        : false;
      const score = Math.round(
        40 * (1 - (h.eta_seconds ?? maxEta) / maxEta) +
        15 + // beds default: 30 * (5/10)
        20 * (specialtyMatch ? 1 : 0) +
        10 * ((h.rating || 0) / 5)
      );
      return { ...h, score, specialty_match: specialtyMatch };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((h, i) => ({ ...h, rank: i + 1 }));
}

app.post('/api/hospitals', async (req, res) => {
  const { triageResult, lat, lng } = req.body;
  try {
    let hospitals = await findNearbyHospitals(triageResult, lat, lng);
    hospitals = await getETAs(lat, lng, hospitals);
    hospitals = rankHospitals(hospitals, triageResult);
    if (hospitals.length > 0) {
      hospitals[0].phone = await getHospitalPhone(hospitals[0].place_id);
    }
    res.json({ hospitals, userLocation: { lat, lng } });
  } catch (err) {
    console.error('Hospital search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
