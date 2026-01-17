'use client'

import React, { useState, useEffect } from 'react'
import { useData } from '@/components/context/DataContext'
import { useAuth } from '@/components/context/AuthContext'
import { supabase } from '@/lib/supabase'
import LegalAcceptance from '@/components/LegalAcceptance'

interface LegalGuardProps {
  children: React.ReactNode;
}

const CURRENT_TERMS_VERSION = '1.0';
const CURRENT_PRIVACY_VERSION = '1.0';

export default function LegalGuard({ children }: LegalGuardProps) {
  const { userProfile } = useData();
  const { session } = useAuth();
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!session || !userProfile) {
      setIsChecking(false);
      return;
    }

    // Check if user needs to accept legal documents
    const termsAccepted = userProfile.termsAccepted && userProfile.termsVersion === CURRENT_TERMS_VERSION;
    const privacyAccepted = userProfile.privacyAccepted && userProfile.privacyVersion === CURRENT_PRIVACY_VERSION;

    if (!termsAccepted || !privacyAccepted) {
      setNeedsAcceptance(true);
    }

    setIsChecking(false);
  }, [userProfile, session]);

  const handleAccept = async () => {
    if (!session?.user?.id) {
      throw new Error('No user session');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        terms_accepted: true,
        privacy_accepted: true,
        legal_acceptance_date: new Date().toISOString(),
        terms_version: CURRENT_TERMS_VERSION,
        privacy_version: CURRENT_PRIVACY_VERSION
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error updating legal acceptance:', error);
      throw error;
    }

    // Refresh the page to load updated profile
    window.location.reload();
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-txt-secondary">Laden...</p>
        </div>
      </div>
    );
  }

  // Show legal acceptance if needed
  if (needsAcceptance && session) {
    return (
      <LegalAcceptance 
        onAccept={handleAccept}
        isModal={true}
      />
    );
  }

  return <>{children}</>;
}
