import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  VideocamOutlined,
  VideocamOffOutlined,
  MonitorHeartOutlined,
  WarningAmberOutlined,
  CheckCircleOutline,
  HighlightOffOutlined,
  BoltOutlined,
  InsightsOutlined,
  PlayArrow,
  Pause,
  ArrowBackOutlined,
} from '@mui/icons-material';
import { usePoseDetection, PoseResult } from '../usePoseDetection';

type FeedbackItem = {
  time: string;
  severity: 'good' | 'warning' | 'critical';
  title: string;
  message: string;
};

const exerciseConfig = {
  squat: {
    label: 'Bodyweight Squat',
    angles: ['rightKnee', 'leftKnee', 'rightHip', 'leftHip'],
    repDetection: {
      rightKneeBottomAngle: 100, rightKneeTopAngle: 140,
      leftKneeBottomAngle: 100,  leftKneeTopAngle: 140,
      rightHipBottomAngle: 100,  rightHipTopAngle: 50,
      leftHipBottomAngle: 100,   leftHipTopAngle: 50,
    },
  },
  pushup: {
    label: 'Push-Up',
    angles: ['rightElbow', 'leftElbow'],
    repDetection: {
      rightElbowBottomAngle: 90, rightElbowTopAngle: 155,
      leftElbowBottomAngle: 90,  leftElbowTopAngle: 155,
    },
  },
};

const exerciseLandmarkIndices: Record<'squat' | 'pushup', number[]> = {
  squat:  [23, 24, 25, 26, 27, 28],
  pushup: [11, 12, 13, 14, 15, 16],
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const calculateAverage = (numbers: (number | null)[]): number => {
  const nums = numbers.filter((n): n is number => n !== null);
  if (nums.length === 0) return 0;
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
};

export default function WorkoutPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [countdownDuration, setCountdownDuration] = useState<3 | 5 | 10>(3);
  const countdownValueRef = useRef<number | null>(null);
  useEffect(() => { countdownValueRef.current = countdownValue; }, [countdownValue]);

  const [isPositionOk, setIsPositionOk] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const sessionTimeRef = useRef(0);

  const inBottomPositionRef = useRef(false);
  const repsThisSetRef = useRef(0);
  const setDataRef = useRef<PoseResult[]>([]);
  const currentSetRef = useRef(1);
  const lastRepTimestampRef = useRef(0);
  const MIN_REP_GAP_MS = 800;

  const [repsThisSet, setRepsThisSet] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState(8);
  const [exercise, setExercise] = useState<'squat' | 'pushup'>('squat');
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);

  const config = exerciseConfig[exercise];

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setCameraActive(false);
    }
    setCountdownValue(null);
    setIsPositionOk(false);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setError('');
      setCountdownValue(countdownDuration);
    } catch {
      setError('CAMERA_ACCESS_DENIED');
    }
  };

  const advanceSet = useCallback(() => {
    repsThisSetRef.current = 0;
    setRepsThisSet(0);
    setDataRef.current = [];
    inBottomPositionRef.current = false;
    lastRepTimestampRef.current = 0;

    if (currentSetRef.current < targetSets) {
      currentSetRef.current += 1;
      setCurrentSet(currentSetRef.current);
    } else {
      currentSetRef.current = 1;
      setCurrentSet(1);
    }
  }, [targetSets]);

  const sendSetToBackend = useCallback(async (stopped: boolean) => {
    stopCamera();
    if (setDataRef.current.length === 0) { advanceSet(); return; }

    const averageAngles: Record<string, number> = {};
    config.angles.forEach(angle => {
      averageAngles[angle] = calculateAverage(
        setDataRef.current.map(d => d.angles[angle as keyof typeof d.angles])
      );
    });

    try {
      const res = await fetch('http://localhost:3000/api/pose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setNumber: currentSetRef.current,
          repsCompleted: repsThisSetRef.current,
          exercise,
          averageAngles,
        }),
      });
      const data = await res.json();
      setFeedbackItems(prev => [...prev, {
        time: formatTime(sessionTimeRef.current),
        severity: res.ok ? (stopped ? 'warning' : 'good') : 'critical',
        title: res.ok
          ? (stopped ? `Set ${currentSetRef.current} (Stopped Early)` : `Set ${currentSetRef.current} Complete`)
          : `Set ${currentSetRef.current} — Analysis Failed`,
        message: data.feedback ?? data.error ?? 'Unknown error',
      }]);
    } catch {
      setFeedbackItems(prev => [...prev, {
        time: formatTime(sessionTimeRef.current),
        severity: 'critical',
        title: `Set ${currentSetRef.current} — Connection Error`,
        message: 'Could not reach the backend. Make sure the server is running.',
      }]);
    }

    advanceSet();
  }, [exercise, config.angles, stopCamera, advanceSet]);

  const handlePoseDetected = useCallback((result: PoseResult) => {
    const indices = exerciseLandmarkIndices[exercise];
    setIsPositionOk(indices.every(i => (result.landmarks[i]?.visibility ?? 0) > 0.5));

    if (countdownValueRef.current !== null) return;

    const benchmarks = config.repDetection;
    const angles = config.angles;

    const anyInBottom = angles.some(angle => {
      const v = result.angles[angle as keyof typeof result.angles];
      return v != null && v < (benchmarks as any)[`${angle}BottomAngle`];
    });
    if (anyInBottom && !inBottomPositionRef.current) inBottomPositionRef.current = true;

    const allAtTop = angles.every(angle => {
      const v = result.angles[angle as keyof typeof result.angles];
      return v != null && v > (benchmarks as any)[`${angle}TopAngle`];
    });

    if (allAtTop && inBottomPositionRef.current) {
      const now = Date.now();
      if (now - lastRepTimestampRef.current >= MIN_REP_GAP_MS) {
        inBottomPositionRef.current = false;
        lastRepTimestampRef.current = now;
        repsThisSetRef.current += 1;
        setRepsThisSet(repsThisSetRef.current);
      }
    }

    setDataRef.current.push(result);

    if (repsThisSetRef.current >= targetReps) sendSetToBackend(false);
  }, [exercise, config, targetReps, sendSetToBackend]);

  usePoseDetection({ videoRef, canvasRef, enabled: cameraActive && !isPaused, onPoseDetected: handlePoseDetected });

  useEffect(() => { return () => stopCamera(); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (cameraActive && !isPaused) {
        setSessionTime(prev => { const n = prev + 1; sessionTimeRef.current = n; return n; });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [cameraActive, isPaused]);

  useEffect(() => {
    if (countdownValue === null) return;
    if (countdownValue === 0) { const t = setTimeout(() => setCountdownValue(null), 600); return () => clearTimeout(t); }
    const t = setTimeout(() => setCountdownValue(v => v !== null ? v - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [countdownValue]);

  const getSeverityColor = (s: string) => {
    if (s === 'good') return { border: '#22c55e', bg: 'rgba(34,197,94,0.07)', text: '#bbf7d0', title: '#4ade80' };
    if (s === 'warning') return { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)', text: '#fde68a', title: '#fbbf24' };
    return { border: '#ef4444', bg: 'rgba(239,68,68,0.07)', text: '#fecaca', title: '#f87171' };
  };

  const getSeverityIcon = (s: string) => {
    if (s === 'good') return <CheckCircleOutline style={{ fontSize: 16 }} />;
    if (s === 'warning') return <WarningAmberOutlined style={{ fontSize: 16 }} />;
    if (s === 'critical') return <HighlightOffOutlined style={{ fontSize: 16 }} />;
    return <InsightsOutlined style={{ fontSize: 16 }} />;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c10',
      color: '#e0ebe0',
      fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        .rf-input:focus { outline: none; border-color: rgba(74,222,128,0.5) !important; }
        .rf-select:focus { outline: none; }
        .rf-btn-primary { background: #4ade80; color: #080c10; border: none; font-weight: 700; cursor: pointer; transition: background 0.2s, transform 0.15s; border-radius: 10px; }
        .rf-btn-primary:hover { background: #22c55e; }
        .rf-btn-primary:active { transform: scale(0.98); }
        .rf-btn-danger { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.25); font-weight: 600; cursor: pointer; transition: background 0.2s; border-radius: 8px; }
        .rf-btn-danger:hover { background: rgba(239,68,68,0.25); }
        .rf-btn-ghost { background: rgba(255,255,255,0.05); color: #e0ebe0; border: 1px solid rgba(255,255,255,0.08); font-weight: 600; cursor: pointer; transition: background 0.2s; border-radius: 8px; }
        .rf-btn-ghost:hover { background: rgba(255,255,255,0.09); }
        .countdown-digit { animation: countPop 0.2s ease; }
        @keyframes countPop { from { transform: scale(1.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .feedback-card { transition: transform 0.15s; }
        .feedback-card:hover { transform: translateY(-1px); }
      `}</style>

      {/* HEADER */}
      <header style={{
        height: '60px',
        background: 'rgba(8,12,16,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(74,222,128,0.08)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '16px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(224,235,224,0.45)', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#4ade80')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(224,235,224,0.45)')}
        >
          <ArrowBackOutlined style={{ fontSize: 18 }} />
        </button>
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.svg" alt="RishFits" style={{ height: '26px' }} />
          <span style={{ fontWeight: 700, letterSpacing: '0.06em', fontSize: '15px' }}>RISHFITS</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '20px', fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em' }}>
          {formatTime(sessionTime)}
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '100px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          background: cameraActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
          color: cameraActive ? '#4ade80' : 'rgba(224,235,224,0.3)',
          border: `1px solid ${cameraActive ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {cameraActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
          {cameraActive ? 'Live' : 'Idle'}
        </div>
      </header>

      {/* 3-COLUMN LAYOUT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT PANEL — controls */}
        <aside style={{
          width: '260px',
          flexShrink: 0,
          borderRight: '1px solid rgba(74,222,128,0.07)',
          background: 'rgba(255,255,255,0.015)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          gap: '24px',
          overflowY: 'auto',
        }}>
          {!cameraActive ? (
            /* Setup mode */
            <>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(224,235,224,0.35)', marginBottom: '10px' }}>Exercise</div>
                <select
                  className="rf-select"
                  value={exercise}
                  onChange={e => setExercise(e.target.value as 'squat' | 'pushup')}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(74,222,128,0.15)',
                    borderRadius: '8px',
                    color: '#e0ebe0',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <option value="squat" style={{ background: '#0f1a14' }}>Bodyweight Squat</option>
                  <option value="pushup" style={{ background: '#0f1a14' }}>Push-Up</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {(['Sets', 'Reps'] as const).map(label => {
                  const val = label === 'Sets' ? targetSets : targetReps;
                  const setter = label === 'Sets' ? setTargetSets : setTargetReps;
                  const max = label === 'Sets' ? 10 : 30;
                  return (
                    <div key={label}>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(224,235,224,0.35)', marginBottom: '8px' }}>{label}</div>
                      <input
                        type="number"
                        min={1}
                        max={max}
                        value={val}
                        onChange={e => setter(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="rf-input"
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(74,222,128,0.12)',
                          borderRadius: '8px',
                          color: '#e0ebe0',
                          padding: '10px 12px',
                          fontSize: '22px',
                          fontWeight: 800,
                          textAlign: 'center',
                          fontFamily: 'DM Mono, monospace',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(224,235,224,0.35)', marginBottom: '10px' }}>Countdown</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([3, 5, 10] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setCountdownDuration(s)}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: countdownDuration === s ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        background: countdownDuration === s ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                        color: countdownDuration === s ? '#4ade80' : 'rgba(224,235,224,0.4)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="rf-btn-primary"
                onClick={startCamera}
                style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: 'auto' }}
              >
                Start Set {currentSet} of {targetSets}
              </button>
            </>
          ) : (
            /* Active mode */
            <>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(224,235,224,0.35)', marginBottom: '6px' }}>Exercise</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#e0ebe0' }}>{config.label}</div>
              </div>

              {/* Set counter */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(74,222,128,0.1)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(224,235,224,0.35)', marginBottom: '8px' }}>Set</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 900, color: '#e0ebe0', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{currentSet}</span>
                  <span style={{ fontSize: '20px', color: 'rgba(224,235,224,0.3)', fontFamily: 'DM Mono, monospace' }}>/ {targetSets}</span>
                </div>
              </div>

              {/* Rep counter */}
              <div style={{
                background: 'rgba(74,222,128,0.05)',
                border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4ade80', marginBottom: '8px' }}>Reps</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '56px', fontWeight: 900, color: '#4ade80', fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{repsThisSet}</span>
                  <span style={{ fontSize: '22px', color: 'rgba(74,222,128,0.35)', fontFamily: 'DM Mono, monospace' }}>/ {targetReps}</span>
                </div>
              </div>

              {/* Position status */}
              {countdownValue !== null && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: isPositionOk ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${isPositionOk ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  fontSize: '13px',
                  color: isPositionOk ? '#4ade80' : '#fbbf24',
                  fontWeight: 600,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isPositionOk ? '#4ade80' : '#fbbf24', flexShrink: 0 }} />
                  {isPositionOk ? 'Position OK' : 'Full body in frame'}
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                <button
                  className="rf-btn-ghost"
                  onClick={() => setIsPaused(p => !p)}
                  disabled={countdownValue !== null}
                  style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: countdownValue !== null ? 0.4 : 1, cursor: countdownValue !== null ? 'not-allowed' : 'pointer' }}
                >
                  {isPaused ? <><PlayArrow style={{ fontSize: 18 }} /> Resume</> : <><Pause style={{ fontSize: 18 }} /> Pause</>}
                </button>
                {countdownValue === null && (
                  <button
                    className="rf-btn-ghost"
                    onClick={() => sendSetToBackend(true)}
                    style={{ padding: '12px', fontSize: '14px', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24', background: 'rgba(245,158,11,0.05)' }}
                  >
                    Stop Set Early
                  </button>
                )}
                <button
                  className="rf-btn-danger"
                  onClick={() => { stopCamera(); }}
                  style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <VideocamOffOutlined style={{ fontSize: 18 }} /> Abort
                </button>
              </div>
            </>
          )}
        </aside>

        {/* CENTER — Video */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#080c10', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle corner glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(34,60,44,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', width: '100%', maxWidth: '800px', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(74,222,128,0.1)', boxShadow: '0 0 60px rgba(0,0,0,0.5)' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none', transform: 'scaleX(-1)' }} />

            {/* Countdown overlay */}
            {cameraActive && countdownValue !== null && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,16,0.55)', zIndex: 20 }}>
                {countdownValue > 0 ? (
                  <div
                    key={countdownValue}
                    className="countdown-digit"
                    style={{ fontSize: 'clamp(100px, 18vw, 160px)', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 0 60px rgba(74,222,128,0.8), 0 0 120px rgba(74,222,128,0.4)', fontFamily: 'DM Mono, monospace' }}
                  >
                    {countdownValue}
                  </div>
                ) : (
                  <div style={{ fontSize: '72px', fontWeight: 900, color: '#4ade80', letterSpacing: '0.1em', textShadow: '0 0 40px rgba(74,222,128,0.9)' }}>GO!</div>
                )}
              </div>
            )}

            {/* Camera error */}
            {error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080c10', zIndex: 30, padding: '32px' }}>
                <VideocamOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#f0f7f0' }}>Camera Access Required</h3>
                <p style={{ fontSize: '14px', color: 'rgba(224,235,224,0.5)', textAlign: 'center', maxWidth: '360px', marginBottom: '28px', lineHeight: 1.65 }}>
                  Video is processed locally and never stored or uploaded. Allow camera access to continue.
                </p>
                <button className="rf-btn-primary" onClick={startCamera} style={{ padding: '14px 32px', fontSize: '15px' }}>
                  Allow Camera
                </button>
              </div>
            )}

            {/* Idle overlay */}
            {!cameraActive && !error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080c10', zIndex: 30 }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '20px',
                }}>
                  <VideocamOutlined style={{ fontSize: 32, color: 'rgba(74,222,128,0.6)' }} />
                </div>
                <p style={{ fontSize: '15px', color: 'rgba(224,235,224,0.35)', fontWeight: 500 }}>Configure your session on the left, then start.</p>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT PANEL — AI Analysis */}
        <aside style={{
          width: '280px',
          flexShrink: 0,
          borderLeft: '1px solid rgba(74,222,128,0.07)',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255,255,255,0.015)',
        }}>
          {/* Panel header */}
          <div style={{
            padding: '18px 20px',
            borderBottom: '1px solid rgba(74,222,128,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MonitorHeartOutlined style={{ fontSize: 18, color: '#4ade80' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#e0ebe0' }}>AI Analysis</span>
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: cameraActive ? '#4ade80' : 'rgba(224,235,224,0.25)',
            }}>
              {cameraActive ? 'Active' : 'Idle'}
            </div>
          </div>

          {/* Feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {feedbackItems.length === 0 && !cameraActive ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px 16px', opacity: 0.4 }}>
                <InsightsOutlined style={{ fontSize: 36, color: '#4ade80', marginBottom: '12px' }} />
                <p style={{ fontSize: '13px', color: 'rgba(224,235,224,0.6)', lineHeight: 1.6 }}>Complete a set to receive AI-powered form feedback.</p>
              </div>
            ) : (
              <>
                {feedbackItems.map((item, i) => {
                  const c = getSeverityColor(item.severity);
                  return (
                    <div
                      key={i}
                      className="feedback-card"
                      style={{
                        borderLeft: `3px solid ${c.border}`,
                        background: c.bg,
                        borderRadius: '8px',
                        padding: '12px 14px',
                        border: `1px solid ${c.border}40`,
                        borderLeftWidth: '3px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: c.title, fontSize: '12px', fontWeight: 700 }}>
                          {getSeverityIcon(item.severity)}
                          {item.title}
                        </div>
                        <span style={{ fontSize: '10px', color: 'rgba(224,235,224,0.3)', fontFamily: 'DM Mono, monospace' }}>{item.time}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: c.text, lineHeight: 1.65, margin: 0 }}>{item.message}</p>
                    </div>
                  );
                })}

                {cameraActive && (
                  <div style={{
                    padding: '14px',
                    background: 'rgba(74,222,128,0.04)',
                    border: '1px solid rgba(74,222,128,0.12)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'rgba(224,235,224,0.6)',
                    lineHeight: 1.6,
                  }}>
                    {countdownValue !== null
                      ? 'Get into position...'
                      : 'Tracking your form. Feedback arrives after each set.'}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Panel footer */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(74,222,128,0.07)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BoltOutlined style={{ fontSize: 13, color: '#fbbf24' }} />
            <span style={{ fontSize: '11px', color: 'rgba(224,235,224,0.25)' }}>AI prompt engineered by Rishane · Local video processing</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
