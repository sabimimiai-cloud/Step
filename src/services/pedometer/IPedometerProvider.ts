import { PedometerCapabilities, PedometerProviderType, SensorStatus, StepEngineState, MotionSample } from '../../types';

export interface PedometerStepUpdate {
  totalStepsToday: number;
  cadenceSpm: number;
  timestamp: number;
  isBackgroundUpdate?: boolean;
}

export type StepUpdateCallback = (update: PedometerStepUpdate) => void;
export type StateChangeCallback = (state: StepEngineState) => void;
export type MotionSampleCallback = (sample: MotionSample) => void;

export interface IPedometerProvider {
  readonly providerType: PedometerProviderType;
  readonly capabilities: PedometerCapabilities;

  /**
   * Initializes the provider and checks hardware / API availability
   */
  initialize(): Promise<boolean>;

  /**
   * Requests necessary OS or browser permissions (e.g. iOS CoreMotion / Web DeviceMotion / Android ACTIVITY_RECOGNITION)
   */
  requestPermission(): Promise<boolean>;

  /**
   * Starts live step tracking
   */
  startTracking(onStep: StepUpdateCallback, onState: StateChangeCallback, onSample?: MotionSampleCallback): Promise<void>;

  /**
   * Stops live step tracking to save battery
   */
  stopTracking(): Promise<void>;

  /**
   * Queries historical steps stored by the hardware coprocessor (e.g. CMPedometer.queryPedometerData)
   * Returns empty array if not supported by provider
   */
  queryHistoricalSteps?(startDate: Date, endDate: Date): Promise<{ date: string; steps: number }[]>;

  /**
   * Returns current internal state
   */
  getState(): StepEngineState;

  /**
   * Cleanup
   */
  destroy(): void;
}
