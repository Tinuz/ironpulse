'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Utensils, Flame, Droplet, Check, Scan, AlertTriangle, TrendingUp, TrendingDown, Target, ChevronLeft, ChevronRight, Calendar, BarChart3, Clock, Search, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData, NutritionItem } from '@/components/context/DataContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { nl } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import BarcodeScanner from '@/components/BarcodeScanner'
import WaterTracker from '@/components/WaterTracker'
import { NutritionSearchResult } from '@/types/nutrition'
import { getCachedResults, setCachedResults } from '@/lib/nutritionSearch'

type ViewMode = 'day' | 'week' | 'month';

export default function Nutrition() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { nutritionLogs, addMeal, deleteMeal, addWater, userProfile } = useData()
  const [isAdding, setIsAdding] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showHistory, setShowHistory] = useState(false);
  
  // Nutrition search state
  const [searchResults, setSearchResults] = useState<NutritionSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todaysLog = nutritionLogs.find(l => l.date === currentDateStr);
  const items = todaysLog ? todaysLog.items : [];

  const [newItem, setNewItem] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    volume: '',
    type: 'food' as 'food' | 'drink'
  });

  const totals = items.reduce((acc, item) => ({
    calories: Math.round(acc.calories + item.calories),
    protein: Math.round((acc.protein + item.protein) * 10) / 10,
    carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
    fats: Math.round((acc.fats + item.fats) * 10) / 10,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  // Calculate targets from user profile
  const getTargets = () => {
    if (!userProfile) return null;

    const weight = userProfile.weight;
    const height = userProfile.height;
    const age = userProfile.age;
    const gender = userProfile.gender;
    const activityLevel = userProfile.activityLevel;

    // BMR berekening (Mifflin-St Jeor)
    let bmr: number;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    // TDEE berekening
    const tdee = bmr * activityLevel;
    const maintenanceCalories = Math.round(tdee);

    const proteinTarget = Math.round(weight * 2);
    const fatsTarget = Math.round((maintenanceCalories * 0.28) / 9);
    const carbsTarget = Math.round((maintenanceCalories - (proteinTarget * 4) - (fatsTarget * 9)) / 4);

    return {
      maintenance: maintenanceCalories,
      protein: proteinTarget,
      fats: fatsTarget,
      carbs: carbsTarget
    };
  };

  const targets = getTargets();

  // Analyze nutrition intake
  const getNutritionStatus = () => {
    if (!targets) return null;

    const caloriePercentage = (totals.calories / targets.maintenance) * 100;
    const proteinPercentage = (totals.protein / targets.protein) * 100;
    const fatsPercentage = (totals.fats / targets.fats) * 100;
    const carbsPercentage = (totals.carbs / targets.carbs) * 100;

    return {
      calories: {
        current: totals.calories,
        target: targets.maintenance,
        percentage: caloriePercentage,
        status: caloriePercentage < 70 ? 'low' : caloriePercentage > 115 ? 'high' : 'good'
      },
      protein: {
        current: totals.protein,
        target: targets.protein,
        percentage: proteinPercentage,
        status: proteinPercentage < 70 ? 'low' : proteinPercentage > 150 ? 'high' : 'good'
      },
      fats: {
        current: totals.fats,
        target: targets.fats,
        percentage: fatsPercentage,
        status: fatsPercentage < 60 ? 'low' : fatsPercentage > 140 ? 'high' : 'good'
      },
      carbs: {
        current: totals.carbs,
        target: targets.carbs,
        percentage: carbsPercentage,
        status: carbsPercentage < 60 ? 'low' : carbsPercentage > 140 ? 'high' : 'good'
      }
    };
  };

  const nutritionStatus = getNutritionStatus();

  // Get data for week/month view
  const getHistoryData = () => {
    let dateRange: Date[] = [];
    
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      dateRange = eachDayOfInterval({ start, end });
    } else if (viewMode === 'month') {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      dateRange = eachDayOfInterval({ start, end });
    }

    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const log = nutritionLogs.find(l => l.date === dateStr);
      const dayTotals = log ? log.items.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fats: acc.fats + item.fats,
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 }) : { calories: 0, protein: 0, carbs: 0, fats: 0 };

      return {
        date: dateStr,
        displayDate: format(date, 'dd MMM', { locale: nl }),
        shortDate: format(date, 'dd/MM'),
        ...dayTotals
      };
    });
  };

  const historyData = viewMode !== 'day' ? getHistoryData() : [];

  const handleAdd = () => {
    if (!newItem.name || !newItem.calories) return;
    
    addMeal(currentDateStr, {
      name: newItem.name,
      calories: Number(newItem.calories),
      protein: Number(newItem.protein) || 0,
      carbs: Number(newItem.carbs) || 0,
      fats: Number(newItem.fats) || 0,
      type: newItem.type,
      volume: newItem.volume ? Number(newItem.volume) : undefined
    });

    setNewItem({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      volume: '',
      type: 'food'
    });
    setIsAdding(false);
  };

  const handleProductScanned = (product: any) => {
    setNewItem({
      name: product.brand ? `${product.brand} - ${product.name}` : product.name,
      calories: product.calories.toString(),
      protein: product.protein.toString(),
      carbs: product.carbs.toString(),
      fats: product.fats.toString(),
      volume: '',
      type: 'food'
    });
    setIsScannerOpen(false);
    setIsAdding(true);
  };

  // Debounced nutrition search
  const searchNutrition = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Check cache first
    const cached = getCachedResults(query);
    if (cached) {
      setSearchResults(cached);
      setShowDropdown(true);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/search-nutrition?query=${encodeURIComponent(query)}&limit=8`);
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
        setShowDropdown(true);
        
        // Cache results
        setCachedResults(query, data.results);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input with debouncing
  const handleSearchInput = (value: string) => {
    setNewItem({...newItem, name: value});

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search (300ms)
    searchTimeoutRef.current = setTimeout(() => {
      searchNutrition(value);
    }, 300);
  };

  // Handle result selection
  const handleSelectResult = (result: NutritionSearchResult) => {
    const selectedName = result.brand ? `${result.brand} - ${result.name}` : result.name;
    setNewItem({
      name: selectedName,
      calories: result.nutrients.calories.toString(),
      protein: result.nutrients.protein.toString(),
      carbs: result.nutrients.carbs.toString(),
      fats: result.nutrients.fats.toString(),
      volume: '',
      type: newItem.type
    });
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Get recent unique items from all nutrition logs
  const getRecentItems = () => {
    const allItems: NutritionItem[] = [];
    
    // Collect all items from all dates
    nutritionLogs.forEach(log => {
      allItems.push(...log.items);
    });
    
    // Create unique items based on name + nutritional values
    const uniqueItems = new Map<string, NutritionItem>();
    
    allItems.forEach(item => {
      const key = `${item.name}-${item.calories}-${item.protein}-${item.carbs}-${item.fats}-${item.type}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });
    
    // Return last 10 unique items
    return Array.from(uniqueItems.values()).slice(-10).reverse();
  };

  const recentItems = getRecentItems();

  const handleAddRecentItem = (item: NutritionItem) => {
    addMeal(currentDateStr, {
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      type: item.type
    });
    setIsAdding(false);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(direction === 'prev' ? subDays(selectedDate, 7) : addDays(selectedDate, 7));
    } else if (viewMode === 'month') {
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      const newDate = new Date(currentYear, direction === 'prev' ? currentMonth - 1 : currentMonth + 1, 1);
      setSelectedDate(newDate);
    }
  };

  const isToday = currentDateStr === today;

  const data = [
    { name: 'Protein', value: totals.protein * 4, color: '#ec4899' },
    { name: 'Carbs', value: totals.carbs * 4, color: '#3b82f6' },
    { name: 'Fats', value: totals.fats * 9, color: '#f59e0b' },
  ];

  const activeData = data.filter(d => d.value > 0);
  if (activeData.length === 0) {
    activeData.push({ name: 'Empty', value: 1, color: '#333' });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold">{t.nutrition.title}</h1>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <BarChart3 size={20} className={showHistory ? 'text-primary' : 'text-muted-foreground'} />
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2 bg-card border border-white/5 rounded-xl p-1">
          <button
            onClick={() => { setViewMode('day'); setShowHistory(false); }}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-colors ${
              viewMode === 'day' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {t.nutrition.day}
          </button>
          <button
            onClick={() => { setViewMode('week'); setShowHistory(true); }}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-colors ${
              viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {t.nutrition.week}
          </button>
          <button
            onClick={() => { setViewMode('month'); setShowHistory(true); }}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-colors ${
              viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {t.nutrition.month}
          </button>
        </div>

        {/* Date Navigator */}
        <div className="bg-card border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <div className="text-center">
              <div className="font-bold">
                {viewMode === 'day' && format(selectedDate, 'EEEE d MMMM yyyy', { locale: nl })}
                {viewMode === 'week' && `Week ${format(selectedDate, 'w, yyyy', { locale: nl })}`}
                {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: nl })}
              </div>
              {!isToday && viewMode === 'day' && (
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs text-primary hover:underline"
                >
                  {t.nutrition.backToToday}
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* History Charts (Week/Month View) */}
        {showHistory && viewMode !== 'day' && historyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-white/5 rounded-2xl p-6 space-y-6"
          >
            <h3 className="font-bold text-lg">{t.nutrition.calorieHistory}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="shortDate" 
                    stroke="#666" 
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="calories" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                  />
                  {targets && (
                    <Line 
                      type="monotone" 
                      dataKey={() => targets.maintenance}
                      stroke="#22c55e" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Doel"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-sm mb-3 text-muted-foreground uppercase">{t.nutrition.averageMacros}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t.nutrition.protein}:</span>
                    <span className="font-bold">
                      {Math.round(historyData.reduce((sum, d) => sum + d.protein, 0) / historyData.length)}g
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t.nutrition.carbs}:</span>
                    <span className="font-bold">
                      {Math.round(historyData.reduce((sum, d) => sum + d.carbs, 0) / historyData.length)}g
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t.nutrition.fats}:</span>
                    <span className="font-bold">
                      {Math.round(historyData.reduce((sum, d) => sum + d.fats, 0) / historyData.length)}g
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-3 text-muted-foreground uppercase">{t.nutrition.statistics}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t.nutrition.avgCalories}:</span>
                    <span className="font-bold">
                      {Math.round(historyData.reduce((sum, d) => sum + d.calories, 0) / historyData.length) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t.nutrition.highestDay}:</span>
                    <span className="font-bold">
                      {Math.max(...historyData.map(d => d.calories), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t.nutrition.lowestDay}:</span>
                    <span className="font-bold">
                      {Math.min(...historyData.map(d => d.calories).filter(c => c > 0), 9999) === 9999 ? 0 : Math.min(...historyData.map(d => d.calories).filter(c => c > 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Day View - Summary Card */}
        {viewMode === 'day' && (
          <>
            <div className="bg-card border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">{t.nutrition.calories} {isToday ? t.nutrition.today : format(selectedDate, 'd MMM', { locale: language === 'nl' ? nl : undefined })}</div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-5xl font-black tabular-nums">{totals.calories}</div>
                    {targets && (
                      <div className="text-lg text-muted-foreground">
                        / {targets.maintenance}
                      </div>
                    )}
                  </div>
                  {targets && nutritionStatus && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{t.nutrition.progress}</span>
                        <span className={`font-bold ${
                          nutritionStatus.calories.status === 'low' ? 'text-amber-500' :
                          nutritionStatus.calories.status === 'high' ? 'text-red-500' :
                          'text-green-500'
                        }`}>
                          {Math.round(nutritionStatus.calories.percentage)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(nutritionStatus.calories.percentage, 100)}%` }}
                          className={`h-full rounded-full ${
                            nutritionStatus.calories.status === 'low' ? 'bg-amber-500' :
                            nutritionStatus.calories.status === 'high' ? 'bg-red-500' :
                            'bg-green-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}
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

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-pink-500/10 p-3 rounded-xl border border-pink-500/20">
                  <div className="text-[10px] text-pink-400 font-bold uppercase flex items-center gap-1 mb-1">
                    {t.nutrition.protein}
                    {nutritionStatus && nutritionStatus.protein.status === 'low' && (
                      <TrendingDown size={10} className="text-amber-500" />
                    )}
                    {nutritionStatus && nutritionStatus.protein.status === 'high' && (
                      <TrendingUp size={10} className="text-red-500" />
                    )}
                  </div>
                  <div className="text-lg font-bold tabular-nums">{totals.protein}g</div>
                  {targets && (
                    <div className="text-[9px] text-muted-foreground mt-1">
                      {t.nutrition.goal}: {targets.protein}g
                    </div>
                  )}
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                  <div className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1 mb-1">
                    {t.nutrition.carbs}
                    {nutritionStatus && nutritionStatus.carbs.status === 'low' && (
                      <TrendingDown size={10} className="text-amber-500" />
                    )}
                    {nutritionStatus && nutritionStatus.carbs.status === 'high' && (
                      <TrendingUp size={10} className="text-red-500" />
                    )}
                  </div>
                  <div className="text-lg font-bold tabular-nums">{totals.carbs}g</div>
                  {targets && (
                    <div className="text-[9px] text-muted-foreground mt-1">
                      {t.nutrition.goal}: {targets.carbs}g
                    </div>
                  )}
                </div>
                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1 mb-1">
                    {t.nutrition.fats}
                    {nutritionStatus && nutritionStatus.fats.status === 'low' && (
                      <TrendingDown size={10} className="text-amber-500" />
                    )}
                    {nutritionStatus && nutritionStatus.fats.status === 'high' && (
                      <TrendingUp size={10} className="text-red-500" />
                    )}
                  </div>
                  <div className="text-lg font-bold tabular-nums">{totals.fats}g</div>
                  {targets && (
                    <div className="text-[9px] text-muted-foreground mt-1">
                      {t.nutrition.goal}: {targets.fats}g
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Warnings & Recommendations */}
            {nutritionStatus && (
              <AnimatePresence>
                {(nutritionStatus.calories.status !== 'good' || 
                  nutritionStatus.protein.status === 'low' ||
                  nutritionStatus.fats.status === 'low') && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    {nutritionStatus.calories.status === 'low' && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-amber-500 text-sm">{t.nutrition.tooFewCalories}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'nl' 
                              ? `Je hebt pas ${totals.calories} van ${targets?.maintenance} kcal geconsumeerd. Dit kan leiden tot energietekort en spierverlies.`
                              : `You've only consumed ${totals.calories} of ${targets?.maintenance} kcal. This can lead to energy deficit and muscle loss.`
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {nutritionStatus.calories.status === 'high' && (
                      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-red-500 text-sm">{t.nutrition.tooManyCalories}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'nl'
                              ? `Je hebt ${totals.calories} van ${targets?.maintenance} kcal geconsumeerd. Dit kan leiden tot ongewenste gewichtstoename.`
                              : `You've consumed ${totals.calories} of ${targets?.maintenance} kcal. This can lead to unwanted weight gain.`
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {nutritionStatus.protein.status === 'low' && totals.calories > 0 && (
                      <div className="bg-pink-500/10 border border-pink-500/30 p-4 rounded-xl flex items-start gap-3">
                        <Target size={20} className="text-pink-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-pink-400 text-sm">{t.nutrition.needMoreProtein}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'nl'
                              ? `Je hebt ${totals.protein}g van ${targets?.protein}g eiwit binnen. Eiwit is essentieel voor spiergroei en herstel.`
                              : `You've consumed ${totals.protein}g of ${targets?.protein}g protein. Protein is essential for muscle growth and recovery.`
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {nutritionStatus.fats.status === 'low' && totals.calories > 500 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
                        <Target size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-amber-400 text-sm">{t.nutrition.needMoreFats}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {language === 'nl'
                              ? `Je hebt ${totals.fats}g van ${targets?.fats}g vetten binnen. Gezonde vetten zijn belangrijk voor hormoonproductie.`
                              : `You've consumed ${totals.fats}g of ${targets?.fats}g fats. Healthy fats are important for hormone production.`
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {nutritionStatus.calories.status === 'good' && 
                 nutritionStatus.protein.status === 'good' &&
                 nutritionStatus.fats.status === 'good' &&
                 nutritionStatus.carbs.status === 'good' &&
                 totals.calories > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-start gap-3"
                  >
                    <Check size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-green-500 text-sm">{t.nutrition.perfectOnTrack}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.nutrition.balancedNutrition}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* No Profile Warning */}
            {!targets && (
              <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle size={20} className="text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-primary text-sm">Stel je profiel in</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Vul de Fitness Calculator in bij Progress om gepersonaliseerde doelen en aanbevelingen te krijgen.
                  </div>
                </div>
              </div>
            )}

            {/* Water Tracker */}
            {viewMode === 'day' && (
              <WaterTracker 
                currentIntake={todaysLog?.waterIntake || 0}
                targetIntake={2000}
                onAddWater={(amount) => addWater(currentDateStr, amount)}
              />
            )}

            {/* Meals List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  {isToday ? t.nutrition.today : format(selectedDate, 'd MMMM', { locale: language === 'nl' ? nl : undefined })}
                </h2>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsScannerOpen(true)}
                    className="text-primary text-sm font-bold uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    <Scan size={16} /> {t.nutrition.scanBarcode.split(' ')[0]}
                  </button>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="text-primary text-sm font-bold uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    <Plus size={16} /> {t.common.add}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {items.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-2xl"
                  >
                    <Utensils size={32} className="mx-auto mb-3 opacity-50" />
                    <p>{t.nutrition.noMeals}</p>
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
                              {item.protein > 0 && <span>• {item.protein}g P</span>}
                              {item.carbs > 0 && <span>• {item.carbs}g C</span>}
                              {item.fats > 0 && <span>• {item.fats}g F</span>}
                              {item.type === 'drink' && item.volume && (
                                <span className="text-blue-400">• {item.volume}ml</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteMeal(currentDateStr, item.id)}
                          className="text-red-500/60 md:opacity-0 md:group-hover:opacity-100 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setIsAdding(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-background w-full rounded-t-3xl max-h-[85vh] overflow-y-auto pb-32"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{t.nutrition.addMeal}</h2>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="text-muted-foreground"
                  >
                    ✕
                  </button>
                </div>

                {/* Recent Items Section */}
                {recentItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                      <Clock size={14} className="text-primary" />
                      {t.nutrition.recentlyAdded}
                    </h3>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 -mr-1">
                      {recentItems.map((item, index) => (
                        <motion.button
                          key={`${item.name}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleAddRecentItem(item)}
                          className="w-full bg-card border border-white/5 hover:border-primary/30 hover:bg-primary/5 p-3 rounded-xl transition-all text-left group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                item.type === 'drink' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                              }`}>
                                {item.type === 'drink' ? <Droplet size={14} /> : <Utensils size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{item.name}</div>
                                <div className="text-xs text-muted-foreground flex gap-2">
                                  <span className="font-mono">{item.calories} kcal</span>
                                  {item.protein > 0 && <span>• {item.protein}g P</span>}
                                  {item.carbs > 0 && <span>• {item.carbs}g C</span>}
                                  {item.fats > 0 && <span>• {item.fats}g F</span>}
                                </div>
                              </div>
                            </div>
                            <Plus size={16} className="text-primary/60 md:opacity-0 md:group-hover:opacity-100 hover:text-primary transition-opacity flex-shrink-0" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-px flex-1 bg-white/5" />
                      <span>{t.nutrition.orAddManually}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                  </div>
                )}

                <div className="relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">{t.nutrition.mealName}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) {
                          setShowDropdown(true);
                        }
                      }}
                      placeholder={language === 'nl' ? 'Zoek product... (bijv. "halfvolle melk")' : 'Search product...'}
                      className="w-full bg-card border border-white/10 rounded-xl p-3 pr-10 focus:border-primary outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearching ? (
                        <Loader2 size={16} className="text-muted-foreground animate-spin" />
                      ) : (
                        <Search size={16} className="text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Autocomplete Dropdown */}
                  <AnimatePresence>
                    {showDropdown && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
                      >
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSelectResult(result)}
                            className="w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm truncate">
                                  {result.name}
                                </div>
                                {result.brand && (
                                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                                    {result.brand}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  <span className="font-mono font-bold text-primary">
                                    {result.nutrients.calories} kcal
                                  </span>
                                  {result.nutrients.protein > 0 && (
                                    <span className="text-pink-400">
                                      {result.nutrients.protein}g P
                                    </span>
                                  )}
                                  {result.nutrients.carbs > 0 && (
                                    <span className="text-blue-400">
                                      {result.nutrients.carbs}g C
                                    </span>
                                  )}
                                  {result.nutrients.fats > 0 && (
                                    <span className="text-amber-400">
                                      {result.nutrients.fats}g F
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-[10px] text-muted-foreground uppercase tracking-wider">
                                {result.source === 'openfoodfacts' ? 'OFF' : 'USDA'}
                              </div>
                            </div>
                          </button>
                        ))}
                        <div className="p-2 text-[10px] text-center text-muted-foreground border-t border-white/5">
                          {language === 'nl' 
                            ? 'Data van Open Food Facts & USDA • per 100g/ml' 
                            : 'Data from Open Food Facts & USDA • per 100g/ml'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setNewItem({...newItem, type: 'food'})}
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                      newItem.type === 'food' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'
                    }`}
                  >
                    <Utensils size={16} className="inline mr-2" />
                    {t.nutrition.food}
                  </button>
                  <button
                    onClick={() => setNewItem({...newItem, type: 'drink'})}
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                      newItem.type === 'drink' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'
                    }`}
                  >
                    <Droplet size={16} className="inline mr-2" />
                    {t.nutrition.drink}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">{t.nutrition.calories}</label>
                    <input
                      type="number"
                      value={newItem.calories}
                      onChange={(e) => setNewItem({...newItem, calories: e.target.value})}
                      placeholder="200"
                      className="w-full bg-card border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">{t.nutrition.protein} (g)</label>
                    <input
                      type="number"
                      value={newItem.protein}
                      onChange={(e) => setNewItem({...newItem, protein: e.target.value})}
                      placeholder="30"
                      className="w-full bg-card border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">{t.nutrition.carbs} (g)</label>
                    <input
                      type="number"
                      value={newItem.carbs}
                      onChange={(e) => setNewItem({...newItem, carbs: e.target.value})}
                      placeholder="10"
                      className="w-full bg-card border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">{t.nutrition.fats} (g)</label>
                    <input
                      type="number"
                      value={newItem.fats}
                      onChange={(e) => setNewItem({...newItem, fats: e.target.value})}
                      placeholder="5"
                      className="w-full bg-card border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                {/* Volume field for drinks */}
                {newItem.type === 'drink' && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block flex items-center gap-2">
                      <Droplet size={14} className="text-blue-400" />
                      Volume (ml)
                    </label>
                    <input
                      type="number"
                      value={newItem.volume}
                      onChange={(e) => setNewItem({...newItem, volume: e.target.value})}
                      placeholder="250"
                      className="w-full bg-card border border-blue-500/20 rounded-xl p-3 focus:border-blue-500/50 outline-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      Dit wordt automatisch toegevoegd aan je hydratatie tracking
                    </p>
                  </div>
                )}

                <button
                  onClick={handleAdd}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Check size={20} /> {t.common.add}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScanner
            onProductScanned={handleProductScanned}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
