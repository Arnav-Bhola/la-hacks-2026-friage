import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import fs from "fs";
import Groq from "groq-sdk";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"] }));
app.use(express.json());

// ── Cloudinary AI Vision Tagging ─────────────────────────────────────────────
app.post("/api/analyze-tags", async (req, res) => {
  const { source, tag_definitions } = req.body;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  const credentials = Buffer.from(
    `${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`,
  ).toString("base64");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v2/analysis/${CLOUDINARY_CLOUD_NAME}/analyze/ai_vision_tagging`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({ source, tag_definitions }),
      },
    );
    const data = await response.json();
    if (!response.ok)
      console.error("Cloudinary error:", response.status, JSON.stringify(data));
    else fs.writeFileSync("dummy_response.json", JSON.stringify(data, null, 2));
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to reach Cloudinary API" });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDurationSeconds(dur) {
  if (!dur) return null;
  const m = String(dur).match(/^(\d+)s$/);
  return m ? parseInt(m[1]) : null;
}

function formatDuration(s) {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60),
    r = mins % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function formatDistance(m) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Step 1: Get 20 nearest hospitals from Google Places ───────────────────────
async function findNearbyHospitals(lat, lng) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours,places.businessStatus,places.types",
      },
      body: JSON.stringify({
        textQuery: "hospital emergency room",
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 20000 },
        },
        maxResultCount: 20,
      }),
    },
  );

  const data = await res.json();
  if (!res.ok)
    throw new Error(`Places API: ${data.error?.message || res.status}`);

  return (data.places || []).map((p) => ({
    place_id: p.id,
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    rating: p.rating ?? 0,
    open_now: p.regularOpeningHours?.openNow ?? null,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    types: p.types || [],
  }));
}

// ── Step 2: Get ETAs via Routes API ───────────────────────────────────────────
async function getETAs(lat, lng, hospitals) {
  if (!hospitals.length) return [];

  try {
    const res = await fetch(
      "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "originIndex,destinationIndex,duration,distanceMeters,condition",
        },
        body: JSON.stringify({
          origins: [
            {
              waypoint: {
                location: { latLng: { latitude: lat, longitude: lng } },
              },
            },
          ],
          destinations: hospitals.map((h) => ({
            waypoint: {
              location: { latLng: { latitude: h.lat, longitude: h.lng } },
            },
          })),
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      },
    );

    const text = await res.text();
    if (!text) throw new Error("empty response");
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error?.message || res.status);

    const elements = Array.isArray(data) ? data : [];
    return hospitals.map((h, i) => {
      const el = elements.find(
        (e) => e.destinationIndex === i && e.condition === "ROUTE_EXISTS",
      );
      const etaSeconds = el ? parseDurationSeconds(el.duration) : null;
      return {
        ...h,
        eta_seconds: etaSeconds,
        eta_label: etaSeconds !== null ? formatDuration(etaSeconds) : "Unknown",
        distance_label:
          el?.distanceMeters != null
            ? formatDistance(el.distanceMeters)
            : "Unknown",
      };
    });
  } catch (err) {
    console.warn(
      "Routes API unavailable, falling back to straight-line:",
      err.message,
    );
    return hospitals.map((h) => {
      const meters = haversineMeters(lat, lng, h.lat, h.lng);
      const etaSeconds = Math.round(meters / (40000 / 3600));
      return {
        ...h,
        eta_seconds: etaSeconds,
        eta_label: formatDuration(etaSeconds) + " (est.)",
        distance_label: formatDistance(Math.round(meters)) + " (est.)",
      };
    });
  }
}

// ── Step 3: Enrich with CDPH bed/treatment data ───────────────────────────────
function enrichWithCDPH(googleHospitals) {
  const cdph = JSON.parse(
    fs.readFileSync(path.join(__dirname, "hospitals.json"), "utf8"),
  );

  return googleHospitals.map((hospital) => {
    const keyword = hospital.name
      .toUpperCase()
      .split(" ")
      .slice(0, 2)
      .join(" ");
    const matches = cdph.filter((h) =>
      h.FACNAME?.toUpperCase().includes(keyword),
    );
    const treatmentTypes = [
      ...new Set(matches.map((h) => h.BED_CAPACITY_TYPE)),
    ].filter(Boolean);
    const totalBeds = matches.reduce(
      (sum, h) => sum + (parseInt(h.BED_CAPACITY) || 0),
      0,
    );
    return { ...hospital, treatmentTypes, totalBeds };
  });
}

// ── Main endpoint ─────────────────────────────────────────────────────────────
app.post("/api/hospitals", async (req, res) => {
  const { lat, lng, symptomDescription, tags } = req.body;

  console.log("Received:", { lat, lng, symptomDescription, tags });

  try {
    let hospitals = await findNearbyHospitals(lat, lng);
    hospitals = await getETAs(lat, lng, hospitals);
    hospitals = enrichWithCDPH(hospitals);
    hospitals = hospitals.map((h, i) => ({ ...h, rank: i + 1 }));

    const tagList =
      (tags || []).map((t) => t.name || t).join(", ") || "none detected";
    const hospitalList = hospitals
      .map(
        (h, i) =>
          `${i + 1}. ${h.name} | ETA: ${h.eta_label} | ${h.distance_label} | Beds: ${h.totalBeds || "Unknown"} | Treatments: ${h.treatmentTypes?.join(", ") || "Unknown"}`,
      )
      .join("\n");

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a 911 dispatch routing assistant. Recommend the best hospital based on patient symptoms and hospital capabilities. ESI levels: 1=immediate life threat, 2=high risk/severe pain, 3=urgent stable, 4=less urgent, 5=non-urgent. Respond ONLY with valid JSON.`,
        },
        {
          role: "user",
          content: `PATIENT DESCRIPTION: ${symptomDescription || "Not provided"}

CLOUDINARY DETECTED TAGS: ${tagList}

NEAREST HOSPITALS (with ETAs and bed data):
${hospitalList}

Return exactly this JSON:
{
  "recommended": {
    "name": "hospital name",
    "address": "address",
    "eta_label": "X mins",
    "reason": "one sentence clinical reason"
  },
  "alternatives": [
    { "name": "...", "address": "...", "eta_label": "...", "reason": "..." },
    { "name": "...", "address": "...", "eta_label": "...", "reason": "..." }
  ],
  "dispatchNote": "one sentence for the ambulance crew",
  "severity": "critical|high|moderate|low",
  "esi_level": 1|2|3|4|5
}`,
        },
      ],
    });

    const recommendation = JSON.parse(response.choices[0].message.content);
    res.json({ recommendation, hospitals, userLocation: { lat, lng } });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
