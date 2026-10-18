import { IPedometerProvider, PedometerStepUpdate, StepUpdateCallback, StateChangeCallback, MotionSampleCallback } from './IPedometerProvider';
import { PedometerCapabilities, PedometerProviderType, SensorStatus, StepEngineState } from '../../types';

// Declare standard iOS WebKit bridge interface
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        pedometer?: {
          postMessage: (message: unknown) => void;
        };
      };
    };
    Capacitor?: {
      isPluginAvailable: (name: string) => boolean;
      Plugins?: {
        Pedometer?: {
          isAvailable: () => Promise<{ available: boolean }>;
          requestPermissions: () => Promise<{ status: string }>;
          startPedometerUpdates: (callback: (data: { numberOfSteps: number; currentCadence?: number }) => void) => Promise<string>;
          stopPedometerUpdates: () => Promise<void>;
          queryPedometerData: (options: { start: string; end: string }) => Promise<{ steps: number }>;
        };
      };
    };
  }
}

export class NativeCoreMotionProvider implements IPedometerProvider {
  public readonly providerType: PedometerProviderType = 'ios_coremotion';
  public readonly capabilities: PedometerCapabilities = {
    supportsBackgroundTracking: true,
    supportsHardwarePedometer: true,
    supportsHistoricalCoprocessorQuery: true,
    sensorName: 'Apple CoreMotion (CMPedometer)',
    platformDescription: 'iOS Native Motion Coprocessor (M-Series)',
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
    // Check if running inside iOS Capacitor or Native WebKit container
    const hasCapacitor = Boolean(window.Capacitor?.isPluginAvailable?.('Pedometer'));
    const hasWebKitBridge = Boolean(window.webkit?.messageHandlers?.pedometer);

    if (hasCapacitor || hasWebKitBridge) {
      this.status = 'listening_stationary';
      this.notifyState();
      return true;
    }

    // In a standard browser, native iOS CoreMotion bridge is unavailable
    this.status = 'unsupported';
    this.capabilities.limitationNotice =
      'Native CoreMotion bridge is not active. This web session cannot access the Apple M-series coprocessor for background counting without the iOS native container.';
    this.notifyState();
    return false;
  }

  public async requestPermission(): Promise<boolean> {
    if (window.Capacitor?.Plugins?.Pedometer) {
      try {
        const result = await window.Capacitor.Plugins.Pedometer.requestPermissions();
        if (result.status === 'granted') {
          this.status = 'listening_stationary';
          this.notifyState();
          return true;
        } else {
          this.status = 'permission_denied';
          this.notifyState();
          return false;
        }
      } catch (err) {
        console.error('CoreMotion permission error:', err);
        this.status = 'error';
        this.notifyState();
        return false;
      }
    }

    // WebKit custom handler
    if (window.webkit?.messageHandlers?.pedometer) {
      window.webkit.messageHandlers.pedometer.postMessage({ action: 'requestAuthorization' });
      return true;
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

    if (window.Capacitor?.Plugins?.Pedometer) {
      this.isListening = true;
      this.status = 'listening_stationary';
      this.notifyState();

      await window.Capacitor.Plugins.Pedometer.startPedometerUpdates((data) => {
        const steps = data.numberOfSteps || 0;
        const cadence = Math.round((data.currentCadence || 0) * 60); // convert steps/sec to spm
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
      });
    }
  }

  public async stopTracking(): Promise<void> {
    this.isListening = false;
    this.status = 'listening_stationary';
    if (window.Capacitor?.Plugins?.Pedometer) {
      await window.Capacitor.Plugins.Pedometer.stopPedometerUpdates();
    }
    this.notifyState();
  }

  public async queryHistoricalSteps(startDate: Date, endDate: Date): Promise<{ date: string; steps: number }[]> {
    if (window.Capacitor?.Plugins?.Pedometer) {
      const result = await window.Capacitor.Plugins.Pedometer.queryPedometerData({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
      return [{ date: startDate.toISOString().split('T')[0], steps: result.steps }];
    }
    return [];
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
