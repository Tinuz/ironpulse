'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, Plus, ChevronRight, Sun, Moon, Cookie, Utensils, Flame } from 'lucide-react'
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

  useEffect(() => {
    if (session?.access_token) {
      fetchTopTemplates()
    }
  }, [session])

  const fetchTopTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/meal-templates', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Show top 3 most used templates
        const topTemplates = (data.templates || [])
          .sort((a: MealTemplate, b: MealTemplate) => b.usageCount - a.usageCount)
          .slice(0, 3)
        setTemplates(topTemplates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogTemplate = async (template: MealTemplate) => {
    setLoggingTemplate(template.id)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      
      const response = await fetch(`/api/meal-templates/${template.id}/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: today })
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
            onClick={() => handleLogTemplate(template)}
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
    </motion.div>
  )
}
