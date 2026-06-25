import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

export default function NextStepsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#080c10', color: '#e0ebe0', fontFamily: 'Inter, -apple-system, system-ui, sans-serif', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .ns-link { color: #4ade80; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; border: 1px solid rgba(74,222,128,0.2); padding: 8px 16px; border-radius: 8px; transition: border-color 0.2s, background 0.2s; }
        .ns-link:hover { border-color: rgba(74,222,128,0.5); background: rgba(74,222,128,0.06); }
        .roadmap-item { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid rgba(74,222,128,0.06); }
        .roadmap-item:last-child { border-bottom: none; }
        .nav-link-ns { color: rgba(224,235,224,0.45); font-size: 14px; text-decoration: none; transition: color 0.2s; background: none; border: none; cursor: pointer; }
        .nav-link-ns:hover { color: #4ade80; }
      `}</style>

      {/* Nav */}
      <nav style={{
        height: '64px',
        padding: '0 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(8,12,16,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(74,222,128,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="/logo.svg" alt="RishFits" style={{ height: '28px' }} />
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.06em' }}>RISHFITS</span>
        </div>
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          <button className="nav-link-ns" onClick={() => navigate('/')}>Home</button>
          <button className="nav-link-ns" onClick={() => navigate('/workout')}>Train</button>
          <button
            onClick={() => navigate('/workout')}
            style={{ background: '#4ade80', color: '#080c10', border: 'none', fontWeight: 700, cursor: 'pointer', padding: '9px 20px', borderRadius: '8px', fontSize: '14px', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#22c55e')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4ade80')}
          >
            Start Training
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(60px, 10vw, 120px) 40px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '80px', animation: 'fadeUp 0.7s ease' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4ade80', display: 'block', marginBottom: '16px' }}>
            Project Documentation
          </span>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#f0f7f0', margin: '0 0 20px', lineHeight: 1.1 }}>
            What's Next for<br />RishFits.
          </h1>
          <p style={{ fontSize: '17px', color: 'rgba(224,235,224,0.5)', lineHeight: 1.7, maxWidth: '560px', margin: 0 }}>
            This is a working prototype that demonstrates real-time pose detection and AI-powered coaching in the browser.
            Here's where it goes from here.
          </p>
        </div>

        {/* Roadmap */}
        <Section title="Roadmap" label="What's coming">
          {[
            { status: 'next', title: 'Multi-exercise library', detail: 'Deadlift, overhead press, lunge, Romanian deadlift — each with calibrated angle thresholds and exercise-specific coaching prompts.' },
            { status: 'next', title: 'Session history', detail: 'Persist set/rep data and feedback in browser localStorage so athletes can track form trends over multiple sessions.' },
            { status: 'next', title: 'Export as JSON / CSV', detail: 'Download raw joint angle data from any session for further analysis in Python, Excel, or any analytics tool.' },
            { status: 'future', title: 'Mobile app (React Native)', detail: 'Port the MediaPipe model to a native app so users can position their phone and train without needing a laptop.' },
            { status: 'future', title: 'Side-by-side comparison', detail: 'Record a reference clip (e.g. the user at their best form), then overlay it next to the live feed in real time.' },
            { status: 'future', title: 'Wearable integration', detail: 'Sync heart rate and acceleration data from Apple Watch or Garmin to correlate fatigue with form breakdown.' },
          ].map(item => (
            <div key={item.title} className="roadmap-item">
              <div style={{
                flexShrink: 0,
                width: '60px',
                paddingTop: '2px',
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: item.status === 'next' ? '#4ade80' : 'rgba(224,235,224,0.25)',
                  display: 'block',
                }}>
                  {item.status === 'next' ? 'Next' : 'Later'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0f7f0', marginBottom: '6px' }}>{item.title}</div>
                <div style={{ fontSize: '14px', color: 'rgba(224,235,224,0.5)', lineHeight: 1.65 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </Section>

        {/* Technical stack */}
        <Section title="Technical Stack" label="Built with">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { name: 'MediaPipe Tasks Vision', role: 'Pose landmark detection (33 points, real-time)' },
              { name: 'AI (prompt engineered by Rishane)', role: 'AI coaching via joint angle analysis' },
              { name: 'React + TypeScript', role: 'Frontend framework' },
              { name: 'Vite', role: 'Build tool and dev server' },
              { name: 'Express.js', role: 'Backend API server' },
              { name: 'Tailwind CSS', role: 'Utility-first styling' },
            ].map(item => (
              <div key={item.name} style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(74,222,128,0.08)',
                borderRadius: '10px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '4px', fontFamily: 'DM Mono, monospace' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(224,235,224,0.45)', lineHeight: 1.5 }}>{item.role}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Client */}
        <Section title="Client" label="Who this is for">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
            alignItems: 'start',
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(224,235,224,0.3)', marginBottom: '12px' }}>About</div>
              <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#f0f7f0', marginBottom: '14px', letterSpacing: '-0.01em' }}>Rishane Oak</h3>
              <p style={{ fontSize: '15px', color: 'rgba(224,235,224,0.55)', lineHeight: 1.75, marginBottom: '24px' }}>
                Rishane Oak is a fitness coach and content creator focused on making high-quality training guidance accessible.
                Through RishFits, he helps athletes of all levels understand how to move well — with form cues grounded in biomechanics,
                not guesswork.
              </p>
              <p style={{ fontSize: '15px', color: 'rgba(224,235,224,0.55)', lineHeight: 1.75, marginBottom: '28px' }}>
                This tool was built to extend that mission: giving anyone, anywhere, a real-time mirror for their form — without
                needing a trainer in the room.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <a href="https://www.rishfits.com/" target="_blank" rel="noopener noreferrer" className="ns-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  rishfits.com
                </a>
                <a href="https://www.instagram.com/rishfits/?hl=en" target="_blank" rel="noopener noreferrer" className="ns-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  @rishfits
                </a>
                <a href="https://www.threads.com/@rishfits" target="_blank" rel="noopener noreferrer" className="ns-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c0-3.52.85-6.374 2.495-8.491C5.845 1.205 8.598.024 12.179 0h.014c3.582.024 6.334 1.205 8.185 3.509C22.022 5.626 22.5 8.48 22.5 12s-.478 6.374-2.122 8.491C18.527 22.795 15.775 23.976 12.193 24h-.007zm.014-22.5C9.044 1.524 6.72 2.524 5.195 4.534 3.793 6.393 3.007 9.002 3.007 12s.786 5.607 2.188 7.466c1.525 2.01 3.85 3.01 6.993 3.034h.007c3.143-.024 5.468-1.024 6.993-3.034 1.402-1.859 2.188-4.468 2.188-7.466s-.786-5.607-2.188-7.466C17.663 3.024 15.338 2.024 12.2 1.5z"/></svg>
                  @rishfits
                </a>
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(74,222,128,0.1)',
              borderRadius: '16px',
              padding: '28px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(224,235,224,0.3)', marginBottom: '20px' }}>By the numbers</div>
              {[
                { label: 'Landmarks tracked', value: '33' },
                { label: 'Joint angles computed', value: '10' },
                { label: 'Exercises supported', value: '2 (v1)' },
                { label: 'Data stored on servers', value: 'Zero' },
                { label: 'Accounts required', value: 'None' },
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(74,222,128,0.06)' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(224,235,224,0.5)' }}>{stat.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80', fontFamily: 'DM Mono, monospace' }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Author */}
        <Section title="Author" label="Built by">
          <div style={{
            display: 'flex',
            gap: '32px',
            alignItems: 'start',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(74,222,128,0.3) 0%, rgba(34,100,60,0.2) 100%)',
              border: '1px solid rgba(74,222,128,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              color: '#4ade80',
              flexShrink: 0,
            }}>
              OK
            </div>
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#f0f7f0', marginBottom: '6px', letterSpacing: '-0.01em' }}>Ohm Kumblekere</h3>
              <div style={{ fontSize: '13px', color: 'rgba(224,235,224,0.4)', marginBottom: '14px', fontFamily: 'DM Mono, monospace' }}>ohmkumbl@umich.edu</div>
              <p style={{ fontSize: '15px', color: 'rgba(224,235,224,0.55)', lineHeight: 1.75, maxWidth: '520px', margin: 0 }}>
                Designed and built this tool end to end — from MediaPipe pose pipeline integration, rep detection algorithm,
                AI coaching backend, to the full-stack architecture and UI. The goal was to ship something genuinely useful,
                not just a demo.
              </p>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <div style={{ marginTop: '80px', textAlign: 'center', padding: '60px 0', borderTop: '1px solid rgba(74,222,128,0.08)' }}>
          <button
            onClick={() => navigate('/workout')}
            style={{ background: '#4ade80', color: '#080c10', border: 'none', fontWeight: 700, cursor: 'pointer', padding: '16px 40px', borderRadius: '10px', fontSize: '16px', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#22c55e')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4ade80')}
          >
            Try It Now →
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        marginBottom: '72px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(24px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4ade80' }}>{label}</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(74,222,128,0.1)' }} />
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f0f7f0', letterSpacing: '-0.01em', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
