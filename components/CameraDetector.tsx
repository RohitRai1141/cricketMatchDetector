import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Eye, EyeOff, Video, Download, Hourglass } from 'lucide-react';
import { DEFAULT_MOTION_CONFIG } from '../constants';

interface CameraDetectorProps {
  onMotionDetected: () => void;
  isActive: boolean;
  onVideoAvailable?: (blob: Blob) => void;
}

const CameraDetector: React.FC<CameraDetectorProps> = ({ onMotionDetected, isActive, onVideoAvailable }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  const lastTriggerTime = useRef<number>(0);
  // Fix: Initialize with 0 to satisfy expected arguments
  const animationRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const frameCountRef = useRef<number>(0);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [motionScore, setMotionScore] = useState(0);
  const [sensitivity, setSensitivity] = useState(DEFAULT_MOTION_CONFIG.sensitivity);
  const [isRecording, setIsRecording] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(true);

  // Setup Camera & Recorder
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true, 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Initialize Recorder
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
             const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp9' });
             mediaRecorderRef.current = recorder;
             
             recorder.ondataavailable = (e) => {
               if (e.data.size > 0) chunksRef.current.push(e.data);
             };

             recorder.onstop = () => {
               const blob = new Blob(chunksRef.current, { type: 'video/webm' });
               if (onVideoAvailable) onVideoAvailable(blob);
               chunksRef.current = []; // Reset
             };

             recorder.start(1000); // 1s chunks
             setIsRecording(true);
        }

        // Warmup timer
        setTimeout(() => setIsWarmingUp(false), 2000);

      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };

    startCamera();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Motion Detection Loop
  const detectMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(detectMotion);
      return;
    }

    // Draw current frame to canvas (scaled down for performance)
    const width = 100; // Low res for analysis
    const height = 100;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    const currentFrame = ctx.getImageData(0, 0, width, height);
    
    // Skip detection during warmup
    if (isWarmingUp) {
        previousFrameRef.current = currentFrame;
        animationRef.current = requestAnimationFrame(detectMotion);
        return;
    }
    
    if (previousFrameRef.current) {
      let diffScore = 0;
      const data = currentFrame.data;
      const prevData = previousFrameRef.current.data;
      const length = data.length;

      for (let i = 0; i < length; i += 16) { 
        const rDiff = Math.abs(data[i] - prevData[i]);
        const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
        const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);
        
        if (rDiff + gDiff + bDiff > 150) { 
          diffScore++;
        }
      }

      setMotionScore(diffScore);

      const now = Date.now();
      const timeSinceLast = now - lastTriggerTime.current;
      
      if (diffScore > sensitivity && timeSinceLast > DEFAULT_MOTION_CONFIG.cooldownMs) {
        lastTriggerTime.current = now;
        console.log("Ball Detected via Motion! Score:", diffScore);
        onMotionDetected();
      }
    }

    previousFrameRef.current = currentFrame;
    animationRef.current = requestAnimationFrame(detectMotion);
  }, [isActive, onMotionDetected, sensitivity, isWarmingUp]);

  useEffect(() => {
    if (isActive) {
      animationRef.current = requestAnimationFrame(detectMotion);
    }
    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, detectMotion]);

  return (
    <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden shadow-lg border border-gray-700 group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay UI */}
      <div className="absolute top-2 left-2 flex gap-2">
         <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${isActive ? 'bg-green-900/80 text-green-400' : 'bg-yellow-900/80 text-yellow-400'}`}>
            {isWarmingUp ? (
                <>
                    <Hourglass size={14} className="animate-spin" />
                    Initializing...
                </>
            ) : (
                <>
                    <Camera size={14} className={isActive ? 'animate-pulse' : ''} />
                    {isActive ? 'Tracking' : 'Paused'}
                </>
            )}
         </div>
         {isRecording && (
            <div className="px-2 py-1 rounded text-xs flex items-center gap-1 bg-red-900/80 text-red-400 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                REC
            </div>
         )}
      </div>

      <div className="absolute top-2 right-2 flex gap-2">
         <button 
           onClick={() => setDebugMode(!debugMode)}
           className="p-1.5 bg-black/40 rounded-full text-white/70 hover:text-white backdrop-blur-sm"
         >
           {debugMode ? <Eye size={16} /> : <EyeOff size={16} />}
         </button>
      </div>

      {(debugMode) && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md p-3 text-xs font-mono text-green-300 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-1">
                <span>Motion: {motionScore}</span>
                <span className="text-gray-400">Trigger > {sensitivity}</span>
            </div>
            
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-3 relative">
                 <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-10" 
                    style={{ left: `${Math.min((sensitivity / 625) * 100, 100)}%` }} 
                 ></div>
                 
                <div 
                    className={`h-full transition-all duration-100 ${motionScore > sensitivity ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${Math.min((motionScore / 625) * 100, 100)}%` }}
                />
            </div>

            <div className="flex items-center gap-2">
                <span className="text-gray-400">Sens:</span>
                <input 
                    type="range" 
                    min="50" 
                    max="1000" 
                    step="50"
                    value={sensitivity} 
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-center">
                Slide right to reduce false detections (lower sensitivity)
            </div>
        </div>
      )}
    </div>
  );
};

export default CameraDetector;