import React, { useEffect, useRef, useState } from 'react';
import { MotionSample } from '../types';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface LiveSensorWaveformProps {
  samples: MotionSample[];
  cadenceSpm: number;
  isActivelyWalking: boolean;
}

export const LiveSensorWaveform: React.FC<LiveSensorWaveformProps> = ({
  samples,
  cadenceSpm,
  isActivelyWalking,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // Clear background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Draw dynamic threshold line (+1.35 m/s^2)
    // Scale factor: 1 m/s^2 = 18 pixels
    const scale = 16;
    const thresholdY = midY - 1.35 * scale;
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(width, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (samples.length < 2) return;

    // Draw smoothed dynamic acceleration wave
    ctx.lineWidth = 2;
    ctx.strokeStyle = isActivelyWalking ? '#34d399' : '#a1a1aa';
    ctx.beginPath();

    const stepX = width / Math.max(samples.length - 1, 1);

    samples.forEach((sample, i) => {
      const x = i * stepX;
      const y = midY - sample.filteredMagnitude * scale;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Highlight peaks that counted as step triggers
    samples.forEach((sample, i) => {
      if (sample.isPeak) {
        const x = i * stepX;
        const y = midY - sample.filteredMagnitude * scale;
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [samples, isOpen, isActivelyWalking]);

  const latestSample = samples[samples.length - 1];
  const currentMagnitude = latestSample ? latestSample.rawMagnitude.toFixed(2) : '9.81';
  const currentDynamic = latestSample ? latestSample.filteredMagnitude.toFixed(2) : '0.00';

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 mt-4">
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-300">Live Accelerometer Kinematics</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500">
              {currentMagnitude} m/s²
            </span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 font-mono">
              <div>
                Dynamic Acc: <span className="text-white">{currentDynamic}</span> m/s²
              </div>
              <div>
                Cadence: <span className="text-emerald-400">{cadenceSpm}</span> spm
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={340}
              height={100}
              className="w-full h-24 rounded-lg bg-zinc-950 border border-zinc-800"
            />

            <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-yellow-400 inline-block" />
                <span>Peak threshold (1.35)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>Confirmed footfall</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
