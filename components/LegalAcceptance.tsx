'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, FileText, Shield, AlertTriangle, ExternalLink } from 'lucide-react'

interface LegalAcceptanceProps {
  onAccept: () => Promise<void>;
  isModal?: boolean; // Show as modal for existing users
  onCancel?: () => void;
}

export default function LegalAcceptance({ onAccept, isModal = false, onCancel }: LegalAcceptanceProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');


  const handleSubmit = async () => {
    if (!termsAccepted || !privacyAccepted) {
      setError('Je moet akkoord gaan met beide documenten om verder te gaan.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onAccept();
    } catch (err) {
      setError('Er ging iets mis. Probeer het opnieuw.');
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield size={32} className="text-accent-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Welkom bij IronPulse</h2>
        <p className="text-txt-secondary text-sm">
          {isModal 
            ? 'We hebben onze voorwaarden bijgewerkt. Lees en accepteer de documenten om door te gaan.'
            : 'Voordat je begint, lees en accepteer de volgende documenten:'}
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm space-y-2">
            <p className="font-semibold text-amber-500">Belangrijke waarschuwing</p>
            <ul className="text-txt-secondary space-y-1 list-disc list-inside">
              <li>IronPulse is <strong>geen medisch hulpmiddel</strong></li>
              <li>AI-adviezen zijn <strong>niet gevalideerd</strong> door professionals</li>
              <li>Raadpleeg <strong>altijd een arts</strong> bij twijfel of klachten</li>
              <li>Gebruik is <strong>volledig op eigen risico</strong></li>
              <li>Er kunnen <strong>geen rechten</strong> worden ontleend aan aanbevelingen</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Terms of Service */}
      <div className="space-y-3">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <FileText className="text-accent-primary flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="font-bold mb-1">Algemene Voorwaarden</h3>
              <p className="text-sm text-txt-tertiary mb-3">
                Beschrijft aansprakelijkheid, disclaimers en je rechten en plichten.
              </p>
              <a 
                href="/terms" 
                target="_blank"
                className="text-accent-primary hover:text-accent-secondary text-sm font-semibold inline-flex items-center gap-1"
              >
                Lees Algemene Voorwaarden <ExternalLink size={14} />
              </a>
            </div>
          </div>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              termsAccepted 
                ? 'bg-accent-primary border-accent-primary' 
                : 'border-border-default group-hover:border-accent-primary'
            }`}>
              {termsAccepted && <Check size={16} className="text-white" />}
            </div>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm">
              Ik heb de Algemene Voorwaarden gelezen en ga hiermee akkoord
            </span>
          </label>
        </div>

        {/* Privacy Policy */}
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <Shield className="text-accent-primary flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="font-bold mb-1">Privacyverklaring</h3>
              <p className="text-sm text-txt-tertiary mb-3">
                Beschrijft hoe we je gegevens verzamelen, gebruiken en beschermen.
              </p>
              <a 
                href="/privacy" 
                target="_blank"
                className="text-accent-primary hover:text-accent-secondary text-sm font-semibold inline-flex items-center gap-1"
              >
                Lees Privacyverklaring <ExternalLink size={14} />
              </a>
            </div>
          </div>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              privacyAccepted 
                ? 'bg-accent-primary border-accent-primary' 
                : 'border-border-default group-hover:border-accent-primary'
            }`}>
              {privacyAccepted && <Check size={16} className="text-white" />}
            </div>
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm">
              Ik heb de Privacyverklaring gelezen en ga hiermee akkoord
            </span>
          </label>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {isModal && onCancel && (
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-lg font-semibold bg-bg-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          >
            Annuleren
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!termsAccepted || !privacyAccepted || isSubmitting}
          className="flex-1 py-3 rounded-lg font-semibold bg-accent-primary hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Verwerken...' : 'Akkoord en Doorgaan'}
        </button>
      </div>

      {!isModal && (
        <p className="text-xs text-txt-tertiary text-center">
          Door akkoord te gaan, bevestig je dat je de documenten hebt gelezen en begrepen.
        </p>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-bg-primary rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {content}
      </div>
    </div>
  );
}
