import React from 'react';
import { X, Cpu, Smartphone, ShieldCheck, BatteryCharging, AlertCircle, Layers } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">StepFlow Architecture &amp; Sensor Specifications</h2>
              <p className="text-xs text-zinc-400">Technical audit of Web vs Native Pedometer capabilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs leading-relaxed text-zinc-300 pr-1">
          {/* Question 1: Platform */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <Smartphone className="w-4 h-4" />
              <span>1. Current Platform Target</span>
            </div>
            <p className="text-zinc-400">
              This environment runs as a <strong>Mobile-first Web Application (React 19, TypeScript, Tailwind CSS)</strong> executed inside modern mobile and desktop web browsers (Safari, Chrome, Firefox, Edge).
            </p>
          </div>

          {/* Question 2: Sensor Access */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <Layers className="w-4 h-4" />
              <span>2. Access to Real Step / Motion Sensors</span>
            </div>
            <ul className="space-y-1.5 text-zinc-400 list-disc pl-4 mt-1">
              <li>
                <strong>Web Browser reality:</strong> Web browsers do not expose dedicated OS hardware pedometer counters (like Apple CoreMotion <code className="text-zinc-300 font-mono">CMPedometer</code> or Android <code className="text-zinc-300 font-mono">TYPE_STEP_COUNTER</code>).
              </li>
              <li>
                <strong>What StepFlow implements:</strong> StepFlow binds to raw 3D accelerometer signals via the W3C <code className="text-zinc-300 font-mono">DeviceMotionEvent</code> API. Our physics engine calculates Euclidean acceleration magnitude, filters static gravity (9.81 m/s²), applies low-pass smoothing, and detects cyclic biomechanical gait peaks (1.4 to 3.2 Hz).
              </li>
            </ul>
          </div>

          {/* Question 3: Background Tracking */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>3. Background / Screen-Locked Limitations</span>
            </div>
            <p className="text-zinc-400">
              <strong>Crucial Distinction:</strong> In all mobile browsers (Safari on iOS &amp; Chrome on Android), when the phone is locked or the tab goes into the background, JavaScript execution is aggressively frozen by the OS, and motion sensor events cease immediately.
            </p>
            <p className="text-zinc-400 mt-2">
              StepFlow solves this in the web environment via:
            </p>
            <ul className="space-y-1 text-zinc-400 list-disc pl-4 mt-1">
              <li>
                <strong>Screen Wake Lock API:</strong> Keeps the display alive in high-efficiency OLED dark mode during active walking sessions.
              </li>
              <li>
                <strong>Honest State Reporting:</strong> We never fabricate fake phantom steps when the screen is locked.
              </li>
            </ul>
          </div>

          {/* Question 4: Native APIs Required */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sky-400 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>4. Native APIs Required for 24/7 Locked Background Counting</span>
            </div>
            <div className="space-y-2 mt-1">
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="font-semibold text-zinc-200">iOS (Swift / Objective-C):</span>
                <p className="text-zinc-400 mt-0.5">
                  <code className="text-sky-300 font-mono">CoreMotion.CMPedometer</code> queries Apple’s low-power M-series motion coprocessor. Background tracking requires <code className="text-sky-300 font-mono">HealthKit (HKQuantityTypeIdentifierStepCount)</code> or background location/audio entitlements.
                </p>
              </div>
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="font-semibold text-zinc-200">Android (Kotlin / Java):</span>
                <p className="text-zinc-400 mt-0.5">
                  <code className="text-sky-300 font-mono">android.hardware.Sensor.TYPE_STEP_COUNTER</code> running inside an Android Foreground Service with <code className="text-sky-300 font-mono">FOREGROUND_SERVICE_TYPE_HEALTH</code> and <code className="text-sky-300 font-mono">ACTIVITY_RECOGNITION</code> permission, or Google Health Connect.
                </p>
              </div>
            </div>
          </div>

          {/* Question 5: Web vs Native Partition */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <BatteryCharging className="w-4 h-4" />
              <span>5. Web vs Native Implementation Partition</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="font-semibold text-emerald-400">Directly in this Web App:</span>
                <ul className="list-disc pl-3 text-zinc-400 mt-1 space-y-0.5">
                  <li>Full fitness UI &amp; charts</li>
                  <li>Real-time DeviceMotion peak detection</li>
                  <li>Hysteresis gait period validation</li>
                  <li>WakeLock active walking mode</li>
                  <li>Local storage daily persistence</li>
                  <li>Diagnostic live waveform canvas</li>
                </ul>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="font-semibold text-zinc-300">Requires Native Bridge (Capacitor/RN):</span>
                <ul className="list-disc pl-3 text-zinc-400 mt-1 space-y-0.5">
                  <li>Locked screen 24/7 background counting</li>
                  <li>Coprocessor hardware step buffer</li>
                  <li>Apple Health / Google Fit sync</li>
                  <li>Zero-battery hardware step events</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl transition-colors"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};
