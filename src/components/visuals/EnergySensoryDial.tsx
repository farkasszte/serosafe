import { BatteryCharging, Moon, Zap } from 'lucide-react';

interface EnergySensoryDialProps {
  lang: 'hu' | 'en';
  energyLevel: number;
  sensoryBattery: number;
  sleepHours: number;
  wokeAtNight: boolean;
  onChangeEnergy: (val: number) => void;
  onChangeSensory: (val: number) => void;
  onChangeSleepHours: (val: number) => void;
  onToggleWokeAtNight: () => void;
}

const PCT_PRESETS = [25, 50, 75, 100] as const;
const SLEEP_PRESETS = [5, 6, 7, 8.5] as const;

export function EnergySensoryDial({
  lang,
  energyLevel,
  sensoryBattery,
  sleepHours,
  wokeAtNight,
  onChangeEnergy,
  onChangeSensory,
  onChangeSleepHours,
  onToggleWokeAtNight,
}: EnergySensoryDialProps) {
  const hu = lang === 'hu';

  const clampedEnergy = Math.max(0, Math.min(100, energyLevel));
  const clampedSensory = Math.max(0, Math.min(100, sensoryBattery));

  const energyStatus =
    clampedEnergy < 35
      ? hu
        ? 'Alacsony tartalék'
        : 'Low reserve'
      : clampedEnergy < 70
        ? hu
          ? 'Kiegyenlített'
          : 'Steady'
        : hu
          ? 'Magas tartalék'
          : 'High energy';

  const sensoryStatus =
    clampedSensory <= 30
      ? hu
        ? 'Csendes szünet ajánlott'
        : 'Quiet break recommended'
      : clampedSensory <= 65
        ? hu
          ? 'Mérsékelt terhelhetőség'
          : 'Moderate bandwidth'
        : hu
          ? 'Stabil kapacitás'
          : 'Steady capacity';

  return (
    <div data-no-swipe="true" className="widget-container">
      <div className="divide-y divide-border @[560px]:divide-y-0 grid grid-cols-1 @[560px]:grid-cols-3 @[560px]:gap-4">
        {/* 1. Testi energia — egységes Alvásidő-stílusú kártya */}
        <div className="py-3.5 first:pt-1 last:pb-1 @[560px]:p-4 @[560px]:first:pt-4 @[560px]:last:pb-4 @[560px]:rounded-2xl @[560px]:bg-surface-subtle/60 @[560px]:border @[560px]:border-border flex flex-col justify-between gap-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-ink">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-accent" aria-hidden="true" />
              {hu ? 'Testi energia' : 'Physical energy'}
            </span>
            <span className="tabular-nums font-bold text-ink">
              {clampedEnergy}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {PCT_PRESETS.map((pct) => {
              const isClose = Math.abs(clampedEnergy - pct) <= 12;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onChangeEnergy(pct)}
                  aria-pressed={clampedEnergy === pct}
                  className={`py-2 rounded-xl text-xs font-semibold border transition tabular-nums ${
                    isClose
                      ? 'bg-accent-soft text-accent-strong border-accent-border'
                      : 'bg-surface text-ink-muted border-border hover:border-border-strong'
                  }`}
                >
                  {pct}%
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={clampedEnergy}
            onChange={(e) => onChangeEnergy(Number(e.target.value))}
            aria-label={hu ? 'Testi energiaszint százalék' : 'Energy level percent'}
            className="w-full cursor-pointer"
          />

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-ink-muted">{hu ? 'Állapot' : 'Status'}</span>
            <span className="font-semibold text-ink">{energyStatus}</span>
          </div>
        </div>

        {/* 2. Szenzoros kapacitás — egységes Alvásidő-stílusú kártya */}
        <div className="py-3.5 first:pt-1 last:pb-1 @[560px]:p-4 @[560px]:first:pt-4 @[560px]:last:pb-4 @[560px]:rounded-2xl @[560px]:bg-surface-subtle/60 @[560px]:border @[560px]:border-border flex flex-col justify-between gap-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-ink">
            <span className="inline-flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4 text-secondary" aria-hidden="true" />
              {hu ? 'Szenzoros kapacitás' : 'Sensory capacity'}
            </span>
            <span
              className={`tabular-nums font-bold ${
                clampedSensory <= 30 ? 'text-warning-ink' : 'text-ink'
              }`}
            >
              {clampedSensory}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {PCT_PRESETS.map((pct) => {
              const isClose = Math.abs(clampedSensory - pct) <= 12;
              const lowActive = isClose && clampedSensory <= 30;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onChangeSensory(pct)}
                  aria-pressed={clampedSensory === pct}
                  className={`py-2 rounded-xl text-xs font-semibold border transition tabular-nums ${
                    lowActive
                      ? 'bg-warning-soft text-warning-ink border-warning-border'
                      : isClose
                        ? 'bg-accent-soft text-accent-strong border-accent-border'
                        : 'bg-surface text-ink-muted border-border hover:border-border-strong'
                  }`}
                >
                  {pct}%
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={clampedSensory}
            onChange={(e) => onChangeSensory(Number(e.target.value))}
            aria-label={hu ? 'Szenzoros kapacitás százalék' : 'Sensory capacity percent'}
            className="w-full cursor-pointer"
          />

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-ink-muted">{hu ? 'Ingertűrés' : 'Bandwidth'}</span>
            <span
              className={`font-semibold text-right ${
                clampedSensory <= 30 ? 'text-warning-ink' : 'text-ink'
              }`}
            >
              {sensoryStatus}
            </span>
          </div>
        </div>

        {/* 3. Alvásidő — egységes kártya referencia */}
        <div className="py-3.5 first:pt-1 last:pb-1 @[560px]:p-4 @[560px]:first:pt-4 @[560px]:last:pb-4 @[560px]:rounded-2xl @[560px]:bg-surface-subtle/60 @[560px]:border @[560px]:border-border flex flex-col justify-between gap-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-ink">
            <span className="inline-flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-secondary" aria-hidden="true" />
              {hu ? 'Alvásidő' : 'Sleep duration'}
            </span>
            <span className="tabular-nums font-bold text-ink">
              {sleepHours.toFixed(1)} {hu ? 'óra' : 'h'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {SLEEP_PRESETS.map((hrs) => {
              const isClose = Math.abs(sleepHours - hrs) < 0.4;
              return (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => onChangeSleepHours(hrs)}
                  aria-pressed={isClose}
                  className={`py-2 rounded-xl text-xs font-semibold border transition tabular-nums ${
                    isClose
                      ? 'bg-accent-soft text-accent-strong border-accent-border'
                      : 'bg-surface text-ink-muted border-border hover:border-border-strong'
                  }`}
                >
                  {hu
                    ? hrs === 8.5
                      ? '8+ óra'
                      : `${hrs} óra`
                    : hrs === 8.5
                      ? '8+ h'
                      : `${hrs} h`}
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={2}
            max={12}
            step={0.5}
            value={sleepHours}
            onChange={(e) => onChangeSleepHours(Number(e.target.value))}
            aria-label={hu ? 'Alvás órában' : 'Sleep in hours'}
            className="w-full cursor-pointer"
          />

          <label className="flex items-center justify-between gap-2 text-xs text-ink cursor-pointer">
            <span>{hu ? 'Éjjel többször felébredtem' : 'Woke up during the night'}</span>
            <input
              type="checkbox"
              checked={wokeAtNight}
              onChange={onToggleWokeAtNight}
              className="w-4 h-4 rounded border-border-strong"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
