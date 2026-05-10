'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Plus, ChevronRight, Sun, Moon, Cookie, Utensils, Flame, X, Check } from 'lucide-react'
import { useAuth } from '@/components/context/AuthContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { MealTemplate, MealCategory } from '@/types/nutrition'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

const CATEGORY_ICONS: Record<MealCategory, React.ReactNode> = {
  breakfast: <Sun size={16} />,
  lunch: <Utensils size={16} />,  
  dinner: <Moon size={16} />,
  snack: <Cookie size={16} />,
  other: <Package size={16} />
}

interface QuickMealTemplatesProps {
  onTemplateLogged?: () => void
}

export default function QuickMealTemplates({ onTemplateLogged }: QuickMealTemplatesProps) {
  const router = useRouter()
  const { session } = useAuth()
  const { t } = useLanguage()
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loggingTemplate, setLoggingTemplate] = useState<string | null>(null)
  const [portionPicker, setPortionPicker] = useState<{ template: MealTemplate; portions: number } | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchTopTemplates = async () => {
      if (!session?.access_token) return
      
      setIsLoading(true)
      try {
        const response = await fetch('/api/meal-templates', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          signal: controller.signal
        })

        if (response.ok && isMounted) {
          const data = await response.json()
          // Show top 3 most used templates
          const topTemplates = (data.templates || [])
            .sort((a: MealTemplate, b: MealTemplate) => b.usageCount - a.usageCount)
            .slice(0, 3)
          setTemplates(topTemplates)
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching templates:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchTopTemplates()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [session?.access_token])



  const handleLogTemplate = async (template: MealTemplate, portions: number = 1) => {
    setPortionPicker(null)
    setLoggingTemplate(template.id)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      
      const response = await fetch(`/api/meal-templates/${template.id}/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: today, portions })
      })

      if (response.ok) {
        setTimeout(() => {
          setLoggingTemplate(null)
          if (onTemplateLogged) onTemplateLogged()
        }, 500)
      }
    } catch (error) {
      console.error('Error logging template:', error)
      setLoggingTemplate(null)
    }
  }

  if (isLoading) {
    return null
  }

  if (templates.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Package size={20} />
            </div>
            <div>
              <div className="font-bold text-sm">{t.templates.quickTemplates}</div>
              <div className="text-xs text-muted-foreground">{t.templates.createToQuickLog}</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/meal-templates/new')}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            {t.common.add}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-primary" />
          <h3 className="font-bold text-sm">{t.templates.quickTemplates}</h3>
        </div>
        <button
          onClick={() => router.push('/meal-templates')}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {t.templates.viewAll}
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {templates.map(template => (
          <motion.button
            key={template.id}
            onClick={() => setPortionPicker({ template, portions: 1 })}
            disabled={loggingTemplate === template.id}
            whileTap={{ scale: 0.98 }}
            className="bg-card border border-white/5 rounded-xl p-3 hover:border-primary/30 transition-all text-left disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  {template.category && CATEGORY_ICONS[template.category]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{template.name}</div>
                  {template.category && (
                    <div className="text-xs text-muted-foreground capitalize">
                      {template.category}
                    </div>
                  )}
                </div>
              </div>
              
              {loggingTemplate === template.id ? (
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={20} className="text-primary" />
              )}
            </div>

            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Flame size={12} className="text-orange-500" />
                <span className="font-semibold">{template.totalCalories}</span>
                <span className="text-muted-foreground">kcal</span>
              </div>
              <div className="text-muted-foreground">
                {template.totalProtein}g • {template.totalCarbs}g • {template.totalFats}g
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Portion Picker Modal */}
      <AnimatePresence>
        {portionPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setPortionPicker(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{t.templates.selectPortion}</h3>
                  <p className="text-sm text-muted-foreground">{portionPicker.template.name}</p>
                </div>
                <button onClick={() => setPortionPicker(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              {/* Preset portion buttons */}
              <div className="grid grid-cols-6 gap-1.5">
                {([0.25, 0.5, 0.75, 1, 1.5, 2] as const).map((p, i) => (
                  <button
                    key={p}
                    onClick={() => setPortionPicker(prev => prev ? { ...prev, portions: p } : null)}
                    className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                      portionPicker.portions === p
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-foreground hover:bg-white/10'
                    }`}
                  >
                    {['¼', '½', '¾', '1×', '1½', '2×'][i]}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap">Eigen getal:</label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.25"
                  value={portionPicker.portions}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v > 0) setPortionPicker(prev => prev ? { ...prev, portions: v } : null)
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">×</span>
              </div>

              {/* Live macro preview */}
              <div className="bg-background/50 rounded-xl p-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-orange-400">{Math.round((portionPicker.template.totalCalories || 0) * portionPicker.portions)}</div>
                    <div className="text-xs text-muted-foreground">kcal</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-pink-400">{(Math.round((portionPicker.template.totalProtein || 0) * portionPicker.portions * 10) / 10)}g</div>
                    <div className="text-xs text-muted-foreground">eiwit</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-400">{(Math.round((portionPicker.template.totalCarbs || 0) * portionPicker.portions * 10) / 10)}g</div>
                    <div className="text-xs text-muted-foreground">koolh.</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-yellow-400">{(Math.round((portionPicker.template.totalFats || 0) * portionPicker.portions * 10) / 10)}g</div>
                    <div className="text-xs text-muted-foreground">vet</div>
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={() => handleLogTemplate(portionPicker.template, portionPicker.portions)}
                disabled={loggingTemplate === portionPicker.template.id}
                className="w-full py-3 bg-gradient-to-r from-primary to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loggingTemplate === portionPicker.template.id ? (
                  <><Check size={20} />{t.templates.logged}</>
                ) : (
                  <><Plus size={20} />{t.templates.confirmAndLog}</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
