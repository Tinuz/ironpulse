'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, Plus } from 'lucide-react'
import clsx from 'clsx'

interface WaterTrackerProps {
  currentIntake: number; // in ml
  targetIntake?: number; // in ml, default 2000ml
  onAddWater: (amount: number) => void;
}

export default function WaterTracker({ 
  currentIntake, 
  targetIntake = 2000, 
  onAddWater 
}: WaterTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const quickAmounts = [250, 500, 750];
  const percentage = Math.min((currentIntake / targetIntake) * 100, 100);
  const glassesCount = Math.floor(currentIntake / 250); // 1 glas = 250ml

  const handleAddWater = (amount: number) => {
    onAddWater(amount);
    setIsExpanded(false);
    setCustomAmount('');
  };

  return (
    <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Droplet className="text-blue-400" size={24} fill="currentColor" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Hydratatie</h3>
              <p className="text-xs text-muted-foreground">
                {currentIntake}ml / {targetIntake}ml
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-blue-400">
              {Math.round(percentage)}%
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {glassesCount} glazen
            </div>
          </div>
        </div>

        {/* Water bottle visualization */}
        <div className="mt-4 relative">
          {/* Bottle container */}
          <div className="h-48 w-24 mx-auto relative">
            {/* Bottle outline */}
            <div className="absolute inset-0 border-4 border-blue-400/30 rounded-lg rounded-t-3xl"></div>
            
            {/* Bottle cap */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-blue-400/20 border-2 border-blue-400/30 rounded-t-lg"></div>

            {/* Water fill with wave animation */}
            <div className="absolute inset-0 overflow-hidden rounded-lg rounded-t-3xl">
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400"
                initial={{ height: '0%' }}
                animate={{ height: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                {/* Wave effect */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-8 bg-blue-300/30"
                  animate={{
                    y: [-4, 4, -4],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'easeInOut'
                  }}
                  style={{
                    borderRadius: '50% 50% 0 0'
                  }}
                />
                
                {/* Bubbles */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-white/40 rounded-full"
                    style={{
                      left: `${20 + i * 30}%`,
                      bottom: '10%'
                    }}
                    animate={{
                      y: [-100, 20],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      delay: i * 0.7,
                      ease: 'easeOut'
                    }}
                  />
                ))}
              </motion.div>
            </div>

            {/* Measurement lines */}
            {[25, 50, 75].map((mark) => (
              <div
                key={mark}
                className="absolute left-0 right-0 flex items-center"
                style={{ bottom: `${mark}%` }}
              >
                <div className="h-px w-3 bg-blue-400/20"></div>
                <div className="flex-1"></div>
                <div className="text-[10px] text-blue-400/40 font-mono">
                  {(targetIntake * mark / 100).toFixed(0)}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar below bottle */}
          <div className="mt-4 space-y-1">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            {percentage >= 100 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm font-bold text-blue-400 flex items-center justify-center gap-2"
              >
                <Check className="text-green-400" size={16} />
                Doel bereikt! 🎉
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                Voeg water toe
              </div>

              {/* Quick add buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleAddWater(amount)}
                    className="py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors group"
                  >
                    <Plus className="mx-auto mb-1 text-blue-400 group-hover:scale-110 transition-transform" size={18} />
                    <div className="text-sm font-bold text-blue-400">{amount}ml</div>
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Aangepast bedrag
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="bijv. 350"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                    min="0"
                    step="50"
                  />
                  <button
                    onClick={() => customAmount && handleAddWater(Number(customAmount))}
                    disabled={!customAmount || Number(customAmount) <= 0}
                    className={clsx(
                      "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                      customAmount && Number(customAmount) > 0
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-white/5 text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sluiten
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Check({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
