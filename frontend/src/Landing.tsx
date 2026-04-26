import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🩸',
    title: 'AI Injury Analysis',
    desc: 'Upload a photo of the patient. Our computer vision model detects wounds, bleeding severity, consciousness level, and mechanism of injury in seconds.',
  },
  {
    icon: '⚡',
    title: 'Instant ESI Triage',
    desc: 'Groq-powered LLM assigns an Emergency Severity Index (ESI 1–5) with clinical reasoning, immediate actions, and what not to wait for.',
  },
  {
    icon: '🏥',
    title: 'Context-Aware Hospital Matching',
    desc: 'Hospitals are ranked by facility tier, ETA, bed capacity, specialty match, and ESI level — trauma centers surface first for critical patients.',
  },
  {
    icon: '🗺️',
    title: 'Live Route Guidance',
    desc: 'Turn-by-turn route polyline rendered directly on the card map. One tap opens Google Maps navigation for the crew.',
  },
  {
    icon: '🚑',
    title: 'Dispatch Recommendations',
    desc: 'A concise dispatch note tells the ambulance crew exactly what to communicate to the receiving hospital before arrival.',
  },
  {
    icon: '📊',
    title: 'Full Facility Data',
    desc: 'Each hospital card shows bed capacity, open/closed status, rating, phone number, and distance — everything needed to make the right call fast.',
  },
];

const STEPS = [
  { num: '01', label: 'Describe', detail: 'Type a brief patient description or skip straight to the photo.' },
  { num: '02', label: 'Photograph', detail: 'Upload a photo. Vision AI tags injuries in under 3 seconds.' },
  { num: '03', label: 'Triage', detail: 'ESI level, care type, and immediate actions are generated instantly.' },
  { num: '04', label: 'Dispatch', detail: 'Pick from ranked hospitals and navigate with one tap.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#0f172a' }}>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(248,250,252,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 20 }}>✚</span>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.4px' }}>Friage</span>
          </div>
          <button onClick={() => navigate('/app')} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Open App →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '96px 24px 80px', background: 'linear-gradient(180deg, #fff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 28 }}>
          <span>✚</span> AI-Powered Emergency Triage
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, margin: '0 0 24px', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
          Get the right patient<br />
          <span style={{ color: '#ef4444' }}>to the right hospital</span><br />
          right now.
        </h1>
        <p style={{ fontSize: 18, color: '#64748b', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.65 }}>
          Friage uses computer vision and AI to triage injuries, rank nearby hospitals by severity match, and route first responders in seconds.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/app')}
            style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(239,68,68,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(239,68,68,0.4)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(239,68,68,0.35)'; }}
          >
            Start Triage →
          </button>
          <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', fontSize: 16, fontWeight: 600, color: '#475569', textDecoration: 'none', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff' }}>
            How it works
          </a>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 64, flexWrap: 'wrap' }}>
          {[['< 3s', 'Injury analysis'], ['ESI 1–5', 'Triage scale'], ['20+', 'Nearby hospitals ranked'], ['1-tap', 'Navigation']].map(([val, lbl]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>{val}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#ef4444', textTransform: 'uppercase', marginBottom: 10 }}>How it works</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Four steps. Seconds to execute.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ position: 'relative', background: '#f8fafc', borderRadius: 14, padding: '28px 24px', borderTop: '3px solid #ef4444' }}>
                {i < STEPS.length - 1 && (
                  <div style={{ position: 'absolute', top: 40, right: -12, fontSize: 18, color: '#cbd5e1', zIndex: 1 }}>→</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', marginBottom: 10, letterSpacing: '1px' }}>{s.num}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: '#ef4444', textTransform: 'uppercase', marginBottom: 10 }}>Features</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Everything a first responder needs.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#fff', borderRadius: 14, padding: '28px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 30 }}>{f.icon}</span>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 24px', background: '#0f172a', textAlign: 'center', color: '#fff' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <span style={{ fontSize: 36 }}>🚑</span>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', margin: '16px 0 14px' }}>Ready when every second counts.</h2>
          <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 36, lineHeight: 1.65 }}>
            No login required. Open the app, upload a photo, and get a triage assessment with hospital routing in under 10 seconds.
          </p>
          <button
            onClick={() => navigate('/app')}
            style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, padding: '15px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}
          >
            Open Friage →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0f172a', borderTop: '1px solid #1e293b', padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: '#475569' }}>
          <span style={{ color: '#ef4444', fontWeight: 900 }}>✚</span> Friage · Built at LA Hacks 2026
        </span>
      </footer>

    </div>
  );
}
