/**
 * API Request/Response Types
 * Shared type definitions for API contracts between client and server
 */

// ===== Chat API Types =====
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Pre-formatted user context string containing workout history, stats, nutrition data */
  userData?: string;
  coachProfile?: 'motiverend' | 'streng' | 'wetenschappelijk' | 'vriendelijk' | 'powerlifting' | 'bodybuilding';
}

export interface ChatResponse {
  message: string;
  tokens?: number;
  model?: string;
}

export interface ChatErrorResponse {
  error: string;
  details?: any;
  retryAfter?: number;
}

// ===== Workout Generator API Types =====
export interface WorkoutGeneratorRequest {
  userGoal: string;
  experienceLevel: string;
  daysPerWeek: number;
  sessionDuration: number;
  availableEquipment: string[];
  preferences?: string;
  injuries?: string;
}

export interface WorkoutGeneratorResponse {
  workout: any; // TODO: Define proper workout type
  estimatedCost: number;
}

// ===== Accessory Suggestions API Types =====
export interface AccessorySuggestionsRequest {
  exerciseName: string;
  muscleGroup: string;
  experienceLevel?: string;
}

export interface AccessorySuggestionsResponse {
  suggestions: string[];
  reasoning?: string;
}
