import { QRCodeSVG } from "qrcode.react";

interface Props {
  url: string;
  onClose: () => void;
}

export function ReportQRModal({ url, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "32px 36px 28px",
          maxWidth: 400,
          width: "92%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: "#ef4444", fontWeight: 900, fontSize: 20 }}>✚</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0f172a", letterSpacing: "-0.3px" }}>Friage Report</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              fontSize: 14,
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
          Scan to open the triage PDF on any device
        </p>

        {/* QR Code */}
        <div
          style={{
            display: "inline-block",
            padding: 16,
            border: "2px solid #fecaca",
            borderRadius: 16,
            background: "#fff",
            marginBottom: 14,
          }}
        >
          <QRCodeSVG value={url} size={210} fgColor="#0f172a" bgColor="#ffffff" />
        </div>

        <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 20px" }}>
          Nurse can scan this to view and download the full PDF
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18 }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#ef4444",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📄 Open PDF
          </a>
          <a
            href={url}
            download="friage-triage-report.pdf"
            style={{
              background: "#f1f5f9",
              color: "#374151",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ⬇ Download
          </a>
        </div>

        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          <span style={{ color: "#ef4444", fontWeight: 900 }}>✚</span> Friage · AI Emergency Triage · LA Hacks 2026
        </div>
      </div>
    </div>
  );
}
