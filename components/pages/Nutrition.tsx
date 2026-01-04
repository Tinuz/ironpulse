'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Utensils, Flame, Droplet, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export default function Nutrition() {
  const router = useRouter()
  const { nutritionLogs, addMeal, deleteMeal } = useData()
  const [isAdding, setIsAdding] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysLog = nutritionLogs.find(l => l.date === today);
  const items = todaysLog ? todaysLog.items : [];

  const [newItem, setNewItem] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    type: 'food' as 'food' | 'drink'
  });

  const totals = items.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fats: acc.fats + item.fats,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const handleAdd = () => {
    if (!newItem.name || !newItem.calories) return;
    
    addMeal(today, {
      name: newItem.name,
      calories: Number(newItem.calories),
      protein: Number(newItem.protein) || 0,
      carbs: Number(newItem.carbs) || 0,
      fats: Number(newItem.fats) || 0,
      type: newItem.type
    });

    setNewItem({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      type: 'food'
    });
    setIsAdding(false);
  };

  const data = [
    { name: 'Protein', value: totals.protein * 4, color: '#ec4899' }, // Pink
    { name: 'Carbs', value: totals.carbs * 4, color: '#3b82f6' },    // Blue
    { name: 'Fats', value: totals.fats * 9, color: '#f59e0b' },      // Amber
  ];

  // Filter out zero values for chart
  const activeData = data.filter(d => d.value > 0);
  if (activeData.length === 0) {
    activeData.push({ name: 'Empty', value: 1, color: '#333' });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Nutrition Tracker</h1>
        </div>

        {/* Summary Card */}
        <div className="bg-card border border-white/5 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Calories Today</div>
              <div className="text-5xl font-black tabular-nums">{totals.calories}</div>
              <div className="text-xs text-muted-foreground mt-1">kcal consumed</div>
            </div>
            <div className="w-24 h-24 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={45}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {activeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <Flame size={16} className="text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-pink-500/10 p-3 rounded-xl border border-pink-500/20">
              <div className="text-[10px] text-pink-400 font-bold uppercase">Protein</div>
              <div className="text-xl font-bold">{totals.protein}g</div>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
              <div className="text-[10px] text-blue-400 font-bold uppercase">Carbs</div>
              <div className="text-xl font-bold">{totals.carbs}g</div>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <div className="text-[10px] text-amber-400 font-bold uppercase">Fats</div>
              <div className="text-xl font-bold">{totals.fats}g</div>
            </div>
          </div>
        </div>

        {/* Meals List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Today's Meals</h2>
            <button 
              onClick={() => setIsAdding(true)}
              className="text-primary text-sm font-bold uppercase tracking-wider flex items-center gap-1 hover:underline"
            >
              <Plus size={16} /> Add Meal
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-2xl"
              >
                <Utensils size={32} className="mx-auto mb-3 opacity-50" />
                <p>No meals logged today.</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-card border border-white/5 p-4 rounded-xl flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.type === 'drink' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {item.type === 'drink' ? <Droplet size={18} /> : <Utensils size={18} />}
                      </div>
                      <div>
                        <div className="font-bold">{item.name}</div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          <span>{item.calories} kcal</span>
                          <span className="text-pink-400/80">{item.protein}p</span>
                          <span className="text-blue-400/80">{item.carbs}c</span>
                          <span className="text-amber-400/80">{item.fats}f</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteMeal(today, item.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Meal Sheet */}
      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-white/10 rounded-t-3xl p-6 pb-safe-area"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Add Meal</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 text-muted-foreground">
                  <ArrowLeft size={24} className="-rotate-90" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Meal Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g., Chicken Rice Bowl"
                    className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Calories</label>
                    <input
                      type="number"
                      value={newItem.calories}
                      onChange={e => setNewItem({...newItem, calories: e.target.value})}
                      placeholder="0"
                      className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Type</label>
                    <div className="flex p-1 bg-background rounded-xl border border-white/10">
                      <button 
                        onClick={() => setNewItem({...newItem, type: 'food'})}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${newItem.type === 'food' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        Food
                      </button>
                      <button 
                        onClick={() => setNewItem({...newItem, type: 'drink'})}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${newItem.type === 'drink' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        Drink
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-pink-400 uppercase mb-1 block">Protein (g)</label>
                    <input
                      type="number"
                      value={newItem.protein}
                      onChange={e => setNewItem({...newItem, protein: e.target.value})}
                      placeholder="0"
                      className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-400 uppercase mb-1 block">Carbs (g)</label>
                    <input
                      type="number"
                      value={newItem.carbs}
                      onChange={e => setNewItem({...newItem, carbs: e.target.value})}
                      placeholder="0"
                      className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-400 uppercase mb-1 block">Fats (g)</label>
                    <input
                      type="number"
                      value={newItem.fats}
                      onChange={e => setNewItem({...newItem, fats: e.target.value})}
                      placeholder="0"
                      className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={!newItem.name || !newItem.calories}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={20} /> Add to Log
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
