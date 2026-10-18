import { IPedometerProvider, PedometerStepUpdate, StepUpdateCallback, StateChangeCallback, MotionSampleCallback } from './IPedometerProvider';
import { PedometerCapabilities, PedometerProviderType, SensorStatus, StepEngineState, MotionSample } from '../../types';

interface GaitCandidate {
  timestamp: number;
  peakValue: number;
  interval: number;
}

export class WebDeviceMotionProvider implements IPedometerProvider {
  public readonly providerType: PedometerProviderType = 'web_accelerometer';
  public readonly capabilities: PedometerCapabilities = {
    supportsBackgroundTracking: false,
    supportsHardwarePedometer: false,
    supportsHistoricalCoprocessorQuery: false,
    sensorName: 'Web DeviceMotionEvent (3-Axis Accelerometer)',
    platformDescription: 'Browser Accelerometer Kinematics (Foreground Only)',
    limitationNotice:
      'Browser restriction: Mobile browsers freeze DeviceMotionEvent when the screen is locked, the tab is backgrounded, or another app is opened. Continuous background pedometer counting requires native iOS (CoreMotion) or Android (Foreground Service).',
  };

  private status: SensorStatus = 'unsupported';
  private permissionState: 'prompt' | 'granted' | 'denied' | 'unknown' = 'unknown';
  private isListening = false;
  private isActivelyWalking = false;
  private cadenceSpm = 0;
  private lastStepTimestamp = 0;
  private totalStepsToday = 0;
  private currentSessionSteps = 0;
  private isSimulatedDesktop = false;

  // Signal processing parameters
  private gravityEstimate = 9.80665;
  private smoothedLinearAcc = 0;
  private recentSamples: MotionSample[] = [];
  private maxSampleHistory = 60;

  // Stride rhythm confirmation buffer
  private unconfirmedStrides: GaitCandidate[] = [];
  private readonly CONFIRMATION_STRIDE_COUNT = 3;
  private lastPeakTime = 0;
  private lastTroughTime = 0;
  private lastPeakValue = 0;

  private readonly MIN_STEP_INTERVAL_MS = 270;
  private readonly MAX_STEP_INTERVAL_MS = 1400;
  private readonly DYNAMIC_PEAK_THRESHOLD = 1.35;
  private readonly DYNAMIC_TROUGH_THRESHOLD = -0.95;

  private stationaryTimeoutId: number | null = null;
  private simulationIntervalId: number | null = null;
  private motionCheckTimeoutId: number | null = null;

  private boundDeviceMotionHandler: (e: DeviceMotionEvent) => void;
  private onStepCallback: StepUpdateCallback | null = null;
  private onStateCallback: StateChangeCallback | null = null;
  private onSampleCallback: MotionSampleCallback | null = null;

  constructor(initialSteps: number = 0) {
    this.totalStepsToday = initialSteps;
    this.boundDeviceMotionHandler = this.handleDeviceMotionEvent.bind(this);
  }

  public async initialize(): Promise<boolean> {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      this.status = 'unsupported';
      this.notifyState();
      return false;
    }

    const dme = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === 'function') {
      this.status = 'needs_permission';
      this.permissionState = 'prompt';
      this.notifyState();
      return true;
    }

    this.status = 'listening_stationary';
    this.permissionState = 'granted';
    this.notifyState();
    return true;
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const dme = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === 'function') {
      try {
        const response = await dme.requestPermission();
        if (response === 'granted') {
          this.permissionState = 'granted';
          this.status = 'listening_stationary';
          this.notifyState();
          return true;
        } else {
          this.permissionState = 'denied';
          this.status = 'permission_denied';
          this.notifyState();
          return false;
        }
      } catch (err) {
        console.error('Motion permission error:', err);
        this.permissionState = 'denied';
        this.status = 'permission_denied';
        this.notifyState();
        return false;
      }
    }

    this.permissionState = 'granted';
    this.status = 'listening_stationary';
    this.notifyState();
    return true;
  }

  public async startTracking(
    onStep: StepUpdateCallback,
    onState: StateChangeCallback,
    onSample?: MotionSampleCallback
  ): Promise<void> {
    this.onStepCallback = onStep;
    this.onStateCallback = onState;
    if (onSample) this.onSampleCallback = onSample;

    if (typeof window === 'undefined' || this.isListening) return;

    try {
      window.addEventListener('devicemotion', this.boundDeviceMotionHandler, { passive: true });
      this.isListening = true;
      this.status = 'listening_stationary';
      this.notifyState();

      // Check if hardware sensor actually emits data
      if (this.motionCheckTimeoutId) clearTimeout(this.motionCheckTimeoutId);
      this.motionCheckTimeoutId = window.setTimeout(() => {
        if (this.recentSamples.length === 0 && !this.isSimulatedDesktop) {
          this.status = 'unsupported';
          this.isListening = false;
          window.removeEventListener('devicemotion', this.boundDeviceMotionHandler);
          this.notifyState();
        }
      }, 3500);
    } catch (err) {
      console.error('Failed to attach motion listener:', err);
      this.status = 'error';
      this.notifyState();
    }
  }

  public async stopTracking(): Promise<void> {
    if (typeof window === 'undefined' || !this.isListening) return;
    window.removeEventListener('devicemotion', this.boundDeviceMotionHandler);
    this.isListening = false;
    this.isActivelyWalking = false;
    this.cadenceSpm = 0;
    if (this.stationaryTimeoutId) clearTimeout(this.stationaryTimeoutId);
    if (this.motionCheckTimeoutId) clearTimeout(this.motionCheckTimeoutId);
    this.stopSimulation();
    this.notifyState();
  }

  private handleDeviceMotionEvent(event: DeviceMotionEvent): void {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const rawMagnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    if (!isFinite(rawMagnitude) || rawMagnitude > 50) return;

    const now = performance.now();

    // Gravity filter (0.85 alpha)
    this.gravityEstimate = 0.85 * this.gravityEstimate + 0.15 * rawMagnitude;
    const dynamicAcc = rawMagnitude - this.gravityEstimate;

    // Smoothing
    this.smoothedLinearAcc = 0.65 * this.smoothedLinearAcc + 0.35 * dynamicAcc;

    this.processKinematics(this.smoothedLinearAcc, rawMagnitude, now);
  }

  private processKinematics(smoothedValue: number, rawMagnitude: number, timestamp: number): void {
    let isPeak = false;

    if (smoothedValue < this.DYNAMIC_TROUGH_THRESHOLD) {
      this.lastTroughTime = timestamp;
    }

    if (smoothedValue > this.DYNAMIC_PEAK_THRESHOLD) {
      if (smoothedValue > this.lastPeakValue) {
        this.lastPeakValue = smoothedValue;
      }
    } else if (this.lastPeakValue > this.DYNAMIC_PEAK_THRESHOLD) {
      isPeak = true;
      const intervalSinceLastPeak = timestamp - this.lastPeakTime;
      const peakMagnitude = this.lastPeakValue;
      this.lastPeakValue = 0;

      const isValidInterval =
        intervalSinceLastPeak >= this.MIN_STEP_INTERVAL_MS &&
        intervalSinceLastPeak <= this.MAX_STEP_INTERVAL_MS;

      const hasRecentTrough = timestamp - this.lastTroughTime < 1100;

      if (isValidInterval && hasRecentTrough) {
        this.evaluateGaitCandidate({
          timestamp,
          peakValue: peakMagnitude,
          interval: intervalSinceLastPeak,
        });
        this.lastPeakTime = timestamp;
      } else if (intervalSinceLastPeak > this.MAX_STEP_INTERVAL_MS) {
        this.lastPeakTime = timestamp;
        this.unconfirmedStrides = [{ timestamp, peakValue: peakMagnitude, interval: 0 }];
      }
    }

    const sample: MotionSample = {
      timestamp,
      rawMagnitude,
      filteredMagnitude: smoothedValue,
      threshold: this.DYNAMIC_PEAK_THRESHOLD,
      isPeak,
    };

    this.recentSamples.push(sample);
    if (this.recentSamples.length > this.maxSampleHistory) {
      this.recentSamples.shift();
    }
    if (this.onSampleCallback) this.onSampleCallback(sample);

    if (Math.abs(smoothedValue) > 0.4) {
      this.touchStationaryWatchdog();
    }
  }

  private evaluateGaitCandidate(candidate: GaitCandidate): void {
    const now = Date.now();
    const interval = candidate.interval;
    const instantSpm = Math.round(60000 / interval);

    if (this.isActivelyWalking) {
      this.registerStep(1, instantSpm, now);
    } else {
      this.unconfirmedStrides.push(candidate);
      if (this.unconfirmedStrides.length >= this.CONFIRMATION_STRIDE_COUNT) {
        const intervals = this.unconfirmedStrides.slice(1).map((s) => s.interval).filter((i) => i > 0);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const isRhythmic = intervals.every((i) => Math.abs(i - avgInterval) / avgInterval < 0.45);

        if (isRhythmic) {
          this.isActivelyWalking = true;
          this.status = 'listening_walking';
          const stepsToCredit = this.unconfirmedStrides.length;
          const avgSpm = Math.round(60000 / avgInterval);
          this.registerStep(stepsToCredit, avgSpm, now);
          this.unconfirmedStrides = [];
        } else {
          this.unconfirmedStrides.shift();
        }
      }
    }
    this.touchStationaryWatchdog();
  }

  private registerStep(count: number, cadence: number, timestamp: number): void {
    this.totalStepsToday += count;
    this.currentSessionSteps += count;
    this.cadenceSpm = Math.min(Math.max(cadence, 40), 220);
    this.lastStepTimestamp = timestamp;

    if (this.onStepCallback) {
      this.onStepCallback({
        totalStepsToday: this.totalStepsToday,
        cadenceSpm: this.cadenceSpm,
        timestamp,
        isBackgroundUpdate: false,
      });
    }
    this.notifyState();
  }

  private touchStationaryWatchdog(): void {
    if (this.stationaryTimeoutId) clearTimeout(this.stationaryTimeoutId);
    this.stationaryTimeoutId = window.setTimeout(() => {
      if (this.isActivelyWalking || this.status === 'listening_walking') {
        this.isActivelyWalking = false;
        this.cadenceSpm = 0;
        this.unconfirmedStrides = [];
        this.status = 'listening_stationary';
        this.notifyState();
      }
    }, 2500);
  }

  public startDesktopMotionSimulator(simulatedCadenceSpm: number = 105): void {
    this.stopSimulation();
    this.isSimulatedDesktop = true;
    this.status = 'listening_stationary';
    this.isListening = true;
    this.notifyState();

    const sampleRateHz = 50;
    const intervalMs = 1000 / sampleRateHz;
    let t = 0;
    const strideFrequencyHz = simulatedCadenceSpm / 60;

    this.simulationIntervalId = window.setInterval(() => {
      t += intervalMs / 1000;
      const fundamental = Math.sin(2 * Math.PI * strideFrequencyHz * t) * 2.1;
      const harmonic = Math.sin(4 * Math.PI * strideFrequencyHz * t + 0.3) * 0.5;
      const noise = (Math.random() - 0.5) * 0.15;
      const simZ = 9.81 + fundamental + harmonic + noise;
      const simX = Math.cos(2 * Math.PI * strideFrequencyHz * t) * 0.6;
      const simY = Math.sin(2 * Math.PI * strideFrequencyHz * t * 0.5) * 0.4;

      const mockEvent = {
        accelerationIncludingGravity: { x: simX, y: simY, z: simZ },
        acceleration: null,
      } as unknown as DeviceMotionEvent;

      this.handleDeviceMotionEvent(mockEvent);
    }, intervalMs);
  }

  public stopSimulation(): void {
    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }
    this.isSimulatedDesktop = false;
  }

  public setTodaySteps(steps: number): void {
    this.totalStepsToday = steps;
    this.notifyState();
  }

  public getState(): StepEngineState {
    return {
      sensorStatus: this.status,
      providerType: this.providerType,
      capabilities: this.capabilities,
      isSupported: this.status !== 'unsupported',
      permissionState: this.permissionState,
      isListening: this.isListening,
      cadenceSpm: this.cadenceSpm,
      lastStepTimestamp: this.lastStepTimestamp,
      totalStepsToday: this.totalStepsToday,
      currentSessionSteps: this.currentSessionSteps,
      isActivelyWalking: this.isActivelyWalking,
      isSimulatedDesktop: this.isSimulatedDesktop,
    };
  }

  private notifyState(): void {
    if (this.onStateCallback) {
      this.onStateCallback(this.getState());
    }
  }

  public destroy(): void {
    this.stopTracking();
  }
}
