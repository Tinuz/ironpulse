import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ProgressionStatus } from '@/components/utils/progressionAnalytics';

interface ProgressionBadgeProps {
  status: ProgressionStatus;
  delta: string; // Formatted delta (e.g., "+2.5kg", "+2 reps")
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function ProgressionBadge({ 
  status, 
  delta, 
  size = 'sm',
  showText = true 
}: ProgressionBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const iconSize = iconSizes[size];

  if (status === 'improved') {
    return (
      <div className={`inline-flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg font-semibold ${sizeClasses[size]}`}>
        <TrendingUp size={iconSize} strokeWidth={2.5} />
        {showText && <span>{delta}</span>}
      </div>
    );
  }

  if (status === 'decreased') {
    return (
      <div className={`inline-flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-semibold ${sizeClasses[size]}`}>
        <TrendingDown size={iconSize} strokeWidth={2.5} />
        {showText && <span>{delta}</span>}
      </div>
    );
  }

  // Maintained status
  return (
    <div className={`inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg font-semibold ${sizeClasses[size]}`}>
      <Minus size={iconSize} strokeWidth={2.5} />
      {showText && <span className="text-xs">Same</span>}
    </div>
  );
}
