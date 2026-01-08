/**
 * Nutrition Search Types
 * Interfaces for Open Food Facts, USDA FoodData Central, and unified search results
 */

// ===== Open Food Facts Types =====
export interface OpenFoodFactsNutrients {
  'energy-kcal_100g'?: number;
  'proteins_100g'?: number;
  'carbohydrates_100g'?: number;
  'fat_100g'?: number;
  'fiber_100g'?: number;
  'sugars_100g'?: number;
  'salt_100g'?: number;
  'sodium_100g'?: number;
}

export interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_nl?: string;
  brands?: string;
  nutriments?: OpenFoodFactsNutrients;
  serving_size?: string;
  quantity?: string;
  image_url?: string;
  code?: string; // barcode
}

export interface OpenFoodFactsResponse {
  count: number;
  page: number;
  page_size: number;
  products: OpenFoodFactsProduct[];
}

// ===== USDA FoodData Central Types =====
export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface USDAResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}

// ===== Unified Search Result =====
export interface NutritionSearchResult {
  id: string; // Unique identifier (OFF code or USDA fdcId)
  name: string; // Product name
  brand?: string; // Brand name if available
  source: 'openfoodfacts' | 'usda'; // Data source
  
  // Nutrients per 100g/100ml (standardized)
  nutrients: {
    calories: number; // kcal
    protein: number; // g
    carbs: number; // g
    fats: number; // g
    fiber?: number; // g (optional)
    sugars?: number; // g (optional)
    sodium?: number; // mg (optional)
  };
  
  // Metadata
  servingSize?: string; // e.g., "100ml", "1 slice (30g)"
  imageUrl?: string;
}

// ===== API Request/Response Types =====
export interface NutritionSearchRequest {
  query: string; // Search term (Dutch)
  limit?: number; // Max results (default: 10)
}

export interface NutritionSearchResponse {
  results: NutritionSearchResult[];
  totalResults: number;
  cached: boolean; // Whether results came from cache
  sources: {
    openfoodfacts: number; // Number of results from OFF
    usda: number; // Number of results from USDA
  };
}

// ===== Cache Entry =====
export interface CachedSearchEntry {
  query: string;
  results: NutritionSearchResult[];
  timestamp: number; // Unix timestamp
  ttl: number; // Time to live in ms (default: 24 hours)
}
