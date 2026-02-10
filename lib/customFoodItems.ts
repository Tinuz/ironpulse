/**
 * Custom Food Items Service
 * CRUD operations for user-defined custom food items
 */

import {
  CustomFoodItem,
  CreateCustomFoodItemRequest,
  UpdateCustomFoodItemRequest
} from '@/types/nutrition';

// ===== DATABASE HELPERS =====

/**
 * Convert database row to CustomFoodItem
 */
function mapDbRowToCustomItem(row: any): CustomFoodItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    brand: row.brand,
    calories: parseFloat(row.calories),
    protein: parseFloat(row.protein),
    carbs: parseFloat(row.carbs),
    fats: parseFloat(row.fats),
    servingSize: parseFloat(row.serving_size),
    servingUnit: row.serving_unit,
    category: row.category,
    notes: row.notes,
    usageCount: row.usage_count || 0,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ===== CRUD OPERATIONS =====

/**
 * Get all custom food items for a user
 */
export async function getCustomFoodItems(
  supabase: any,
  userId: string,
  options?: {
    limit?: number;
    sortBy?: 'name' | 'usage' | 'recent';
  }
): Promise<CustomFoodItem[]> {
  try {
    let query = supabase
      .from('custom_food_items')
      .select('*')
      .eq('user_id', userId);

    // Apply sorting
    const sortBy = options?.sortBy || 'name';
    if (sortBy === 'usage') {
      query = query.order('usage_count', { ascending: false });
    } else if (sortBy === 'recent') {
      query = query.order('last_used_at', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('name', { ascending: true });
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching custom food items:', error);
      return [];
    }

    return (data || []).map(mapDbRowToCustomItem);
  } catch (err) {
    console.error('Exception fetching custom food items:', err);
    return [];
  }
}

/**
 * Search custom food items by name
 */
export async function searchCustomFoodItems(
  supabase: any,
  userId: string,
  searchQuery: string
): Promise<CustomFoodItem[]> {
  try {
    const { data, error } = await supabase
      .from('custom_food_items')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${searchQuery}%`)
      .order('usage_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error searching custom food items:', error);
      return [];
    }

    return (data || []).map(mapDbRowToCustomItem);
  } catch (err) {
    console.error('Exception searching custom food items:', err);
    return [];
  }
}

/**
 * Get single custom food item by ID
 */
export async function getCustomFoodItem(
  supabase: any,
  itemId: string
): Promise<CustomFoodItem | null> {
  try {
    const { data, error } = await supabase
      .from('custom_food_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error || !data) {
      console.error('Error fetching custom food item:', error);
      return null;
    }

    return mapDbRowToCustomItem(data);
  } catch (err) {
    console.error('Exception fetching custom food item:', err);
    return null;
  }
}

/**
 * Create new custom food item
 */
export async function createCustomFoodItem(
  supabase: any,
  userId: string,
  request: CreateCustomFoodItemRequest
): Promise<CustomFoodItem | null> {
  try {
    const { data, error } = await supabase
      .from('custom_food_items')
      .insert({
        user_id: userId,
        name: request.name,
        brand: request.brand,
        calories: request.calories,
        protein: request.protein,
        carbs: request.carbs,
        fats: request.fats,
        serving_size: request.servingSize,
        serving_unit: request.servingUnit,
        category: request.category,
        notes: request.notes,
        usage_count: 0
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating custom food item:', error);
      return null;
    }

    return mapDbRowToCustomItem(data);
  } catch (err) {
    console.error('Exception creating custom food item:', err);
    return null;
  }
}

/**
 * Update existing custom food item
 */
export async function updateCustomFoodItem(
  supabase: any,
  itemId: string,
  updates: UpdateCustomFoodItemRequest
): Promise<CustomFoodItem | null> {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.brand !== undefined) updateData.brand = updates.brand;
    if (updates.calories !== undefined) updateData.calories = updates.calories;
    if (updates.protein !== undefined) updateData.protein = updates.protein;
    if (updates.carbs !== undefined) updateData.carbs = updates.carbs;
    if (updates.fats !== undefined) updateData.fats = updates.fats;
    if (updates.servingSize !== undefined) updateData.serving_size = updates.servingSize;
    if (updates.servingUnit !== undefined) updateData.serving_unit = updates.servingUnit;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('custom_food_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating custom food item:', error);
      return null;
    }

    return mapDbRowToCustomItem(data);
  } catch (err) {
    console.error('Exception updating custom food item:', err);
    return null;
  }
}

/**
 * Delete custom food item
 */
export async function deleteCustomFoodItem(
  supabase: any,
  itemId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('custom_food_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting custom food item:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception deleting custom food item:', err);
    return false;
  }
}

/**
 * Increment usage count and update last used timestamp
 */
export async function incrementCustomItemUsage(
  supabase: any,
  itemId: string
): Promise<void> {
  try {
    // Get current item
    const { data: item } = await supabase
      .from('custom_food_items')
      .select('usage_count')
      .eq('id', itemId)
      .single();

    if (item) {
      await supabase
        .from('custom_food_items')
        .update({
          usage_count: (item.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', itemId);
    }
  } catch (err) {
    console.error('Error incrementing custom item usage:', err);
  }
}
