import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import {
  Camera,
  Maximize2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Minimize2,
  RefreshCw,
  VideoOff,
} from 'lucide-react';

interface ContestModeGuardProps {
  roundKey: 'quiz' | 'coding' | 'bidding';
  roundTitle: string;
  roundDuration?: string;
  children: React.ReactNode;
  onExit: () => void;
  isCompleted?: boolean;
  onContestReady?: () => void;
}

export const ContestModeGuard: React.FC<ContestModeGuardProps> = ({
  roundKey,
  roundTitle,
  roundDuration,
  children,
  onExit,
  isCompleted = false,
  onContestReady,
}) => {
  const {
    currentTeam,
    monitoringSettings,
    logMonitoringEvent,
    enterContestMode,
    exitContestMode,
  } = useCompetition();

  // Step in contest lifecycle: 'ready_check' | 'active' | 'completed'
  const [contestStep, setContestStep] = useState<'ready_check' | 'active' | 'completed'>(
    isCompleted ? 'completed' : 'ready_check'
  );

  // Stream & Hardware state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Violation flags
  const [fullscreenViolation, setFullscreenViolation] = useState<boolean>(false);
  const [cameraViolation, setCameraViolation] = useState<boolean>(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState<boolean>(false);
  const [warningCount, setWarningCount] = useState<number>(0);

  // Video element refs
  const precheckVideoRef = useRef<HTMLVideoElement | null>(null);
  const livePipVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera preview minimize state in active round
  const [pipMinimized, setPipMinimized] = useState<boolean>(false);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraActive(false);
  }, []);

  // Request camera stream
  const requestCamera = async (): Promise<MediaStream | null> => {
    setCameraLoading(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access (MediaDevices API).');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // Explicitly no audio per contest instructions
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);
      setCameraViolation(false);

      // Attach stream listeners
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleCameraInterruption('Camera track was ended or disconnected.');
        };
        videoTrack.onmute = () => {
          handleCameraInterruption('Camera feed was muted.');
        };
        videoTrack.onunmute = () => {
          setIsCameraActive(true);
          setCameraViolation(false);
          logMonitoringEvent({
            teamId: currentTeam.id,
            teamName: currentTeam.name || currentTeam.id,
            roundKey,
            type: 'CAMERA_CONNECTED',
            details: 'Camera feed resumed',
          });
        };
      }

      logMonitoringEvent({
        teamId: currentTeam.id,
        teamName: currentTeam.name || currentTeam.id,
        roundKey,
        type: 'CAMERA_CONNECTED',
        details: 'Camera stream active',
      });

      return mediaStream;
    } catch (err: any) {
      const msg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera permissions in your browser bar.'
          : err.message || 'Unable to access camera.';
      setCameraError(msg);
      setIsCameraActive(false);
      return null;
    } finally {
      setCameraLoading(false);
    }
  };

  const handleCameraInterruption = (reason: string) => {
    setIsCameraActive(false);
    setCameraViolation(true);
    logMonitoringEvent({
      teamId: currentTeam.id,
      teamName: currentTeam.name || currentTeam.id,
      roundKey,
      type: 'CAMERA_INTERRUPTED',
      details: reason,
    });
  };

  // Re-attach video element whenever stream changes
  useEffect(() => {
    if (stream && precheckVideoRef.current) {
      precheckVideoRef.current.srcObject = stream;
    }
    if (stream && livePipVideoRef.current) {
      livePipVideoRef.current.srcObject = stream;
    }
  }, [stream, contestStep]);

  // Request Fullscreen explicitly inside user gesture
  const triggerEnterFullscreen = async (): Promise<boolean> => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      }
      return true;
    } catch (err) {
      console.warn('Fullscreen entry rejected:', err);
      return false;
    }
  };

  // Handle ALLOW CAMERA & START
  const handleAllowCameraAndStart = async () => {
    // 1. Get Camera
    const activeStream = await requestCamera();
    if (!activeStream && monitoringSettings.requireCamera) {
      return; // Cannot proceed without camera
    }

    // 2. Request Fullscreen
    if (monitoringSettings.requireFullscreen) {
      const fsOk = await triggerEnterFullscreen();
      if (!fsOk) {
        alert('Fullscreen mode is required to enter contest mode. Please allow fullscreen in your browser.');
        return;
      }
    }

    // 3. Mark contest active
    setContestStep('active');
    enterContestMode(roundKey);

    logMonitoringEvent({
      teamId: currentTeam.id,
      teamName: currentTeam.name || currentTeam.id,
      roundKey,
      type: 'FULLSCREEN_ENTER',
      details: 'Started contest in fullscreen mode',
    });

    if (onContestReady) {
      onContestReady();
    }
  };

  // Return to Fullscreen after violation
  const handleReturnToFullscreen = async () => {
    const success = await triggerEnterFullscreen();
    if (success) {
      setFullscreenViolation(false);
      logMonitoringEvent({
        teamId: currentTeam.id,
        teamName: currentTeam.name || currentTeam.id,
        roundKey,
        type: 'FULLSCREEN_ENTER',
        details: 'Contestant returned to fullscreen mode',
      });
    }
  };

  // Reconnect Camera after violation
  const handleReconnectCamera = async () => {
    const s = await requestCamera();
    if (s) {
      setCameraViolation(false);
    }
  };

  // Listeners during ACTIVE contest step
  useEffect(() => {
    if (contestStep !== 'active') return;

    // 1. Fullscreen changes
    const onFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      if (!isFs && monitoringSettings.requireFullscreen) {
        setFullscreenViolation(true);
        setWarningCount((w) => w + 1);
        logMonitoringEvent({
          teamId: currentTeam.id,
          teamName: currentTeam.name || currentTeam.id,
          roundKey,
          type: 'FULLSCREEN_EXIT',
          details: 'Participant exited fullscreen mode',
        });
      } else if (isFs) {
        setFullscreenViolation(false);
      }
    };

    // 2. Visibility / Tab switch changes
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (monitoringSettings.monitorTabSwitching) {
          setTabSwitchWarning(true);
          setWarningCount((w) => w + 1);
          logMonitoringEvent({
            teamId: currentTeam.id,
            teamName: currentTeam.name || currentTeam.id,
            roundKey,
            type: 'TAB_SWITCH',
            details: 'Participant switched tab or minimized browser window',
          });
        }
      } else {
        // Tab restored
        setTimeout(() => setTabSwitchWarning(false), 5000);
      }
    };

    // 3. Window Blur / Focus
    const onWindowBlur = () => {
      if (monitoringSettings.monitorWindowFocus) {
        logMonitoringEvent({
          teamId: currentTeam.id,
          teamName: currentTeam.name || currentTeam.id,
          roundKey,
          type: 'WINDOW_BLUR',
          details: 'Browser window lost focus',
        });
      }
    };

    const onWindowFocus = () => {
      if (monitoringSettings.monitorWindowFocus) {
        logMonitoringEvent({
          teamId: currentTeam.id,
          teamName: currentTeam.name || currentTeam.id,
          roundKey,
          type: 'WINDOW_FOCUS',
          details: 'Browser window regained focus',
        });
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [contestStep, monitoringSettings, currentTeam, roundKey, logMonitoringEvent]);

  // Clean up when unmounting or completing
  useEffect(() => {
    if (isCompleted && contestStep === 'active') {
      setContestStep('completed');
      stopCameraStream();
      exitContestMode();
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
    }
  }, [isCompleted, contestStep, stopCameraStream, exitContestMode]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      exitContestMode();
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
    };
  }, [stopCameraStream, exitContestMode]);

  // =========================================================================
  // VIEW 1: PRE-ROUND PREPARATION SCREEN ("Get Ready")
  // =========================================================================
  if (contestStep === 'ready_check') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-[11px] font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/50">
              Contest Mode Entry
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white mt-3 mb-1">
              Get Ready
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              {roundTitle} • {currentTeam.name || currentTeam.id}
            </p>
          </div>

          {/* Camera preview box */}
          <div className="mb-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
              <video
                ref={precheckVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover mirror ${stream ? 'block' : 'hidden'}`}
                style={{ transform: 'scaleX(-1)' }}
              />

              {!stream && (
                <div className="text-center p-6 text-neutral-400">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-neutral-300 mb-1">
                    Camera access is required for this round.
                  </p>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                    Live camera feed will be monitored during the round for anti-cheating compliance. No recordings are saved.
                  </p>
                </div>
              )}

              {stream && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Camera Ready
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-2.5 mb-7 bg-neutral-50 dark:bg-neutral-950/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 text-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-neutral-900 dark:text-white">Camera Access</span>
                <span className="text-neutral-400 ml-1.5">— Continuous webcam monitoring</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-neutral-900 dark:text-white">Fullscreen Mode</span>
                <span className="text-neutral-400 ml-1.5">— Exiting triggers security alert</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-neutral-900 dark:text-white">Contest Timer</span>
                <span className="text-neutral-400 ml-1.5">
                  — Authoritative clock {roundDuration ? `(${roundDuration})` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-neutral-900 dark:text-white">Anti-Cheating Monitoring</span>
                <span className="text-neutral-400 ml-1.5">— Tab switches & focus logged</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onExit}
              className="sm:w-1/3 py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleAllowCameraAndStart}
              disabled={cameraLoading}
              className="sm:w-2/3 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cameraLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting Camera...
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  ALLOW CAMERA & START
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ROUND COMPLETED
  // =========================================================================
  if (contestStep === 'completed' || isCompleted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-neutral-950 dark:text-white mb-2">
            Round Completed
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6">
            Your results for <span className="font-semibold text-neutral-900 dark:text-white">{roundTitle}</span> have been recorded. Contest mode and camera stream have ended.
          </p>
          <button
            onClick={onExit}
            className="w-full py-3 px-6 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer hover:opacity-90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE CONTEST MODE (Fullscreen + Live Camera PiP + Violation Overlays)
  // =========================================================================
  return (
    <div className="relative w-full min-h-screen">
      {/* Tab Switch Warning Toast */}
      {tabSwitchWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center gap-3 animate-bounce">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div>Please return to the contest window.</div>
            <div className="text-[10px] font-medium opacity-90">
              Tab switch detected and recorded. Warnings: {warningCount}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Violation Modal Overlay */}
      {fullscreenViolation && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Maximize2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-2">Please return to fullscreen to continue</h3>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Exiting fullscreen mode is a contest violation. The round timer is continuing to run and will never reset.
            </p>
            <button
              onClick={handleReturnToFullscreen}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Camera Interruption Warning Overlay */}
      {cameraViolation && (
        <div className="fixed inset-0 z-40 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-rose-900/40 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <VideoOff className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-2">Camera access was interrupted</h3>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Your camera stream was stopped or disconnected. Please reconnect camera access immediately to proceed. The timer continues.
            </p>
            <button
              onClick={handleReconnectCamera}
              className="w-full py-3.5 px-6 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Reconnect Camera
            </button>
          </div>
        </div>
      )}

      {/* Small live camera preview PiP in bottom-right corner */}
      {stream && (
        <div
          className={`fixed bottom-4 right-4 z-30 transition-all duration-200 select-none ${
            pipMinimized ? 'w-28 h-10' : 'w-40 h-28 sm:w-48 sm:h-32'
          } rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-700/80 shadow-2xl`}
        >
          <video
            ref={livePipVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${pipMinimized ? 'hidden' : 'block'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Status overlay bar */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-950/80 backdrop-blur-sm text-[9px] font-bold text-emerald-400 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE
          </div>

          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setPipMinimized(!pipMinimized)}
            className="absolute top-2 right-2 p-1 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-white cursor-pointer"
            title={pipMinimized ? 'Expand Camera' : 'Minimize Camera'}
          >
            {pipMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>

          {pipMinimized && (
            <div className="w-full h-full flex items-center justify-center gap-2 text-[10px] font-bold text-neutral-300 px-3">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Camera Active</span>
            </div>
          )}
        </div>
      )}

      {/* The Actual Contest Round UI */}
      <div>{children}</div>
    </div>
  );
};
