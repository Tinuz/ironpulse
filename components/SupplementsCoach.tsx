'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Pill, Loader2 } from 'lucide-react'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { getCsrfToken } from '@/lib/csrfClient'
import type { ChatMessage } from '@/types/api'
import { format } from 'date-fns'

interface SupplementsCoachProps {
  onClose: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function SupplementsCoach({ onClose }: SupplementsCoachProps) {
  const { supplements, userProfile, history } = useData()
  const { session } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initial greeting
    const greeting: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Hey! I'm your brutal honest supplements coach. I'm here to cut through the BS and tell you exactly what works, what doesn't, and what's just marketing hype.\n\nI can see you're tracking ${supplements.length} supplement${supplements.length !== 1 ? 's' : ''}. Let me know what you want to optimize—muscle gain, fat loss, performance, recovery—and I'll give you the real deal. No sugar coating.\n\nWhat's on your mind?`,
      timestamp: Date.now()
    }
    setMessages([greeting])
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const generateSupplementsContext = (): string => {
    const parts: string[] = []

    // Current supplements
    if (supplements.length > 0) {
      parts.push('CURRENT SUPPLEMENTS:')
      const recentSupplements = supplements.slice(0, 30) // Last 30 entries
      const supplementsByName = recentSupplements.reduce((acc, supp) => {
        if (!acc[supp.name]) {
          acc[supp.name] = []
        }
        acc[supp.name].push(supp)
        return acc
      }, {} as Record<string, typeof supplements>)

      Object.entries(supplementsByName).forEach(([name, supps]) => {
        const latest = supps[0]
        parts.push(`- ${name}: ${latest.dosageAmount}${latest.dosageUnit}${latest.timing ? ` (${latest.timing})` : ''}${latest.brand ? ` [${latest.brand}]` : ''}`)
      })
    } else {
      parts.push('CURRENT SUPPLEMENTS: None logged yet')
    }

    // User profile
    if (userProfile) {
      parts.push('\nUSER PROFILE:')
      parts.push(`- Age: ${userProfile.age}, Gender: ${userProfile.gender}`)
      parts.push(`- Weight: ${userProfile.weight}kg, Height: ${userProfile.height}cm`)
      
      const activityLabels: Record<number, string> = {
        1.2: 'Sedentary',
        1.375: 'Lightly Active',
        1.55: 'Moderately Active',
        1.725: 'Very Active',
        1.9: 'Extremely Active'
      }
      parts.push(`- Activity Level: ${activityLabels[userProfile.activityLevel] || 'Unknown'}`)
    }

    // Training frequency
    if (history.length > 0) {
      const last30Days = history.filter(w => {
        const workoutDate = new Date(w.date)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return workoutDate >= thirtyDaysAgo
      })
      parts.push(`\nTRAINING FREQUENCY: ${last30Days.length} workouts in last 30 days`)
      
      // Workout types
      const hasCardio = last30Days.some(w => 
        w.exercises?.some(e => e.type === 'cardio')
      )
      const hasStrength = last30Days.some(w => 
        w.exercises?.some(e => !e.type || e.type === 'strength')
      )
      
      const trainingStyle: string[] = []
      if (hasStrength) trainingStyle.push('Strength Training')
      if (hasCardio) trainingStyle.push('Cardio')
      if (trainingStyle.length > 0) {
        parts.push(`- Training Style: ${trainingStyle.join(', ')}`)
      }
    }

    return parts.join('\n')
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !session?.access_token) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputText,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    try {
      const supplementsContext = generateSupplementsContext()
      
      const apiMessages: ChatMessage[] = messages
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))

      apiMessages.push({
        role: 'user',
        content: userMsg.content
      })

      const csrfToken = await getCsrfToken()

      const response = await fetch('/api/supplements-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          messages: apiMessages,
          supplementsContext
        })
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const data = await response.json()
      
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, aiMsg])
    } catch (error) {
      console.error('Error getting AI response:', error)
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I could not process that. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Pill className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Supplements Coach</h2>
              <p className="text-sm text-muted-foreground">Brutally honest, evidence-based advice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </p>
                <div className="text-xs opacity-70 mt-2">
                  {format(msg.timestamp, 'HH:mm')}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm text-muted-foreground">Analyzing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask about your supplement stack, dosing, timing..."
              className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
