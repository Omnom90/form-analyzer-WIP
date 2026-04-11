import { useEffect, useRef, useCallback, useState } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from '@mediapipe/tasks-vision';

export interface PoseResult {
  landmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
  angles: {
    leftElbow: number | null;
    rightElbow: number | null;
    leftShoulder: number | null;
    rightShoulder: number | null;
    leftHip: number | null;
    rightHip: number | null;
    leftKnee: number | null;
    rightKnee: number | null;
    leftAnkle: number | null;
    rightAnkle: number | null;
  };
  timestamp: number;
}

interface UsePoseDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  onPoseDetected?: (result: PoseResult) => void;
  enabled: boolean;
}

export function usePoseDetection({
  videoRef,
  canvasRef,
  onPoseDetected,
  enabled
}: UsePoseDetectionOptions) {
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate angle between three landmarks
  const calculateAngle = useCallback((
    A: { x: number; y: number },
    B: { x: number; y: number },
    C: { x: number; y: number }
  ): number | null => {
    const BAx = A.x - B.x;
    const BAy = A.y - B.y;
    const BCx = C.x - B.x;
    const BCy = C.y - B.y;

    const dot = BAx * BCx + BAy * BCy;
    const magBA = Math.sqrt(BAx ** 2 + BAy ** 2);
    const magBC = Math.sqrt(BCx ** 2 + BCy ** 2);

    if (magBA === 0 || magBC === 0) return null;

    const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
    return parseFloat((Math.acos(cosTheta) * (180 / Math.PI)).toFixed(1));
  }, []);

  // Calculate all joint angles from landmarks
  const calculateAllAngles = useCallback((landmarks: any[]) => {
    const p = (i: number) => landmarks[i];

    return {
      leftElbow: calculateAngle(p(11), p(13), p(15)),
      rightElbow: calculateAngle(p(12), p(14), p(16)),
      leftShoulder: calculateAngle(p(23), p(11), p(13)),
      rightShoulder: calculateAngle(p(24), p(12), p(14)),
      leftHip: calculateAngle(p(11), p(23), p(25)),
      rightHip: calculateAngle(p(12), p(24), p(26)),
      leftKnee: calculateAngle(p(23), p(25), p(27)),
      rightKnee: calculateAngle(p(24), p(26), p(28)),
      leftAnkle: calculateAngle(p(25), p(27), p(31)),
      rightAnkle: calculateAngle(p(26), p(28), p(32)),
    };
  }, [calculateAngle]);

  // Initialize MediaPipe
  useEffect(() => {
    //if (!enabled) return;

    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: '/pose_landmarker_lite.task'
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          }
        );

        // Setup drawing utils if canvas provided
        if (canvasRef?.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            drawingUtilsRef.current = new DrawingUtils(ctx);
          }
        }

        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize pose detection';
        setError(errorMsg);
        console.error('Pose detection init error:', err);
      }
    };

    initMediaPipe();
  }, [enabled, canvasRef]);

  // Process frames
  useEffect(() => {
    if (!enabled || !isInitialized || !poseLandmarkerRef.current || !videoRef.current) {
      return;
    }

    const processFrame = () => {
      try {
        if (!videoRef.current || videoRef.current.readyState !== 4) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        const results = poseLandmarkerRef.current!.detectForVideo(
          videoRef.current,
          performance.now()
        );

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const angles = calculateAllAngles(landmarks);

          const poseResult: PoseResult = {
            landmarks,
            angles,
            timestamp: Date.now()
          };

          onPoseDetected?.(poseResult);

          // Draw skeleton on canvas if available
          if (canvasRef?.current && drawingUtilsRef.current && results.landmarks) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              // Set canvas size to match video dimensions for proper alignment
              if (videoRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
              }
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              drawingUtilsRef.current.drawLandmarks(landmarks, {
                radius: 5,
                fillColor: '#00bfff'
              });
              drawingUtilsRef.current.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: '#00bfff',
                lineWidth: 1
              });
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('Frame processing error:', err);
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, isInitialized, onPoseDetected, calculateAllAngles, videoRef, canvasRef]);

  return {
    isInitialized,
    error
  };
}
