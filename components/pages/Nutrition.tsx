'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Utensils, Flame, Droplet, Check, Scan, AlertTriangle, TrendingUp, TrendingDown, Target, ChevronLeft, ChevronRight, Calendar, BarChart3, Clock, Search, Loader2, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData, NutritionItem } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { useLanguage } from '@/components/context/LanguageContext'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { nl } from 'date-fns/locale'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import BarcodeScanner from '@/components/BarcodeScanner'
import WaterTracker from '@/components/WaterTracker'
import { NutritionSearchResult } from '@/types/nutrition'
import { getCachedResults, setCachedResults } from '@/lib/nutritionSearch'
import SupplementsSection from '@/components/SupplementsSection'
import SupplementsCoach from '@/components/SupplementsCoach'
import QuickMealTemplates from '@/components/QuickMealTemplates'
import CustomFoodItemModal from '@/components/CustomFoodItemModal'
import { CustomFoodItem } from '@/types/nutrition'
import { getAuthenticatedClient } from '@/lib/supabase'
import { getCustomFoodItems, incrementCustomItemUsage } from '@/lib/customFoodItems'
import { generateNutritionContextInsights, analyseProteinConsistency } from '@/components/utils/nutritionContextAnalytics'

type ViewMode = 'day' | 'week' | 'month';
type ActiveTab = 'food' | 'supplements';

export default function Nutrition() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { session } = useAuth()
  const { nutritionLogs, addMeal, updateMeal, deleteMeal, addWater, userProfile, history } = useData()
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<NutritionItem | null>(null);
  const [editingItemNeedsBase, setEditingItemNeedsBase] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('food');
  const [showSupplementsCoach, setShowSupplementsCoach] = useState(false);
  
  // Custom food items state
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [customFoodItems, setCustomFoodItems] = useState<CustomFoodItem[]>([]);
  
  // Recent items state
  const [recentItemsSearch, setRecentItemsSearch] = useState('');
  const [recentItemsDisplayCount, setRecentItemsDisplayCount] = useState(10);
  const recentItemsScrollRef = useRef<HTMLDivElement>(null);
  
  // Nutrition search state
  const [searchResults, setSearchResults] = useState<NutritionSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollObserverRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Load custom food items
  useEffect(() => {
    let isMounted = true;

    const loadCustomItems = async () => {
      if (!session?.user) return;
      
      try {
        const supabase = getAuthenticatedClient(session.access_token);

        const items = await getCustomFoodItems(supabase, session.user.id, { sortBy: 'usage' });
        
        if (isMounted) {
          setCustomFoodItems(items);
        }
      } catch (err) {
        console.error('Error loading custom food items:', err);
      }
    };

    loadCustomItems();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id, session?.access_token]);

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
    saturatedFat: '',
    unsaturatedFat: '',
    volume: '',
    amount: '100', // Default to 100g
    type: 'food' as 'food' | 'drink',
    // Base values per 100g (for recalculation)
    baseCalories: '',
    baseProtein: '',
    baseCarbs: '',
    baseFats: '',
    baseSaturatedFat: '',
    baseUnsaturatedFat: ''
  });

  const totals = items.reduce((acc, item) => ({
    calories: Math.round(acc.calories + item.calories),
    protein: Math.round((acc.protein + item.protein) * 10) / 10,
    carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
    fats: Math.round((acc.fats + item.fats) * 10) / 10,
    saturatedFat: Math.round((acc.saturatedFat + (item.saturatedFat || 0)) * 10) / 10,
    unsaturatedFat: Math.round((acc.unsaturatedFat + (item.unsaturatedFat || 0)) * 10) / 10,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, saturatedFat: 0, unsaturatedFat: 0 });

  // Calculate targets from user profile
  // Scientific basis:
  //   Calorie adjustments: Slater & Phillips (2011), J Sports Sci
  //   Protein targets: Morton et al. (2018), BJSM meta-analysis (49 RCTs, n=1,800+)
  //     - maintain: ~2.0 g/kg   (upper range for active individuals)
  //     - bulk:     ~1.8 g/kg   (sufficient during positive energy balance)
  //     - cut:      ~2.2 g/kg   (higher protein preserves LBM during deficit)
  const getTargets = () => {
    if (!userProfile) return null;

    const weight = userProfile.weight;
    const height = userProfile.height;
    const age = userProfile.age;
    const gender = userProfile.gender;
    const activityLevel = userProfile.activityLevel;
    const fitnessGoal = userProfile.fitnessGoal || 'maintain';

    // BMR berekening (Mifflin-St Jeor)
    let bmr: number;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    // TDEE berekening
    const tdee = bmr * activityLevel;

    // Calorie target adjusted for goal (Slater & Phillips 2011)
    let calorieMultiplier = 1.0;
    if (fitnessGoal === 'bulk') calorieMultiplier = 1.15;   // +15% surplus
    else if (fitnessGoal === 'cut') calorieMultiplier = 0.78; // −22% deficit
    const targetCalories = Math.round(tdee * calorieMultiplier);
    const maintenanceCalories = Math.round(tdee);

    // Protein target per goal (Morton et al. 2018)
    let proteinPerKg = 2.0;
    if (fitnessGoal === 'bulk') proteinPerKg = 1.8;
    else if (fitnessGoal === 'cut') proteinPerKg = 2.2;
    const proteinTarget = Math.round(weight * proteinPerKg);

    const fatsTarget = Math.round((targetCalories * 0.28) / 9);
    const carbsTarget = Math.round((targetCalories - (proteinTarget * 4) - (fatsTarget * 9)) / 4);

    return {
      maintenance: maintenanceCalories,
      target: targetCalories,
      protein: proteinTarget,
      fats: fatsTarget,
      carbs: carbsTarget,
      fitnessGoal,
    };
  };

  const targets = getTargets();

  // Analyze nutrition intake
  const getNutritionStatus = () => {
    if (!targets) return null;

    const caloriePercentage = (totals.calories / targets.target) * 100;
    const proteinPercentage = (totals.protein / targets.protein) * 100;
    const fatsPercentage = (totals.fats / targets.fats) * 100;
    const carbsPercentage = (totals.carbs / targets.carbs) * 100;

    return {
      calories: {
        current: totals.calories,
        target: targets.target,
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

  // Analyze fat quality (saturated vs unsaturated)
  const getFatQuality = () => {
    const totalFat = totals.fats;
    const saturated = totals.saturatedFat || 0;
    const unsaturated = totals.unsaturatedFat || 0;
    
    if (totalFat === 0) return null;
    
    // Calculate percentages
    const saturatedPercentage = (saturated / totalFat) * 100;
    const unsaturatedPercentage = (unsaturated / totalFat) * 100;
    const unknownPercentage = 100 - saturatedPercentage - unsaturatedPercentage;
    
    // Calculate saturated fat as % of total calories (for health recommendations)
    const saturatedCalories = saturated * 9;
    const saturatedPercentOfTotalCal = targets ? (saturatedCalories / targets.target) * 100 : 0;
    
    // Determine quality score
    // 🟢 >70% unsaturated = excellent
    // 🟡 50-70% unsaturated = ok
    // 🔴 <50% unsaturated = needs improvement
    let quality: 'excellent' | 'good' | 'needs-improvement' = 'good';
    let message = '';
    
    if (unsaturatedPercentage >= 70) {
      quality = 'excellent';
      message = language === 'nl' 
        ? '70%+ van je vetinname is onverzadigd. Uitstekend voor je gezondheid!' 
        : '70%+ of your fat intake is unsaturated. Excellent for your health!';
    } else if (unsaturatedPercentage >= 50) {
      quality = 'good';
      message = language === 'nl'
        ? '50-70% van je vetinname is onverzadigd. Goed, maar kan beter.'
        : '50-70% of your fat intake is unsaturated. Good, but could be better.';
    } else if (saturatedPercentage > 50) {
      quality = 'needs-improvement';
      message = language === 'nl'
        ? 'Meer dan 50% van je vetten is verzadigd. Overweeg meer onverzadigde vetbronnen.'
        : 'More than 50% of your fats are saturated. Consider more unsaturated fat sources.';
    }
    
    // Check if saturated fat is too high relative to total calories
    if (saturatedPercentOfTotalCal > 10 && targets) {
      quality = 'needs-improvement';
      message = language === 'nl'
        ? `Verzadigd vet is ${saturatedPercentOfTotalCal.toFixed(0)}% van je totale calorieën (advies: max 10%). Probeer meer onverzadigde vetten te eten.`
        : `Saturated fat is ${saturatedPercentOfTotalCal.toFixed(0)}% of total calories (recommended: max 10%). Try eating more unsaturated fats.`;
    }
    
    return {
      saturatedGrams: saturated,
      unsaturatedGrams: unsaturated,
      saturatedPercentage: Math.round(saturatedPercentage),
      unsaturatedPercentage: Math.round(unsaturatedPercentage),
      unknownPercentage: Math.round(unknownPercentage),
      saturatedPercentOfTotalCal: Math.round(saturatedPercentOfTotalCal),
      quality,
      message
    };
  };

  const fatQuality = getFatQuality();

  // Training-day context insights (Phase 2)
  // Scientific basis: Aragon & Schoenfeld 2013, Burke et al. 2011, Morton et al. 2018
  const contextResult = targets && userProfile ? generateNutritionContextInsights(
    history,
    items,
    currentDateStr,
    { calories: targets.target, protein: targets.protein, carbs: targets.carbs },
    targets.fitnessGoal as 'bulk' | 'cut' | 'maintain',
  ) : null;

  // Weekly protein consistency (Phase 4)
  const proteinConsistency = targets && nutritionLogs.length > 0
    ? analyseProteinConsistency(nutritionLogs, targets.protein)
    : null;

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

  const closeModal = () => {
    setIsAdding(false);
    setEditingItem(null);
    setEditingItemNeedsBase(false);
    setNewItem({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      saturatedFat: '',
      unsaturatedFat: '',
      volume: '',
      amount: '100',
      type: 'food',
      baseCalories: '',
      baseProtein: '',
      baseCarbs: '',
      baseFats: '',
      baseSaturatedFat: '',
      baseUnsaturatedFat: ''
    });
  };

  const handleEdit = (item: NutritionItem) => {
    setEditingItem(item);

    // If grams were stored, back-calculate per-100g base values so the amount
    // slider works correctly.
    const grams = item.grams && item.grams > 0 ? item.grams : null;
    const noBase = !grams;
    setEditingItemNeedsBase(noBase);
    const toBase = (val: number) =>
      grams ? (Math.round((val / grams) * 1000) / 10).toString() : '';

    setNewItem({
      name: item.name,
      // Show the values scaled to the stored gram amount
      calories: item.calories.toString(),
      protein: item.protein.toString(),
      carbs: item.carbs.toString(),
      fats: item.fats.toString(),
      saturatedFat: item.saturatedFat?.toString() || '',
      unsaturatedFat: item.unsaturatedFat?.toString() || '',
      volume: item.volume?.toString() || '',
      amount: grams ? grams.toString() : '100',
      type: item.type,
      // Base (per 100g) values — used by handleAmountChange for recalculation
      baseCalories: toBase(item.calories),
      baseProtein: toBase(item.protein),
      baseCarbs: toBase(item.carbs),
      baseFats: toBase(item.fats),
      baseSaturatedFat: item.saturatedFat ? toBase(item.saturatedFat) : '',
      baseUnsaturatedFat: item.unsaturatedFat ? toBase(item.unsaturatedFat) : '',
    });
    setIsAdding(true);
  };

  const handleAdd = () => {
    if (!newItem.name || !newItem.calories) return;

    const gramsValue = newItem.type === 'food' && newItem.amount ? Number(newItem.amount) : undefined;

    const itemData = {
      name: newItem.name,
      calories: Number(newItem.calories),
      protein: Number(newItem.protein) || 0,
      carbs: Number(newItem.carbs) || 0,
      fats: Number(newItem.fats) || 0,
      saturatedFat: newItem.saturatedFat ? Number(newItem.saturatedFat) : undefined,
      unsaturatedFat: newItem.unsaturatedFat ? Number(newItem.unsaturatedFat) : undefined,
      type: newItem.type,
      volume: newItem.volume ? Number(newItem.volume) : undefined,
      grams: gramsValue
    };

    if (editingItem) {
      updateMeal(currentDateStr, editingItem.id, itemData);
    } else {
      addMeal(currentDateStr, itemData);
    }

    closeModal();
  };

  const handleProductScanned = (product: any) => {
    setNewItem({
      name: product.brand ? `${product.brand} - ${product.name}` : product.name,
      calories: product.calories.toString(),
      protein: product.protein.toString(),
      carbs: product.carbs.toString(),
      fats: product.fats.toString(),
      saturatedFat: product.saturatedFat?.toString() || '',
      unsaturatedFat: product.unsaturatedFat?.toString() || '',
      volume: '',
      amount: '100',
      type: 'food',
      baseCalories: product.calories.toString(),
      baseProtein: product.protein.toString(),
      baseCarbs: product.carbs.toString(),
      baseFats: product.fats.toString(),
      baseSaturatedFat: product.saturatedFat?.toString() || '',
      baseUnsaturatedFat: product.unsaturatedFat?.toString() || ''
    });
    setIsScannerOpen(false);
    setIsAdding(true);
  };

  // Debounced nutrition search
  const searchNutrition = useCallback(async (query: string, page = 1, append = false) => {
    if (query.trim().length < 3 || !session?.access_token) {
      setSearchResults([]);
      setShowDropdown(false);
      setHasMoreResults(false);
      return;
    }

    // Check cache first (only for page 1)
    if (page === 1 && !append) {
      const cached = getCachedResults(query);
      if (cached) {
        setSearchResults(cached);
        setShowDropdown(true);
        setIsSearching(false);
        setHasMoreResults(cached.length >= 20);
        return;
      }
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
    }

    try {
      const response = await fetch(
        `/api/search-nutrition?query=${encodeURIComponent(query)}&limit=20&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (append) {
          setSearchResults(prev => [...prev, ...data.results]);
        } else {
          setSearchResults(data.results);
          if (page === 1) {
            setCachedResults(query, data.results);
          }
        }
        
        setShowDropdown(true);
        setHasMoreResults(data.pagination?.hasMore ?? false);
        
      } else if (response.status === 429) {
        console.error('Rate limit exceeded');
        if (!append) {
          setSearchResults([]);
        }
      } else {
        if (!append) {
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      if (!append) {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [session?.access_token]);

  // Handle search input with debouncing
  const handleSearchInput = (value: string) => {
    setNewItem({...newItem, name: value});
    setSearchPage(1);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      // Show dropdown immediately if we have matching custom items
      const hasMatchingCustomItems = customFoodItems.some(item => 
        item.name.toLowerCase().includes(value.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(value.toLowerCase()))
      );
      
      if (hasMatchingCustomItems) {
        setShowDropdown(true);
      }

      if (value.trim().length >= 3) {
        // Debounce database search (300ms)
        searchTimeoutRef.current = setTimeout(() => {
          searchNutrition(value, 1, false);
        }, 300);
      }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setHasMoreResults(false);
    }
  };

  // Load more results
  const loadMoreResults = useCallback(() => {
    if (!isLoadingMore && hasMoreResults && newItem.name.trim().length >= 3) {
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      searchNutrition(newItem.name, nextPage, true);
    }
  }, [isLoadingMore, hasMoreResults, searchPage, newItem.name, searchNutrition]);

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;

    scrollObserverRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMoreResults && !isLoadingMore) {
          loadMoreResults();
        }
      },
      { threshold: 0.1 }
    );

    if (showDropdown && searchResults.length > 0) {
      scrollObserverRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (scrollObserverRef.current) {
        scrollObserverRef.current.disconnect();
      }
    };
  }, [hasMoreResults, isLoadingMore, loadMoreResults, showDropdown, searchResults.length]);

  // Handle result selection
  const handleSelectResult = (result: NutritionSearchResult) => {
    const selectedName = result.brand ? `${result.brand} - ${result.name}` : result.name;
    setNewItem({
      name: selectedName,
      calories: result.nutrients.calories.toString(),
      protein: result.nutrients.protein.toString(),
      carbs: result.nutrients.carbs.toString(),
      fats: result.nutrients.fats.toString(),
      saturatedFat: result.nutrients.saturatedFat?.toString() || '',
      unsaturatedFat: result.nutrients.unsaturatedFat?.toString() || '',
      volume: '',
      amount: '100',
      type: newItem.type,
      // Store base values (per 100g) for recalculation
      baseCalories: result.nutrients.calories.toString(),
      baseProtein: result.nutrients.protein.toString(),
      baseCarbs: result.nutrients.carbs.toString(),
      baseFats: result.nutrients.fats.toString(),
      baseSaturatedFat: result.nutrients.saturatedFat?.toString() || '',
      baseUnsaturatedFat: result.nutrients.unsaturatedFat?.toString() || ''
    });
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Handle custom food item selection
  const handleSelectCustomItem = async (item: CustomFoodItem) => {
    const selectedName = item.brand ? `${item.brand} - ${item.name}` : item.name;
    
    // Calculate values per 100g from the serving size
    const per100gMultiplier = 100 / item.servingSize;
    const calories = Math.round(item.calories * per100gMultiplier);
    const protein = Math.round(item.protein * per100gMultiplier * 10) / 10;
    const carbs = Math.round(item.carbs * per100gMultiplier * 10) / 10;
    const fats = Math.round(item.fats * per100gMultiplier * 10) / 10;
    const saturatedFat = item.saturatedFat ? Math.round(item.saturatedFat * per100gMultiplier * 10) / 10 : 0;
    const unsaturatedFat = item.unsaturatedFat ? Math.round(item.unsaturatedFat * per100gMultiplier * 10) / 10 : 0;
    
    setNewItem({
      name: selectedName,
      calories: calories.toString(),
      protein: protein.toString(),
      carbs: carbs.toString(),
      fats: fats.toString(),
      saturatedFat: saturatedFat ? saturatedFat.toString() : '',
      unsaturatedFat: unsaturatedFat ? unsaturatedFat.toString() : '',
      volume: '',
      amount: item.servingSize.toString(), // Use original serving size
      type: newItem.type,
      // Store base values (per 100g) for recalculation
      baseCalories: calories.toString(),
      baseProtein: protein.toString(),
      baseCarbs: carbs.toString(),
      baseFats: fats.toString(),
      baseSaturatedFat: saturatedFat ? saturatedFat.toString() : '',
      baseUnsaturatedFat: unsaturatedFat ? unsaturatedFat.toString() : ''
    });
    
    // Increment usage count
    if (session?.user) {
      try {
        const supabase = getAuthenticatedClient(session.access_token);

        await incrementCustomItemUsage(supabase, item.id);
      } catch (err) {
        console.error('Error incrementing custom item usage:', err);
      }
    }
    
    setShowDropdown(false);
    setSearchResults([]);
  };

  // Handle custom item created
  const handleCustomItemCreated = (item: CustomFoodItem) => {
    setCustomFoodItems([item, ...customFoodItems]);
    handleSelectCustomItem(item);
    setShowCustomFoodModal(false);
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

  // Calculate nutrition values based on amount (in grams)
  const handleAmountChange = (amount: string) => {
    const amountNum = parseFloat(amount) || 0;
    
    // If we have base values, recalculate
    if (newItem.baseCalories) {
      const multiplier = amountNum / 100;
      
      setNewItem({
        ...newItem,
        amount: amount,
        calories: Math.round(parseFloat(newItem.baseCalories) * multiplier).toString(),
        protein: (Math.round(parseFloat(newItem.baseProtein) * multiplier * 10) / 10).toString(),
        carbs: (Math.round(parseFloat(newItem.baseCarbs) * multiplier * 10) / 10).toString(),
        fats: (Math.round(parseFloat(newItem.baseFats) * multiplier * 10) / 10).toString(),
        saturatedFat: newItem.baseSaturatedFat ? (Math.round(parseFloat(newItem.baseSaturatedFat) * multiplier * 10) / 10).toString() : '',
        unsaturatedFat: newItem.baseUnsaturatedFat ? (Math.round(parseFloat(newItem.baseUnsaturatedFat) * multiplier * 10) / 10).toString() : ''
      });
    } else {
      setNewItem({...newItem, amount: amount});
    }
  };

  // Get recent unique items from all nutrition logs (sorted by date, newest first)
  const getRecentItems = () => {
    // Sort logs by date (newest first)
    const sortedLogs = [...nutritionLogs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Collect items in reverse order (newest additions first)
    const allItems: (NutritionItem & { addedDate: string })[] = [];
    
    sortedLogs.forEach(log => {
      // Reverse the items array to get most recently added items first
      const itemsWithDate = [...log.items].reverse().map(item => ({
        ...item,
        addedDate: log.date
      }));
      allItems.push(...itemsWithDate);
    });
    
    // Create unique items based on name + nutritional values (keep first occurrence = most recent)
    const uniqueItems = new Map<string, NutritionItem & { addedDate: string }>();
    
    allItems.forEach(item => {
      const key = `${item.name}-${item.calories}-${item.protein}-${item.carbs}-${item.fats}-${item.type}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });
    
    return Array.from(uniqueItems.values());
  };

  const allRecentItems = getRecentItems();
  
  // Filter recent items based on search
  const filteredRecentItems = recentItemsSearch.trim().length > 0
    ? allRecentItems.filter(item => 
        item.name.toLowerCase().includes(recentItemsSearch.toLowerCase())
      )
    : allRecentItems;
  
  // Apply display limit for infinite scroll
  const recentItems = filteredRecentItems.slice(0, recentItemsDisplayCount);
  const hasMoreRecentItems = filteredRecentItems.length > recentItemsDisplayCount;

  const handleAddRecentItem = (item: NutritionItem) => {
    addMeal(currentDateStr, {
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      saturatedFat: item.saturatedFat,
      unsaturatedFat: item.unsaturatedFat,
      type: item.type
    });
    closeModal();
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
              onClick={() => router.push('/dashboard')}
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

        {/* Tab Selector - Only show in day view */}
        {viewMode === 'day' && (
          <div className="flex gap-2 bg-card border border-white/5 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('food')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'food' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              <Utensils size={16} />
              Food & Drinks
            </button>
            <button
              onClick={() => setActiveTab('supplements')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'supplements' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                <path d="M2 12h10v10"/>
              </svg>
              Supplements
            </button>
          </div>
        )}

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
                      dataKey={() => targets.target}
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
        {viewMode === 'day' && activeTab === 'food' && (
          <>
            <div className="bg-card border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">
                    {t.nutrition.calories} {isToday ? t.nutrition.today : format(selectedDate, 'd MMM', { locale: language === 'nl' ? nl : undefined })}
                    {targets && (
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        targets.fitnessGoal === 'bulk' ? 'bg-blue-500/20 text-blue-400' :
                        targets.fitnessGoal === 'cut'  ? 'bg-orange-500/20 text-orange-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {targets.fitnessGoal === 'bulk' ? 'Bulk +15%' : targets.fitnessGoal === 'cut' ? 'Cut −22%' : 'Onderhoud'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-5xl font-black tabular-nums">{totals.calories}</div>
                    {targets && (
                      <div className="text-lg text-muted-foreground">
                        / {targets.target}
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

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-pink-500/10 p-2 sm:p-3 rounded-xl border border-pink-500/20">
                  <div className="text-[9px] sm:text-[10px] text-pink-400 font-bold uppercase flex items-center gap-1 mb-1 leading-tight">
                    <span className="truncate">{t.nutrition.protein}</span>
                    {nutritionStatus && nutritionStatus.protein.status === 'low' && (
                      <TrendingDown size={10} className="text-amber-500 flex-shrink-0" />
                    )}
                    {nutritionStatus && nutritionStatus.protein.status === 'high' && (
                      <TrendingUp size={10} className="text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-bold tabular-nums">{totals.protein}g</div>
                  {targets && (
                    <div className="text-[8px] sm:text-[9px] text-muted-foreground mt-1 truncate">
                      {t.nutrition.goal}: {targets.protein}g
                    </div>
                  )}
                </div>
                <div className="bg-blue-500/10 p-2 sm:p-3 rounded-xl border border-blue-500/20">
                  <div className="text-[9px] sm:text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1 mb-1 leading-tight">
                    <span className="truncate">{t.nutrition.carbs}</span>
                    {nutritionStatus && nutritionStatus.carbs.status === 'low' && (
                      <TrendingDown size={10} className="text-amber-500 flex-shrink-0" />
                    )}
                    {nutritionStatus && nutritionStatus.carbs.status === 'high' && (
                      <TrendingUp size={10} className="text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-bold tabular-nums">{totals.carbs}g</div>
                  {targets && (
                    <div className="text-[8px] sm:text-[9px] text-muted-foreground mt-1 truncate">
                      {t.nutrition.goal}: {targets.carbs}g
                    </div>
                  )}
                </div>
                <div className="bg-amber-500/10 p-2 sm:p-3 rounded-xl border border-amber-500/20">
                  <div className="text-[9px] sm:text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1 mb-1 leading-tight">
                    <span className="truncate">{t.nutrition.fats}</span>
                    {nutritionStatus && nutritionStatus.fats.status === 'low' && (
                      <TrendingDown size={10} className="text-amber-500 flex-shrink-0" />
                    )}
                    {nutritionStatus && nutritionStatus.fats.status === 'high' && (
                      <TrendingUp size={10} className="text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-bold tabular-nums">{totals.fats}g</div>
                  {targets && (
                    <div className="text-[8px] sm:text-[9px] text-muted-foreground mt-1 truncate">
                      {t.nutrition.goal}: {targets.fats}g
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fat Quality Analysis */}
            {fatQuality && fatQuality.saturatedGrams + fatQuality.unsaturatedGrams > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${
                  fatQuality.quality === 'excellent' ? 'bg-green-500/10 border-green-500/30' :
                  fatQuality.quality === 'good' ? 'bg-blue-500/10 border-blue-500/30' :
                  'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 text-2xl`}>
                    {fatQuality.quality === 'excellent' ? '🟢' : fatQuality.quality === 'good' ? '🟡' : '🔴'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-2">
                      {language === 'nl' ? 'Vetkwaliteit' : 'Fat Quality'}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {fatQuality.saturatedGrams > 0 && (
                        <div className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-md">
                          Verzadigd: {fatQuality.saturatedGrams}g ({fatQuality.saturatedPercentage}%)
                        </div>
                      )}
                      {fatQuality.unsaturatedGrams > 0 && (
                        <div className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-md">
                          Onverzadigd: {fatQuality.unsaturatedGrams}g ({fatQuality.unsaturatedPercentage}%)
                        </div>
                      )}
                      {fatQuality.unknownPercentage > 0 && (
                        <div className="text-xs bg-zinc-500/20 text-zinc-400 px-2 py-1 rounded-md">
                          Onbekend: {fatQuality.unknownPercentage}%
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fatQuality.message}
                    </div>
                    {fatQuality.unknownPercentage > 30 && (
                      <div className="text-xs text-zinc-500 mt-2 italic">
                        {language === 'nl' 
                          ? 'Tip: Voeg verzadigd/onverzadigd vet toe aan je maaltijden voor betere inzichten.'
                          : 'Tip: Add saturated/unsaturated fat data to your meals for better insights.'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Training-day context insights — Phase 2 */}
            {contextResult && contextResult.insights.length > 0 && (
              <div className="space-y-2">
                {contextResult.insights.map((insight, idx) => (
                  <motion.div
                    key={insight.type}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                      insight.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/25'
                        : insight.severity === 'tip'
                        ? 'bg-blue-500/10 border-blue-500/25'
                        : 'bg-zinc-500/10 border-zinc-500/20'
                    }`}
                  >
                    <div className="text-base mt-0.5 flex-shrink-0">
                      {insight.severity === 'warning' ? '⚡' : insight.severity === 'tip' ? '💡' : 'ℹ️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-xs mb-0.5 ${
                        insight.severity === 'warning' ? 'text-amber-400' :
                        insight.severity === 'tip'     ? 'text-blue-400' :
                        'text-zinc-300'
                      }`}>{insight.title}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{insight.message}</div>
                      {insight.reference && (
                        <div className="text-[9px] text-zinc-600 mt-1">{insight.reference}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Weekly protein consistency — Phase 4 */}
            {proteinConsistency && proteinConsistency.days.some(d => d.hasLog) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-white/5 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Eiwitconsistentie (7d)</div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    proteinConsistency.consistencyScore >= 80 ? 'bg-green-500/20 text-green-400' :
                    proteinConsistency.consistencyScore >= 50 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {proteinConsistency.consistencyScore}%
                    {proteinConsistency.trend === 'improving' ? ' ↑' : proteinConsistency.trend === 'declining' ? ' ↓' : ''}
                  </div>
                </div>
                <div className="flex gap-1.5 justify-between">
                  {proteinConsistency.days.slice(-7).map(day => (
                    <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                      <div className={`h-6 w-full max-w-[28px] rounded-md ${
                        !day.hasLog ? 'bg-white/5' :
                        day.met      ? 'bg-green-500/70' :
                                       'bg-red-400/50'
                      }`} title={`${day.date}: ${day.protein}g / ${day.target}g`} />
                      <div className="text-[8px] text-muted-foreground">
                        {format(new Date(day.date), 'dd/MM')}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-zinc-600 mt-2">Areta et al. 2013 · ≥80% eiwitdoel per dag = groen</div>
              </motion.div>
            )}

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
                  <div className="font-bold text-primary text-sm">{language === 'nl' ? 'Stel je profiel in' : 'Set up your profile'}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {language === 'nl' 
                      ? 'Vul de Fitness Calculator in bij Progress om gepersonaliseerde doelen en aanbevelingen te krijgen.'
                      : 'Complete the Fitness Calculator in Progress to get personalized goals and recommendations.'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Water Tracker */}
            {viewMode === 'day' && activeTab === 'food' && (
              <WaterTracker 
                currentIntake={todaysLog?.waterIntake || 0}
                targetIntake={2000}
                onAddWater={(amount) => addWater(currentDateStr, amount)}
              />
            )}

            {/* Quick Meal Templates */}
            {viewMode === 'day' && activeTab === 'food' && isToday && (
              <QuickMealTemplates onTemplateLogged={() => window.location.reload()} />
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-muted-foreground/60 md:opacity-0 md:group-hover:opacity-100 hover:text-primary p-2 hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => deleteMeal(currentDateStr, item.id)}
                            className="text-red-500/60 md:opacity-0 md:group-hover:opacity-100 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>

              {/* Per-item protein highlights — Phase 3 */}
              {/* Areta et al. 2013: consuming ≥0.4 g/kg protein per meal, 4× per day, */}
              {/* maximises muscle protein synthesis throughout the day               */}
              {items.length > 0 && userProfile && targets && (() => {
                const perMealTarget = Math.round(userProfile.weight * 0.4);
                const proteinRichItems = items
                  .filter(i => i.protein >= 10)
                  .sort((a, b) => b.protein - a.protein);
                const hitCount = proteinRichItems.filter(i => i.protein >= perMealTarget).length;
                const recommended = 4;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 pt-4 border-t border-white/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Eiwitmomentjes</div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        hitCount >= recommended ? 'bg-green-500/20 text-green-400' :
                        hitCount >= 2 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-zinc-500/20 text-zinc-500'
                      }`}>{hitCount}/{recommended}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500 mb-2">
                      Doel: {recommended}× ≥{perMealTarget}g eiwit per maaltijd · Areta et al. 2013
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {proteinRichItems.slice(0, 8).map(item => (
                        <div key={item.id} className={`text-[10px] px-2 py-1 rounded-lg font-medium ${
                          item.protein >= perMealTarget
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                        }`}>
                          {item.name.length > 18 ? item.name.slice(0, 16) + '…' : item.name} · {Math.round(item.protein)}g
                        </div>
                      ))}
                      {proteinRichItems.length === 0 && (
                        <div className="text-[10px] text-zinc-600 italic">Nog geen eiwitrijke items gelogd.</div>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
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
            onClick={closeModal}
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
                  <h2 className="text-xl font-bold">{editingItem ? (language === 'nl' ? 'Wijzig Maaltijd' : 'Edit Meal') : t.nutrition.addMeal}</h2>
                  <button 
                    onClick={closeModal}
                    className="text-muted-foreground"
                  >
                    ✕
                  </button>
                </div>

                {/* Recent Items Section — hidden when editing an existing item */}
                {!editingItem && allRecentItems.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Clock size={14} className="text-primary" />
                        {t.nutrition.recentlyAdded}
                      </h3>
                      <div className="text-xs text-muted-foreground">
                        {filteredRecentItems.length} {filteredRecentItems.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                    
                    {/* Search bar for recent items */}
                    <div className="mb-3">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={recentItemsSearch}
                          onChange={(e) => {
                            setRecentItemsSearch(e.target.value);
                            setRecentItemsDisplayCount(10); // Reset display count on search
                          }}
                          placeholder={language === 'nl' ? 'Zoek in recent toegevoegd...' : 'Search recent items...'}
                          className="w-full pl-9 pr-3 py-2 bg-card border border-white/10 rounded-lg text-sm focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                    
                    <div 
                      ref={recentItemsScrollRef}
                      className="max-h-80 overflow-y-auto space-y-2 pr-1 -mr-1"
                    >
                      {recentItems.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {recentItemsSearch.trim().length > 0 
                            ? (language === 'nl' ? 'Geen resultaten gevonden' : 'No results found')
                            : (language === 'nl' ? 'Geen items gevonden' : 'No items found')
                          }
                        </div>
                      ) : (
                        <>
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
                          
                          {/* Load More Button */}
                          {hasMoreRecentItems && (
                            <button
                              onClick={() => setRecentItemsDisplayCount(prev => prev + 10)}
                              className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors font-semibold"
                            >
                              {language === 'nl' 
                                ? `Laad meer... (${recentItems.length} van ${filteredRecentItems.length})`
                                : `Load more... (${recentItems.length} of ${filteredRecentItems.length})`
                              }
                            </button>
                          )}
                        </>
                      )}
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
                      placeholder={language === 'nl' ? 'Zoek product... (bijv. "halfvolle melk")' : 'Search product... (e.g. "milk")'}
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
                    {showDropdown && (searchResults.length > 0 || customFoodItems.length > 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-bg-secondary border border-border-default rounded-professional shadow-elevated overflow-hidden max-h-96 overflow-y-auto"
                      >
                        {/* Custom Food Items Section */}
                        {customFoodItems.length > 0 && newItem.name.trim().length >= 2 && (
                          (() => {
                            const filtered = customFoodItems.filter(item => 
                              item.name.toLowerCase().includes(newItem.name.toLowerCase()) ||
                              (item.brand && item.brand.toLowerCase().includes(newItem.name.toLowerCase()))
                            );
                            
                            if (filtered.length > 0) {
                              return (
                                <>
                                  <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20">
                                    <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                                      {t.customFood.yourItems}
                                    </div>
                                  </div>
                                  {filtered.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => handleSelectCustomItem(item)}
                                      className="w-full p-4 text-left hover:bg-bg-tertiary transition-colors border-b border-border-default flex gap-3"
                                    >
                                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                        <Utensils className="w-5 h-5 text-white" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate text-txt-primary">
                                              {item.name}
                                            </div>
                                            {item.brand && (
                                              <div className="text-xs text-txt-tertiary truncate mt-0.5">
                                                {item.brand}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                                              <span className="font-semibold text-accent-primary">
                                                {item.calories} kcal
                                              </span>
                                              {item.protein > 0 && (
                                                <span className="text-pink-400">
                                                  {item.protein}g P
                                                </span>
                                              )}
                                              {item.carbs > 0 && (
                                                <span className="text-blue-400">
                                                  {item.carbs}g C
                                                </span>
                                              )}
                                              {item.fats > 0 && (
                                                <span className="text-amber-400">
                                                  {item.fats}g F
                                                </span>
                                              )}
                                              <span className="text-txt-tertiary">
                                                • per {item.servingSize}{item.servingUnit}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex-shrink-0 text-[10px] text-purple-400 uppercase tracking-wider font-semibold">
                                            {t.customFood.custom}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </>
                              );
                            }
                            return null;
                          })()
                        )}

                        {/* Database Search Results */}
                        {searchResults.length > 0 && (
                          <>
                            {customFoodItems.length > 0 && (
                              <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
                                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                                  {t.customFood.database}
                                </div>
                              </div>
                            )}
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSelectResult(result)}
                            className="w-full p-4 text-left hover:bg-bg-tertiary transition-colors border-b border-border-default last:border-0 flex gap-3"
                          >
                            {/* Product Image */}
                            {result.imageUrl && (
                              <div className="flex-shrink-0 w-16 h-16 bg-bg-primary rounded-professional overflow-hidden border border-border-light">
                                <img 
                                  src={result.imageUrl} 
                                  alt={result.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate text-txt-primary">
                                    {result.name}
                                  </div>
                                  {result.brand && (
                                    <div className="text-xs text-txt-tertiary truncate mt-0.5">
                                      {result.brand}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                                    <span className="font-semibold text-accent-primary">
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
                                <div className="flex-shrink-0 text-[10px] text-txt-tertiary uppercase tracking-wider font-semibold">
                                  {result.source === 'openfoodfacts' ? 'OFF' : 'USDA'}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                        
                        {/* Infinite Scroll Trigger & Status */}
                        {hasMoreResults ? (
                          <div ref={loadMoreTriggerRef} className="p-4 text-center">
                            {isLoadingMore ? (
                              <div className="flex items-center justify-center gap-2 text-txt-tertiary">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">Laden...</span>
                              </div>
                            ) : (
                              <button
                                onClick={loadMoreResults}
                                className="text-sm text-accent-primary hover:text-accent-secondary transition-colors font-semibold"
                              >
                                Meer resultaten laden (pagina {searchPage} van 25)
                              </button>
                            )}
                          </div>
                        ) : searchResults.length >= 20 ? (
                          <div className="p-4 text-center text-sm text-txt-tertiary">
                            <Check size={16} className="inline mr-2 text-accent-success" />
                            Alle {searchResults.length} resultaten geladen
                          </div>
                        ) : null}
                          </>
                        )}
                        
                        {/* Add Custom Item Button */}
                        {newItem.name.trim().length >= 2 && (
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              setShowCustomFoodModal(true);
                            }}
                            className="w-full p-4 bg-gradient-to-r from-purple-500/10 to-pink-600/10 hover:from-purple-500/20 hover:to-pink-600/20 border-t border-purple-500/20 transition-all flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300"
                          >
                            <Plus size={16} />
                            <span className="font-semibold text-sm">
                              {t.customFood.createNew}
                            </span>
                          </button>
                        )}
                        
                        <div className="p-2 text-[10px] text-center text-txt-tertiary border-t border-border-default">
                          {language === 'nl' 
                            ? `${searchResults.length} resultaten • Data van Open Food Facts & USDA • per 100g/ml` 
                            : `${searchResults.length} results • Data from Open Food Facts & USDA • per 100g/ml`}
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

                {/* Amount Field - For Food (grams) */}
                {newItem.type === 'food' && (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-primary uppercase mb-2 block flex items-center gap-2">
                      {language === 'nl' ? 'Hoeveelheid (gram)' : 'Amount (grams)'}
                      {newItem.baseCalories && (
                        <span className="text-[10px] text-muted-foreground normal-case font-normal">
                          • {t.nutrition.per100g}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={newItem.amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="100"
                      className="w-full bg-card border-2 border-primary/30 rounded-xl p-3 focus:border-primary outline-none text-lg font-bold"
                    />
                    {editingItem && editingItemNeedsBase && (
                      <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {language === 'nl' ? 'Voeg per-100g waarden toe om de berekening te activeren' : 'Add per-100g values to enable recalculation'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: language === 'nl' ? 'Kcal / 100g' : 'Kcal / 100g', key: 'baseCalories', placeholder: '293' },
                            { label: language === 'nl' ? 'Eiwit / 100g' : 'Protein / 100g', key: 'baseProtein', placeholder: '2.7' },
                            { label: language === 'nl' ? 'Koolhydr. / 100g' : 'Carbs / 100g', key: 'baseCarbs', placeholder: '66' },
                            { label: language === 'nl' ? 'Vetten / 100g' : 'Fats / 100g', key: 'baseFats', placeholder: '1.0' },
                          ].map(({ label, key, placeholder }) => (
                            <div key={key}>
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block">{label}</label>
                              <input
                                type="number"
                                step="0.1"
                                value={newItem[key as keyof typeof newItem]}
                                onChange={(e) => {
                                  const updated = { ...newItem, [key]: e.target.value };
                                  // If all four base fields are filled, immediately recalculate for the current amount
                                  if (updated.baseCalories && updated.baseProtein && updated.baseCarbs && updated.baseFats) {
                                    const multiplier = (parseFloat(updated.amount) || 100) / 100;
                                    setNewItem({
                                      ...updated,
                                      calories: Math.round(parseFloat(updated.baseCalories) * multiplier).toString(),
                                      protein: (Math.round(parseFloat(updated.baseProtein) * multiplier * 10) / 10).toString(),
                                      carbs: (Math.round(parseFloat(updated.baseCarbs) * multiplier * 10) / 10).toString(),
                                      fats: (Math.round(parseFloat(updated.baseFats) * multiplier * 10) / 10).toString(),
                                      saturatedFat: updated.baseSaturatedFat ? (Math.round(parseFloat(updated.baseSaturatedFat) * multiplier * 10) / 10).toString() : updated.saturatedFat,
                                      unsaturatedFat: updated.baseUnsaturatedFat ? (Math.round(parseFloat(updated.baseUnsaturatedFat) * multiplier * 10) / 10).toString() : updated.unsaturatedFat,
                                    });
                                  } else {
                                    setNewItem(updated);
                                  }
                                }}
                                placeholder={placeholder}
                                className="w-full bg-card border border-white/10 rounded-lg p-2 text-sm focus:border-primary outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Volume Field - For Drinks (ml) */}
                {newItem.type === 'drink' && (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-blue-400 uppercase mb-2 block flex items-center gap-2">
                      <Droplet size={14} />
                      {language === 'nl' ? 'Volume (ml)' : 'Volume (ml)'}
                    </label>
                    <input
                      type="number"
                      value={newItem.volume}
                      onChange={(e) => setNewItem({...newItem, volume: e.target.value})}
                      placeholder="250"
                      className="w-full bg-card border-2 border-blue-500/30 rounded-xl p-3 focus:border-blue-500/50 outline-none text-lg font-bold"
                    />
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {language === 'nl' 
                        ? 'Dit wordt automatisch toegevoegd aan je hydratatie tracking' 
                        : 'This will be automatically added to your hydration tracking'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">{t.nutrition.calories}</label>
                    <input
                      type="number"
                      value={newItem.calories}
                      onChange={(e) => setNewItem({...newItem, calories: e.target.value})}
                      placeholder="200"
                      className="w-full bg-card border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                      disabled={!!newItem.baseCalories}
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
                      disabled={!!newItem.baseCalories}
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
                      disabled={!!newItem.baseCalories}
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
                      disabled={!!newItem.baseCalories}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                      Verzadigd vet (g) <span className="text-[10px] text-zinc-600 font-normal ml-1">optioneel</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newItem.saturatedFat}
                      onChange={(e) => setNewItem({...newItem, saturatedFat: e.target.value})}
                      placeholder="2"
                      className="w-full bg-card border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                      disabled={!!newItem.baseCalories}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                      Onverzadigd vet (g) <span className="text-[10px] text-zinc-600 font-normal ml-1">optioneel</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newItem.unsaturatedFat}
                      onChange={(e) => setNewItem({...newItem, unsaturatedFat: e.target.value})}
                      placeholder="3"
                      className="w-full bg-card border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                      disabled={!!newItem.baseCalories}
                    />
                  </div>
                </div>

                <button
                  onClick={handleAdd}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Check size={20} /> {editingItem ? (language === 'nl' ? 'Opslaan' : 'Save') : t.common.add}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supplements Tab */}
      {viewMode === 'day' && activeTab === 'supplements' && (
        <div className="bg-card border border-white/5 rounded-3xl p-6">
          <SupplementsSection 
            selectedDate={selectedDate} 
            onOpenCoach={() => setShowSupplementsCoach(true)}
          />
        </div>
      )}

      {/* Supplements Coach Modal */}
      <AnimatePresence>
        {showSupplementsCoach && (
          <SupplementsCoach onClose={() => setShowSupplementsCoach(false)} />
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

      {/* Custom Food Item Modal */}
      <CustomFoodItemModal
        isOpen={showCustomFoodModal}
        onClose={() => setShowCustomFoodModal(false)}
        onItemCreated={handleCustomItemCreated}
      />
    </div>
  );
}
