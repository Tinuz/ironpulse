'use client'

import { useState } from 'react'
import Body from '@mjcdev/react-body-highlighter'

interface MuscleRecoveryData {
  muscle: string
  recovery: number // 0-100%
  lastTrained?: Date
  volume?: number
}

interface MuscleRecoveryMapProps {
  muscleData: MuscleRecoveryData[]
  onMuscleClick?: (muscle: string) => void
  className?: string
}

// Map MuscleGroup to body part slugs from @mjcdev/react-body-highlighter
function getMuscleSlug(muscleGroup: string): string[] {
  const mapping: Record<string, string[]> = {
    chest: ['chest'],
    back: ['upper-back', 'lower-back'],
    lats: ['upper-back'],
    'middle-back': ['upper-back'],
    'lower-back': ['lower-back'],
    shoulders: ['deltoids'],
    biceps: ['biceps'],
    triceps: ['triceps'],
    forearms: ['forearm'],
    abs: ['abs', 'obliques'],
    obliques: ['obliques'],
    legs: ['quadriceps', 'hamstring', 'calves'],
    quads: ['quadriceps'],
    quadriceps: ['quadriceps'],
    hamstrings: ['hamstring'],
    glutes: ['gluteal'],
    calves: ['calves'],
    traps: ['trapezius'],
    'hip-flexors': ['adductors'],
  }

  return mapping[muscleGroup.toLowerCase()] || []
}

// Convert recovery percentage to intensity level (1-5)
function getIntensityFromRecovery(recovery: number): number {
  if (recovery === 0) return 1      // Niet getraind (paars)
  if (recovery < 40) return 2       // Recent getraind (rood)
  if (recovery < 70) return 3       // Herstellend (oranje)
  if (recovery < 90) return 4       // Bijna klaar (geel)
  return 5                          // Volledig hersteld (groen)
}

export default function MuscleRecoveryMap({ 
  muscleData, 
  onMuscleClick,
  className = '' 
}: MuscleRecoveryMapProps) {
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front')

  // Transform muscle data to body part data
  const bodyData = muscleData.flatMap(muscle => {
    const slugs = getMuscleSlug(muscle.muscle)
    const intensity = getIntensityFromRecovery(muscle.recovery)
    
    return slugs.map(slug => ({
      slug: slug as any,
      intensity,
    }))
  })

  // Custom colors for 5 recovery levels
  const recoveryColors = [
    '#9333EA', // Purple - Niet getraind (0%)
    '#EF4444', // Red - Recent getraind (1-39%)
    '#F59E0B', // Orange - Herstellend (40-69%)
    '#EAB308', // Yellow - Bijna klaar (70-89%)
    '#10B981', // Green - Volledig hersteld (90-100%)
  ]

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSelectedView('front')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedView === 'front'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Voorkant
        </button>
        <button
          onClick={() => setSelectedView('back')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedView === 'back'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Achterkant
        </button>
      </div>

      {/* Body Visualization */}
      <div className="relative w-full max-w-xs mx-auto">
        <Body
          data={bodyData}
          side={selectedView}
          colors={recoveryColors}
          scale={1.5}
          border="#374151"
          onBodyPartClick={(bodyPart) => {
            if (onMuscleClick && bodyPart.slug) {
              // Find original muscle name from slug
              const muscle = muscleData.find(m => 
                getMuscleSlug(m.muscle).includes(bodyPart.slug!)
              )
              if (muscle) onMuscleClick(muscle.muscle)
            }
          }}
        />
      </div>

      {/* Legend */}
      <div className="mt-6 w-full max-w-md">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Herstel Status
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { color: recoveryColors[4], label: 'Volledig Hersteld', range: '90-100%' },
            { color: recoveryColors[3], label: 'Bijna Klaar', range: '70-89%' },
            { color: recoveryColors[2], label: 'Herstellend', range: '40-69%' },
            { color: recoveryColors[1], label: 'Recent Getraind', range: '1-39%' },
            { color: recoveryColors[0], label: 'Niet Getraind', range: '0%' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded-md flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  ({item.range})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
