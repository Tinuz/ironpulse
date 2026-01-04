'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Ruler, Scale, Plus, Trash2, TrendingUp, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData, BodyStats } from '@/components/context/DataContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

export default function Progress() {
  const { bodyStats, addBodyStats, deleteBodyStats } = useData();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

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

  // Prepare chart data (reversed to show chronological order)
  const chartData = [...bodyStats].reverse().map(stat => ({
    date: format(new Date(stat.date), 'MM/dd'),
    weight: stat.weight,
    biceps: stat.biceps,
    chest: stat.chest
  }));

  const latestStats = bodyStats[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
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

      <div className="p-4 max-w-2xl mx-auto space-y-8">
        
        {/* Current Stats Overview */}
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

        {/* Charts */}
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

        {/* History List */}
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
                  className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-card border border-white/10 w-full max-w-md rounded-2xl p-6 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">New Measurement</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <span className="sr-only">Close</span>
                  <ArrowLeft className="rotate-[-90deg]" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
