'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingDown, TrendingUp, Activity, Heart, Zap, Save } from 'lucide-react'
import { useData } from '@/components/context/DataContext'

interface FitnessMetrics {
  bmi: number
  bmiCategory: string
  bmr: number
  tdee: number
  maintenanceCalories: number
  weightLossCalories: number
  weightGainCalories: number
  bodyFatPercentage: number
  idealWeightMin: number
  idealWeightMax: number
  leanBodyMass: number
}

interface CalculatorInputs {
  age: string
  weight: string
  height: string
  gender: 'male' | 'female'
  activityLevel: number
}

const activityLevels = [
  { value: 1.2, label: 'Zittend', description: 'Weinig tot geen beweging' },
  { value: 1.375, label: 'Licht actief', description: '1-3 dagen/week lichte sport' },
  { value: 1.55, label: 'Matig actief', description: '3-5 dagen/week matige sport' },
  { value: 1.725, label: 'Zeer actief', description: '6-7 dagen/week intensieve sport' },
  { value: 1.9, label: 'Extreem actief', description: 'Zware fysieke arbeid/topsport' }
]

export default function FitnessCalculator() {
  const { userProfile, saveUserProfile } = useData()
  const [inputs, setInputs] = useState<CalculatorInputs>({
    age: '',
    weight: '',
    height: '',
    gender: 'male',
    activityLevel: 1.55
  })
  
  const [results, setResults] = useState<FitnessMetrics | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load user profile data when component mounts
  useEffect(() => {
    if (userProfile) {
      setInputs({
        age: userProfile.age.toString(),
        weight: userProfile.weight.toString(),
        height: userProfile.height.toString(),
        gender: userProfile.gender,
        activityLevel: userProfile.activityLevel
      })
      // Auto-calculate if profile exists
      calculateMetricsFromProfile(userProfile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile])

  const calculateMetricsFromProfile = (profile: typeof userProfile) => {
    if (!profile) return
    
    const age = profile.age
    const weight = profile.weight
    const height = profile.height
    const heightInMeters = height / 100

    calculateAndSetMetrics(age, weight, height, heightInMeters, profile.gender, profile.activityLevel)
  }

  const calculateMetrics = () => {
    const age = parseInt(inputs.age)
    const weight = parseFloat(inputs.weight)
    const height = parseFloat(inputs.height)
    
    // Validatie
    if (!age || !weight || !height || age < 18 || age > 120 || weight < 30 || weight > 300 || height < 100 || height > 250) {
      alert('Voer geldige waarden in (leeftijd 18-120, gewicht 30-300kg, lengte 100-250cm)')
      return
    }

    const heightInMeters = height / 100
    calculateAndSetMetrics(age, weight, height, heightInMeters, inputs.gender, inputs.activityLevel)
  }

  const calculateAndSetMetrics = (
    age: number,
    weight: number,
    height: number,
    heightInMeters: number,
    gender: 'male' | 'female',
    activityLevel: number
  ) => {
    // BMI berekening
    const bmi = weight / (heightInMeters * heightInMeters)
    
    // BMI categorie
    let bmiCategory: string
    if (bmi < 18.5) bmiCategory = 'Ondergewicht'
    else if (bmi < 25) bmiCategory = 'Normaal gewicht'
    else if (bmi < 30) bmiCategory = 'Overgewicht'
    else bmiCategory = 'Obesitas'

    // BMR berekening (Mifflin-St Jeor)
    let bmr: number
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
    }

    // TDEE berekening
    const tdee = bmr * activityLevel
    const maintenanceCalories = Math.round(tdee)
    const weightLossCalories = Math.round(tdee - 500)
    const weightGainCalories = Math.round(tdee + 500)

    // Vetpercentage schatting
    let bodyFatPercentage: number
    if (gender === 'male') {
      bodyFatPercentage = (1.20 * bmi) + (0.23 * age) - 16.2
    } else {
      bodyFatPercentage = (1.20 * bmi) + (0.23 * age) - 5.4
    }

    // Ideaal gewicht bereik (BMI 18.5-24.9)
    const idealWeightMin = 18.5 * (heightInMeters * heightInMeters)
    const idealWeightMax = 24.9 * (heightInMeters * heightInMeters)

    // Lean body mass
    const leanBodyMass = weight - (weight * (bodyFatPercentage / 100))

    setResults({
      bmi: Math.round(bmi * 10) / 10,
      bmiCategory,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      maintenanceCalories,
      weightLossCalories,
      weightGainCalories,
      bodyFatPercentage: Math.round(bodyFatPercentage * 10) / 10,
      idealWeightMin: Math.round(idealWeightMin * 10) / 10,
      idealWeightMax: Math.round(idealWeightMax * 10) / 10,
      leanBodyMass: Math.round(leanBodyMass * 10) / 10
    })
    
    setShowResults(true)
  }

  const handleSaveProfile = async () => {
    const age = parseInt(inputs.age)
    const weight = parseFloat(inputs.weight)
    const height = parseFloat(inputs.height)
    
    if (!age || !weight || !height) {
      alert('Vul eerst alle velden in')
      return
    }

    setIsSaving(true)
    try {
      await saveUserProfile({
        age,
        weight,
        height,
        gender: inputs.gender,
        activityLevel: inputs.activityLevel
      })
      alert('✅ Profiel opgeslagen!')
    } catch (error) {
      alert('❌ Fout bij opslaan. Probeer opnieuw.')
    } finally {
      setIsSaving(false)
    }
  }

  const getBMIColor = (category: string) => {
    if (category === 'Normaal gewicht') return 'text-green-500'
    if (category === 'Ondergewicht' || category === 'Overgewicht') return 'text-amber-500'
    return 'text-red-500'
  }

  const getBodyFatCategory = (percentage: number, gender: string) => {
    if (gender === 'male') {
      if (percentage < 6) return { label: 'Essentieel vet', color: 'text-red-500' }
      if (percentage < 14) return { label: 'Atletisch', color: 'text-green-500' }
      if (percentage < 18) return { label: 'Fit', color: 'text-green-400' }
      if (percentage < 25) return { label: 'Gemiddeld', color: 'text-yellow-500' }
      return { label: 'Hoog', color: 'text-red-500' }
    } else {
      if (percentage < 14) return { label: 'Essentieel vet', color: 'text-red-500' }
      if (percentage < 21) return { label: 'Atletisch', color: 'text-green-500' }
      if (percentage < 25) return { label: 'Fit', color: 'text-green-400' }
      if (percentage < 32) return { label: 'Gemiddeld', color: 'text-yellow-500' }
      return { label: 'Hoog', color: 'text-red-500' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-card border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Calculator size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Fitness Calculator</h3>
            <p className="text-xs text-muted-foreground">Bereken je BMI, caloriebehoefte en meer</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Leeftijd (jaar)</label>
            <input
              type="number"
              value={inputs.age}
              onChange={(e) => setInputs({...inputs, age: e.target.value})}
              placeholder="25"
              className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Gewicht (kg)</label>
            <input
              type="number"
              value={inputs.weight}
              onChange={(e) => setInputs({...inputs, weight: e.target.value})}
              placeholder="75"
              className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Lengte (cm)</label>
            <input
              type="number"
              value={inputs.height}
              onChange={(e) => setInputs({...inputs, height: e.target.value})}
              placeholder="180"
              className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Geslacht</label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputs({...inputs, gender: 'male'})}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                  inputs.gender === 'male' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'
                }`}
              >
                Man
              </button>
              <button
                onClick={() => setInputs({...inputs, gender: 'female'})}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                  inputs.gender === 'female' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'
                }`}
              >
                Vrouw
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Activiteitsniveau</label>
          <select
            value={inputs.activityLevel}
            onChange={(e) => setInputs({...inputs, activityLevel: parseFloat(e.target.value)})}
            className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
          >
            {activityLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label} - {level.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={calculateMetrics}
            className="flex-1 bg-primary text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Calculator size={20} /> Bereken
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save size={20} /> {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {userProfile 
            ? '💾 Je profiel is opgeslagen en wordt automatisch geladen' 
            : '⚠️ Deze berekeningen zijn schattingen, geen medisch advies'
          }
        </p>
      </div>

      {/* Results */}
      {showResults && results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* BMI Card */}
          <div className="bg-card border border-white/5 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Activity size={16} /> Body Mass Index (BMI)
            </h4>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-4xl font-black">{results.bmi}</div>
                <div className={`text-sm font-bold mt-1 ${getBMIColor(results.bmiCategory)}`}>
                  {results.bmiCategory}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Ideaal gewicht:</div>
                <div className="font-bold text-foreground">{results.idealWeightMin} - {results.idealWeightMax} kg</div>
              </div>
            </div>
          </div>

          {/* Calories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-2">
                <Zap size={12} /> Onderhoud
              </div>
              <div className="text-2xl font-black">{results.maintenanceCalories}</div>
              <div className="text-xs text-muted-foreground">kcal/dag</div>
            </div>
            <div className="bg-card border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase mb-2">
                <TrendingDown size={12} /> Afvallen
              </div>
              <div className="text-2xl font-black">{results.weightLossCalories}</div>
              <div className="text-xs text-muted-foreground">kcal/dag (-0.5kg/week)</div>
            </div>
            <div className="bg-card border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-2">
                <TrendingUp size={12} /> Aankomen
              </div>
              <div className="text-2xl font-black">{results.weightGainCalories}</div>
              <div className="text-xs text-muted-foreground">kcal/dag (+0.5kg/week)</div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase mb-2">
                <Heart size={12} /> Vetpercentage
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black">{results.bodyFatPercentage}%</div>
                <div className={`text-xs font-bold ${getBodyFatCategory(results.bodyFatPercentage, inputs.gender).color}`}>
                  {getBodyFatCategory(results.bodyFatPercentage, inputs.gender).label}
                </div>
              </div>
            </div>
            <div className="bg-card border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase mb-2">
                <Activity size={12} /> Spiermassa
              </div>
              <div className="text-2xl font-black">{results.leanBodyMass}</div>
              <div className="text-xs text-muted-foreground">kg (schatting)</div>
            </div>
          </div>

          {/* BMR Info */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Rustmetabolisme (BMR)</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-black">{results.bmr} <span className="text-sm font-normal text-muted-foreground">kcal/dag</span></div>
                <div className="text-xs text-muted-foreground mt-1">Energie in rust, zonder activiteit</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
