'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Ruler, Scale, Plus, Trash2, TrendingUp, User, Dumbbell, Award, TrendingDown, Minus, Activity, BarChart3, AlertCircle, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData, BodyStats } from '@/components/context/DataContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import FitnessCalculator from '@/components/FitnessCalculator'
import Sparkline from '@/components/Sparkline'
import { roundTo } from '@/components/utils/workoutCalculations'
import {
  getMostFrequentExercises,
  calculateStrengthScore,
  getRecentPRs,
  calculatePeriodProgress,
  detectPlateau,
  getSparklineData
} from '@/components/utils/strengthAnalytics'

export default function Progress() {
  const { bodyStats, addBodyStats, deleteBodyStats, history } = useData();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'strength'>('strength');
  const [periodFilter, setPeriodFilter] = useState<28 | 90 | 180 | 365>(90);

  // Form State
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [chest, setChest] = useState('');
  const [biceps, setBiceps] = useState('');
  const [waist, setWaist] = useState('');

  const handleSave = () => {
    const newStats: BodyStats = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      weight: weight ? Number(weight) : undefined,
      height: height ? Number(height) : undefined,
      age: age ? Number(age) : undefined,
      chest: chest ? Number(chest) : undefined,
      biceps: biceps ? Number(biceps) : undefined,
      waist: waist ? Number(waist) : undefined,
    };
    
    addBodyStats(newStats);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setWeight('');
    setHeight('');
    setAge('');
    setChest('');
    setBiceps('');
    setWaist('');
  };

  const chartData = [...bodyStats].reverse().map(stat => ({
    date: format(new Date(stat.date), 'MM/dd'),
    weight: stat.weight,
    biceps: stat.biceps,
    chest: stat.chest
  }));

  const latestStats = bodyStats[0];

  const frequentExercises = useMemo(() => 
    getMostFrequentExercises(history, 6), 
    [history]
  );

  const strengthScore = useMemo(() => 
    calculateStrengthScore(history), 
    [history]
  );

  const recentPRs = useMemo(() => 
    getRecentPRs(history, 30), 
    [history]
  );

  const exerciseProgress = useMemo(() => {
    return frequentExercises.map(exerciseName => {
      const progress = calculatePeriodProgress(exerciseName, history, periodFilter);
      const plateau = detectPlateau(exerciseName, history);
      const sparkline = getSparklineData(exerciseName, history, 10);
      
      return {
        exerciseName,
        ...progress,
        plateau,
        sparkline
      };
    });
  }, [frequentExercises, history, periodFilter]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg">My Progress</h1>
          <button 
            onClick={() => setIsAdding(true)}
            className="p-2 -mr-2 text-primary hover:text-primary/80"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => setActiveTab('strength')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'strength' 
                ? 'bg-primary text-background shadow-lg shadow-primary/20' 
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            <Dumbbell size={16} />
            Kracht
          </button>
          <button
            onClick={() => setActiveTab('body')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'body' 
                ? 'bg-primary text-background shadow-lg shadow-primary/20' 
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            <Scale size={16} />
            Lichaam
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'strength' && (
          <motion.div
            key="strength"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {history.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <Dumbbell size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="font-bold text-muted-foreground">Nog geen workouts</h3>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Voltooi je eerste workout om je krachtvoortgang te volgen
                </p>
              </div>
            ) : (
              <>
                {strengthScore.lifts.length > 0 && (
                  <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={24} className="text-primary" />
                      <h3 className="font-bold text-lg">Total Krachtscore</h3>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-black text-primary">
                        {Math.round(strengthScore.total)}
                      </span>
                      <span className="text-lg text-muted-foreground font-bold">KG</span>
                    </div>
                    {strengthScore.previousTotal !== null && (
                      <div className={`text-sm font-bold flex items-center gap-1 ${
                        strengthScore.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {strengthScore.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {strengthScore.change >= 0 ? '+' : ''}{roundTo(strengthScore.change, 0.5)}kg
                        <span className="text-muted-foreground ml-1">
                          ({strengthScore.percentageChange >= 0 ? '+' : ''}{strengthScore.percentageChange.toFixed(1)}% laatste maand)
                        </span>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                      {strengthScore.lifts.map(lift => (
                        <div key={lift.name} className="flex justify-between">
                          <span className="text-muted-foreground">{lift.name}:</span>
                          <span className="font-bold">{roundTo(lift.oneRM, 0.5)}kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { days: 28, label: '4 Weken' },
                    { days: 90, label: '3 Maanden' },
                    { days: 180, label: '6 Maanden' },
                    { days: 365, label: '1 Jaar' }
                  ].map(period => (
                    <button
                      key={period.days}
                      onClick={() => setPeriodFilter(period.days as any)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                        periodFilter === period.days
                          ? 'bg-primary text-background'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <BarChart3 size={16} />
                    Voortgang per Exercise
                  </h3>
                  
                  {exerciseProgress.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-xl">
                      <p className="text-muted-foreground text-sm">Geen exercises gevonden voor deze periode</p>
                    </div>
                  ) : (
                    exerciseProgress.map(ex => (
                      <motion.div
                        key={ex.exerciseName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-white/5 rounded-2xl p-5 hover:border-primary/20 transition-all cursor-pointer"
                        onClick={() => router.push(`/exercise-progress?name=${encodeURIComponent(ex.exerciseName)}`)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg">{ex.exerciseName}</h4>
                          {ex.plateau.isPlateaued && (
                            <div className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full">
                              <AlertCircle size={12} />
                              Plateau
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Huidige 1RM</div>
                            <div className="text-2xl font-black text-primary">
                              {ex.current1RM ? roundTo(ex.current1RM, 0.5) : '--'}
                              <span className="text-sm text-muted-foreground ml-1">kg</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Progressie</div>
                            <div className={`text-2xl font-black ${
                              ex.change > 0 ? 'text-green-500' :
                              ex.change < 0 ? 'text-red-500' :
                              'text-muted-foreground'
                            }`}>
                              {ex.previous1RM ? (
                                <>
                                  {ex.change >= 0 ? '+' : ''}{roundTo(ex.change, 0.5)}
                                  <span className="text-sm ml-1">kg</span>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Nieuw</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <Sparkline 
                            data={ex.sparkline} 
                            width={280} 
                            height={32}
                            color={ex.change >= 0 ? '#10b981' : '#ef4444'}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
                          <div className="flex items-center gap-1">
                            {ex.trend === 'increasing' ? (
                              <><TrendingUp size={12} className="text-green-500" /> <span className="text-green-500">Stijgend</span></>
                            ) : ex.trend === 'decreasing' ? (
                              <><TrendingDown size={12} className="text-red-500" /> <span className="text-red-500">Dalend</span></>
                            ) : (
                              <><Minus size={12} /> <span>Stabiel</span></>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            {ex.workoutCount} workouts
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {recentPRs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Award size={16} />
                      Recente PR's (30 dagen)
                    </h3>
                    <div className="space-y-2">
                      {recentPRs.slice(0, 5).map((pr, idx) => (
                        <motion.div
                          key={`${pr.exerciseName}-${pr.date}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <Award size={18} className="text-primary" />
                            </div>
                            <div>
                              <div className="font-bold text-sm">{pr.exerciseName}</div>
                              <div className="text-xs text-muted-foreground">
                                {pr.weight}kg × {pr.reps} reps • {pr.daysAgo === 0 ? 'Vandaag' : `${pr.daysAgo} dagen geleden`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-lg text-primary">{roundTo(pr.oneRM, 0.5)}kg</div>
                            <div className="text-[10px] text-muted-foreground uppercase">1RM</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
                  <Activity size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-600 leading-relaxed">
                    <strong>Opmerking:</strong> Krachtvoortgang is gebaseerd op geschatte 1RM waarden. 
                    Factoren zoals techniek, vermoeidheid en herstel beïnvloeden prestaties. 
                    Gebruik deze data als richtlijn voor je progressie.
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'body' && (
          <motion.div
            key="body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="w-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-2xl p-4 flex items-center justify-between hover:from-primary/30 hover:to-accent/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <TrendingUp size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Fitness Calculator</div>
                  <div className="text-xs text-muted-foreground">BMI, caloriebehoefte & meer</div>
                </div>
              </div>
              <div className={`transform transition-transform ${showCalculator ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </button>

            <AnimatePresence>
              {showCalculator && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <FitnessCalculator />
                </motion.div>
              )}
            </AnimatePresence>
            
            {latestStats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Scale size={48} />
                  </div>
                  <div className="text-xs uppercase font-bold text-muted-foreground mb-1">Current Weight</div>
                  <div className="text-3xl font-black tabular-nums text-primary">
                    {latestStats.weight || '--'} <span className="text-sm font-normal text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="bg-card border border-white/5 p-4 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Ruler size={48} />
                  </div>
                  <div className="text-xs uppercase font-bold text-muted-foreground mb-1">Height</div>
                  <div className="text-3xl font-black tabular-nums">
                    {latestStats.height || '--'} <span className="text-sm font-normal text-muted-foreground">cm</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <User size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="font-bold text-muted-foreground">No stats tracked yet</h3>
                <p className="text-xs text-muted-foreground/60 mt-1">Tap + to add your first measurement</p>
              </div>
            )}

            {chartData.length > 1 && (
              <div className="space-y-6">
                <div className="h-64 w-full">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" /> Weight Trend
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        dot={{ fill: '#f59e0b', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Measurement History</h3>
              <AnimatePresence>
                {bodyStats.map((stat) => (
                  <motion.div
                    key={stat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-card border border-white/5 rounded-xl p-4 flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold text-lg flex items-center gap-2">
                        {format(new Date(stat.date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {stat.weight && <span className="flex items-center gap-1"><Scale size={10} /> {stat.weight}kg</span>}
                        {stat.chest && <span className="flex items-center gap-1">Chest: {stat.chest}cm</span>}
                        {stat.biceps && <span className="flex items-center gap-1">Biceps: {stat.biceps}cm</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteBodyStats(stat.id)}
                      className="p-2 text-red-500/60 md:opacity-0 md:group-hover:opacity-100 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setIsAdding(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-card border border-white/10 w-full max-w-md rounded-t-2xl max-h-[85vh] overflow-y-auto pb-32"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-card z-10 -mx-6 px-6 -mt-6 pt-6 pb-2">
                  <h2 className="text-xl font-bold">New Measurement</h2>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <span className="sr-only">Close</span>
                    <ArrowLeft className="rotate-[-90deg]" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground">Weight (kg)</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-white/5 rounded-lg px-3 py-3 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0.0"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground">Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-white/5 rounded-lg px-3 py-3 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground">Chest (cm)</label>
                    <input
                      type="number"
                      value={chest}
                      onChange={(e) => setChest(e.target.value)}
                      className="w-full bg-white/5 rounded-lg px-3 py-3 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground">Biceps (cm)</label>
                    <input
                      type="number"
                      value={biceps}
                      onChange={(e) => setBiceps(e.target.value)}
                      className="w-full bg-white/5 rounded-lg px-3 py-3 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground">Waist (cm)</label>
                    <input
                      type="number"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                      className="w-full bg-white/5 rounded-lg px-3 py-3 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-white/5 rounded-lg px-3 py-3 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!weight && !height && !chest}
                  className="w-full py-4 bg-primary text-background font-black text-lg uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                >
                  Save Entry
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
