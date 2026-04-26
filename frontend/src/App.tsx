import { useState, useEffect } from "react";
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
// import { useAiVisionTagging } from './cloudinary/visionTagging'; // uncomment when going live
// import TAG_DEFINITIONS from './tagDefinitions'; // uncomment when going live
import { useTriage } from "./triage";
import { useHospitals } from "./hospitals";
import { HospitalCards } from "./HospitalCards";

// MOCK MODE — swap both for real API calls when quota is available.
// To go live: call runTriage(realTags) and remove DUMMY_TRIAGE / setTriage.
const DUMMY_TRIAGE = {
  esi_level: 4,
  severity: "minimal" as const,
  care_type: "urgent_care_clinic" as const,
  specialty: "general practice",
  hospital_search_keyword: "urgent care clinic",
  reasoning: "The patient has a minor cut with visible blood, but it is not severe or life-threatening, so urgent care in a clinic setting is appropriate.",
  immediate_actions: [
    "Apply gentle pressure to stop bleeding",
    "Clean the cut with cool water and mild soap",
  ],
  do_not_delay_for: [],
};

const hasUploadPreset = Boolean(uploadPreset);

function App() {
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // const { analyze, tags } = useAiVisionTagging(); // uncomment when going live
  const { setTriage, triage, loading: triageLoading, error: triageError } = useTriage();
  const { findHospitals, hospitals, userLocation, loading: hospitalsLoading, error: hospitalsError } = useHospitals();

  useEffect(() => {
    if (triage) findHospitals(triage);
  }, [triage, findHospitals]);

  const handleUploadSuccess = (result: CloudinaryUploadResult) => {
    setUploadedImageId(result.public_id);
    setUploadedUrl(result.secure_url);
    // MOCK MODE: set triage data directly, skipping Groq.
    // To go live: call runTriage(realTags) from useAiVisionTagging instead.
    setTriage(DUMMY_TRIAGE);
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
    <div className='app'>
      <main className='main-content'>
        <h1>Triage</h1>

        {hasUploadPreset && (
          <div className='upload-section'>
            <h2>Upload an Image</h2>
            <UploadWidget
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              buttonText='Upload Image'
            />
          </div>
        )}

        <div className='image-section'>
          <h2>Display Image</h2>
          <AdvancedImage
            cldImg={displayImage}
            plugins={[placeholder({ mode: "blur" }), lazyload()]}
            alt={uploadedImageId ? "Your uploaded image" : "Sample image"}
            className='display-image'
          />
          {uploadedImageId && <p className='image-info'>Public ID: {uploadedImageId}</p>}
          {uploadedUrl && (
            <p className='image-info'>
              URL:{" "}
              <a href={uploadedUrl} target='_blank' rel='noopener noreferrer'>
                {uploadedUrl}
              </a>
            </p>
          )}
        </div>

        {(triageLoading || triage || triageError) && (
          <div className='triage-section'>
            <h2>Triage Assessment</h2>
            {triageLoading && <p>Running triage...</p>}
            {triageError && <p style={{ color: "red" }}>{triageError}</p>}
            {triage && (
              <div>
                <p>
                  <strong>ESI Level:</strong> {triage.esi_level} — <strong>Severity:</strong>{" "}
                  {triage.severity}
                </p>
                <p><strong>Care Type:</strong> {triage.care_type}</p>
                <p><strong>Specialty:</strong> {triage.specialty}</p>
                <p><strong>Reasoning:</strong> {triage.reasoning}</p>
                <p><strong>Immediate Actions:</strong></p>
                <ul>
                  {triage.immediate_actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {(hospitalsLoading || hospitals.length > 0 || hospitalsError) && (
          <div className='hospitals-section'>
            <h2>Nearby Facilities</h2>
            {hospitalsLoading && <p>Finding hospitals near you...</p>}
            {hospitalsError && <p style={{ color: "red" }}>{hospitalsError}</p>}
            {hospitals.length > 0 && (
              <HospitalCards hospitals={hospitals} userLocation={userLocation} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
