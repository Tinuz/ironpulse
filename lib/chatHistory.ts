/**
 * AI Chat History Service
 * Handles persistence and retrieval of AI coach conversations
 */

import { supabase } from './supabase'

export type CoachType = 'ai_trainer' | 'supplements_coach'

export interface ChatHistoryMessage {
  id: string
  user_id: string
  coach_type: CoachType
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metadata?: Record<string, any>
}

export interface SaveMessageParams {
  userId: string
  coachType: CoachType
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, any>
}

/**
 * Save a chat message to history
 */
export async function saveChatMessage(params: SaveMessageParams): Promise<ChatHistoryMessage | null> {
  const { userId, coachType, role, content, metadata } = params

  const { data, error } = await supabase
    .from('ai_chat_history')
    .insert({
      user_id: userId,
      coach_type: coachType,
      role,
      content,
      metadata: metadata || {}
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving chat message:', error)
    return null
  }

  return data
}

/**
 * Get recent chat history for a user and coach type
 * @param limit - Maximum number of messages to retrieve (default: 50, for ~25 exchanges)
 */
export async function getChatHistory(
  userId: string,
  coachType: CoachType,
  limit: number = 50
): Promise<ChatHistoryMessage[]> {
  const { data, error } = await supabase
    .from('ai_chat_history')
    .select('*')
    .eq('user_id', userId)
    .eq('coach_type', coachType)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching chat history:', error)
    return []
  }

  return data || []
}

/**
 * Get recent chat history (last N messages) for context window
 * This is optimized for sending to the AI API
 */
export async function getRecentChatHistory(
  userId: string,
  coachType: CoachType,
  limit: number = 30
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const messages = await getChatHistory(userId, coachType, limit)
  
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }))
}

/**
 * Clear all chat history for a user and coach type
 */
export async function clearChatHistory(userId: string, coachType: CoachType): Promise<boolean> {
  const { error } = await supabase
    .from('ai_chat_history')
    .delete()
    .eq('user_id', userId)
    .eq('coach_type', coachType)

  if (error) {
    console.error('Error clearing chat history:', error)
    return false
  }

  return true
}

/**
 * Clear all chat history for a user (all coach types)
 */
export async function clearAllChatHistory(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_chat_history')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Error clearing all chat history:', error)
    return false
  }

  return true
}

/**
 * Get chat statistics for a user
 */
export async function getChatStats(userId: string, coachType?: CoachType) {
  let query = supabase
    .from('ai_chat_history')
    .select('id, coach_type, role, created_at', { count: 'exact' })
    .eq('user_id', userId)

  if (coachType) {
    query = query.eq('coach_type', coachType)
  }

  const { count, error } = await query

  if (error) {
    console.error('Error fetching chat stats:', error)
    return { totalMessages: 0 }
  }

  return {
    totalMessages: count || 0
  }
}
