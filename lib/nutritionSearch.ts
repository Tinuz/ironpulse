/**
 * Nutrition Search Utilities
 * Helper functions for API mapping, deduplication, and caching
 */

import { 
  OpenFoodFactsProduct, 
  USDAFood, 
  NutritionSearchResult,
  CachedSearchEntry 
} from '@/types/nutrition';

// ===== Cache Management =====
const CACHE_KEY = 'nutrition_search_cache';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedResults(query: string): NutritionSearchResult[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cache: CachedSearchEntry[] = JSON.parse(cached);
    const entry = cache.find(e => e.query.toLowerCase() === query.toLowerCase());
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      // Expired, remove it
      const updated = cache.filter(e => e.query.toLowerCase() !== query.toLowerCase());
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      return null;
    }
    
    return entry.results;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export function setCachedResults(query: string, results: NutritionSearchResult[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    let cache: CachedSearchEntry[] = cached ? JSON.parse(cached) : [];
    
    // Remove old entry for this query
    cache = cache.filter(e => e.query.toLowerCase() !== query.toLowerCase());
    
    // Add new entry
    cache.push({
      query,
      results,
      timestamp: Date.now(),
      ttl: DEFAULT_TTL
    });
    
    // Limit cache size to 50 entries (FIFO)
    if (cache.length > 50) {
      cache = cache.slice(-50);
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// ===== Open Food Facts Mapping =====
export function mapOpenFoodFactsProduct(product: OpenFoodFactsProduct): NutritionSearchResult | null {
  const name = product.product_name_nl || product.product_name;
  if (!name || !product.nutriments) return null;
  
  const nutrients = product.nutriments;
  
  // Require at least calories to be valid
  if (!nutrients['energy-kcal_100g']) return null;
  
  return {
    id: `off_${product.code || Math.random().toString(36).substr(2, 9)}`,
    name: name,
    brand: product.brands,
    source: 'openfoodfacts',
    nutrients: {
      calories: Math.round(nutrients['energy-kcal_100g'] || 0),
      protein: Math.round((nutrients.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((nutrients.carbohydrates_100g || 0) * 10) / 10,
      fats: Math.round((nutrients.fat_100g || 0) * 10) / 10,
      fiber: nutrients.fiber_100g ? Math.round(nutrients.fiber_100g * 10) / 10 : undefined,
      sugars: nutrients.sugars_100g ? Math.round(nutrients.sugars_100g * 10) / 10 : undefined,
      sodium: nutrients.sodium_100g ? Math.round((nutrients.sodium_100g * 1000) * 10) / 10 : undefined // Convert g to mg
    },
    servingSize: product.serving_size || product.quantity,
    imageUrl: product.image_url
  };
}

// ===== USDA FoodData Central Mapping =====
const USDA_NUTRIENT_IDS = {
  ENERGY: 1008, // Energy (kcal)
  PROTEIN: 1003, // Protein (g)
  CARBS: 1005, // Carbohydrate, by difference (g)
  FAT: 1004, // Total lipid (fat) (g)
  FIBER: 1079, // Fiber, total dietary (g)
  SUGARS: 2000, // Sugars, total including NLEA (g)
  SODIUM: 1093 // Sodium, Na (mg)
};

export function mapUSDAFood(food: USDAFood): NutritionSearchResult | null {
  if (!food.description || !food.foodNutrients || food.foodNutrients.length === 0) {
    return null;
  }
  
  const getNutrient = (nutrientId: number): number => {
    const nutrient = food.foodNutrients.find(n => n.nutrientId === nutrientId);
    return nutrient?.value || 0;
  };
  
  const calories = getNutrient(USDA_NUTRIENT_IDS.ENERGY);
  
  // Require calories to be valid
  if (calories === 0) return null;
  
  return {
    id: `usda_${food.fdcId}`,
    name: food.description,
    brand: food.brandOwner,
    source: 'usda',
    nutrients: {
      calories: Math.round(calories),
      protein: Math.round(getNutrient(USDA_NUTRIENT_IDS.PROTEIN) * 10) / 10,
      carbs: Math.round(getNutrient(USDA_NUTRIENT_IDS.CARBS) * 10) / 10,
      fats: Math.round(getNutrient(USDA_NUTRIENT_IDS.FAT) * 10) / 10,
      fiber: getNutrient(USDA_NUTRIENT_IDS.FIBER) || undefined,
      sugars: getNutrient(USDA_NUTRIENT_IDS.SUGARS) || undefined,
      sodium: getNutrient(USDA_NUTRIENT_IDS.SODIUM) || undefined
    },
    servingSize: food.servingSize && food.servingSizeUnit 
      ? `${food.servingSize}${food.servingSizeUnit}` 
      : undefined
  };
}

// ===== Deduplication with Fuzzy Matching =====
export function deduplicateResults(results: NutritionSearchResult[]): NutritionSearchResult[] {
  const seen = new Set<string>();
  const unique: NutritionSearchResult[] = [];
  
  for (const result of results) {
    // Create a normalized key for comparison
    const normalizedName = result.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special chars
      .trim();
    
    const key = `${normalizedName}_${result.nutrients.calories}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(result);
    }
  }
  
  return unique;
}

// ===== Result Sorting (prioritize relevance) =====
export function sortByRelevance(results: NutritionSearchResult[], query: string): NutritionSearchResult[] {
  const lowerQuery = query.toLowerCase();
  
  return results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    // Exact match first
    if (aName === lowerQuery) return -1;
    if (bName === lowerQuery) return 1;
    
    // Starts with query
    if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
    if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1;
    
    // Contains query
    if (aName.includes(lowerQuery) && !bName.includes(lowerQuery)) return -1;
    if (bName.includes(lowerQuery) && !aName.includes(lowerQuery)) return 1;
    
    // Prefer Open Food Facts (more relevant for Dutch users)
    if (a.source === 'openfoodfacts' && b.source === 'usda') return -1;
    if (a.source === 'usda' && b.source === 'openfoodfacts') return 1;
    
    return 0;
  });
}
