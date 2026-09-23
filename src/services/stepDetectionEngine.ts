import { MotionSample, SensorStatus, StepEngineState } from '../types';

export type StepCallback = (stepCount: number, cadenceSpm: number) => void;
export type StateChangeCallback = (state: StepEngineState) => void;
export type MotionSampleCallback = (sample: MotionSample) => void;

interface GaitCandidate {
  timestamp: number;
  peakValue: number;
  interval: number;
}

export class StepDetectionEngine {
  private status: SensorStatus = 'unsupported';
  private permissionState: 'prompt' | 'granted' | 'denied' | 'unknown' = 'unknown';
  private isListening = false;
  private isActivelyWalking = false;
  private cadenceSpm = 0;
  private lastStepTimestamp = 0;
  private totalStepsToday = 0;
  private currentSessionSteps = 0;
  private isSimulatedDesktop = false;

  // Real-time physics filter parameters
  private gravityEstimate = 9.80665;
  private smoothedLinearAcc = 0;
  private recentSamples: MotionSample[] = [];
  private maxSampleHistory = 60;

  // Stride rhythm confirmation buffer (prevents false positives from single shakes/bumps)
  private unconfirmedStrides: GaitCandidate[] = [];
  private readonly CONFIRMATION_STRIDE_COUNT = 3;
  private lastPeakTime = 0;
  private lastTroughTime = 0;
  private lastPeakValue = 0;
  private isSearchingForTrough = false;

  // Timing thresholds for human biomechanics:
  // - Walking cadence: ~1.4 Hz to 3.2 Hz (280ms to 900ms between foot strikes)
  // - Slower walk allowed up to 1300ms
  // - Jitter / vehicle shaking: < 270ms (rejected)
  private readonly MIN_STEP_INTERVAL_MS = 270;
  private readonly MAX_STEP_INTERVAL_MS = 1400;
  
  // Acceleration threshold (m/s^2) for peak detection above baseline
  private readonly DYNAMIC_PEAK_THRESHOLD = 1.35;
  private readonly DYNAMIC_TROUGH_THRESHOLD = -0.95;

  // Idle timeout (ms) before marking user as stationary to save battery
  private stationaryTimeoutId: number | null = null;
  private readonly STATIONARY_IDLE_TIMEOUT_MS = 2500;

  // Callbacks
  private onStepListeners: Set<StepCallback> = new Set();
  private onStateChangeListeners: Set<StateChangeCallback> = new Set();
  private onSampleListeners: Set<MotionSampleCallback> = new Set();

  // Bound event listeners
  private boundDeviceMotionHandler: (e: DeviceMotionEvent) => void;
  private simulationIntervalId: number | null = null;
  private motionCheckTimeoutId: number | null = null;

  constructor(initialSteps: number = 0) {
    this.totalStepsToday = initialSteps;
    this.boundDeviceMotionHandler = this.handleDeviceMotionEvent.bind(this);
    this.inspectInitialSupport();
  }

  /**
   * Checks browser sensor capabilities
   */
  private inspectInitialSupport(): void {
    if (typeof window === 'undefined') {
      this.status = 'unsupported';
      return;
    }

    // Check if DeviceMotionEvent exists in window
    if (!('DeviceMotionEvent' in window)) {
      this.status = 'unsupported';
      this.notifyStateChange();
      return;
    }

    // Check for iOS 13+ permission model
    const dme = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === 'function') {
      this.status = 'needs_permission';
      this.permissionState = 'prompt';
      this.notifyStateChange();
      return;
    }

    // Modern Android / Desktop Chromium / Firefox
    // Permissions query if supported
    if (navigator.permissions && (navigator.permissions.query as unknown)) {
      navigator.permissions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .query({ name: 'accelerometer' as any })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            this.permissionState = 'granted';
            this.status = 'listening_stationary';
          } else if (permissionStatus.state === 'denied') {
            this.permissionState = 'denied';
            this.status = 'permission_denied';
          } else {
            this.permissionState = 'prompt';
            this.status = 'needs_permission';
          }
          this.notifyStateChange();
        })
        .catch(() => {
          // Accelerometer permission name might not be supported in some browsers
          // We default to ready to listen
          this.status = 'listening_stationary';
          this.notifyStateChange();
        });
    } else {
      this.status = 'listening_stationary';
      this.notifyStateChange();
    }
  }

  /**
   * Request user permission for motion sensors (required for iOS Safari)
   */
  public async requestSensorPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const dme = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === 'function') {
      try {
        const response = await dme.requestPermission();
        if (response === 'granted') {
          this.permissionState = 'granted';
          this.status = 'listening_stationary';
          this.notifyStateChange();
          this.startListening();
          return true;
        } else {
          this.permissionState = 'denied';
          this.status = 'permission_denied';
          this.notifyStateChange();
          return false;
        }
      } catch (err) {
        console.error('Motion permission error:', err);
        this.permissionState = 'denied';
        this.status = 'permission_denied';
        this.notifyStateChange();
        return false;
      }
    }

    // For non-iOS or standard browsers, start listening
    this.permissionState = 'granted';
    this.status = 'listening_stationary';
    this.notifyStateChange();
    this.startListening();
    return true;
  }

  /**
   * Start listening to real device motion events
   */
  public startListening(): void {
    if (typeof window === 'undefined' || this.isListening) return;

    try {
      window.addEventListener('devicemotion', this.boundDeviceMotionHandler, { passive: true });
      this.isListening = true;
      this.status = 'listening_stationary';
      this.notifyStateChange();

      // Verification timer: If after 3.5 seconds of listening we receive zero valid motion events,
      // the device doesn't have an active hardware accelerometer (e.g. desktop Mac/PC).
      if (this.motionCheckTimeoutId) clearTimeout(this.motionCheckTimeoutId);
      this.motionCheckTimeoutId = window.setTimeout(() => {
        if (this.recentSamples.length === 0 && !this.isSimulatedDesktop) {
          this.status = 'unsupported';
          this.isListening = false;
          window.removeEventListener('devicemotion', this.boundDeviceMotionHandler);
          this.notifyStateChange();
        }
      }, 3500);
    } catch (err) {
      console.error('Failed to attach motion listener:', err);
      this.status = 'error';
      this.notifyStateChange();
    }
  }

  /**
   * Stop listening to save battery
   */
  public stopListening(): void {
    if (typeof window === 'undefined' || !this.isListening) return;
    window.removeEventListener('devicemotion', this.boundDeviceMotionHandler);
    this.isListening = false;
    this.isActivelyWalking = false;
    this.cadenceSpm = 0;
    if (this.stationaryTimeoutId) clearTimeout(this.stationaryTimeoutId);
    if (this.motionCheckTimeoutId) clearTimeout(this.motionCheckTimeoutId);
    this.stopSimulation();
    this.notifyStateChange();
  }

  /**
   * Core signal processing algorithm executed on each DeviceMotionEvent
   */
  private handleDeviceMotionEvent(event: DeviceMotionEvent): void {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) {
      return;
    }

    const x = acc.x;
    const y = acc.y;
    const z = acc.z;
    const now = performance.now();

    // 1. Calculate 3D Euclidean magnitude ||a|| = sqrt(x^2 + y^2 + z^2)
    const rawMagnitude = Math.sqrt(x * x + y * y + z * z);

    // Filter out crazy hardware sensor spikes / NaN
    if (!isFinite(rawMagnitude) || rawMagnitude > 50) return;

    // 2. Estimate gravity using Low-Pass Filter (LPF)
    // alpha = 0.85 separates static gravity vector (approx 9.8 m/s^2)
    const alpha = 0.85;
    this.gravityEstimate = alpha * this.gravityEstimate + (1 - alpha) * rawMagnitude;

    // 3. High-Pass Residual: Dynamic acceleration caused by user movement
    const dynamicAcc = rawMagnitude - this.gravityEstimate;

    // 4. Low-pass smoothing on dynamic acceleration to eliminate high-frequency motor noise/tremor
    const beta = 0.65;
    this.smoothedLinearAcc = beta * this.smoothedLinearAcc + (1 - beta) * dynamicAcc;

    // Process step kinematics
    this.processKinematics(this.smoothedLinearAcc, rawMagnitude, now);
  }

  /**
   * Kinematic peak-valley detection with periodic gait cadence validation
   */
  private processKinematics(smoothedValue: number, rawMagnitude: number, timestamp: number): void {
    let isPeak = false;

    // 1. Track trough (foot plant / deceleration phase)
    if (smoothedValue < this.DYNAMIC_TROUGH_THRESHOLD) {
      this.lastTroughTime = timestamp;
      this.isSearchingForTrough = false;
    }

    // 2. Track peak (toe push-off / impact phase)
    if (smoothedValue > this.DYNAMIC_PEAK_THRESHOLD) {
      // Check if this is the crest of a peak
      if (smoothedValue > this.lastPeakValue) {
        this.lastPeakValue = smoothedValue;
      }
    } else if (this.lastPeakValue > this.DYNAMIC_PEAK_THRESHOLD) {
      // We just passed the apex of the peak!
      isPeak = true;
      const intervalSinceLastPeak = timestamp - this.lastPeakTime;
      const peakMagnitude = this.lastPeakValue;
      this.lastPeakValue = 0; // reset for next wave

      // Biomechanical validation:
      // Gait interval must be between 270ms (~222 steps/min sprint) and 1400ms (~43 steps/min slow walk)
      const isValidInterval =
        intervalSinceLastPeak >= this.MIN_STEP_INTERVAL_MS &&
        intervalSinceLastPeak <= this.MAX_STEP_INTERVAL_MS;

      // Must have had a trough within reasonable proximity (cyclical motion, not steady centrifugal force)
      const hasRecentTrough = timestamp - this.lastTroughTime < 1100;

      if (isValidInterval && hasRecentTrough) {
        this.evaluateGaitCandidate({
          timestamp,
          peakValue: peakMagnitude,
          interval: intervalSinceLastPeak,
        });
        this.lastPeakTime = timestamp;
      } else if (intervalSinceLastPeak > this.MAX_STEP_INTERVAL_MS) {
        // First movement after being stationary
        this.lastPeakTime = timestamp;
        this.unconfirmedStrides = [{ timestamp, peakValue: peakMagnitude, interval: 0 }];
      }
    }

    // Record sample for live monitor
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
    this.notifySample(sample);

    // Keep reset timer alive for stationary idle detection
    if (Math.abs(smoothedValue) > 0.4) {
      this.touchStationaryWatchdog();
    }
  }

  /**
   * Stride confirmation: Prevents single bumps, car bumps, or desk nudges
   * from registering as walking steps. Requires consecutive periodic strides.
   */
  private evaluateGaitCandidate(candidate: GaitCandidate): void {
    const now = Date.now();
    const interval = candidate.interval;

    // Calculate instantaneous cadence: spm = 60,000 / interval_ms
    const instantSpm = Math.round(60000 / interval);

    if (this.isActivelyWalking) {
      // User is already in confirmed walking rhythm: Count this step immediately
      this.registerStep(1, instantSpm, now);
    } else {
      // Add to unconfirmed buffer
      this.unconfirmedStrides.push(candidate);

      // Check if we reached required rhythmic cadence confirmation
      if (this.unconfirmedStrides.length >= this.CONFIRMATION_STRIDE_COUNT) {
        // Verify cadence consistency (stride intervals shouldn't fluctuate by > 45%)
        const intervals = this.unconfirmedStrides
          .slice(1)
          .map((s) => s.interval)
          .filter((i) => i > 0);

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const isRhythmic = intervals.every(
          (i) => Math.abs(i - avgInterval) / avgInterval < 0.45
        );

        if (isRhythmic) {
          // RHYTHM CONFIRMED! Transition to walking state
          this.isActivelyWalking = true;
          this.status = 'listening_walking';
          
          // Credit the buffered steps retroactively (just like native hardware pedometers do)
          const stepsToCredit = this.unconfirmedStrides.length;
          const avgSpm = Math.round(60000 / avgInterval);
          this.registerStep(stepsToCredit, avgSpm, now);
          this.unconfirmedStrides = [];
        } else {
          // Inconsistent/random vibration: drop oldest stride candidate
          this.unconfirmedStrides.shift();
        }
      }
    }

    this.touchStationaryWatchdog();
  }

  /**
   * Commits detected steps to total count and notifies listeners
   */
  private registerStep(count: number, cadence: number, timestamp: number): void {
    this.totalStepsToday += count;
    this.currentSessionSteps += count;
    this.cadenceSpm = Math.min(Math.max(cadence, 40), 220);
    this.lastStepTimestamp = timestamp;

    // Notify step subscribers
    this.onStepListeners.forEach((listener) => {
      try {
        listener(this.totalStepsToday, this.cadenceSpm);
      } catch (err) {
        console.error('Step listener error:', err);
      }
    });

    this.notifyStateChange();
  }

  /**
   * Watchdog timer to automatically shift to stationary mode when motion stops
   * Saves CPU and battery while stationary
   */
  private touchStationaryWatchdog(): void {
    if (this.stationaryTimeoutId) {
      clearTimeout(this.stationaryTimeoutId);
    }

    this.stationaryTimeoutId = window.setTimeout(() => {
      if (this.isActivelyWalking || this.status === 'listening_walking') {
        this.isActivelyWalking = false;
        this.cadenceSpm = 0;
        this.unconfirmedStrides = [];
        this.status = 'listening_stationary';
        this.notifyStateChange();
      }
    }, this.STATIONARY_IDLE_TIMEOUT_MS);
  }

  /**
   * Desktop Testing Lab:
   * Enables simulating authentic rhythmic sinusoidal walking acceleration
   * so developers on desktop can test and verify the exact peak detection algorithm.
   */
  public startDesktopMotionSimulator(simulatedCadenceSpm: number = 105): void {
    this.stopSimulation();
    this.isSimulatedDesktop = true;
    this.status = 'listening_stationary';
    this.isListening = true;
    this.notifyStateChange();

    const sampleRateHz = 50; // 50 Hz motion sampling
    const intervalMs = 1000 / sampleRateHz;
    let t = 0;
    const strideFrequencyHz = simulatedCadenceSpm / 60; // e.g. 1.75 Hz

    this.simulationIntervalId = window.setInterval(() => {
      t += intervalMs / 1000;
      // Realistic human walking acceleration model:
      // Vertical sinusoidal acceleration + secondary harmonic toe-strike + slight noise
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

  // --- State and Event Subscription ---

  public setTodaySteps(steps: number): void {
    this.totalStepsToday = steps;
    this.notifyStateChange();
  }

  public getState(): StepEngineState {
    return {
      sensorStatus: this.status,
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

  public getRecentSamples(): MotionSample[] {
    return [...this.recentSamples];
  }

  public subscribeToSteps(cb: StepCallback): () => void {
    this.onStepListeners.add(cb);
    return () => this.onStepListeners.delete(cb);
  }

  public subscribeToStateChange(cb: StateChangeCallback): () => void {
    this.onStateChangeListeners.add(cb);
    cb(this.getState());
    return () => this.onStateChangeListeners.delete(cb);
  }

  public subscribeToSamples(cb: MotionSampleCallback): () => void {
    this.onSampleListeners.add(cb);
    return () => this.onSampleListeners.delete(cb);
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.onStateChangeListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('State change listener error:', err);
      }
    });
  }

  private notifySample(sample: MotionSample): void {
    this.onSampleListeners.forEach((listener) => {
      try {
        listener(sample);
      } catch (err) {
        console.error('Sample listener error:', err);
      }
    });
  }

  public destroy(): void {
    this.stopListening();
    this.onStepListeners.clear();
    this.onStateChangeListeners.clear();
    this.onSampleListeners.clear();
  }
}

// Global singleton instance for clean app-wide state consistency
let engineInstance: StepDetectionEngine | null = null;

export function getStepEngine(initialSteps: number = 0): StepDetectionEngine {
  if (!engineInstance) {
    engineInstance = new StepDetectionEngine(initialSteps);
  }
  return engineInstance;
}
