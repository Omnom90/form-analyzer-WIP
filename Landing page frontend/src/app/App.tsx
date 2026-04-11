import { useEffect, useRef, useState, useCallback } from 'react';
import {
  VideocamOutlined,
  MonitorHeartOutlined,
  WarningAmberOutlined,
  CheckCircleOutline,
  HighlightOffOutlined,
  VisibilityOutlined,
  BoltOutlined,
  TrendingUpOutlined,
  ScheduleOutlined,
  GpsFixedOutlined,
  SettingsOutlined,
  NotificationsOutlined,
  PlayArrow,
  Pause,
  SkipNextOutlined,
  ReplayOutlined,
  HomeOutlined,
  BarChartOutlined,
  DescriptionOutlined,
  InsightsOutlined,
  ResetTvOutlined,
} from '@mui/icons-material';
import { usePoseDetection, PoseResult } from './usePoseDetection';

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [lastPoseData, setLastPoseData] = useState<PoseResult | null>(null);
  
  // Session timer
  const [sessionTime, setSessionTime] = useState(0);
  
  // Mock real-time metrics
  const [metrics, setMetrics] = useState({
    heartRate: 142,
    reps: 8,
    tempo: '2-0-2',
    rangeOfMotion: 94,
    formScore: 87,
    depth: 'OPTIMAL',
    kneeAlignment: 'GOOD',
    hipHinge: 'GOOD',
    barPath: 'WARNING'
  });

  // AI feedback items
  type FeedbackItem = {
    time: string;
    severity: 'good' | 'warning' | 'critical';
    title: string;
    message: string;
  };

  
  const exerciseConfig = {
  squat: {
    angles: ['rightKnee', 'leftKnee', 'rightHip', 'leftHip'],
    repDetection: {
      rightKneeBottomAngle: 100,      // knees bent at bottom
      rightKneeTopAngle: 140,   
      leftKneeBottomAngle: 100,      // knees bent at bottom
      leftKneeTopAngle: 140,         // knees extended at top
      rightHipBottomAngle: 100,       // hips bent at bottom
      rightHipTopAngle: 50,     
      leftHipBottomAngle: 100,       // hips bent at bottom
      leftHipTopAngle: 50           // hips extended at top
    }
  },
  
  benchPress: {
    angles: ['rightElbow', 'leftElbow', 'rightShoulder', 'leftShoulder'],
    repDetection: {
      rightElbowBottomAngle: 90,
    rightElbowTopAngle: 170,
    leftElbowBottomAngle: 90,
    leftElbowTopAngle: 170,
    rightShoulderBottomAngle: 80,
    rightShoulderTopAngle: 160,
    leftShoulderBottomAngle: 80,
    leftShoulderTopAngle: 160,
    }
  },
  
  deadlift: {
    angles: ['rightKnee', 'leftKnee', 'rightHip', 'leftHip', 'rightAnkle', 'leftAnkle'],
    repDetection: {
        rightKneeBottomAngle: 130,
        rightKneeTopAngle: 170,
        leftKneeBottomAngle: 130,
        leftKneeTopAngle: 170,
        rightHipBottomAngle: 70,
        rightHipTopAngle: 170,
        leftHipBottomAngle: 70,
        leftHipTopAngle: 170,
        rightAnkleBottomAngle: 70,
        rightAnkleTopAngle: 130,
        leftAnkleBottomAngle: 70,
        leftAnkleTopAngle: 130,   // hips extended at lockout
    }
  },
  
 
};
  
const inBottomPositionRef = useRef(false);
const repsThisSetRef = useRef(0);
const setDataRef = useRef<any[]>([]);
const currentSetRef = useRef(1);

const [repsThisSet, setRepsThisSet] = useState(0);
const [currentSet, setCurrentSet] = useState(1);

const [exercise, setExercise] = useState<'squat' | 'benchPress' | 'deadlift'>('squat');
  
  
const neededAngles = exerciseConfig[exercise].angles;

const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);


const calculateAverage = (numbers: (number | null)[]) : number => {
    const nums = numbers.filter(n => n !== null) as number[];
    if (nums.length === 0) return 0;
    const avg = nums.reduce((acc, val) => acc + val, 0) / nums.length;
    return avg;
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'good': return 'border-emerald-500 bg-emerald-50';
      case 'warning': return 'border-amber-500 bg-amber-50';
      case 'critical': return 'border-rose-500 bg-rose-50';
      default: return 'border-cyan-400 bg-cyan-50';
    }
  };

  const getSeverityIconColor = (severity: string) => {
    switch (severity) {
      case 'good': return 'text-emerald-600';
      case 'warning': return 'text-amber-600';
      case 'critical': return 'text-rose-600';
      default: return 'text-cyan-600';
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'good': return 'text-emerald-900';
      case 'warning': return 'text-amber-900';
      case 'critical': return 'text-rose-900';
      default: return 'text-cyan-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'good': return <CheckCircleOutline className="size-4" />;
      case 'warning': return <WarningAmberOutlined className="size-4" />;
      case 'critical': return <HighlightOffOutlined className="size-4" />;
      default: return <InsightsOutlined className="size-4" />;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1920, height: 1080 },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError('');
      }
    } catch (err) {
      setError('CAMERA_ACCESS_DENIED');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const sendPoseDataToBackend = useCallback(async (poseData: PoseResult) => {
    
    const config = exerciseConfig[exercise];
    const benchmarks = config.repDetection;
    const angles = config.angles;

    const anyAngleInBottom = angles.some(angle => {
      const angleValue = poseData.angles[angle as keyof typeof poseData.angles];
      return angleValue != null && angleValue < benchmarks[`${angle}BottomAngle` as keyof typeof benchmarks];
    });

    if(anyAngleInBottom && !inBottomPositionRef.current){
      inBottomPositionRef.current = true;
    }

    const allAnglesAtTop = angles.every(angle => {
      const angleValue = poseData.angles[angle as keyof typeof poseData.angles];
      return angleValue != null && angleValue > benchmarks[`${angle}TopAngle` as keyof typeof benchmarks];
    });
    
    
    if(allAnglesAtTop && inBottomPositionRef.current){
      inBottomPositionRef.current = false;
      repsThisSetRef.current += 1;
      setRepsThisSet(repsThisSetRef.current); 
    }
      
 

    setDataRef.current.push(poseData);

    if(repsThisSetRef.current >= 8){
      try {
        const averageAngles: Record<string, number> = {};
        neededAngles.forEach(angle => {
          averageAngles[angle] = calculateAverage(
            setDataRef.current.map(d => d.angles[angle as keyof typeof d.angles])
          );
        });

        const payload = {
          setNumber: currentSetRef.current,
          repsCompleted: repsThisSetRef.current,
          exercise: exercise,
          averageAngles: averageAngles
        };

        const response = await fetch('http://localhost:3000/api/pose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

          console.log("Response status:", response.status);
       

          const data = await response.json();
          console.log("Feedback received:", data.feedback);

          setFeedbackItems(prev => [...prev, {
            time: formatTime(sessionTime),
            severity: 'good',  // Just default to 'good' or parse the text
            title: `Set ${currentSetRef.current} Feedback`,
            message: data.feedback  
  }])
        if (!response.ok) {
          console.error('Backend response error:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to send pose data:', error);
      }

      repsThisSetRef.current = 0;
      setRepsThisSet(0);
      currentSetRef.current += 1;
      setCurrentSet(currentSetRef.current)
      setDataRef.current = [];
    }
  }, [exercise]);

  const handlePoseDetected = useCallback((result : PoseResult) => {
    setLastPoseData(result);
    sendPoseDataToBackend(result);
  }, [sendPoseDataToBackend]);
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };


  // Initialize pose detection
  usePoseDetection({
    videoRef,
    canvasRef,
    enabled: cameraActive && !isPaused,
    onPoseDetected: (result) => handlePoseDetected(result)
  });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (cameraActive && !isPaused) {
        setSessionTime(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [cameraActive, isPaused]);

  // Simulate real-time metric updates
  useEffect(() => {
    if (!cameraActive) return;
    
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        heartRate: 140 + Math.floor(Math.random() * 8),
        formScore: 85 + Math.floor(Math.random() * 10),
        rangeOfMotion: 92 + Math.floor(Math.random() * 6)
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [cameraActive]);

  



 



  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}>
      {/* Subtle texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 4px)'
        }}
      />

      {/* GLOBAL HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 z-30">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <MonitorHeartOutlined className="size-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-white">RISHFITS</span>
            </div>
            <div className="flex items-center gap-2 bg-rose-500 px-3 py-1 rounded-md">
              <div className="size-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Live</span>
            </div>
          </div>

          {/* Center Info */}
          <div className="flex flex-col items-center">
            <select
              value={exercise}
              onChange={(e) => setExercise(e.target.value as 'squat' | 'benchPress' | 'deadlift')}
              className="text-base font-semibold text-white uppercase tracking-wide bg-slate-800 border border-cyan-500/30 rounded px-3 py-1.5 hover:border-cyan-500/60 transition-colors cursor-pointer"
            >
              <option value="squat">Barbell Back Squat</option>
              <option value="benchPress">Bench Press</option>
              <option value="deadlift">Deadlift</option>
            </select>
            <div className="text-xs text-slate-400 mt-1">Set 3 of 5 • A</div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-cyan-400 tabular-nums">{formatTime(sessionTime)}</div>
            <div className="size-9 rounded-full bg-slate-800 border border-slate-700" />
            <SettingsOutlined className="size-5 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors" />
            <div className="relative">
              <NotificationsOutlined className="size-5 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors" />
              <div className="absolute -top-1 -right-1 size-2 bg-rose-500 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="pt-16 flex h-screen">
        {/* LEFT NAVIGATION BAR */}
        <nav className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-3">
          <button className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all group relative">
            <HomeOutlined className="size-5" />
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
              Home
            </span>
          </button>
          <button className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 group relative">
            <VideocamOutlined className="size-5" />
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
              Live Feed
            </span>
          </button>
          <button className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all group relative">
            <BarChartOutlined className="size-5" />
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
              Analytics
            </span>
          </button>
          <button className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all group relative">
            <DescriptionOutlined className="size-5" />
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
              History
            </span>
          </button>
          
          <div className="mt-auto">
            <button className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all group relative">
              <SettingsOutlined className="size-5" />
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                Settings
              </span>
            </button>
          </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden">
          {/* ZONE 1: VIDEO FEED (55%) */}
          <div className="flex-[0_0_55%] p-6 flex flex-col gap-4">
            {/* Video Container */}
            <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative shadow-2xl">
              {/* Pose Canvas Overlay */}
              {cameraActive && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 15 }}
                />
              )}

              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
                  {/* Error State Card */}
                  <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
                    {/* Illustrated Icon */}
                    <div className="mb-6 flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl" />
                        <div className="relative size-20 bg-gradient-to-br from-rose-500/20 to-rose-600/20 rounded-full flex items-center justify-center border border-rose-500/30">
                          <VideocamOutlined className="size-10 text-rose-400" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Headline */}
                    <h3 className="text-2xl font-bold text-white text-center mb-3">
                      Camera Access Required
                    </h3>
                    
                    {/* Helper Text */}
                    <p className="text-slate-400 text-center mb-6 leading-relaxed">
                      To provide real-time form analysis and AI-powered coaching, we need access to your camera. Your privacy is protected—video is processed locally.
                    </p>
                    
                    {/* CTA Button */}
                    <button
                      onClick={startCamera}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-base hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Enable Camera Access
                    </button>
                    
                    {/* Help Link */}
                    <div className="mt-4 text-center">
                      <button className="text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                        Having trouble? Check your browser settings →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover bg-black"
                  />
                  
                  {/* Video Overlays */}
                  {cameraActive && (
                    <>
                
                    </>
                  )}
                </>
              )}
            </div>

            {/* Bottom Metrics Strip */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <BoltOutlined className="size-4 text-amber-400" />
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Power</div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">847<span className="text-sm text-slate-400 ml-1">W</span></div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <ScheduleOutlined className="size-4 text-blue-400" />
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tutorial</div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">42<span className="text-sm text-slate-400 ml-1">s</span></div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUpOutlined className="size-4 text-emerald-400" />
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Velocity</div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">0.68<span className="text-sm text-slate-400 ml-1">m/s</span></div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <GpsFixedOutlined className="size-4 text-cyan-400" />
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consistency</div>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">94<span className="text-sm text-slate-400 ml-1">%</span></div>
              </div>
            </div>
          </div>

          {/* ZONE 2: AI FEEDBACK PANEL (35%) */}
          <div className="flex-[0_0_35%] pt-6 pr-6 pb-[7.5rem] flex flex-col">
            <div className="flex-1 bg-white rounded-xl overflow-hidden flex flex-col shadow-2xl">
              {/* Panel Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MonitorHeartOutlined className="size-5 text-slate-700" />
                    <h3 className="font-semibold text-slate-900 text-lg">AI Analysis Feed</h3>
                  </div>
                  <div className="px-3 py-1 bg-emerald-500 rounded-md text-xs font-bold text-white uppercase tracking-wide">
                    Active
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Real-Time Feedback
                </p>
              </div>

              {/* Feedback Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gradient-to-b from-slate-50 to-white">
                {!cameraActive ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="mb-4 relative">
                      <div className="absolute inset-0 bg-slate-200 rounded-full blur-xl opacity-50" />
                      <div className="relative size-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                        <VideocamOutlined className="size-8 text-slate-400" />
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Camera Inactive</h4>
                    <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
                      Start camera feed to receive AI-powered form analysis and real-time coaching
                    </p>
                  </div>
                ) : (
                  <>
                    {feedbackItems.map((item, index) => (
                      <div 
                        key={index}
                        className={`${getSeverityColor(item.severity)} border-l-4 rounded-lg shadow-md hover:shadow-lg transition-all p-4 group hover:scale-[1.01]`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`${getSeverityIconColor(item.severity)} transition-transform group-hover:scale-110`}>
                              {getSeverityIcon(item.severity)}
                            </div>
                            <h4 className={`font-bold text-sm ${getSeverityTextColor(item.severity)}`}>
                              {item.title}
                            </h4>
                          </div>
                          <div className="text-xs font-mono text-slate-500 tabular-nums bg-white/60 px-2 py-0.5 rounded">
                            {item.time}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed pl-6">
                          {item.message}
                        </p>
                      </div>
                    ))}

                    {/* Live Processing Indicator */}
                    <div className="relative overflow-hidden border border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-cyan-50 rounded-lg p-4 shadow-sm">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute size-3 bg-cyan-400 rounded-full animate-ping opacity-75" />
                          <div className="relative size-2 bg-cyan-500 rounded-full" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-cyan-900 uppercase tracking-wide">
                            AI Processing
                          </div>
                          <div className="text-xs text-cyan-700 mt-0.5">
                            Analyzing frame 2847 • 30 FPS
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Panel Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <BoltOutlined className="size-3.5 shrink-0 text-amber-500" />
                  <span>Backend integration: Phase 2 • Model: YOLOv8-Pose + Custom Squat Classifier</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ZONE 3: BOTTOM CONTROL STRIP */}
        <div className="fixed bottom-0 left-16 right-0 h-20 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 flex items-center justify-between px-6">
          {/* Left: Controls */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="p-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors shadow-lg"
            >
              {isPaused ? <PlayArrow className="size-5 text-white" /> : <Pause className="size-5 text-white" />}
            </button>
            <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <SkipNextOutlined className="size-5 text-slate-400" />
            </button>
            <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <ReplayOutlined className="size-5 text-slate-400" />
            </button>
            <div className="h-10 w-px bg-slate-800 mx-2" />
            <div className="text-sm text-slate-400">
              <span className="text-cyan-400 font-semibold">Set {currentSet}</span> / 5
            </div>
          </div>

          <div className="text-sm text-slate-400">
            <span className="text-cyan-400 font-semibold">Reps: {repsThisSet}</span> / 8
          </div>

          {/* Center: Progress */}
          <div className="flex-1 max-w-md mx-8">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
              <span>Session Progress</span>
              <span>67%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-2/3 rounded-full" />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition-all">
              Save Clip
            </button>
            <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition-all">
              Export Data
            </button>
            <button className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-lg text-sm font-bold text-white transition-all uppercase tracking-wide">
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}