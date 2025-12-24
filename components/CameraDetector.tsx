import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Eye, EyeOff, Activity, Target, Settings2, Crosshair, RefreshCcw } from 'lucide-react';

// Declare OpenCV on window
declare global {
  interface Window {
    cv: any;
  }
}

interface CameraDetectorProps {
  onMotionDetected: () => void;
  isActive: boolean;
  onVideoAvailable?: (blob: Blob) => void;
}

const CameraDetector: React.FC<CameraDetectorProps> = ({ 
  onMotionDetected, 
  isActive, 
  onVideoAvailable 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef(0);

  // OpenCV State
  const [cvReady, setCvReady] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [trackingStats, setTrackingStats] = useState({
    area: 0,
    circularity: 0,
    velocity: 0,
    detectedColor: 'None'
  });
  const [isWarmingUp, setIsWarmingUp] = useState(true);

  // Tracking Logic State
  const centroidHistory = useRef<{x: number, y: number, t: number}[]>([]);
  const lastDetectionTime = useRef(0);
  const consecutiveDetections = useRef(0);

  // Multi-Color Ball Detection Ranges
  const colorRanges = useRef({
    tennisBall: {
      name: "Tennis Ball",
      low: [20, 80, 80, 0],
      high: [40, 255, 255, 0],
      low2: [0, 0, 0, 0],
      high2: [0, 0, 0, 0]
    },
    cricketRed: {
      name: "Cricket Red",
      low: [0, 120, 100, 0],
      high: [10, 255, 255, 0],
      low2: [170, 120, 100, 0],
      high2: [180, 255, 255, 0]
    },
    cricketWhite: {
      name: "Cricket White",
      low: [0, 0, 180, 0],
      high: [180, 30, 255, 0],
      low2: [0, 0, 0, 0],
      high2: [0, 0, 0, 0]
    }
  });

  // Memory Management for OpenCV Mats
  const matsRef = useRef<any>({
    src: null,
    hsv: null,
    masks: {}, // Will hold masks for each color
    hierarchy: null,
    contours: null,
    kernel: null
  });

  // Check for OpenCV load
  useEffect(() => {
    const checkCv = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        console.log("OpenCV.js Loaded");
        setCvReady(true);
        clearInterval(checkCv);
      }
    }, 100);
    return () => clearInterval(checkCv);
  }, []);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 }, 
            height: { ideal: 720 }
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            if (window.cv) {
              initializeMats(videoRef.current!.videoWidth, videoRef.current!.videoHeight);
            }
          };
        }

        setTimeout(() => setIsWarmingUp(false), 2000);
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    startCamera();

    return () => {
      cleanupMats();
    };
  }, []);

  const cleanupMats = () => {
    const m = matsRef.current;
    if (m.src) m.src.delete();
    if (m.hsv) m.hsv.delete();
    if (m.hierarchy) m.hierarchy.delete();
    if (m.contours) m.contours.delete();
    if (m.kernel) m.kernel.delete();
    
    // Clean up all color masks
    Object.keys(m.masks).forEach(key => {
      if (m.masks[key].mask1) m.masks[key].mask1.delete();
      if (m.masks[key].mask2) m.masks[key].mask2.delete();
      if (m.masks[key].maskFinal) m.masks[key].maskFinal.delete();
      if (m.masks[key].low1) m.masks[key].low1.delete();
      if (m.masks[key].high1) m.masks[key].high1.delete();
      if (m.masks[key].low2) m.masks[key].low2.delete();
      if (m.masks[key].high2) m.masks[key].high2.delete();
    });

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const initializeMats = (width: number, height: number) => {
    const cv = window.cv;
    if (!cv) return;

    const m = matsRef.current;

    // Initialize base mats
    m.src = new cv.Mat(height, width, cv.CV_8UC4);
    m.hsv = new cv.Mat(height, width, cv.CV_8UC3);
    m.hierarchy = new cv.Mat();
    m.contours = new cv.MatVector();
    m.kernel = cv.Mat.ones(5, 5, cv.CV_8U);

    // Initialize masks for each color range
    const ranges = colorRanges.current;
    Object.keys(ranges).forEach((colorKey) => {
      const range = ranges[colorKey as keyof typeof ranges];
      m.masks[colorKey] = {
        mask1: new cv.Mat(height, width, cv.CV_8UC1),
        mask2: new cv.Mat(height, width, cv.CV_8UC1),
        maskFinal: new cv.Mat(height, width, cv.CV_8UC1),
        low1: new cv.Mat(height, width, cv.CV_8UC3, range.low),
        high1: new cv.Mat(height, width, cv.CV_8UC3, range.high),
        low2: new cv.Mat(height, width, cv.CV_8UC3, range.low2),
        high2: new cv.Mat(height, width, cv.CV_8UC3, range.high2)
      };
    });
  };

  const calibrateColor = () => {
    if (!videoRef.current || !matsRef.current.hsv) return;

    const cv = window.cv;
    const m = matsRef.current;

    // Sample center of image (80x80 box for better sampling)
    const centerX = Math.floor(m.hsv.cols / 2);
    const centerY = Math.floor(m.hsv.rows / 2);
    const rect = new cv.Rect(centerX - 40, centerY - 40, 80, 80);
    const roi = m.hsv.roi(rect);

    // Calculate mean HSV
    const mean = cv.mean(roi);
    roi.delete();

    const h = mean[0];
    const s = mean[1];
    const v = mean[2];

    // More generous tolerance for outdoor conditions
    const hTol = 25;
    const sTol = 100;
    const vTol = 100;

    // Determine which color preset this is closest to and update it
    let targetColor = 'tennisBall';
    
    // Yellow-green range (tennis ball)
    if (h >= 20 && h <= 40) {
      targetColor = 'tennisBall';
    }
    // Red range (cricket ball red)
    else if (h < 15 || h > 165) {
      targetColor = 'cricketRed';
    }
    // Low saturation (white cricket ball)
    else if (s < 50 && v > 150) {
      targetColor = 'cricketWhite';
    }

    // Update the specific color range with calibrated values
    const newRange = {
      low: [Math.max(0, h - hTol), Math.max(50, s - sTol), Math.max(50, v - vTol), 0],
      high: [Math.min(180, h + hTol), 255, 255, 0],
      low2: [0, 0, 0, 0],
      high2: [0, 0, 0, 0]
    };

    // Handle red wraparound
    if (h < hTol || h > 180 - hTol) {
      newRange.low = [0, Math.max(50, s - sTol), Math.max(50, v - vTol), 0];
      newRange.high = [Math.min(180, h + hTol), 255, 255, 0];
      newRange.low2 = [Math.max(0, 180 - hTol), Math.max(50, s - sTol), Math.max(50, v - vTol), 0];
      newRange.high2 = [180, 255, 255, 0];
    }
    
    // Update ref
    const ranges: any = colorRanges.current;
    if (ranges[targetColor]) {
       ranges[targetColor].low = newRange.low;
       ranges[targetColor].high = newRange.high;
       ranges[targetColor].low2 = newRange.low2;
       ranges[targetColor].high2 = newRange.high2;
    }

    // Update the threshold mats for the calibrated color
    const colorMask = matsRef.current.masks[targetColor];
    if (colorMask) {
      colorMask.low1.delete();
      colorMask.high1.delete();
      colorMask.low2.delete();
      colorMask.high2.delete();

      colorMask.low1 = new cv.Mat(m.src.rows, m.src.cols, cv.CV_8UC3, newRange.low);
      colorMask.high1 = new cv.Mat(m.src.rows, m.src.cols, cv.CV_8UC3, newRange.high);
      colorMask.low2 = new cv.Mat(m.src.rows, m.src.cols, cv.CV_8UC3, newRange.low2);
      colorMask.high2 = new cv.Mat(m.src.rows, m.src.cols, cv.CV_8UC3, newRange.high2);
    }

    setIsCalibrating(false);
    setDebugMode(true);
    setShowMask(true);
  };

  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive || !cvReady || isWarmingUp) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const cv = window.cv;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const m = matsRef.current;

    if (video.readyState !== 4 || !m.src) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (!ctx) return;

    // Draw raw video frame
    ctx.drawImage(video, 0, 0);

    // Calibration Overlay
    if (isCalibrating) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 4;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.strokeRect(cx - 60, cy - 60, 120, 120);
      
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, canvas.width, cy - 70);
      ctx.fillRect(0, cy + 70, canvas.width, canvas.height - (cy+70));
      
      ctx.font = "24px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("PLACE BALL IN YELLOW BOX", cx, cy - 80);
      ctx.fillText("TAP SCREEN TO CALIBRATE", cx, cy + 100);
      
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      // Read Frame into OpenCV
      m.src.data.set(ctx.getImageData(0, 0, canvas.width, canvas.height).data);

      // Convert to HSV
      cv.cvtColor(m.src, m.hsv, cv.COLOR_RGBA2RGB);
      cv.cvtColor(m.hsv, m.hsv, cv.COLOR_RGB2HSV);

      // Apply Gaussian blur to reduce noise
      cv.GaussianBlur(m.hsv, m.hsv, new cv.Size(5, 5), 0);

      const allDetectedCircles: any[] = [];
      const ranges = colorRanges.current;
      
      // CORE LOGIC: Process each color range independently
      Object.keys(ranges).forEach((colorKey) => {
        const colorMask = m.masks[colorKey];
        const colorName = ranges[colorKey as keyof typeof ranges].name;

        // Apply color thresholding for this specific color
        cv.inRange(m.hsv, colorMask.low1, colorMask.high1, colorMask.mask1);
        cv.inRange(m.hsv, colorMask.low2, colorMask.high2, colorMask.mask2);
        cv.addWeighted(colorMask.mask1, 1.0, colorMask.mask2, 1.0, 0.0, colorMask.maskFinal);

        // Morphological operations to clean up mask
        cv.morphologyEx(colorMask.maskFinal, colorMask.maskFinal, cv.MORPH_OPEN, m.kernel);
        cv.morphologyEx(colorMask.maskFinal, colorMask.maskFinal, cv.MORPH_CLOSE, m.kernel);

        // Find contours for this color
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(colorMask.maskFinal, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        // Adaptive area thresholds
        const minArea = Math.max(300, (canvas.width * canvas.height) * 0.0002);
        const maxArea = (canvas.width * canvas.height) * 0.15;

        // Analyze each contour
        for (let i = 0; i < contours.size(); ++i) {
          let contour = contours.get(i);
          let area = cv.contourArea(contour);

          if (area < minArea || area > maxArea) continue;

          let perimeter = cv.arcLength(contour, true);
          if (perimeter > 0) {
            let circularity = (4 * Math.PI * area) / (perimeter * perimeter);

            // Stricter circularity (0.4) to reduce random noise
            if (circularity > 0.4) {
              let circle = cv.minEnclosingCircle(contour);
              let rect = cv.boundingRect(contour);
              let aspectRatio = Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height);

              // Stricter aspect ratio
              if (aspectRatio < 1.8) {
                allDetectedCircles.push({
                  center: circle.center,
                  radius: circle.radius,
                  area: area,
                  circularity: circularity,
                  aspectRatio: aspectRatio,
                  color: colorName,
                  colorKey: colorKey,
                  score: area * circularity * (2.0 - aspectRatio)
                });
              }
            }
          }
        }

        contours.delete();
        hierarchy.delete();
      });

      // Select best ball across ALL colors
      let bestBall = null;
      if (allDetectedCircles.length > 0) {
        allDetectedCircles.sort((a, b) => b.score - a.score);
        bestBall = allDetectedCircles[0];
      }

      // Visualization
      if (showMask && bestBall) {
        // Show the mask of the detected color
        const detectedMask = m.masks[bestBall.colorKey].maskFinal;
        cv.imshow(canvas, detectedMask);
      }

      if (bestBall) {
        // Draw detection circle
        ctx.beginPath();
        ctx.arc(bestBall.center.x, bestBall.center.y, bestBall.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw crosshair
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bestBall.center.x - 20, bestBall.center.y);
        ctx.lineTo(bestBall.center.x + 20, bestBall.center.y);
        ctx.moveTo(bestBall.center.x, bestBall.center.y - 20);
        ctx.lineTo(bestBall.center.x, bestBall.center.y + 20);
        ctx.stroke();

        // Calculate velocity
        const now = Date.now();
        const lastPos = centroidHistory.current[centroidHistory.current.length - 1];
        let velocity = 0;

        if (lastPos) {
          const dx = bestBall.center.x - lastPos.x;
          const dy = bestBall.center.y - lastPos.y;
          const dt = (now - lastPos.t) / 1000;
          const distance = Math.sqrt(dx*dx + dy*dy);
          if (dt > 0) velocity = distance / dt;
        }

        setTrackingStats({
          area: Math.round(bestBall.area),
          circularity: Number(bestBall.circularity.toFixed(2)),
          velocity: Math.round(velocity),
          detectedColor: bestBall.color
        });

        centroidHistory.current.push({ x: bestBall.center.x, y: bestBall.center.y, t: now });
        if (centroidHistory.current.length > 20) centroidHistory.current.shift();

        // Motion detection filter
        if (velocity > 20) {
          consecutiveDetections.current += 1;
        } else {
          consecutiveDetections.current = Math.max(0, consecutiveDetections.current - 1);
        }

        if (consecutiveDetections.current > 2 && (now - lastDetectionTime.current > 1500)) {
          lastDetectionTime.current = now;
          onMotionDetected();

          // Visual flash
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        consecutiveDetections.current = 0;
        setTrackingStats(prev => ({ ...prev, velocity: 0, detectedColor: 'None' }));
      }

    } catch (e) {
      console.error("CV Error", e);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [cvReady, isActive, isWarmingUp, onMotionDetected, showMask, isCalibrating]);

  useEffect(() => {
    if (cvReady && isActive) {
      animationRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [cvReady, isActive, processFrame]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl border-2 border-gray-700">
      <video 
        ref={videoRef} 
        className="hidden"
        playsInline
        muted
      />

      {/* Main Canvas Area */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        onClick={() => isCalibrating && calibrateColor()}
      />

      {/* CV Loading Overlay */}
      {!cvReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
          <div className="text-white text-xl font-bold animate-pulse">
            Loading CV Engine...
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${isActive ? 'bg-red-600 animate-pulse' : 'bg-gray-600'}`}>
            {isActive ? "🔴 LIVE" : "⏸ PAUSED"}
          </div>
          
          <div className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white w-fit shadow-lg backdrop-blur-md bg-opacity-80">
            {trackingStats.detectedColor}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setIsCalibrating(true)}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg backdrop-blur-md ${
              isCalibrating ? 'bg-yellow-500 text-black' : 'bg-gray-800/80 text-white hover:bg-gray-700'
            }`}
          >
            <Target size={16} />
            {isCalibrating ? "TAP BALL" : "CALIBRATE"}
          </button>

          <button 
            onClick={() => setDebugMode(!debugMode)}
            className={`p-2 rounded-lg shadow-lg backdrop-blur-md ${debugMode ? 'bg-blue-600' : 'bg-gray-800/80'} text-white`}
          >
            {debugMode ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {/* Debug Info Panel */}
      {debugMode && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-lg p-3 text-white text-xs space-y-2 z-10 border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" />
              Velocity: {trackingStats.velocity} px/s
            </span>
            <span className="flex items-center gap-2">
              <Target size={14} className="text-green-400" />
              Area: {trackingStats.area} px²
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Crosshair size={14} className="text-purple-400" />
              Circularity: {trackingStats.circularity}
            </span>
            <button 
              onClick={() => setShowMask(!showMask)}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <Settings2 size={14} />
              {showMask ? "Hide Mask" : "Show Mask"}
            </button>
          </div>

          <div className="text-center text-gray-400 pt-2 border-t border-gray-700">
            Multi-Color Detection: Tennis Ball • Cricket Red • Cricket White
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraDetector;