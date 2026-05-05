'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Droplet, Plus, Minus, Check } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export interface WaterWeekDay {
  date: string;       // ISO YYYY-MM-DD
  intake: number;     // ml
  target: number;     // ml
}

interface WaterTrackerProps {
  currentIntake: number;            // ml
  targetIntake?: number;            // ml — default 2000, pass weight*35 for personalised
  onAddWater: (amount: number) => void;
  onSubtractWater: (amount: number) => void;
  weekHistory?: WaterWeekDay[];     // last 7 days for streak dots
  drinksFromFoodMl?: number;        // ml from drink-type nutrition items (informational)
}

// Labelled presets — names users recognise
const PRESETS = [
  { label: 'Glas',       ml: 200 },
  { label: 'Beker',      ml: 330 },
  { label: 'Flesje',     ml: 500 },
  { label: 'Grote fles', ml: 750 },
] as const;

export default function WaterTracker({
  currentIntake,
  targetIntake = 2000,
  onAddWater,
  onSubtractWater,
  weekHistory,
  drinksFromFoodMl = 0,
}: WaterTrackerProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const percentage = Math.min((currentIntake / targetIntake) * 100, 100);
  const isGoalMet = currentIntake >= targetIntake;

  const handleAdd = (amount: number) => {
    onAddWater(amount);
    setLastAdded(amount);
    setCustomAmount('');
  };

  const handleUndo = () => {
    if (lastAdded !== null && currentIntake > 0) {
      onSubtractWater(lastAdded);
      setLastAdded(null);
    }
  };

  const handleCustomAdd = () => {
    const n = Number(customAmount);
    if (n > 0) handleAdd(n);
  };

  // Fill colour shifts: amber → blue → cyan as you approach / exceed goal
  const fillClass =
    percentage < 40  ? 'from-amber-500/70 to-amber-400/70' :
    percentage < 75  ? 'from-blue-600 to-blue-400' :
                       'from-blue-500 to-cyan-400';

  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4 space-y-4">

      {/* ── Header row ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Droplet className="text-blue-400" size={20} fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-base leading-tight">Hydratatie</span>
            <div className="flex items-center gap-2">
              {isGoalMet && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full"
                >
                  <Check size={10} /> Doel bereikt!
                </motion.span>
              )}
              <span className={`text-xl font-black tabular-nums ${isGoalMet ? 'text-cyan-400' : 'text-blue-400'}`}>
                {Math.round(percentage)}%
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {currentIntake} / {targetIntake} ml
            {drinksFromFoodMl > 0 && (
              <span className="ml-2 text-blue-400/60">+ {drinksFromFoodMl}ml via maaltijden</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────── */}
      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${fillClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* ── Quick-add presets ── always visible ────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map(({ label, ml }) => (
          <button
            key={ml}
            onClick={() => handleAdd(ml)}
            className="flex flex-col items-center py-2.5 px-1 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 border border-blue-500/20 rounded-xl transition-all"
          >
            <Plus size={14} className="text-blue-400 mb-0.5" />
            <span className="text-[11px] font-bold text-blue-400 leading-tight">{label}</span>
            <span className="text-[9px] text-blue-400/60 mt-0.5">{ml}ml</span>
          </button>
        ))}
      </div>

      {/* ── Custom input + undo row ─────────────────────────── */}
      <div className="flex gap-2">
        <input
          type="number"
          value={customAmount}
          onChange={e => setCustomAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCustomAdd()}
          placeholder="Eigen hoeveelheid (ml)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground/40"
          min="1"
          step="50"
        />
        <button
          onClick={handleCustomAdd}
          disabled={!customAmount || Number(customAmount) <= 0}
          className="px-3 py-2 rounded-xl bg-blue-500 disabled:bg-white/10 disabled:text-muted-foreground text-white font-bold transition-colors"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={handleUndo}
          disabled={lastAdded === null || currentIntake === 0}
          title={lastAdded ? `Ongedaan: −${lastAdded}ml` : 'Niets om ongedaan te maken'}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-red-400 transition-colors border border-white/10"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* ── 7-day streak dots ──────────────────────────────── */}
      {weekHistory && weekHistory.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            7-daagse streak
          </div>
          <div className="flex gap-1.5 justify-between">
            {weekHistory.slice(-7).map(day => {
              const pct = day.target > 0 ? day.intake / day.target : 0;
              const hasLog = day.intake > 0;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    title={`${format(new Date(day.date), 'd MMM', { locale: nl })}: ${day.intake}ml`}
                    className={`h-5 w-full max-w-[28px] rounded-md transition-colors ${
                      !hasLog        ? 'bg-white/5' :
                      pct >= 1       ? 'bg-cyan-400/80' :
                      pct >= 0.5     ? 'bg-blue-500/60' :
                                       'bg-blue-500/25'
                    }`}
                  />
                  <span className="text-[8px] text-muted-foreground">
                    {format(new Date(day.date), 'dd/MM')}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] text-zinc-600 mt-1">
            Groen = doel gehaald · Blauw = gedeeltelijk · Grijs = niet gelogd
          </div>
        </div>
      )}
    </div>
  );
}


