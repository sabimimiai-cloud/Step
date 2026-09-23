import React from 'react';
import { ShieldAlert, AlertTriangle, Smartphone, Compass, Sparkles } from 'lucide-react';
import { SensorStatus } from '../types';

interface SensorStatusBannerProps {
  status: SensorStatus;
  isSimulated: boolean;
  onRequestPermission: () => void;
  onToggleSimulator: () => void;
  onOpenInfo: () => void;
  onStartWalkMode: () => void;
}

export const SensorStatusBanner: React.FC<SensorStatusBannerProps> = ({
  status,
  isSimulated,
  onRequestPermission,
  onToggleSimulator,
  onOpenInfo,
  onStartWalkMode,
}) => {
  // If permission needs to be requested (iOS Safari or Android prompt)
  if (status === 'needs_permission') {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 mb-4">
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-left shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-200">Motion Sensor Permission Required</h4>
              <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                StepFlow relies directly on your phone’s accelerometer to detect walking biomechanics in real time. We do not use fake timers or approximations.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={onRequestPermission}
                  className="px-4 py-2 bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl hover:bg-amber-300 transition-colors shadow-sm"
                >
                  Enable Motion Sensors
                </button>
                <button
                  onClick={onOpenInfo}
                  className="px-3 py-2 text-amber-300 hover:text-white text-xs font-medium"
                >
                  Why is this needed?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If permission was denied
  if (status === 'permission_denied') {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 mb-4">
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-rose-200">Sensor Permission Denied</h4>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                Sensor access was blocked. To count steps, please open Safari Settings &gt; Motion &amp; Orientation Access, or enable sensors in your browser’s site permissions.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={onRequestPermission}
                  className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 font-medium text-xs rounded-lg hover:bg-rose-500/30"
                >
                  Retry Permission
                </button>
                <button
                  onClick={onToggleSimulator}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg hover:bg-zinc-700"
                >
                  Test with Kinematics Sim
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If hardware accelerometer is unsupported (e.g. desktop computer)
  if (status === 'unsupported' && !isSimulated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-200">Desktop Environment Detected</h4>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Hardware Check</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                StepFlow uses real phone accelerometer sensors. Because this desktop device lacks a mobile pedometer, live steps will not increment until you move on mobile or activate the Kinematic Walk Simulator below.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={onToggleSimulator}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium text-xs rounded-xl hover:bg-emerald-500/25 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Walking Sim (105 spm)</span>
                </button>
                <button
                  onClick={onOpenInfo}
                  className="px-2.5 py-1.5 text-zinc-400 hover:text-white text-xs"
                >
                  View Tech Architecture
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If simulation is running on desktop
  if (isSimulated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 mb-4">
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <div>
              <p className="text-xs font-semibold text-amber-200">Kinematic Walk Simulator Active</p>
              <p className="text-[11px] text-amber-400/80">Simulating 1.75 Hz gait through real peak-detection engine</p>
            </div>
          </div>
          <button
            onClick={onToggleSimulator}
            className="px-2.5 py-1 bg-zinc-900 border border-amber-500/40 text-amber-300 text-xs rounded-lg hover:bg-zinc-800"
          >
            Stop Sim
          </button>
        </div>
      </div>
    );
  }

  // Normal running state: subtle walk session trigger + background limitation indicator
  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 mb-3">
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Motion sensors active &amp; ready</span>
        </div>
        <button
          onClick={onStartWalkMode}
          className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
        >
          <span>Active Walk Mode</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
