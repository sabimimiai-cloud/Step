import { IPedometerProvider, PedometerStepUpdate, StepUpdateCallback, StateChangeCallback, MotionSampleCallback } from './IPedometerProvider';
import { PedometerCapabilities, PedometerProviderType, SensorStatus, StepEngineState } from '../../types';

declare global {
  interface Window {
    AndroidPedometer?: {
      isAvailable: () => boolean;
      requestPermission: () => void;
      startTracking: () => void;
      stopTracking: () => void;
      getTodaySteps: () => number;
    };
  }
}

export class NativeAndroidSensorProvider implements IPedometerProvider {
  public readonly providerType: PedometerProviderType = 'android_sensor';
  public readonly capabilities: PedometerCapabilities = {
    supportsBackgroundTracking: true,
    supportsHardwarePedometer: true,
    supportsHistoricalCoprocessorQuery: false,
    sensorName: 'Android Sensor.TYPE_STEP_COUNTER',
    platformDescription: 'Android Hardware Step Counter via Health Foreground Service',
  };

  private status: SensorStatus = 'unsupported';
  private isListening = false;
  private totalStepsToday = 0;
  private currentSessionSteps = 0;
  private cadenceSpm = 0;
  private lastStepTimestamp = 0;

  private onStepCallback: StepUpdateCallback | null = null;
  private onStateCallback: StateChangeCallback | null = null;

  constructor(initialSteps: number = 0) {
    this.totalStepsToday = initialSteps;
  }

  public async initialize(): Promise<boolean> {
    const hasAndroidInterface = Boolean(window.AndroidPedometer?.isAvailable?.());

    if (hasAndroidInterface) {
      this.status = 'listening_stationary';
      this.notifyState();
      return true;
    }

    this.status = 'unsupported';
    this.capabilities.limitationNotice =
      'Native Android Health Foreground Service bridge is not active. Background step counting cannot execute in this web browser session without the Android native container.';
    this.notifyState();
    return false;
  }

  public async requestPermission(): Promise<boolean> {
    if (window.AndroidPedometer) {
      try {
        window.AndroidPedometer.requestPermission();
        this.status = 'listening_stationary';
        this.notifyState();
        return true;
      } catch (err) {
        console.error('Android step counter permission error:', err);
        this.status = 'error';
        this.notifyState();
        return false;
      }
    }
    return false;
  }

  public async startTracking(
    onStep: StepUpdateCallback,
    onState: StateChangeCallback,
    _onSample?: MotionSampleCallback
  ): Promise<void> {
    this.onStepCallback = onStep;
    this.onStateCallback = onState;

    if (window.AndroidPedometer) {
      this.isListening = true;
      this.status = 'listening_stationary';
      this.notifyState();
      window.AndroidPedometer.startTracking();

      // Setup window event listener for native step events
      window.addEventListener('android_pedometer_step', ((e: CustomEvent<{ steps: number; cadence: number }>) => {
        const steps = e.detail.steps || 0;
        const cadence = e.detail.cadence || 0;
        const now = Date.now();

        this.totalStepsToday = steps;
        this.cadenceSpm = cadence;
        this.lastStepTimestamp = now;
        this.status = cadence > 0 ? 'listening_walking' : 'listening_stationary';

        if (this.onStepCallback) {
          this.onStepCallback({
            totalStepsToday: this.totalStepsToday,
            cadenceSpm: this.cadenceSpm,
            timestamp: now,
            isBackgroundUpdate: true,
          });
        }
        this.notifyState();
      }) as EventListener);
    }
  }

  public async stopTracking(): Promise<void> {
    this.isListening = false;
    this.status = 'listening_stationary';
    if (window.AndroidPedometer) {
      window.AndroidPedometer.stopTracking();
    }
    this.notifyState();
  }

  public getState(): StepEngineState {
    return {
      sensorStatus: this.status,
      providerType: this.providerType,
      capabilities: this.capabilities,
      isSupported: this.status !== 'unsupported',
      permissionState: this.status === 'permission_denied' ? 'denied' : 'granted',
      isListening: this.isListening,
      cadenceSpm: this.cadenceSpm,
      lastStepTimestamp: this.lastStepTimestamp,
      totalStepsToday: this.totalStepsToday,
      currentSessionSteps: this.currentSessionSteps,
      isActivelyWalking: this.cadenceSpm > 0,
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
