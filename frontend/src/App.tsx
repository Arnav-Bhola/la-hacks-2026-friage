import { useState, useRef } from "react";
import { AdvancedImage, placeholder, lazyload } from "@cloudinary/react";
import { fill } from "@cloudinary/url-gen/actions/resize";
import { format, quality } from "@cloudinary/url-gen/actions/delivery";
import { auto } from "@cloudinary/url-gen/qualifiers/format";
import { auto as autoQuality } from "@cloudinary/url-gen/qualifiers/quality";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { cld, uploadPreset } from "./cloudinary/config";
import { UploadWidget } from "./cloudinary/UploadWidget";
import type { CloudinaryUploadResult } from "./cloudinary/UploadWidget";
import "./App.css";
import { useHospitals } from "./hospitals";
import { HospitalCards } from "./HospitalCards";

import TAG_DEFINITIONS from "./tagDefinitions";

import { useAiVisionTagging } from "./cloudinary/visionTagging";

const hasUploadPreset = Boolean(uploadPreset);

function App() {
  const symptomRef = useRef<HTMLTextAreaElement>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { analyze } = useAiVisionTagging();

  const {
    hospitals,
    recommendation,
    userLocation,
    loading: hospitalsLoading,
    error: hospitalsError,
    setResults,
  } = useHospitals();

  const handleUploadSuccess = async (result: CloudinaryUploadResult) => {
    setUploadedImageId(result.public_id);
    setUploadedUrl(result.secure_url);
    setAnalyzing(true);

    try {
      const tags = (await analyze(result.secure_url, TAG_DEFINITIONS)) ?? [];

      const res2 = await fetch("http://localhost:3001/api/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: 34.0522,
          lng: -118.2437,
          symptomDescription: symptomRef.current?.value ?? "",
          tags,
        }),
      });
      const data = await res2.json();
      setResults(data);

    } catch (err) {
      console.error("Failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    alert(`Upload failed: ${error.message}`);
  };

  const imageId = uploadedImageId || "samples/people/bicycle";

  const displayImage = cld
    .image(imageId)
    .resize(fill().width(600).height(400).gravity(autoGravity()))
    .delivery(format(auto()))
    .delivery(quality(autoQuality()));

  return (
    <div className="app">
      <main className="main-content">
        <h1>Triage</h1>

        {hasUploadPreset && (
          <div className="upload-section">
            <h2>Patient Description</h2>
            <textarea
              ref={symptomRef}
              placeholder="Describe the patient's condition (e.g. unconscious male, fell from ladder, head bleeding)"
              rows={3}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "14px",
                marginBottom: "12px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
            <h2>Upload Patient Photo</h2>
            <UploadWidget
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              buttonText="Upload Image"
            />
            {analyzing && (
              <p style={{ color: "#1a73e8", marginTop: "12px" }}>
                Analyzing image and finding hospitals...
              </p>
            )}
          </div>
        )}

        <div className="image-section">
          <h2>Display Image</h2>
          <AdvancedImage
            cldImg={displayImage}
            plugins={[placeholder({ mode: "blur" }), lazyload()]}
            alt={uploadedImageId ? "Your uploaded image" : "Sample image"}
            className="display-image"
          />
          {uploadedImageId && (
            <p className="image-info">Public ID: {uploadedImageId}</p>
          )}
          {uploadedUrl && (
            <p className="image-info">
              URL:{" "}
              <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
                {uploadedUrl}
              </a>
            </p>
          )}
        </div>

        {recommendation && (
          <div
            style={{
              margin: "16px 0",
              padding: "16px",
              borderRadius: "12px",
              background: "#f0f7ff",
              border: "1px solid #1a73e8",
            }}
          >
            <h3 style={{ margin: "0 0 8px", color: "#1a73e8" }}>
              Recommendation — {recommendation.severity.toUpperCase()}
              <span
                style={{
                  marginLeft: "10px",
                  background:
                    recommendation.esi_level <= 2
                      ? "#dc2626"
                      : recommendation.esi_level === 3
                        ? "#f59e0b"
                        : "#16a34a",
                  color: "white",
                  borderRadius: "6px",
                  padding: "2px 10px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                ESI {recommendation.esi_level}
              </span>
            </h3>
            <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#333" }}>
              → {recommendation.recommended.name}
            </p>
            <p style={{ margin: "0 0 4px", color: "#555", fontSize: "14px" }}>
              {recommendation.recommended.reason}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#333" }}>
              <strong>Dispatch note:</strong> {recommendation.dispatchNote}
            </p>
            {(recommendation.alternatives?.length ?? 0) > 0 && (
              <div style={{ marginTop: "12px" }}>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#555",
                  }}
                >
                  Alternatives:
                </p>
                {recommendation.alternatives.map((alt, i) => (
                  <p
                    key={i}
                    style={{ margin: "2px 0", fontSize: "13px", color: "#666" }}
                  >
                    {i + 2}. {alt.name} — {alt.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {(hospitalsLoading || hospitals.length > 0 || hospitalsError) && (
          <div className="hospitals-section">
            <h2>Nearby Facilities</h2>
            {hospitalsLoading && <p>Finding hospitals near you...</p>}
            {hospitalsError && <p style={{ color: "red" }}>{hospitalsError}</p>}
            {hospitals.length > 0 && (
              <HospitalCards
                hospitals={hospitals}
                userLocation={userLocation}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
