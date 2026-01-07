'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Play, TrendingUp, Calendar, ArrowRight, Plus, Utensils, User, Edit2, MoreVertical, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { format } from 'date-fns';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Dashboard() {
  const { schemas, history, startWorkout, activeWorkout, nutritionLogs, deleteSchema } = useData()
  const { user } = useAuth()
  const router = useRouter()
  const [schemaMenuOpen, setSchemaMenuOpen] = React.useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)

  const totalWorkouts = history.length;

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysLog = nutritionLogs.find(l => l.date === today);
  const totalCalories = todaysLog ? todaysLog.items.reduce((acc, i) => acc + i.calories, 0) : 0;

  const handleStartSchema = (schemaId: string) => {
    const schema = schemas.find(s => s.id === schemaId);
    if (schema) {
      startWorkout(schema);
      router.push('/workout');
    }
  };

  const handleQuickStart = () => {
    startWorkout();
    router.push('/workout');
  };

  const handleDeleteSchema = (schemaId: string) => {
    deleteSchema(schemaId)
    setDeleteConfirmId(null)
    setSchemaMenuOpen(null)
  };

  return (
    <div className="p-6 pb-24 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <h2 className="text-muted-foreground text-sm uppercase tracking-widest mb-1">Fitness Tracker</h2>
          <h1 className="text-4xl font-black italic tracking-tighter">NEXT <span className="text-primary">•</span> REP</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={() => router.push('/settings')}
            className="group relative"
          >
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="h-12 w-12 rounded-full border-2 border-primary/50 shadow-lg hover:scale-105 transition-transform object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform border-2 border-white/20">
                <User size={24} className="text-background" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 rounded-full border-2 border-background"></div>
          </button>
          <p className="text-xs text-muted-foreground max-w-[120px] truncate">{user?.email}</p>
        </div>
      </motion.div>

      {/* Active Workout Banner */}
      {activeWorkout && (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-primary to-accent p-1 rounded-2xl shadow-xl shadow-primary/20 cursor-pointer"
          onClick={() => router.push('/workout')}
        >
          <div className="bg-background/90 backdrop-blur-sm p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wide mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Workout in Progress
              </div>
              <h3 className="text-xl font-bold">{activeWorkout.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Started {format(activeWorkout.startTime, 'h:mm a')}
              </p>
            </div>
            <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
              <Play fill="currentColor" size={20} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Overview */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4"
      >
        <motion.div variants={item} className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-2">
            <TrendingUp size={14} /> Total Workouts
          </div>
          <div className="text-3xl font-black tabular-nums">{totalWorkouts}</div>
        </motion.div>
        
        {/* Nutrition Card - New! */}
        <motion.div 
          variants={item} 
          onClick={() => router.push('/nutrition')}
          className="bg-card border border-border p-4 rounded-2xl cursor-pointer hover:shadow-md transition-all group relative overflow-hidden shadow-sm"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Utensils size={40} />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-2 relative z-10">
            <Utensils size={14} /> Nutrition Today
          </div>
          <div className="text-3xl font-black tabular-nums text-pink-500 relative z-10">
            {totalCalories} <span className="text-sm font-medium text-muted-foreground">kcal</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Start Schemas */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Play size={20} className="text-primary" /> Start Workout
          </h3>
          <button 
            onClick={handleQuickStart}
            className="text-xs font-bold text-primary uppercase tracking-wide hover:underline"
          >
            Freestyle
          </button>
        </div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-3"
        >
          {schemas.map((schema) => (
            <motion.div
              key={schema.id}
              variants={item}
              whileTap={{ scale: 0.98 }}
              className="group relative bg-card border border-border p-5 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all shadow-sm"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${schema.color || 'from-zinc-800 to-zinc-900'} opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl`} />
              
              {/* Menu Button */}
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSchemaMenuOpen(schemaMenuOpen === schema.id ? null : schema.id)
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <MoreVertical size={18} className="text-muted-foreground" />
                </button>

                {/* Dropdown Menu */}
                {schemaMenuOpen === schema.id && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setSchemaMenuOpen(null)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/schema?edit=${schema.id}`)
                          setSchemaMenuOpen(null)
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <Edit2 size={16} className="text-primary" />
                        <span className="font-medium">Edit Schema</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartSchema(schema.id)
                          setSchemaMenuOpen(null)
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <Play size={16} className="text-primary" />
                        <span className="font-medium">Start Workout</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(schema.id)
                          setSchemaMenuOpen(null)
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-destructive/10 transition-colors text-left border-t border-white/5"
                      >
                        <Trash2 size={16} className="text-destructive" />
                        <span className="font-medium text-destructive">Delete Schema</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div 
                onClick={() => handleStartSchema(schema.id)}
                className="flex justify-between items-center relative z-10 cursor-pointer"
              >
                <div className="flex-1 pr-4">
                  <h4 className="font-bold text-lg mb-1">{schema.name}</h4>
                  <p className="text-sm text-muted-foreground flex gap-2">
                    {schema.exercises.length} Exercises
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-muted/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors mr-12">
                  <Play fill="currentColor" size={18} className="ml-1" />
                </div>
              </div>
            </motion.div>
          ))}
          
          <motion.div
            variants={item}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/schema')}
            className="border border-dashed border-border p-4 rounded-2xl flex items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:bg-muted/5 hover:text-foreground transition-colors shadow-sm"
          >
            <Plus size={18} /> Create New Schema
          </motion.div>
        </motion.div>
      </div>

      {/* Recent History */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calendar size={20} className="text-primary" /> Recent
          </h3>
          <button 
            onClick={() => router.push('/history')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-muted/5 rounded-2xl border border-border">
            No workouts logged yet. Time to crush it!
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 3).map((log) => (
              <div 
                key={log.id} 
                className="bg-card p-4 rounded-xl border border-border shadow-sm flex justify-between items-center hover:border-primary/50 transition-colors group"
              >
                <div 
                  onClick={() => router.push(`/workout/${log.id}`)}
                  className="flex-1 cursor-pointer"
                >
                  <h4 className="font-bold">{log.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.date), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono font-bold text-accent">
                      {log.exercises.length} Ex
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/workout/${log.id}?edit=true`)
                    }}
                    className="p-2 hover:bg-primary/20 rounded-lg transition-all duration-200"
                    title="Edit workout"
                  >
                    <Edit2 size={18} className="text-primary" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl p-6 shadow-2xl z-[110] max-w-sm w-[90%]">
            <h3 className="text-xl font-bold mb-2">Delete Schema?</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this workout schema? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSchema(deleteConfirmId)}
                className="flex-1 px-4 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
