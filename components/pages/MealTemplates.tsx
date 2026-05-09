'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Edit2, Flame, Package, Check, Utensils, Sun, Moon, Cookie, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { MealTemplate, MealCategory } from '@/types/nutrition'
import { format } from 'date-fns'

const CATEGORY_ICONS: Record<MealCategory, React.ReactNode> = {
  breakfast: <Sun size={20} />,
  lunch: <Utensils size={20} />,
  dinner: <Moon size={20} />,
  snack: <Cookie size={20} />,
  other: <Package size={20} />
}

export default function MealTemplatesPage() {
  const router = useRouter()
  const { session } = useAuth()
  const { t } = useLanguage()
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loggingTemplate, setLoggingTemplate] = useState<string | null>(null)
  const [portionPicker, setPortionPicker] = useState<{ template: MealTemplate; portions: number } | null>(null)

  // Fetch templates on mount
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchData = async () => {
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
          setTemplates(data.templates || [])
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

    fetchData()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [session?.access_token])



  const handleDelete = async (templateId: string) => {
    try {
      const response = await fetch(`/api/meal-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId))
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleLogTemplate = async (templateId: string, portions: number = 1) => {
    setPortionPicker(null)
    setLoggingTemplate(templateId)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      
      const response = await fetch(`/api/meal-templates/${templateId}/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: today, portions })
      })

      if (response.ok) {
        // Success feedback
        setTimeout(() => {
          setLoggingTemplate(null)
          router.push('/nutrition')
        }, 500)
      }
    } catch (error) {
      console.error('Error logging template:', error)
      setLoggingTemplate(null)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.push('/nutrition')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{t.templates.mealTemplates}</h1>
        <button
          onClick={() => router.push('/meal-templates/new')}
          className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
              <Package size={40} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t.templates.noTemplatesYet}</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                {t.templates.createFirstTemplate}
              </p>
            </div>
            <button
              onClick={() => router.push('/meal-templates/new')}
              className="px-6 py-3 bg-gradient-to-r from-primary to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
            >
              <Plus size={20} className="inline mr-2" />
              {t.templates.createTemplate}
            </button>
          </div>
        )}

        {/* Templates List */}
        {!isLoading && templates.length > 0 && (
          <div className="space-y-3">
            {templates.map((template, i) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-primary/20 transition-colors"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        {template.category && CATEGORY_ICONS[template.category]}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{template.name}</h3>
                        {template.category && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {template.category}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/meal-templates/${template.id}/edit`)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(template.id)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Nutrition Summary */}
                  <div className="flex gap-4 mb-3 px-2">
                    <div className="flex items-center gap-2">
                      <Flame size={16} className="text-orange-500" />
                      <span className="text-sm font-bold">{template.totalCalories || 0}</span>
                      <span className="text-xs text-muted-foreground">kcal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-pink-500"></div>
                      <span className="text-sm">{template.totalProtein || 0}g {t.nutrition.protein.toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm">{template.totalCarbs || 0}g {t.nutrition.carbs.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="bg-background/50 rounded-xl p-3 mb-3 space-y-1">
                    {template.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate flex-1">
                          {item.foodBrand ? `${item.foodBrand} - ${item.foodName}` : item.foodName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {item.quantity}{item.unit}
                        </span>
                      </div>
                    ))}
                    {template.items.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center pt-1">
                        +{template.items.length - 3} {t.templates.moreItems}
                      </div>
                    )}
                  </div>

                  {/* Log Button */}
                  <button
                    onClick={() => setPortionPicker({ template, portions: 1 })}
                    disabled={loggingTemplate === template.id}
                    className="w-full py-3 bg-gradient-to-r from-primary to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loggingTemplate === template.id ? (
                      <>
                        <Check size={20} />
                        {t.templates.logged}
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        {t.templates.logToday}
                      </>
                    )}
                  </button>

                  {/* Usage Count */}
                  {template.usageCount > 0 && (
                    <div className="text-xs text-muted-foreground text-center mt-2">
                      {t.templates.usedTimes.replace('{count}', template.usageCount.toString())}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Portion Picker Modal */}
      <AnimatePresence>
        {portionPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/80"
            onClick={() => setPortionPicker(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
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
                onClick={() => handleLogTemplate(portionPicker.template.id, portionPicker.portions)}
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4"
            >
              <h3 className="text-xl font-bold">{t.templates.deleteTemplate}</h3>
              <p className="text-muted-foreground">{t.templates.deleteConfirmation}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  {t.common.delete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
