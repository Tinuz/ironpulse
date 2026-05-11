'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Activity, Heart, Zap, Save, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useData } from '@/components/context/DataContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FitnessMetrics {
  bmi: number
  bmiCategory: string
  bmr: number
  tdee: number
  maintenanceCalories: number
  goalCalories: number
  goalProtein: number
  bodyFatPercentage: number
  idealWeightMin: number
  idealWeightMax: number
  leanBodyMass: number
}

type FitnessGoal = 'bulk' | 'lean-bulk' | 'maintain' | 'lean-cut' | 'cut'

interface CalculatorInputs {
  age: string
  weight: string
  height: string
  gender: 'male' | 'female'
  activityLevel: number
  fitnessGoal: FitnessGoal
}

// ---------------------------------------------------------------------------
// Activity levels
// Based on: WHO/FAO/UNU Technical Report Series 724 (2001)
//           Ainsworth METs Compendium (2011)
// ---------------------------------------------------------------------------

const ACTIVITY_LEVELS = [
  {
    value: 1.2,
    label: 'Zittend',
    short: 'Weinig beweging',
    example: 'Kantoorwerk, nauwelijks sport',
  },
  {
    value: 1.375,
    label: 'Licht actief',
    short: '1–3× /week',
    example: 'Wandelen, 1-2× fitness of yoga per week',
  },
  {
    value: 1.55,
    label: 'Matig actief',
    short: '3–4× /week',
    example: '3-4× kracht of cardio, weinig extra beweging',
  },
  {
    value: 1.65,
    label: 'Actief',
    short: '4–5× /week gemengd',
    example: '4× kracht + 1-2× cardio/sport (bijv. padel, hardlopen)',
  },
  {
    value: 1.725,
    label: 'Zeer actief',
    short: '6–7× /week intensief',
    example: 'Dagelijkse intensieve training, competitiesport',
  },
  {
    value: 1.9,
    label: 'Extreem actief',
    short: 'Fysieke arbeid + sport',
    example: 'Zwaar beroep + intensief trainingsprogramma',
  },
]

// ---------------------------------------------------------------------------
// Goal configuration
// Calorie surplus/deficit:
//   Bulk    +15% — Slater & Phillips 2011 (J Sports Sci)
//   Lean Bulk +7% — Barakat et al. 2020 (Strength Cond J), Hall et al. 2012 (AJCN)
//   Maintain ±0%
//   Lean Cut −10% — Barakat et al. 2020
//   Cut     −20% — Helms et al. 2014 (J Int Soc Sports Nutr) — max 20% for LBM preservation
// Protein targets:
//   Based on Morton et al. 2018 meta-analysis (Br J Sports Med) + Stokes et al. 2018
// ---------------------------------------------------------------------------

const GOAL_CONFIG: Record<FitnessGoal, {
  label: string
  sublabel: string
  calorieMultiplier: number
  proteinPerKg: number
  color: string
  bgActive: string
  borderActive: string
  description: string
}> = {
  'bulk': {
    label: 'Bulk',
    sublabel: '+15% kcal · 1.8 g/kg',
    calorieMultiplier: 1.15,
    proteinPerKg: 1.8,
    color: 'text-orange-400',
    bgActive: 'bg-orange-500/20',
    borderActive: 'border-orange-500',
    description: 'Maximaal spieropbouw, meer vetaanzet acceptabel',
  },
  'lean-bulk': {
    label: 'Lean Bulk',
    sublabel: '+7% kcal · 1.8 g/kg',
    calorieMultiplier: 1.07,
    proteinPerKg: 1.8,
    color: 'text-blue-400',
    bgActive: 'bg-blue-500/20',
    borderActive: 'border-blue-500',
    description: 'Optimale spiergroei met minimale vettoename — aanbevolen voor getrainde atleten',
  },
  'maintain': {
    label: 'Onderhoud',
    sublabel: '±0% kcal · 2.0 g/kg',
    calorieMultiplier: 1.0,
    proteinPerKg: 2.0,
    color: 'text-green-400',
    bgActive: 'bg-green-500/20',
    borderActive: 'border-green-500',
    description: 'Lichaamssamenstelling behouden, herstel en prestatie optimaliseren',
  },
  'lean-cut': {
    label: 'Lean Cut',
    sublabel: '−10% kcal · 2.2 g/kg',
    calorieMultiplier: 0.90,
    proteinPerKg: 2.2,
    color: 'text-yellow-400',
    bgActive: 'bg-yellow-500/20',
    borderActive: 'border-yellow-500',
    description: 'Geleidelijk vetverliess met maximaal spierbehoud — ideaal voor krachtsporters',
  },
  'cut': {
    label: 'Cut',
    sublabel: '−20% kcal · 2.3 g/kg',
    calorieMultiplier: 0.80,
    proteinPerKg: 2.3,
    color: 'text-red-400',
    bgActive: 'bg-red-500/20',
    borderActive: 'border-red-500',
    description: 'Agressief vetverlies, hogere eiwitbehoefte voor spierbehoud',
  },
}

const GOAL_ORDER: FitnessGoal[] = ['bulk', 'lean-bulk', 'maintain', 'lean-cut', 'cut']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FitnessCalculator() {
  const { userProfile, saveUserProfile } = useData()
  const [inputs, setInputs] = useState<CalculatorInputs>({
    age: '',
    weight: '',
    height: '',
    gender: 'male',
    activityLevel: 1.65,
    fitnessGoal: 'lean-bulk',
  })

  const [results, setResults] = useState<FitnessMetrics | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showActivityInfo, setShowActivityInfo] = useState(false)

  useEffect(() => {
    if (userProfile) {
      setInputs({
        age: userProfile.age.toString(),
        weight: userProfile.weight.toString(),
        height: userProfile.height.toString(),
        gender: userProfile.gender,
        activityLevel: userProfile.activityLevel,
        fitnessGoal: (userProfile.fitnessGoal as FitnessGoal) || 'lean-bulk',
      })
      calculateMetricsFromProfile(userProfile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile])

  const calculateMetricsFromProfile = (profile: typeof userProfile) => {
    if (!profile) return
    const h = profile.height / 100
    doCalculate(profile.age, profile.weight, profile.height, h, profile.gender, profile.activityLevel, (profile.fitnessGoal as FitnessGoal) || 'lean-bulk')
  }

  const calculateMetrics = () => {
    const age = parseInt(inputs.age)
    const weight = parseFloat(inputs.weight)
    const height = parseFloat(inputs.height)

    if (!age || !weight || !height || age < 13 || age > 120 || weight < 30 || weight > 300 || height < 100 || height > 250) {
      alert('Voer geldige waarden in (leeftijd 13–120, gewicht 30–300 kg, lengte 100–250 cm)')
      return
    }

    doCalculate(age, weight, height, height / 100, inputs.gender, inputs.activityLevel, inputs.fitnessGoal)
  }

  const doCalculate = (
    age: number,
    weight: number,
    height: number,
    heightM: number,
    gender: 'male' | 'female',
    activityLevel: number,
    goal: FitnessGoal
  ) => {
    // BMI
    const bmi = weight / (heightM * heightM)
    let bmiCategory: string
    if (bmi < 18.5) bmiCategory = 'Ondergewicht'
    else if (bmi < 25) bmiCategory = 'Normaal gewicht'
    else if (bmi < 30) bmiCategory = 'Overgewicht'
    else bmiCategory = 'Obesitas'

    // BMR — Mifflin-St Jeor (Mifflin et al. 1990, JADA)
    const bmr = gender === 'male'
      ? (10 * weight) + (6.25 * height) - (5 * age) + 5
      : (10 * weight) + (6.25 * height) - (5 * age) - 161

    // TDEE
    const tdee = bmr * activityLevel
    const maintenanceCalories = Math.round(tdee)

    // Goal-adjusted targets
    const cfg = GOAL_CONFIG[goal]
    const goalCalories = Math.round(tdee * cfg.calorieMultiplier)
    const goalProtein = Math.round(weight * cfg.proteinPerKg)

    // Body fat estimate (Deurenberg et al. 1991)
    const bodyFatPercentage = gender === 'male'
      ? (1.20 * bmi) + (0.23 * age) - 16.2
      : (1.20 * bmi) + (0.23 * age) - 5.4

    const idealWeightMin = 18.5 * (heightM * heightM)
    const idealWeightMax = 24.9 * (heightM * heightM)
    const leanBodyMass = weight - (weight * (bodyFatPercentage / 100))

    setResults({
      bmi: Math.round(bmi * 10) / 10,
      bmiCategory,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      maintenanceCalories,
      goalCalories,
      goalProtein,
      bodyFatPercentage: Math.round(bodyFatPercentage * 10) / 10,
      idealWeightMin: Math.round(idealWeightMin * 10) / 10,
      idealWeightMax: Math.round(idealWeightMax * 10) / 10,
      leanBodyMass: Math.round(leanBodyMass * 10) / 10,
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
        activityLevel: inputs.activityLevel,
        fitnessGoal: inputs.fitnessGoal,
      })
      alert('✅ Profiel opgeslagen!')
    } catch {
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

  const getBodyFatCategory = (pct: number, gender: string) => {
    if (gender === 'male') {
      if (pct < 6)  return { label: 'Essentieel vet', color: 'text-red-500' }
      if (pct < 14) return { label: 'Atletisch', color: 'text-green-500' }
      if (pct < 18) return { label: 'Fit', color: 'text-green-400' }
      if (pct < 25) return { label: 'Gemiddeld', color: 'text-yellow-500' }
      return { label: 'Hoog', color: 'text-red-500' }
    } else {
      if (pct < 14) return { label: 'Essentieel vet', color: 'text-red-500' }
      if (pct < 21) return { label: 'Atletisch', color: 'text-green-500' }
      if (pct < 25) return { label: 'Fit', color: 'text-green-400' }
      if (pct < 32) return { label: 'Gemiddeld', color: 'text-yellow-500' }
      return { label: 'Hoog', color: 'text-red-500' }
    }
  }

  const goalCfg = GOAL_CONFIG[inputs.fitnessGoal]

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-card border border-white/5 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Calculator size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Fitness Calculator</h3>
            <p className="text-xs text-muted-foreground">Bereken je BMI, TDEE, calorie- en eiwitdoelstelling</p>
          </div>
        </div>

        {/* Basic inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Leeftijd (jaar)</label>
            <input
              type="number"
              value={inputs.age}
              onChange={e => setInputs({...inputs, age: e.target.value})}
              placeholder="25"
              className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Gewicht (kg)</label>
            <input
              type="number"
              value={inputs.weight}
              onChange={e => setInputs({...inputs, weight: e.target.value})}
              placeholder="75"
              className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Lengte (cm)</label>
            <input
              type="number"
              value={inputs.height}
              onChange={e => setInputs({...inputs, height: e.target.value})}
              placeholder="180"
              className="w-full bg-background border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Geslacht</label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputs({...inputs, gender: 'male'})}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${inputs.gender === 'male' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'}`}
              >Man</button>
              <button
                onClick={() => setInputs({...inputs, gender: 'female'})}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${inputs.gender === 'female' ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'}`}
              >Vrouw</button>
            </div>
          </div>
        </div>

        {/* Activity level — card picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Activiteitsniveau</label>
            <button
              onClick={() => setShowActivityInfo(v => !v)}
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Info size={12} />
              Hoe kies ik?
              {showActivityInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showActivityInfo && (
            <div className="mb-3 bg-white/5 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">PAL-waarden (WHO/FAO/UNU 2001)</p>
              <p>PAL = Physical Activity Level. Bepaal je gemiddelde week: tel trainingen + dagelijkse beweging.</p>
              <p className="text-primary font-medium">Voorbeeld: 4× kracht + 1× padel + 1× hardlopen → "Actief" (PAL 1.65)</p>
            </div>
          )}

          <div className="space-y-2">
            {ACTIVITY_LEVELS.map(level => (
              <button
                key={level.value}
                onClick={() => setInputs({...inputs, activityLevel: level.value})}
                className={`w-full rounded-xl px-4 py-3 text-left transition-colors border ${
                  inputs.activityLevel === level.value
                    ? 'bg-primary/15 border-primary'
                    : 'bg-white/3 border-white/5 hover:bg-white/7'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${inputs.activityLevel === level.value ? 'bg-primary' : 'bg-white/20'}`} />
                    <div>
                      <span className={`font-bold text-sm ${inputs.activityLevel === level.value ? 'text-primary' : 'text-foreground'}`}>
                        {level.label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">{level.short}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{level.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-5">{level.example}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Fitness goal */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Voedingsdoel</label>
          <div className="grid grid-cols-5 gap-1.5">
            {GOAL_ORDER.map(key => {
              const cfg = GOAL_CONFIG[key]
              const active = inputs.fitnessGoal === key
              return (
                <button
                  key={key}
                  onClick={() => setInputs({...inputs, fitnessGoal: key})}
                  className={`py-2.5 px-1 rounded-xl text-center transition-colors border ${
                    active
                      ? `${cfg.bgActive} ${cfg.borderActive} ${cfg.color}`
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/8'
                  }`}
                >
                  <div className="font-bold text-[11px] leading-tight">{cfg.label}</div>
                  <div className="text-[8.5px] mt-0.5 opacity-70 leading-tight">{cfg.sublabel.split(' · ')[0]}</div>
                </button>
              )
            })}
          </div>

          {/* Goal description */}
          <div className={`mt-2 rounded-xl px-3 py-2 border text-xs ${goalCfg.bgActive} ${goalCfg.borderActive}/30`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${goalCfg.color}`}>{goalCfg.label} — {goalCfg.sublabel}</span>
            </div>
            <p className="text-muted-foreground mt-0.5">{goalCfg.description}</p>
          </div>

          <p className="text-[10px] text-zinc-500 mt-1.5">
            Morton et al. 2018 · Helms et al. 2014 · Barakat et al. 2020 · Slater &amp; Phillips 2011
          </p>
        </div>

        {/* Action buttons */}
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

        <p className="text-xs text-muted-foreground text-center">
          {userProfile
            ? '💾 Je profiel is opgeslagen en wordt automatisch geladen'
            : '⚠️ Deze berekeningen zijn schattingen, geen medisch advies'}
        </p>
      </div>

      {/* Results */}
      {showResults && results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Goal target card — most important for the user */}
          <div className={`rounded-2xl p-5 border ${goalCfg.bgActive} ${goalCfg.borderActive}/40`}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className={goalCfg.color} />
              <span className={`text-xs font-bold uppercase ${goalCfg.color}`}>Jouw doelstelling · {goalCfg.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-black">{results.goalCalories}</div>
                <div className="text-xs text-muted-foreground">kcal/dag</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {results.goalCalories > results.maintenanceCalories
                    ? `+${results.goalCalories - results.maintenanceCalories} vs onderhoud`
                    : results.goalCalories < results.maintenanceCalories
                      ? `${results.goalCalories - results.maintenanceCalories} vs onderhoud`
                      : 'Gelijk aan onderhoud'}
                </div>
              </div>
              <div>
                <div className="text-3xl font-black">{results.goalProtein}<span className="text-base font-normal text-muted-foreground"> g</span></div>
                <div className="text-xs text-muted-foreground">eiwit/dag</div>
                <div className="text-[10px] text-muted-foreground mt-1">{goalCfg.sublabel.split(' · ')[1]}</div>
              </div>
            </div>
          </div>

          {/* Maintenance + BMR */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase mb-2">
                <Zap size={12} /> Onderhoud
              </div>
              <div className="text-2xl font-black">{results.maintenanceCalories}</div>
              <div className="text-xs text-muted-foreground">kcal/dag</div>
            </div>
            <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl p-4">
              <div className="text-xs font-bold text-muted-foreground uppercase mb-2">BMR (rust)</div>
              <div className="text-2xl font-black">{results.bmr}</div>
              <div className="text-xs text-muted-foreground">kcal/dag</div>
            </div>
          </div>

          {/* BMI */}
          <div className="bg-card border border-white/5 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Activity size={14} /> BMI
            </h4>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-4xl font-black">{results.bmi}</div>
                <div className={`text-sm font-bold mt-1 ${getBMIColor(results.bmiCategory)}`}>{results.bmiCategory}</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Ideaal gewicht</div>
                <div className="font-bold text-foreground">{results.idealWeightMin}–{results.idealWeightMax} kg</div>
              </div>
            </div>
          </div>

          {/* Body comp */}
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
              <div className="text-[10px] text-muted-foreground mt-1">Deurenberg et al. 1991</div>
            </div>
            <div className="bg-card border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase mb-2">
                <Activity size={12} /> Vetvrije massa
              </div>
              <div className="text-2xl font-black">{results.leanBodyMass}</div>
              <div className="text-xs text-muted-foreground">kg (schatting)</div>
            </div>
          </div>

          {/* Sources */}
          <div className="text-[10px] text-zinc-600 space-y-0.5 px-1">
            <p>BMR: Mifflin-St Jeor (1990) · PAL: WHO/FAO/UNU Technical Report 724 (2001)</p>
            <p>Eiwit: Morton et al. 2018 (meta-analyse) · Helms et al. 2014 · Barakat et al. 2020</p>
            <p>Surplus/deficit: Slater &amp; Phillips 2011 · Hall et al. 2012 (AJCN)</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
