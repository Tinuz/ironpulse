'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trash2, Save, Search, Loader2, Scan, Check } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/context/AuthContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { MealTemplate, MealTemplateItem, MealCategory, NutritionSearchResult } from '@/types/nutrition'
import { getCachedResults, setCachedResults } from '@/lib/nutritionSearch'
import BarcodeScanner from '@/components/BarcodeScanner'

type TemplateItemDraft = Omit<MealTemplateItem, 'id' | 'templateId' | 'createdAt'>

export default function MealTemplateEditor() {
  const router = useRouter()
  const params = useParams()
  const { session } = useAuth()
  const { t } = useLanguage()
  
  const isEditing = !!params?.id
  const templateId = params?.id as string | undefined

  const [name, setName] = useState('')
  const [category, setCategory] = useState<MealCategory>('breakfast')
  const [items, setItems] = useState<TemplateItemDraft[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditing)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NutritionSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)
  const scrollObserverRef = useRef<IntersectionObserver | null>(null)

  // Load existing template if editing
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadTemplate = async () => {
      if (!isEditing || !templateId || !session?.access_token) return
      
      setIsLoading(true)
      try {
        const response = await fetch(`/api/meal-templates/${templateId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          signal: controller.signal
        })

        if (response.ok && isMounted) {
          const data = await response.json()
          const template: MealTemplate = data.template
          
          setName(template.name)
          setCategory(template.category || 'breakfast')
          setItems(template.items.map(item => ({
            foodName: item.foodName,
            foodBrand: item.foodBrand,
            caloriesPer100g: item.caloriesPer100g,
            proteinPer100g: item.proteinPer100g,
            carbsPer100g: item.carbsPer100g,
            fatsPer100g: item.fatsPer100g,
            quantity: item.quantity,
            unit: item.unit,
            foodItemId: item.foodItemId,
            customNotes: item.customNotes
          })))
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error loading template:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTemplate()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isEditing, templateId, session?.access_token])

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSearchPage(1)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchNutrition(value, 1, false)
      }, 300)
    } else {
      setSearchResults([])
      setShowDropdown(false)
      setHasMoreResults(false)
    }
  }

  const searchNutrition = useCallback(async (query: string, page = 1, append = false) => {
    if (query.trim().length < 3 || !session?.access_token) {
      setSearchResults([])
      setShowDropdown(false)
      setHasMoreResults(false)
      return
    }

    // Check cache first (only for page 1)
    if (page === 1 && !append) {
      const cached = getCachedResults(query)
      if (cached) {
        setSearchResults(cached)
        setShowDropdown(true)
        setHasMoreResults(cached.length >= 20)
        return
      }
    }

    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsSearching(true)
    }

    try {
      const response = await fetch(
        `/api/search-nutrition?query=${encodeURIComponent(query)}&limit=20&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        
        if (append) {
          setSearchResults(prev => [...prev, ...data.results])
        } else {
          setSearchResults(data.results)
          setCachedResults(query, data.results)
        }
        
        setShowDropdown(true)
        setHasMoreResults(data.results.length >= 20)
      }
    } catch (error) {
      console.error('Error searching nutrition:', error)
      if (!append) {
        setSearchResults([])
        setShowDropdown(false)
      }
    } finally {
      setIsSearching(false)
      setIsLoadingMore(false)
    }
  }, [session])

  const handleAddFromSearch = (result: NutritionSearchResult) => {
    const newItem: TemplateItemDraft = {
      foodName: result.name,
      foodBrand: result.brand,
      caloriesPer100g: result.nutrients.calories,
      proteinPer100g: result.nutrients.protein,
      carbsPer100g: result.nutrients.carbs,
      fatsPer100g: result.nutrients.fats,
      quantity: 100,
      unit: 'g',
      foodItemId: result.id
    }

    setItems(prev => [...prev, newItem])
    setSearchQuery('')
    setShowDropdown(false)
    setSearchResults([])
  }

  // Load more results
  const loadMoreResults = useCallback(() => {
    if (!isLoadingMore && hasMoreResults && searchQuery.trim().length >= 3) {
      const nextPage = searchPage + 1
      setSearchPage(nextPage)
      searchNutrition(searchQuery, nextPage, true)
    }
  }, [isLoadingMore, hasMoreResults, searchPage, searchQuery, searchNutrition])

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreTriggerRef.current) return

    scrollObserverRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasMoreResults && !isLoadingMore) {
          loadMoreResults()
        }
      },
      { threshold: 0.1 }
    )

    if (showDropdown && searchResults.length > 0) {
      scrollObserverRef.current.observe(loadMoreTriggerRef.current)
    }

    return () => {
      if (scrollObserverRef.current) {
        scrollObserverRef.current.disconnect()
      }
    }
  }, [hasMoreResults, isLoadingMore, loadMoreResults, showDropdown, searchResults.length])

  const handleProductScanned = (product: any) => {
    const newItem: TemplateItemDraft = {
      foodName: product.name,
      foodBrand: product.brand,
      caloriesPer100g: product.calories,
      proteinPer100g: product.protein,
      carbsPer100g: product.carbs,
      fatsPer100g: product.fats,
      quantity: 100,
      unit: 'g'
    }

    setItems(prev => [...prev, newItem])
    setIsScannerOpen(false)
  }

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, field: keyof TemplateItemDraft, value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const calculateTotals = () => {
    return items.reduce((acc, item) => {
      const multiplier = item.quantity / 100
      return {
        calories: acc.calories + (item.caloriesPer100g * multiplier),
        protein: acc.protein + (item.proteinPer100g * multiplier),
        carbs: acc.carbs + (item.carbsPer100g * multiplier),
        fats: acc.fats + (item.fatsPer100g * multiplier)
      }
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 })
  }

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) {
      alert(t.templates.fillAllFields)
      return
    }

    setIsSaving(true)

    try {
      const url = isEditing 
        ? `/api/meal-templates/${templateId}`
        : '/api/meal-templates'
      
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          category,
          items
        })
      })

      if (response.ok) {
        router.push('/meal-templates')
      } else {
        alert(t.templates.saveFailed)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert(t.templates.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const totals = calculateTotals()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.push('/meal-templates')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">
          {isEditing ? t.templates.editTemplate : t.templates.newTemplate}
        </h1>
        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || items.length === 0}
          className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save size={20} />
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-bold mb-2">{t.templates.templateName}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.templates.namePlaceholder}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-bold mb-2">{t.templates.category}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MealCategory)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
          >
            <option value="breakfast">{t.templates.breakfast}</option>
            <option value="lunch">{t.templates.lunch}</option>
            <option value="dinner">{t.templates.dinner}</option>
            <option value="snack">{t.templates.snack}</option>
            <option value="other">{t.templates.other}</option>
          </select>
        </div>

        {/* Add Items Section */}
        <div>
          <label className="block text-sm font-bold mb-2">{t.templates.items}</label>
          
          {/* Search Bar */}
          <div className="relative mb-3" ref={dropdownRef}>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t.templates.searchFood}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary transition-colors"
              />
              {isSearching && (
                <Loader2 size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showDropdown && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 w-full bg-card border border-white/10 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-20"
                >
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddFromSearch(result)}
                      className="w-full p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                    >
                      <div className="font-semibold">{result.name}</div>
                      {result.brand && (
                        <div className="text-xs text-muted-foreground">{result.brand}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.nutrients.calories} kcal • {result.nutrients.protein}g protein
                      </div>
                    </button>
                  ))}

                  {/* Infinite Scroll Trigger & Status */}
                  {hasMoreResults ? (
                    <div ref={loadMoreTriggerRef} className="p-4 text-center">
                      {isLoadingMore ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">Laden...</span>
                        </div>
                      ) : (
                        <button
                          onClick={loadMoreResults}
                          className="text-sm text-primary hover:text-primary/80 transition-colors font-semibold"
                        >
                          Meer resultaten laden (pagina {searchPage} van 25)
                        </button>
                      )}
                    </div>
                  ) : searchResults.length >= 20 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <Check size={16} className="inline mr-2 text-green-500" />
                      Alle {searchResults.length} resultaten geladen
                    </div>
                  ) : null}
                  
                  <div className="p-2 text-[10px] text-center text-muted-foreground border-t border-white/5">
                    {searchResults.length} resultaten • Data van Open Food Facts & USDA • per 100g/ml
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scan Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <Scan size={20} />
            {t.templates.scanBarcode}
          </button>
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-3">
            <div className="font-bold text-sm text-muted-foreground">{t.templates.templateItems}</div>
            {items.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-white/5 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">{item.foodBrand ? `${item.foodBrand} - ${item.foodName}` : item.foodName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Math.round(item.caloriesPer100g * item.quantity / 100)} kcal
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Quantity Input */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="piece">piece</option>
                    <option value="scoop">scoop</option>
                  </select>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Totals Summary */}
        {items.length > 0 && (
          <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-4">
            <div className="font-bold mb-2">{t.templates.totalNutrition}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-muted-foreground">{t.nutrition.calories}</div>
                <div className="text-2xl font-bold">{Math.round(totals.calories)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t.nutrition.protein}</div>
                <div className="text-2xl font-bold text-pink-500">{Math.round(totals.protein * 10) / 10}g</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t.nutrition.carbs}</div>
                <div className="text-2xl font-bold text-blue-500">{Math.round(totals.carbs * 10) / 10}g</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t.nutrition.fats}</div>
                <div className="text-2xl font-bold text-amber-500">{Math.round(totals.fats * 10) / 10}g</div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || items.length === 0}
          className="w-full py-4 bg-gradient-to-r from-primary to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg disabled:opacity-50"
        >
          {isSaving ? t.templates.saving : (isEditing ? t.templates.updateTemplate : t.templates.createTemplate)}
        </button>
      </div>

      {/* Barcode Scanner */}
      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScanner
            onProductScanned={handleProductScanned}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
