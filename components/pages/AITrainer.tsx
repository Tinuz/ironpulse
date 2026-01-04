'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bot, Send, Sparkles, Zap, BrainCircuit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/components/context/DataContext'
import { generateUserContext, getRandomTip, Message } from '@/components/utils/aiTrainer'

export default function AITrainer() {
  const router = useRouter()
  const { history, bodyStats, nutritionLogs, coachProfile } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dailyTip, setDailyTip] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial greeting on mount
  useEffect(() => {
    setDailyTip(getRandomTip());
    if (messages.length === 0) {
      const initialMsg: Message = {
        id: 'init-1',
        role: 'ai',
        text: '👋 Hey! Ik ben je AI Coach. Vraag me alles over training, voeding of je progressie!',
        timestamp: Date.now()
      };
      setMessages([initialMsg]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Generate user context from data
      const userContext = generateUserContext(history, bodyStats, nutritionLogs);

      // Prepare messages for API
      const apiMessages = messages
        .map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text
        }));

      // Add current user message
      apiMessages.push({
        role: 'user',
        content: userMsg.text
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          userData: userContext,
          coachProfile
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        text: data.message,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        text: 'Sorry, er ging iets mis. Probeer het opnieuw! 🤖',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Bot className="text-primary" size={24} />
          <h1 className="font-bold text-lg">AI Coach</h1>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        
        {/* Quick Actions / Featured Tip */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 p-5 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <Sparkles size={48} />
            </div>
            <h3 className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-2">
              <Zap size={14} /> Daily Tip
            </h3>
            <p className="text-sm font-medium leading-relaxed">
              "{dailyTip}"
            </p>
          </motion.div>
        </div>

        {/* Chat Interface */}
        <div className="space-y-4 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-[1px] flex-1 bg-white/10"></div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Session Chat</span>
            <div className="h-[1px] flex-1 bg-white/10"></div>
          </div>

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-none' 
                    : 'bg-card border border-white/10 rounded-bl-none'
                }`}
              >
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2 opacity-50">
                    <BrainCircuit size={12} />
                    <span className="text-[10px] uppercase font-bold">Coach AI</span>
                  </div>
                )}
                {msg.text}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-card border border-white/10 p-4 rounded-2xl rounded-bl-none flex items-center gap-1">
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="relative flex items-center gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your workout or nutrition..."
            className="flex-1 bg-card border border-white/10 text-foreground placeholder:text-muted-foreground/50 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-lg shadow-black/20"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="absolute right-1 top-1 bottom-1 aspect-square bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
