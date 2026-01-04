import { WorkoutLog, BodyStats, NutritionLog } from '@/components/context/DataContext'
import { format } from 'date-fns'

export interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
}

// Generate context string for AI
export const generateUserContext = (
  history: WorkoutLog[], 
  bodyStats: BodyStats[], 
  nutritionLogs: NutritionLog[]
): string => {
  let context = '';
  
  // Recent workouts
  if (history.length > 0) {
    context += '📊 RECENTE WORKOUTS:\n';
    history.slice(0, 5).forEach((workout, idx) => {
      const totalVolume = workout.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sAcc, set) => sAcc + (set.weight * set.reps), 0), 0
      );
      context += `${idx + 1}. ${workout.name} - ${format(new Date(workout.date), 'dd/MM/yyyy')} - Volume: ${totalVolume}kg\n`;
      workout.exercises.forEach(ex => {
        const completed = ex.sets.filter(s => s.completed).length;
        context += `   - ${ex.name}: ${completed}/${ex.sets.length} sets\n`;
      });
    });
    context += '\n';
  }
  
  // Body stats trends
  if (bodyStats.length > 0) {
    context += '💪 LICHAAMSMATEN:\n';
    const latest = bodyStats[0];
    context += `Laatste meting (${latest.date}):\n`;
    if (latest.weight) context += `- Gewicht: ${latest.weight}kg\n`;
    if (latest.chest) context += `- Borst: ${latest.chest}cm\n`;
    if (latest.biceps) context += `- Biceps: ${latest.biceps}cm\n`;
    if (latest.waist) context += `- Taille: ${latest.waist}cm\n`;
    
    if (bodyStats.length > 1) {
      const previous = bodyStats[1];
      if (latest.weight && previous.weight) {
        const diff = latest.weight - previous.weight;
        context += `Gewichtsverandering: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg\n`;
      }
    }
    context += '\n';
  }
  
  // Nutrition today
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysNutrition = nutritionLogs.find(l => l.date === today);
  
  if (todaysNutrition && todaysNutrition.items.length > 0) {
    const totals = todaysNutrition.items.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    
    context += '🍽️ VOEDING VANDAAG:\n';
    context += `Calorieën: ${totals.calories} kcal\n`;
    context += `Eiwitten: ${totals.protein}g | Koolhydraten: ${totals.carbs}g | Vetten: ${totals.fats}g\n`;
    context += `Maaltijden: ${todaysNutrition.items.length}\n\n`;
  } else {
    context += '🍽️ VOEDING VANDAAG: Nog geen maaltijden gelogd\n\n';
  }
  
  return context;
};

export const getRandomTip = (): string => {
  const tips = [
    "💪 Progressive overload is de sleutel tot groei!",
    "🍗 Aim for 1.6-2.2g eiwit per kg lichaamsgewicht.",
    "💤 Rust is essentieel - spieren groeien tijdens herstel.",
    "🥤 Drink voldoende water voor optimale prestaties.",
    "🏋️ Focus op compound oefeningen voor maximale efficiency.",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};
