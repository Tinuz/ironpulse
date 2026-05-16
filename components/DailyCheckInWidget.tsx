'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Check, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'
import { useData, BodyStats } from '@/components/context/DataContext'
import { BodyStatsSchema } from '@/lib/validationSchemas'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckInState {
  weight: string;
  biceps: string;
  waist: string;
  chest: string;
  sleepQuality: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => format(new Date(), 'yyyy-MM-dd');

function sevenDayHistory(bodyStats: BodyStats[]): { date: string; logged: boolean }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = format(d, 'yyyy-MM-dd');
    const logged = bodyStats.some(s => s.date.startsWith(dateStr));
    return { date: dateStr, logged };
  });
}

function rollingAvgWeight(bodyStats: BodyStats[], days = 7): number | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = bodyStats
    .filter(s => s.weight != null && new Date(s.date) >= cutoff)
    .map(s => s.weight as number);
  if (recent.length === 0) return null;
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function trendVsAvg(current: number, avg: number | null): 'up' | 'down' | 'stable' {
  if (avg === null) return 'stable';
  const diff = current - avg;
  if (diff > 0.3) return 'up';
  if (diff < -0.3) return 'down';
  return 'stable';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DailyCheckInWidget() {
  const { bodyStats, addBodyStats } = useData();

  const todayStr = today();
  const todayStat = useMemo(
    () => bodyStats.find(s => s.date.startsWith(todayStr)),
    [bodyStats, todayStr],
  );
  const hasLoggedToday = todayStat != null;

  const [form, setForm] = useState<CheckInState>({
    weight: todayStat?.weight?.toString() ?? '',
    biceps: todayStat?.biceps?.toString() ?? '',
    waist: todayStat?.waist?.toString() ?? '',
    chest: todayStat?.chest?.toString() ?? '',
    sleepQuality: todayStat?.sleepQuality ?? null,
  });
  const [showExtras, setShowExtras] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const weekDots = useMemo(() => sevenDayHistory(bodyStats), [bodyStats]);
  const avgWeight = useMemo(() => rollingAvgWeight(bodyStats), [bodyStats]);
  const trend = todayStat?.weight != null ? trendVsAvg(todayStat.weight, avgWeight) : 'stable';

  const streakCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = format(d, 'yyyy-MM-dd');
      if (bodyStats.some(s => s.date.startsWith(ds))) count++;
      else break;
    }
    return count;
  }, [bodyStats]);

  const handleSave = () => {
    setError(null);
    const candidate = {
      weight: form.weight ? Number(form.weight) : undefined,
      biceps: form.biceps ? Number(form.biceps) : undefined,
      waist: form.waist ? Number(form.waist) : undefined,
      chest: form.chest ? Number(form.chest) : undefined,
    };

    if (!candidate.weight) {
      setError('Vul minimaal je gewicht in.');
      return;
    }

    const result = BodyStatsSchema.safeParse(candidate);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Ongeldige waarden');
      return;
    }

    const newStats: BodyStats = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...result.data,
      sleepQuality: form.sleepQuality ?? undefined,
    };

    addBodyStats(newStats);
    setIsEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  const startEditing = () => {
    setForm({
      weight: todayStat?.weight?.toString() ?? '',
      biceps: todayStat?.biceps?.toString() ?? '',
      waist: todayStat?.waist?.toString() ?? '',
      chest: todayStat?.chest?.toString() ?? '',
      sleepQuality: todayStat?.sleepQuality ?? null,
    });
    setError(null);
    setIsEditing(true);
  };

  // ── Logged + not editing ─────────────────────────────────────────────────
  if (hasLoggedToday && !isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-green-500/20 rounded-2xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
              {justSaved
                ? <Check size={16} className="text-green-400" />
                : <Scale size={16} className="text-green-400" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-green-400">Ingecheckt vandaag</span>
                {streakCount > 1 && (
                  <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                    🔥 {streakCount}d streak
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {todayStat?.weight != null && (
                  <span className="font-bold text-foreground">{todayStat.weight} kg</span>
                )}
                {avgWeight != null && trend !== 'stable' && (
                  <span className={`flex items-center gap-0.5 ${trend === 'up' ? 'text-amber-400' : 'text-green-400'}`}>
                    {trend === 'up'
                      ? <TrendingUp size={11} />
                      : <TrendingDown size={11} />
                    }
                    {trend === 'up' ? '+' : ''}{(((todayStat?.weight ?? 0) - avgWeight)).toFixed(1)} vs 7d gem.
                  </span>
                )}
                {trend === 'stable' && avgWeight != null && (
                  <span className="flex items-center gap-0.5 text-zinc-500">
                    <Minus size={11} /> stabiel vs 7d gem.
                  </span>
                )}
                {todayStat?.sleepQuality != null && (
                  <span className="text-[10px]">
                    {['😫','😞','😐','😊','😴'][todayStat.sleepQuality - 1]} slaap {todayStat.sleepQuality}/5
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={startEditing}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            title="Aanpassen"
          >
            <Pencil size={14} />
          </button>
        </div>

        {/* Week streak dots */}
        <div className="flex gap-1.5 mt-3">
          {weekDots.map(day => (
            <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
              <div className={`h-1.5 w-full rounded-full ${day.logged ? 'bg-green-500' : 'bg-white/10'}`} />
              <span className="text-[8px] text-muted-foreground/50">
                {format(new Date(day.date), 'dd/MM')}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Not yet logged or editing ────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl p-4 border ${
        isEditing
          ? 'border-blue-500/30'
          : 'border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isEditing ? 'bg-blue-500/15' : 'bg-amber-500/15'
        }`}>
          <Scale size={16} className={isEditing ? 'text-blue-400' : 'text-amber-400'} />
        </div>
        <div className="flex-1">
          <div className={`font-bold text-sm ${isEditing ? 'text-blue-400' : 'text-amber-400'}`}>
            {isEditing ? 'Meting aanpassen' : 'Dagelijkse check-in'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {isEditing
              ? 'Pas je gewicht of metingen aan'
              : 'Log je gewicht om je voortgang bij te houden'}
          </div>
        </div>
        {isEditing && (
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Annuleren
          </button>
        )}
      </div>

      {/* Primary: weight input */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="number"
            value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Gewicht (kg)"
            step="0.1"
            min="20"
            max="400"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-muted-foreground/40"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">kg</span>
        </div>
        <button
          onClick={handleSave}
          disabled={!form.weight}
          className="px-4 py-2.5 rounded-xl bg-primary disabled:bg-white/10 disabled:text-muted-foreground text-primary-foreground font-bold text-sm transition-colors"
        >
          Sla op
        </button>
      </div>

      {/* Sleep quality selector */}
      <div className="mb-3">
        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Hoe heb je geslapen?</div>
        <div className="flex gap-2">
          {([1,2,3,4,5] as const).map(v => {
            const emojis = ['😫','😞','😐','😊','😴']
            const labels = ['Erg slecht','Slecht','Matig','Goed','Super']
            const active = form.sleepQuality === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => setForm(f => ({ ...f, sleepQuality: active ? null : v }))}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[9px] transition-colors',
                  active
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold'
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                )}
                title={labels[v-1]}
              >
                <span className="text-base leading-none">{emojis[v-1]}</span>
                <span>{v}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 mb-3 -mt-1">{error}</p>
      )}

      {/* Extra metingen toggle */}
      <button
        onClick={() => setShowExtras(!showExtras)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {showExtras ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        Extra metingen (biceps, middel, borst)
      </button>

      <AnimatePresence>
        {showExtras && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 mt-3">
              {([
                { key: 'biceps', label: 'Biceps', placeholder: '35' },
                { key: 'waist',  label: 'Middel', placeholder: '80' },
                { key: 'chest',  label: 'Borst',  placeholder: '95' },
              ] as const).map(field => (
                <div key={field.key}>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form[field.key]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      step="0.5"
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500/50"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none">cm</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Week streak dots */}
      <div className="flex gap-1.5 mt-4">
        {weekDots.map(day => (
          <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
            <div className={`h-1.5 w-full rounded-full ${day.logged ? 'bg-green-500' : 'bg-white/10'}`} />
            <span className="text-[8px] text-muted-foreground/50">
              {format(new Date(day.date), 'dd/MM')}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
