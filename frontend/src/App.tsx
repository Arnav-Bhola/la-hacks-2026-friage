import { useState, useRef, useEffect } from "react";
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
import { useTriage } from "./triage";
import { ReportQRModal } from "./ReportQR";

const ESI_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "CRITICAL", color: "#fff", bg: "#b71c1c" },
  2: { label: "EMERGENT", color: "#fff", bg: "#c62828" },
  3: { label: "URGENT", color: "#fff", bg: "#e65100" },
  4: { label: "LESS URGENT", color: "#222", bg: "#fdd835" },
  5: { label: "MINIMAL", color: "#fff", bg: "#2e7d32" },
};

const hasUploadPreset = Boolean(uploadPreset);

function App() {
  const symptomRef = useRef<HTMLTextAreaElement>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [, setUploadedUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const { analyze, tags } = useAiVisionTagging();
  const { runTriage, triage, loading: triageLoading } = useTriage();

  useEffect(() => {
    if (!tags.length) return;
    runTriage(tags.map((t) => ({ name: t.name })));
  }, [tags]); // eslint-disable-line react-hooks/exhaustive-deps

  const esiMeta = triage ? ESI_META[triage.esi_level] : null;

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
          lat: 34.07032,
          lng: -118.44707,
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

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triage,
          tags,
          hospitals,
          recommendation,
          userDescription: symptomRef.current?.value ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      const { url } = json;
      setReportUrl(url);
      setShowQR(true);
    } catch (err) {
      console.error(err);
      alert(`Report failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    alert(`Upload failed: ${error.message}`);
  };

  const imageId = uploadedImageId || "samples/people/bicycle";
  const displayImage = cld
    .image(imageId)
    .resize(fill().width(800).height(500).gravity(autoGravity()))
    .delivery(format(auto()))
    .delivery(quality(autoQuality()));

  const esiBadgeBg =
    (recommendation?.esi_level ?? 5) <= 2
      ? "#dc2626"
      : (recommendation?.esi_level ?? 5) === 3
        ? "#d97706"
        : "#16a34a";

  return (
    <div className='app'>
      {/* ── Header ── */}
      <header className='app-header'>
        <div className='header-inner'>
          <span className='header-cross'>✚</span>
          <div>
            <span className='header-title'>Friage</span>
            <span className='header-sub'>AI Emergency Triage</span>
          </div>
        </div>
      </header>

      <main className='main-content'>
        {/* ── Intake Card ── */}
        {hasUploadPreset && (
          <div className='card'>
            <div className='card-body'>
              <label className='field-label'>Describe the patient's condition</label>
              <textarea
                ref={symptomRef}
                className='symptom-input'
                placeholder='e.g. unconscious male, fell from ladder, head bleeding...'
                rows={3}
              />
              <div className='upload-row'>
                <UploadWidget
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                  buttonText='Upload Photo'
                />
                {analyzing && <span className='pill pill-blue'>Analyzing image…</span>}
              </div>

              {uploadedImageId && (
                <div className='preview-wrap'>
                  <AdvancedImage
                    cldImg={displayImage}
                    plugins={[placeholder({ mode: "blur" }), lazyload()]}
                    alt='Uploaded patient image'
                    className='preview-img'
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ESI Triage Card ──
        {(triageLoading || triage) && (
          <div className='card'>
            {triageLoading && (
              <div className='card-body'>
                <span className='pill pill-blue'>Running triage…</span>
              </div>
            )}    
            {triage && esiMeta && (
              <>
                <div
                  className='esi-banner'
                  style={{ background: esiMeta.bg, color: esiMeta.color }}
                >
                  <span className='esi-level'>ESI {triage.esi_level}</span>
                  <span className='esi-label'>{esiMeta.label}</span>
                  <span className='esi-care'>
                    {triage.care_type.replace(/_/g, " ")} · {triage.specialty}
                  </span>
                </div>
                <div className='card-body esi-body'>
                  <p className='esi-reasoning'>
                    <strong>Reasoning:</strong> {triage.reasoning}
                  </p>
                  {triage.immediate_actions.length > 0 && (
                    <div>
                      <p className='list-label'>Immediate Actions</p>
                      <ul className='action-list'>
                        {triage.immediate_actions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(triage.do_not_delay_for?.length ?? 0) > 0 && (
                    <div>
                      <p className='list-label list-label--red'>Do NOT delay for</p>
                      <ul className='action-list action-list--red'>
                        {triage.do_not_delay_for.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </> 
            )}
          </div>
        )} */}

        {/* ── Dispatch Recommendation ── */}
        {recommendation && (
          <div className='card card--accent'>
            <div className='card-body'>
              <div className='rec-header'>
                <span className='rec-title'>Dispatch Recommendation</span>
                <span
                  className='esi-badge'
                  style={{ background: esiBadgeBg }}
                >
                  ESI {recommendation.esi_level} · {recommendation.severity.toUpperCase()}
                </span>
              </div>
              <div className='rec-top'>
                <span className='rec-name'>{recommendation.recommended.name}</span>
                {recommendation.recommended.eta_label && (
                  <span className='rec-eta'>{recommendation.recommended.eta_label}</span>
                )}
              </div>
              <p className='rec-reason'>{recommendation.recommended.reason}</p>
              <div className='dispatch-note'>
                <strong>Dispatch:</strong> {recommendation.dispatchNote}
              </div>
              {(recommendation.alternatives?.length ?? 0) > 0 && (
                <div className='alt-section'>
                  <p
                    className='list-label'
                    style={{ marginTop: 12 }}
                  >
                    Alternatives
                  </p>
                  {recommendation.alternatives.map((alt, i) => (
                    <div
                      key={i}
                      className='alt-row'
                    >
                      <span className='alt-num'>{i + 2}</span>
                      <span className='alt-name'>{alt.name}</span>
                      <span className='alt-reason'>— {alt.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── QR Report ── */}
        {recommendation && (
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            style={{
              width: "100%",
              padding: "14px",
              background: generatingReport ? "#94a3b8" : "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: generatingReport ? "not-allowed" : "pointer",
            }}
          >
            {generatingReport ? "⏳ Generating PDF…" : "📱 Generate QR Report for Nurse"}
          </button>
        )}
        {showQR && reportUrl && (
          <ReportQRModal url={reportUrl} onClose={() => setShowQR(false)} />
        )}

        {/* ── Nearby Hospitals ── */}
        {(hospitalsLoading || hospitals.length > 0 || hospitalsError) && (
          <div>
            <h2 className='section-title'>Nearby Facilities</h2>
            {hospitalsLoading && <p className='status-text'>Finding hospitals near you…</p>}
            {hospitalsError && <p className='error-text'>{hospitalsError}</p>}
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

