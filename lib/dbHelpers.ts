/**
 * Supabase Database Helper Functions
 * Centralized database operations with error handling and type safety
 */

import { supabase } from '@/lib/supabase'

/**
 * Generic function to fetch user data from any table
 */
export async function fetchUserData<T>(
  table: string,
  userId: string,
  options?: {
    orderBy?: { column: string; ascending: boolean }
    select?: string
  }
): Promise<T[]> {
  let query = supabase
    .from(table)
    .select(options?.select || '*')
    .eq('user_id', userId)

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { 
      ascending: options.orderBy.ascending 
    })
  }

  const { data, error } = await query

  if (error) {
    console.error(`Error fetching from ${table}:`, error)
    throw error
  }

  return (data as T[]) || []
}

/**
 * Generic function to insert user data
 */
export async function insertUserData<T>(
  table: string,
  userId: string,
  data: Partial<T>
): Promise<T | null> {
  const { data: inserted, error } = await supabase
    .from(table)
    .insert({
      user_id: userId,
      ...data
    })
    .select()
    .single()

  if (error) {
    console.error(`Error inserting into ${table}:`, error)
    throw error
  }

  return inserted as T
}

/**
 * Generic function to update user data
 */
export async function updateUserData<T>(
  table: string,
  id: string,
  userId: string,
  updates: Partial<T>
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error(`Error updating ${table}:`, error)
    throw error
  }

  return data as T
}

/**
 * Generic function to delete user data
 */
export async function deleteUserData(
  table: string,
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error(`Error deleting from ${table}:`, error)
    throw error
  }
}

/**
 * Batch insert operation
 */
export async function batchInsertUserData<T>(
  table: string,
  userId: string,
  items: Partial<T>[]
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .insert(
      items.map(item => ({
        user_id: userId,
        ...item
      }))
    )
    .select()

  if (error) {
    console.error(`Error batch inserting into ${table}:`, error)
    throw error
  }

  return (data as T[]) || []
}
