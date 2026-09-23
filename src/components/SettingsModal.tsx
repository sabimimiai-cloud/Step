import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, Target, User, Ruler } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [goal, setGoal] = useState(profile.dailyGoal);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [strideLengthMeters, setStrideLengthMeters] = useState(profile.strideLengthMeters);
  const [useMetric, setUseMetric] = useState(profile.useMetric);

  if (!isOpen) return null;

  const quickGoals = [6000, 8000, 10000, 12000, 15000];

  const handleSave = () => {
    onSaveProfile({
      dailyGoal: Number(goal) || 10000,
      weightKg: Number(weightKg) || 70,
      strideLengthMeters: Number(strideLengthMeters) || 0.762,
      useMetric,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Step &amp; Calorie Settings</h2>
            <p className="text-xs text-zinc-400">Personalize step goals and physical calibration</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-6">
          {/* Daily Goal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Daily Step Goal</span>
              </label>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {goal.toLocaleString()} steps
              </span>
            </div>

            <input
              type="range"
              min="2000"
              max="30000"
              step="500"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-full accent-emerald-400 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />

            {/* Quick Presets */}
            <div className="flex gap-1.5 mt-2.5">
              {quickGoals.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setGoal(q)}
                  className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                    goal === q
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {q >= 1000 ? `${q / 1000}k` : q}
                </button>
              ))}
            </div>
          </div>

          {/* Unit System */}
          <div>
            <label className="text-xs font-semibold text-zinc-200 block mb-2">Distance Units</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseMetric(true)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-colors ${
                  useMetric
                    ? 'bg-zinc-800 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                Metric (km / kg)
              </button>
              <button
                type="button"
                onClick={() => setUseMetric(false)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-colors ${
                  !useMetric
                    ? 'bg-zinc-800 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                Imperial (miles / lbs)
              </button>
            </div>
          </div>

          {/* Calorie & Stride Calibration */}
          <div className="space-y-4 pt-2 border-t border-zinc-800/80">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Body Weight</span>
                </span>
                <span className="font-mono text-zinc-200">{weightKg} kg</span>
              </div>
              <input
                type="range"
                min="40"
                max="160"
                step="1"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full accent-zinc-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500">Used for MET walking calorie calculation</span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Estimated Stride Length</span>
                </span>
                <span className="font-mono text-zinc-200">{(strideLengthMeters * 100).toFixed(0)} cm</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.1"
                step="0.02"
                value={strideLengthMeters}
                onChange={(e) => setStrideLengthMeters(Number(e.target.value))}
                className="w-full accent-zinc-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500">Avg adult stride is 76 cm (~2.5 ft)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
