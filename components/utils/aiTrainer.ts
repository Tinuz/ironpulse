import { WorkoutLog, BodyStats, NutritionLog, UserProfile } from '@/components/context/DataContext'
import { format, subDays, startOfWeek } from 'date-fns'
import { 
  getMostFrequentExercises, 
  calculateStrengthScore, 
  getRecentPRs,
  calculatePeriodProgress,
  detectPlateau
} from './strengthAnalytics'
import { getBest1RM, calculateVolume, roundTo, getPersonalRecord } from './workoutCalculations'

export interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
}

export interface ProactiveInsight {
  type: 'success' | 'warning' | 'info' | 'suggestion';
  title: string;
  message: string;
  action?: string;
}

// Generate comprehensive context string for AI
export const generateUserContext = (
  history: WorkoutLog[], 
  bodyStats: BodyStats[], 
  nutritionLogs: NutritionLog[],
  userProfile?: UserProfile
): string => {
  let context = '';
  
  // ===== STRENGTH ANALYTICS =====
  if (history.length > 0) {
    const strengthScore = calculateStrengthScore(history);
    const frequentExercises = getMostFrequentExercises(history, 6);
    const recentPRs = getRecentPRs(history, 30);
    
    context += 'KRACHT PROGRESSIE:\n';
    
    // Overall strength score
    if (strengthScore.lifts.length > 0) {
      context += `Total Strength Score: ${Math.round(strengthScore.total)}kg`;
      if (strengthScore.previousTotal) {
        const change = strengthScore.change >= 0 ? `+${roundTo(strengthScore.change, 0.5)}` : roundTo(strengthScore.change, 0.5);
        context += ` (${change}kg laatste maand, ${strengthScore.percentageChange >= 0 ? '+' : ''}${strengthScore.percentageChange.toFixed(1)}%)\n`;
      } else {
        context += '\n';
      }
      
      strengthScore.lifts.forEach(lift => {
        context += `  - ${lift.name}: ${roundTo(lift.oneRM, 0.5)}kg 1RM\n`;
      });
    }
    
    // Exercise-specific analytics
    context += '\nTOP EXERCISES (laatste 90 dagen):\n';
    frequentExercises.forEach(exerciseName => {
      const progress = calculatePeriodProgress(exerciseName, history, 90);
      const plateau = detectPlateau(exerciseName, history);
      const pr = getPersonalRecord(exerciseName, history);
      
      if (progress.current1RM) {
        context += `  ${exerciseName}:\n`;
        context += `    - Huidige 1RM: ${roundTo(progress.current1RM, 0.5)}kg`;
        
        if (progress.previous1RM) {
          const change = progress.change >= 0 ? `+${roundTo(progress.change, 0.5)}` : roundTo(progress.change, 0.5);
          context += ` (${change}kg, ${progress.percentageChange >= 0 ? '+' : ''}${progress.percentageChange.toFixed(1)}%)`;
        }
        context += `\n`;
        
        if (pr) {
          context += `    - PR: ${roundTo(pr.oneRM, 0.5)}kg (${format(new Date(pr.date), 'dd/MM/yyyy')})\n`;
        }
        
        if (plateau.isPlateaued) {
          context += `    ! PLATEAU: ${plateau.workoutsStagnant} workouts geen progressie - ${plateau.suggestedAction}\n`;
        }
        
        context += `    - Trend: ${progress.trend === 'increasing' ? 'Stijgend' : progress.trend === 'decreasing' ? 'Dalend' : 'Stabiel'}\n`;
      }
    });
    
    // Recent PRs
    if (recentPRs.length > 0) {
      context += '\nRECENTE PR\'s (laatste 30 dagen):\n';
      recentPRs.slice(0, 3).forEach(pr => {
        context += `  - ${pr.exerciseName}: ${roundTo(pr.oneRM, 0.5)}kg (${pr.weight}kg x ${pr.reps} reps) - ${pr.daysAgo === 0 ? 'Vandaag' : `${pr.daysAgo} dagen geleden`}\n`;
      });
    }
    
    // Recent workouts with volume
    context += '\nRECENTE WORKOUTS:\n';
    history.slice(0, 5).forEach((workout, idx) => {
      const totalVolume = workout.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sAcc, set) => sAcc + (set.weight * set.reps), 0), 0
      );
      const duration = workout.endTime ? Math.round((workout.endTime - workout.startTime) / 1000 / 60) : 0;
      
      context += `${idx + 1}. ${workout.name} - ${format(new Date(workout.date), 'dd/MM/yyyy')}`;
      context += ` - Volume: ${totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}kg`;
      if (duration > 0) context += ` - ${duration}min`;
      context += '\n';
      
      workout.exercises.forEach(ex => {
        const completed = ex.sets.filter(s => s.completed).length;
        const best = getBest1RM(ex);
        const volume = calculateVolume(ex);
        
        context += `     - ${ex.name}: ${completed}/${ex.sets.length} sets`;
        if (best) context += `, beste 1RM: ${roundTo(best.oneRM, 0.5)}kg`;
        context += `, volume: ${Math.round(volume)}kg\n`;
      });
    });
    
    // Weekly stats
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekWorkouts = history.filter(w => new Date(w.date) >= weekStart);
    if (weekWorkouts.length > 0) {
      const weekVolume = weekWorkouts.reduce((acc, w) => 
        acc + w.exercises.reduce((eAcc, ex) => 
          eAcc + ex.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0
        ), 0
      );
      context += `\nDEZE WEEK: ${weekWorkouts.length} workouts, ${(weekVolume / 1000).toFixed(1)}k kg totaal volume\n`;
    }
  } else {
    context += 'KRACHT PROGRESSIE: Nog geen workouts gelogd\n';
  }
  
  // ===== BODY STATS & TRENDS =====
  context += '\n';
  if (bodyStats.length > 0) {
    context += 'LICHAAMSMATEN:\n';
    const latest = bodyStats[0];
    context += `Laatste meting (${format(new Date(latest.date), 'dd/MM/yyyy')}):\n`;
    if (latest.weight) context += `  - Gewicht: ${latest.weight}kg\n`;
    if (latest.height) context += `  - Lengte: ${latest.height}cm\n`;
    if (latest.chest) context += `  - Borst: ${latest.chest}cm\n`;
    if (latest.biceps) context += `  - Biceps: ${latest.biceps}cm\n`;
    if (latest.waist) context += `  - Taille: ${latest.waist}cm\n`;
    
    // Trends
    if (bodyStats.length > 1) {
      const previous = bodyStats[1];
      if (latest.weight && previous.weight) {
        const diff = latest.weight - previous.weight;
        const daysBetween = Math.floor((new Date(latest.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24));
        context += `  Gewichtsverandering: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg (${daysBetween} dagen)\n`;
      }
    }
  } else {
    context += 'LICHAAMSMATEN: Nog geen metingen\n';
  }
  
  // ===== NUTRITION & TARGETS =====
  context += '\n';
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysNutrition = nutritionLogs.find(l => l.date === today);
  
  // Calculate targets from user profile
  let targets = null;
  if (userProfile && userProfile.weight && userProfile.height && userProfile.age) {
    const bmr = userProfile.gender === 'female'
      ? 447.593 + (9.247 * userProfile.weight) + (3.098 * userProfile.height) - (4.330 * userProfile.age)
      : 88.362 + (13.397 * userProfile.weight) + (4.799 * userProfile.height) - (5.677 * userProfile.age);
    
    const tdee = bmr * (userProfile.activityLevel || 1.55);
    const proteinTarget = userProfile.weight * 2;
    const fatTarget = (tdee * 0.28) / 9;
    const carbTarget = (tdee - (proteinTarget * 4) - (fatTarget * 9)) / 4;
    
    targets = {
      calories: Math.round(tdee),
      protein: Math.round(proteinTarget),
      carbs: Math.round(carbTarget),
      fats: Math.round(fatTarget)
    };
  }
  
  if (todaysNutrition && todaysNutrition.items.length > 0) {
    const totals = todaysNutrition.items.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    
    context += 'VOEDING VANDAAG:\n';
    context += `  Calories: ${totals.calories} kcal`;
    if (targets) {
      const calDiff = totals.calories - targets.calories;
      context += ` (doel: ${targets.calories}, ${calDiff >= 0 ? '+' : ''}${calDiff} kcal)\n`;
    } else {
      context += '\n';
    }
    
    context += `  Macros: ${totals.protein}g eiwit, ${totals.carbs}g koolhydraten, ${totals.fats}g vetten\n`;
    
    if (targets) {
      context += `  Doelen: ${targets.protein}g eiwit, ${targets.carbs}g koolhydraten, ${targets.fats}g vetten\n`;
      
      // Warnings
      const proteinPercentage = (totals.protein / targets.protein) * 100;
      const calPercentage = (totals.calories / targets.calories) * 100;
      
      if (proteinPercentage < 70) {
        context += `  ! WAARSCHUWING: Te weinig eiwit (${proteinPercentage.toFixed(0)}% van doel)\n`;
      }
      if (calPercentage < 70) {
        context += `  ! WAARSCHUWING: Te weinig calories (${calPercentage.toFixed(0)}% van doel)\n`;
      }
      if (calPercentage > 115) {
        context += `  ! WAARSCHUWING: Te veel calories (${calPercentage.toFixed(0)}% van doel)\n`;
      }
    }
    
    context += `  Maaltijden: ${todaysNutrition.items.length}\n`;
    
    // Last 7 days average
    const last7Days = nutritionLogs
      .filter(log => {
        const logDate = new Date(log.date);
        const weekAgo = subDays(new Date(), 7);
        return logDate >= weekAgo;
      })
      .map(log => log.items.reduce((acc, item) => acc + item.calories, 0));
    
    if (last7Days.length > 0) {
      const avgCalories = Math.round(last7Days.reduce((a, b) => a + b, 0) / last7Days.length);
      context += `  Gemiddeld laatste 7 dagen: ${avgCalories} kcal/dag\n`;
    }
  } else {
    context += 'VOEDING VANDAAG: Nog geen maaltijden gelogd\n';
    if (targets) {
      context += `  Dagelijkse doelen: ${targets.calories} kcal, ${targets.protein}g eiwit\n`;
    }
  }
  
  // ===== USER PROFILE & GOALS =====
  if (userProfile) {
    context += '\nGEBRUIKERSPROFIEL:\n';
    if (userProfile.age) context += `  - Leeftijd: ${userProfile.age} jaar\n`;
    if (userProfile.weight) context += `  - Gewicht: ${userProfile.weight}kg\n`;
    if (userProfile.height) context += `  - Lengte: ${userProfile.height}cm\n`;
    if (userProfile.gender) context += `  - Geslacht: ${userProfile.gender === 'male' ? 'Man' : 'Vrouw'}\n`;
    if (userProfile.activityLevel) {
      const activityLabels: {[key: number]: string} = {
        1.2: 'Sedentair (weinig beweging)',
        1.375: 'Licht actief (1-3 dagen/week)',
        1.55: 'Matig actief (3-5 dagen/week)',
        1.725: 'Zeer actief (6-7 dagen/week)',
        1.9: 'Extra actief (2x per dag)'
      };
      context += `  - Activiteitsniveau: ${activityLabels[userProfile.activityLevel] || userProfile.activityLevel}\n`;
    }
    
    if (targets) {
      context += `  - BMR: ~${Math.round(targets.calories / (userProfile.activityLevel || 1.55))} kcal\n`;
      context += `  - TDEE: ~${targets.calories} kcal\n`;
    }
  }
  
  context += '\n';
  return context;
};

// Generate proactive coaching insights
export const generateProactiveInsights = (
  history: WorkoutLog[],
  _bodyStats: BodyStats[],
  nutritionLogs: NutritionLog[],
  userProfile?: UserProfile
): ProactiveInsight[] => {
  const insights: ProactiveInsight[] = [];
  
  if (history.length === 0) return insights;
  
  // Check for plateaus
  const frequentExercises = getMostFrequentExercises(history, 6);
  frequentExercises.forEach(exerciseName => {
    const plateau = detectPlateau(exerciseName, history);
    if (plateau.isPlateaued) {
      insights.push({
        type: 'warning',
        title: `Plateau bij ${exerciseName}`,
        message: `${plateau.workoutsStagnant} workouts geen progressie. ${plateau.suggestedAction}`,
        action: 'Bekijk Exercise Progress'
      });
    }
  });
  
  // Check recent PRs
  const recentPRs = getRecentPRs(history, 7);
  if (recentPRs.length > 0) {
    insights.push({
      type: 'success',
      title: `${recentPRs.length} PR${recentPRs.length > 1 ? 's' : ''} deze week!`,
      message: `Je hebt deze week ${recentPRs.length} personal record${recentPRs.length > 1 ? 's' : ''} gezet. Goed bezig!`,
      action: 'Bekijk Progress'
    });
  }
  
  // Check workout frequency
  const last7Days = subDays(new Date(), 7);
  const recentWorkouts = history.filter(w => new Date(w.date) >= last7Days).length;
  
  if (recentWorkouts === 0) {
    insights.push({
      type: 'info',
      title: 'Geen workouts deze week',
      message: 'Je hebt deze week nog geen workouts gelogd. Begin vandaag nog!',
      action: 'Start Workout'
    });
  } else if (recentWorkouts >= 5) {
    insights.push({
      type: 'warning',
      title: 'Let op overtraining',
      message: `${recentWorkouts} workouts in 7 dagen. Zorg voor voldoende rust en herstel.`,
      action: 'Plan Rustdag'
    });
  }
  
  // Check nutrition compliance
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysNutrition = nutritionLogs.find(l => l.date === today);
  
  if (userProfile?.weight && (!todaysNutrition || todaysNutrition.items.length === 0)) {
    insights.push({
      type: 'info',
      title: 'Voeding nog niet gelogd',
      message: 'Log je voeding om je macro-doelen te halen.',
      action: 'Voeg Maaltijd Toe'
    });
  } else if (todaysNutrition && todaysNutrition.items.length > 0 && userProfile?.weight) {
    const totals = todaysNutrition.items.reduce((acc, item) => ({
      protein: acc.protein + item.protein
    }), { protein: 0 });
    
    const proteinTarget = userProfile.weight * 2;
    const proteinPercentage = (totals.protein / proteinTarget) * 100;
    
    if (proteinPercentage < 70) {
      insights.push({
        type: 'warning',
        title: 'Te weinig eiwit vandaag',
        message: `Je zit op ${totals.protein}g van ${Math.round(proteinTarget)}g eiwit (${Math.round(proteinPercentage)}%). Verhoog je eiwitinname.`,
        action: 'Bekijk Voeding'
      });
    }
  }
  
  // Check strength score trend
  const strengthScore = calculateStrengthScore(history);
  if (strengthScore.percentageChange < -5 && strengthScore.previousTotal) {
    insights.push({
      type: 'warning',
      title: 'Kracht is gedaald',
      message: `Je Strength Score is met ${Math.abs(strengthScore.percentageChange).toFixed(1)}% gedaald. Check je training en voeding.`,
      action: 'Analyseer Progressie'
    });
  } else if (strengthScore.percentageChange > 10 && strengthScore.previousTotal) {
    insights.push({
      type: 'success',
      title: 'Sterke progressie!',
      message: `Je Strength Score is met ${strengthScore.percentageChange.toFixed(1)}% gestegen. Blijf dit volhouden!`,
      action: 'Bekijk Kracht'
    });
  }
  
  // Check for unbalanced training
  const exerciseFrequency = frequentExercises.reduce((acc, name) => {
    const count = history.reduce((c, w) => 
      c + w.exercises.filter(e => e.name === name).length, 0
    );
    acc[name] = count;
    return acc;
  }, {} as {[key: string]: number});
  
  const pushExercises = ['Bench Press', 'Incline Bench Press', 'Overhead Press', 'Dumbbell Press'];
  const pullExercises = ['Pull-ups', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row'];
  
  const pushCount = pushExercises.reduce((acc, name) => acc + (exerciseFrequency[name] || 0), 0);
  const pullCount = pullExercises.reduce((acc, name) => acc + (exerciseFrequency[name] || 0), 0);
  
  if (pushCount > pullCount * 1.5 && pullCount > 0) {
    insights.push({
      type: 'suggestion',
      title: 'Onbalans push/pull',
      message: 'Je doet meer push- dan pull-oefeningen. Voeg meer trekoefeningen toe voor balans.',
      action: 'Bekijk Schema'
    });
  } else if (pullCount > pushCount * 1.5 && pushCount > 0) {
    insights.push({
      type: 'suggestion',
      title: 'Onbalans push/pull',
      message: 'Je doet meer pull- dan push-oefeningen. Voeg meer drukoefeningen toe voor balans.',
      action: 'Bekijk Schema'
    });
  }
  
  // Limit to top 3 most important insights
  return insights.slice(0, 3);
};

export const getRandomTip = (): string => {
  const tips = [
    "Progressive overload is de sleutel tot groei!",
    "Aim for 1.6-2.2g eiwit per kg lichaamsgewicht.",
    "Rust is essentieel - spieren groeien tijdens herstel.",
    "Drink voldoende water voor optimale prestaties.",
    "Focus op compound oefeningen voor maximale efficiency.",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};
