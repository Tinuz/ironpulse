'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

export default function PrivacyPage() {
  const router = useRouter();
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch('/PRIVACY_POLICY.md')
      .then(res => res.text())
      .then(text => setContent(text));
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-default bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <Shield className="text-accent-primary" size={28} />
            <h1 className="text-2xl font-bold">Privacyverklaring</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
