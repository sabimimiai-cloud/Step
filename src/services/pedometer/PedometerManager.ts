import { IPedometerProvider, StepUpdateCallback, StateChangeCallback, MotionSampleCallback } from './IPedometerProvider';
import { NativeCoreMotionProvider } from './NativeCoreMotionProvider';
import { NativeAndroidSensorProvider } from './NativeAndroidSensorProvider';
import { WebDeviceMotionProvider } from './WebDeviceMotionProvider';
import { PedometerProviderType, StepEngineState, MotionSample } from '../../types';

export class PedometerManager {
  private activeProvider: IPedometerProvider;
  private currentStepsToday = 0;
  private onStepListeners: Set<StepUpdateCallback> = new Set();
  private onStateListeners: Set<StateChangeCallback> = new Set();
  private onSampleListeners: Set<MotionSampleCallback> = new Set();
  private samplesHistory: MotionSample[] = [];

  constructor(initialSteps: number = 0) {
    this.currentStepsToday = initialSteps;
    this.activeProvider = this.selectInitialProvider(initialSteps);
  }

  private selectInitialProvider(initialSteps: number): IPedometerProvider {
    // 1. Check for iOS Native Container (Capacitor or WebKit messageHandler)
    if (
      typeof window !== 'undefined' &&
      (Boolean(window.Capacitor?.isPluginAvailable?.('Pedometer')) ||
        Boolean(window.webkit?.messageHandlers?.pedometer))
    ) {
      return new NativeCoreMotionProvider(initialSteps);
    }

    // 2. Check for Android Native Container (Android JavascriptInterface)
    if (typeof window !== 'undefined' && Boolean(window.AndroidPedometer?.isAvailable?.())) {
      return new NativeAndroidSensorProvider(initialSteps);
    }

    // 3. Web Browser Fallback (Foreground Only)
    return new WebDeviceMotionProvider(initialSteps);
  }

  public async initialize(): Promise<void> {
    await this.activeProvider.initialize();
  }

  public async switchProvider(type: PedometerProviderType): Promise<void> {
    await this.activeProvider.stopTracking();
    this.activeProvider.destroy();

    switch (type) {
      case 'ios_coremotion':
        this.activeProvider = new NativeCoreMotionProvider(this.currentStepsToday);
        break;
      case 'android_sensor':
        this.activeProvider = new NativeAndroidSensorProvider(this.currentStepsToday);
        break;
      case 'web_accelerometer':
      default:
        this.activeProvider = new WebDeviceMotionProvider(this.currentStepsToday);
        break;
    }

    await this.activeProvider.initialize();
    this.bindProviderCallbacks();
  }

  public async startTracking(): Promise<void> {
    this.bindProviderCallbacks();
  }

  private bindProviderCallbacks(): void {
    this.activeProvider.startTracking(
      (update) => {
        this.currentStepsToday = update.totalStepsToday;
        this.onStepListeners.forEach((fn) => fn(update));
      },
      (state) => {
        this.onStateListeners.forEach((fn) => fn(state));
      },
      (sample) => {
        this.samplesHistory.push(sample);
        if (this.samplesHistory.length > 60) this.samplesHistory.shift();
        this.onSampleListeners.forEach((fn) => fn(sample));
      }
    );
  }

  public async stopTracking(): Promise<void> {
    await this.activeProvider.stopTracking();
  }

  public async requestPermission(): Promise<boolean> {
    return await this.activeProvider.requestPermission();
  }

  public getState(): StepEngineState {
    return this.activeProvider.getState();
  }

  public getRecentSamples(): MotionSample[] {
    return [...this.samplesHistory];
  }

  public getActiveProvider(): IPedometerProvider {
    return this.activeProvider;
  }

  public setTodaySteps(steps: number): void {
    this.currentStepsToday = steps;
    if (this.activeProvider instanceof WebDeviceMotionProvider) {
      this.activeProvider.setTodaySteps(steps);
    }
  }

  // Simulation controls (delegated if Web provider)
  public startSimulator(cadence: number = 105): void {
    if (this.activeProvider instanceof WebDeviceMotionProvider) {
      this.activeProvider.startDesktopMotionSimulator(cadence);
    }
  }

  public stopSimulator(): void {
    if (this.activeProvider instanceof WebDeviceMotionProvider) {
      this.activeProvider.stopSimulation();
    }
  }

  public onStep(cb: StepUpdateCallback): () => void {
    this.onStepListeners.add(cb);
    return () => this.onStepListeners.delete(cb);
  }

  public onState(cb: StateChangeCallback): () => void {
    this.onStateListeners.add(cb);
    cb(this.getState());
    return () => this.onStateListeners.delete(cb);
  }

  public onSample(cb: MotionSampleCallback): () => void {
    this.onSampleListeners.add(cb);
    return () => this.onSampleListeners.delete(cb);
  }
}

let managerInstance: PedometerManager | null = null;

export function getPedometerManager(initialSteps: number = 0): PedometerManager {
  if (!managerInstance) {
    managerInstance = new PedometerManager(initialSteps);
  }
  return managerInstance;
}
