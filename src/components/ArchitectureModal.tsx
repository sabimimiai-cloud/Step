import React, { useState } from 'react';
import { X, Cpu, Smartphone, ShieldCheck, BatteryCharging, AlertCircle, Layers, CheckCircle, Code } from 'lucide-react';
import { PedometerCapabilities, PedometerProviderType } from '../types';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProviderType: PedometerProviderType;
  capabilities: PedometerCapabilities;
  onSwitchProvider: (type: PedometerProviderType) => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
  activeProviderType,
  capabilities,
  onSwitchProvider,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'ios' | 'android' | 'web'>('audit');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">StepFlow Technical Audit &amp; Native Bridge</h2>
              <p className="text-xs text-zinc-400">Sensor accuracy, background limitations &amp; native pedometer specs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl my-3 shrink-0">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'audit' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Audit &amp; Truth
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'ios' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            iOS CoreMotion
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'android' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Android Sensor
          </button>
          <button
            onClick={() => setActiveTab('web')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'web' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Web Provider
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed text-zinc-300 pr-1">
          {activeTab === 'audit' && (
            <div className="space-y-3">
              {/* Question: Can web count backgrounded? */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-rose-400 font-semibold mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Can Browser Count When Locked or Backgrounded?</span>
                </div>
                <p className="text-zinc-300 font-medium mt-1">
                  <strong>Answer: NO.</strong> Web standards do not permit background pedometer counting.
                </p>
                <p className="text-zinc-400 mt-1">
                  In iOS Safari and Android Chrome, the operating system forcibly suspends the JavaScript runtime and shuts down <code className="text-zinc-300 font-mono">devicemotion</code> event listeners the moment the phone is locked, the tab is switched, or another app is opened. No browser-only implementation can bypass this OS limitation.
                </p>
              </div>

              {/* What is Real vs What was Seeded */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Real Sensor Measurements vs Demo Data Audit</span>
                </div>
                <div className="space-y-2 text-zinc-400">
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                    <span className="text-emerald-400 font-semibold">100% Real Sensor Measurements:</span>
                    <p className="mt-0.5">
                      • When this page is open in the foreground on a phone with motion permissions enabled, raw 3D accelerometer signals are continuously captured via <code className="text-zinc-300 font-mono">DeviceMotionEvent</code>.<br />
                      • The 3D Euclidean magnitude, gravity filtering (9.81 m/s²), dynamic residual, and peak-trough hysteresis detection run exclusively on authentic physical forces.<br />
                      • Today’s step count strictly increments only upon genuine gait strides.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                    <span className="text-amber-400 font-semibold">Demo Data Purge &amp; Labeling:</span>
                    <p className="mt-0.5">
                      • All automatically seeded synthetic historical days have been <strong>purged</strong>. Fresh app installations now start with authentic 0-step empty history.<br />
                      • Optional test benchmarks can be toggled in the History screen, but are explicitly watermarked with <code className="text-amber-300 font-mono">[DEMO DATA - NOT MEASURED]</code> so no synthetic data is ever misrepresented.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Provider Status */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <span className="text-zinc-400 font-medium">Active Runtime Provider:</span>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-zinc-800">
                  <span className="font-mono text-white font-semibold">{capabilities.sensorName}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      capabilities.supportsBackgroundTracking
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {capabilities.supportsBackgroundTracking ? '24/7 Background Supported' : 'Foreground Only'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">{capabilities.limitationNotice}</p>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-sky-400 font-semibold mb-1">
                  <Smartphone className="w-4 h-4" />
                  <span>Production iOS Architecture: CMPedometer</span>
                </div>
                <p className="text-zinc-400">
                  On iOS, reliable 24/7 background step counting uses Apple’s <strong>CoreMotion</strong> framework and its dedicated low-power M-series motion coprocessor.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <pre>{`// Swift (Capacitor / Native Plugin Bridge)
import CoreMotion

class PedometerPlugin {
  let pedometer = CMPedometer()

  func startTracking() {
    guard CMPedometer.isStepCountingAvailable() else { return }
    pedometer.startUpdates(from: Date()) { data, error in
      guard let data = data, error == nil else { return }
      self.notifyListeners("stepUpdate", data: [
        "numberOfSteps": data.numberOfSteps.intValue,
        "currentCadence": data.currentCadence?.doubleValue ?? 0
      ])
    }
  }

  // 24/7 coprocessor query for past days
  func queryHistorical(start: Date, end: Date) {
    pedometer.queryPedometerData(from: start, to: end) { ... }
  }
}`}</pre>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Switch runtime to iOS CoreMotion bridge:</span>
                  <button
                    onClick={() => onSwitchProvider('ios_coremotion')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                      activeProviderType === 'ios_coremotion'
                        ? 'bg-sky-500 text-black border-sky-400'
                        : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {activeProviderType === 'ios_coremotion' ? 'Active Provider' : 'Select Provider'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <Smartphone className="w-4 h-4" />
                  <span>Production Android Architecture: TYPE_STEP_COUNTER</span>
                </div>
                <p className="text-zinc-400">
                  On Android, production step counting runs in an Android <strong>Foreground Service</strong> using <code className="text-zinc-300 font-mono">Sensor.TYPE_STEP_COUNTER</code> and <code className="text-zinc-300 font-mono">ACTIVITY_RECOGNITION</code> permission.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  <pre>{`// Kotlin Android Foreground Service
class StepCounterService : Service(), SensorEventListener {
  override fun onSensorChanged(event: SensorEvent) {
    if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
      val totalSteps = event.values[0].toInt()
      // Broadcast to WebView bridge
      bridge.dispatchStepEvent(totalSteps)
    }
  }

  // Mandatory Android 14+ Health service type
  // <service android:foregroundServiceType="health" />
}`}</pre>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Switch runtime to Android Sensor bridge:</span>
                  <button
                    onClick={() => onSwitchProvider('android_sensor')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                      activeProviderType === 'android_sensor'
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {activeProviderType === 'android_sensor' ? 'Active Provider' : 'Select Provider'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'web' && (
            <div className="space-y-3">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                  <Layers className="w-4 h-4" />
                  <span>Web DeviceMotionEvent Fallback</span>
                </div>
                <p className="text-zinc-400">
                  Processes raw 3-axis accelerometer forces while the browser tab is in the foreground. Automatically pauses kinematic processing when stationary to preserve battery.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <div>• <strong>Supports Background:</strong> No (OS restriction)</div>
                  <div>• <strong>Physical Sensor:</strong> Yes (3D Accelerometer via devicemotion)</div>
                  <div>• <strong>Cadence Validation:</strong> 1.4 Hz to 3.2 Hz gait rhythm buffer</div>
                  <div>• <strong>Screen Wake Lock:</strong> Supported via Active Walk mode</div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Switch runtime to Web Accelerometer:</span>
                  <button
                    onClick={() => onSwitchProvider('web_accelerometer')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                      activeProviderType === 'web_accelerometer'
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {activeProviderType === 'web_accelerometer' ? 'Active Provider' : 'Select Provider'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
