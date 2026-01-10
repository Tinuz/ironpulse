# IronPulse (NXT•REP) Project Instructions

## Project Overview
IronPulse is a comprehensive mobile-first fitness tracking web application designed to help users track workouts, nutrition, body progress, and connect with a fitness community. The app features AI-powered coaching, intelligent exercise suggestions, achievement system, social features, and uses Supabase for backend and authentication.

## Project Structure

### Development Stack
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS (utility-first, mobile-first design)
- **Next.js**: App Router for SSR, routing, and API routes
- **Backend**: Supabase (PostgreSQL database, Authentication, RLS)
- **Authentication**: Google OAuth via Supabase Auth
- **AI**: OpenRouter (Claude 3.5 Sonnet) for intelligent suggestions
- **Nutrition API**: Open Food Facts for barcode scanning

### Core Files & Pages
- **Entry Point**: `app/page.tsx` - Main application entry point using Next.js App Router
- **Root Layout**: `app/layout.tsx` - Root layout with metadata and global styles
- **Main Component**: `components/FitnessTracker.tsx` - Main application wrapper containing AuthProvider, DataProvider and routing logic
- **Auth Context**: `components/context/AuthContext.tsx` - Google OAuth authentication state management
- **Data Context**: `components/context/DataContext.tsx` - Centralized state using React Context API. Handles persistence via Supabase database
- **Navigation**: `components/Navigation.tsx` - Bottom tab navigation for mobile accessibility

### Pages (components/pages/)
- **Login** (`/login`): `Login.tsx` - Google OAuth authentication page
- **Dashboard** (`/`): `Dashboard.tsx` - Main overview with analytics widgets, quick actions, and daily summary
- **Schema Builder** (`/schema`): `SchemaBuilder.tsx` - Create and manage workout routines/programs
- **Workout Logger** (`/workout/:schemaId?`): `WorkoutLogger.tsx` - Active workout session tracker with real-time logging
- **History** (`/history`): `History.tsx` - Past workout logs with filtering and details
- **Workout Detail** (`/workout-detail/:id`): `WorkoutDetail.tsx` - Detailed view of completed workout with reactions
- **Progress** (`/progress`): `Progress.tsx` - Body measurements, weight tracking, and visual charts
- **Exercise Progress** (`/exercise-progress`): `ExerciseProgress.tsx` - Track PR's and strength progression per exercise
- **Exercise Library** (`/exercises`): `ExerciseLibrary.tsx` - Browse and search all exercises with muscle group filtering
- **AI Trainer** (`/trainer`): `AITrainer.tsx` - Chat interface for AI coaching with coach personality profiles
- **Nutrition** (`/nutrition`): `Nutrition.tsx` - Meal and macro tracking with barcode scanner integration
- **Social** (`/social`): `Social.tsx` - Community features, friend feed, discover users, workout reactions
- **Profile** (`/profile`): `Profile.tsx` - User profile with stats, achievements, and social settings
- **Settings** (`/settings`): `Settings.tsx` - App settings, preferences, and account management


### Analytics Widgets (components/)
- **StreakWidget.tsx**: Workout streak tracker with visual indicators
- **WeeklySummaryWidget.tsx**: Weekly volume, exercise count, and calorie burn
- **MuscleGroupVolumeWidget.tsx**: Volume distribution by muscle group (last 4 weeks)
- **PlateauDetectionWidget.tsx**: Identifies stagnant exercises with AI-powered suggestions
- **DeloadRecommendationWidget.tsx**: Detects overtraining and suggests deload weeks
- **AccessorySuggestionsWidget.tsx**: AI-powered accessory exercise recommendations (Claude 3.5 Sonnet)
- **AchievementsWidget.tsx**: Display unlocked achievements with progress tracking
- **ProgressionBadge.tsx**: Visual badges for strength milestones
- **WaterTracker.tsx**: Daily water intake tracker with goal setting
- **WorkoutReactions.tsx**: Social reactions component for workout posts (fire, strong, clap, beast)

### Utility Tools (components/)
- **BarcodeScanner.tsx**: Camera-based barcode scanner for nutrition tracking (Open Food Facts API)
- **ExerciseBrowser.tsx**: Advanced exercise search and filtering
- **ExerciseSubstitutionModal.tsx**: AI-powered exercise alternatives
- **FitnessCalculator.tsx**: 1RM calculator and strength standards
- **FloatingCoachButton.tsx**: Quick access to AI trainer
- **Sparkline.tsx**: Micro charts for data visualization
- **AchievementToast.tsx**: Achievement unlock notifications

### Utilities (components/utils/)
- **aiTrainer.ts**: AI coaching logic, chat responses, and workout analysis
- **accessoryAnalysis.ts**: Analyzes workout data for imbalances and weak points
- **achievementEngine.ts**: Achievement detection and unlocking logic (30+ achievements)
- **plateauDetection.ts**: Identifies stagnant exercises using statistical analysis
- **deloadAnalytics.ts**: Overtraining detection and deload recommendations
- **volumeAnalytics.ts**: Muscle group volume calculations and tracking
- **weeklyAnalytics.ts**: Weekly workout summaries and statistics
- **progressionAnalytics.ts**: Strength progression tracking and PR detection
- **strengthAnalytics.ts**: Strength standards and percentile calculations
- **streakAnalytics.ts**: Workout streak calculations
- **substitutionEngine.ts**: Exercise substitution recommendations
- **workoutCalculations.ts**: Workout duration, volume, and calorie calculations
- **calorieCalculations.ts**: Exercise-based calorie burn estimates

### Library Functions (lib/)
- **supabase.ts**: Supabase client configuration and initialization
- **openrouter.ts**: OpenRouter API client for AI suggestions (Claude 3.5 Sonnet)
- **exerciseData.ts**: Exercise database with muscle group mappings (500+ exercises)
- **nutritionSearch.ts**: Open Food Facts API integration for barcode scanning
- **translations.ts**: Multi-language support (NL/EN)

### Database Schema (supabase/migrations/)
- **001_initial_schema.sql**: Core tables (workout_schemas, workout_history, exercise_logs, nutrition_logs, body_stats)
- **002_rls_policies.sql**: Row Level Security policies for data protection
- **003_user_profile.sql**: User profile table with fitness goals and preferences
- **004_add_water_intake.sql**: Water intake tracking table
- **004_user_achievements.sql**: Achievements persistence and tracking
- **005_add_workout_calories.sql**: Workout calorie burn calculations
- **006_social_profiles.sql**: Public user profiles for social features
- **007_friends.sql**: Friend relationships and follow system
- **008_update_profile_defaults.sql**: Profile default values
- **010_social_interactions.sql**: Workout reactions and notifications system



## Features & Data Models

### 1. Authentication & User Management
- **Google OAuth**: Secure authentication via Supabase Auth
- **User Profiles**: Age, weight, height, gender, activity level, fitness goals
- **Social Profiles**: Username, display name, bio, avatar, privacy settings
- **RLS (Row Level Security)**: Database-level data protection per user

### 2. Workout Management
- **Schemas/Programs**: Templates for workouts (e.g., "Push Day", "Full Body")
- **Exercises**: 500+ exercises with muscle group mappings
- **Exercise Library**: Searchable database with filtering by muscle group, equipment
- **Real-time Logging**: Track weights, reps, sets, rest timers during workout
- **Workout History**: Complete log of past workouts with detailed analytics
- **Quick Start**: Resume last workout or start from template
- **Workout Reactions**: Social reactions (fire 🔥, strong 💪, clap 👏, beast 😤) on workout posts

### 3. Analytics & Insights
- **Plateau Detection**: Statistical analysis to identify stagnant exercises (no progress in 3+ weeks)
- **Deload Recommendations**: Overtraining detection based on volume, frequency, and fatigue
- **Volume Tracking**: Total volume per muscle group with 4-week trending
- **Progression Analysis**: Track PR's, strength gains, and percentile rankings
- **Weekly Summaries**: Volume, exercise count, workout frequency, calorie burn
- **Streak Tracking**: Consecutive workout days with motivational milestones

### 4. AI Features
- **AI Coach**: Chat-based coaching with multiple personality profiles (motivational, scientific, balanced)
- **Accessory Suggestions**: Claude 3.5 Sonnet analyzes training data to suggest accessory exercises
  - Detects muscle imbalances (push/pull ratio, upper/lower split)
  - Identifies weak points and undertrained muscle groups
  - Provides 3-5 contextual exercise recommendations with reasoning
  - One-click integration into workout programs
  - Cost: ~$0.006 per suggestion (~$0.60/month for typical usage)
- **Exercise Substitutions**: AI-powered alternative exercise suggestions
- **Workout Analysis**: Contextual feedback on workout quality and intensity

### 5. Nutrition Tracking
- **Meal Logging**: Track meals with macros (calories, protein, carbs, fats)
- **Barcode Scanner**: Camera-based scanning using Open Food Facts API (millions of products)
  - Supports EAN-13, UPC-A, UPC-E formats
  - Auto-fills nutrition data and product images
  - Portion size calculations
- **Daily Summaries**: Macro targets, calorie goals, and visual progress
- **Water Intake**: Track daily water consumption with goal setting

### 6. Body Metrics & Progress
- **Measurements**: Weight, height, chest, biceps, waist, thighs, shoulders
- **Progress Charts**: Visual tracking of measurements over time
- **Before/After**: Weight change tracking
- **Body Composition**: Track multiple metrics simultaneously

### 7. Achievements System
- **30+ Achievements**: Workout milestones, strength achievements, consistency rewards
- **Categories**: Strength (PR's), Volume (total weight moved), Consistency (streaks), Specialization (muscle group focus)
- **Database Persistence**: Achievements synced across devices
- **Achievement Toasts**: Real-time notifications on unlock
- **Progress Tracking**: View locked/unlocked achievements in profile
- **Examples**: "First Workout", "100 Workouts", "500kg Total", "30 Day Streak", "Chest Day King"

### 8. Social & Community
- **Public Profiles**: Share stats, achievements, and workout activity
- **Friend System**: Follow users, view friend feed
- **Activity Feed**: See recent workouts from followed users
- **Discover Users**: Find athletes with similar goals and activity levels
- **Workout Reactions**: React to friends' workouts (fire, strong, clap, beast)
- **Reaction Notifications**: Get notified when friends react to your workouts
- **Privacy Controls**: Toggle profile visibility, workout sharing, achievement display
- **Profile Stats**: Total workouts, 30-day activity, achievement count

### 9. Exercise Library
- **500+ Exercises**: Comprehensive database with muscle group mappings
- **Search & Filter**: By name, muscle group, equipment type
- **Exercise Details**: Instructions, target muscles, equipment needed
- **Custom Exercises**: Users can add custom movements
- **Exercise Substitutions**: Find alternatives for equipment or injury limitations



## Architecture & Technology Choices

### Backend: Supabase
- **Why Supabase**: Managed PostgreSQL, built-in auth, real-time subscriptions, RLS
- **Authentication**: Google OAuth for secure, passwordless login
- **Row Level Security (RLS)**: Database-level data isolation per user
- **Real-time Sync**: Automatic data synchronization across devices
- **Storage**: User avatars and profile images
- **Migration-based Schema**: Version-controlled database changes

### AI Integration: OpenRouter + Claude 3.5 Sonnet
- **Why OpenRouter**: Unified API for multiple AI models, pay-as-you-go pricing
- **Why Claude 3.5 Sonnet**: Best reasoning capabilities for fitness analysis, safety, context handling
- **Cost**: ~$0.006 per suggestion (1500 tokens average)
- **Features**: Accessory exercise suggestions, workout analysis, exercise substitutions
- **Safety**: API key client-side with domain restrictions and spending limits
- **Error Handling**: Graceful degradation, retry logic, timeout protection

### Nutrition: Open Food Facts
- **Why Open Food Facts**: Free, open-source, millions of products, no API key required
- **Barcode Support**: EAN-13, UPC-A, UPC-E
- **Data Quality**: Community-driven, verified nutrition data
- **Features**: Product images, multilingual support, portion calculations

### State Management
- **Auth State**: React Context (`AuthContext.tsx`) for user session
- **App State**: React Context (`DataContext.tsx`) for workout/nutrition data
- **Database Sync**: Real-time sync via Supabase subscriptions
- **Local Optimization**: Optimistic UI updates with background sync

### Styling Philosophy
- **Mobile-First**: Designed for mobile screens, scales to desktop
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **Dark Theme**: Default dark mode optimized for gym environments
- **Color System**: 
  - Primary: Orange/Red gradients (#f97316, #dc2626)
  - Accent: Blue (#3b82f6)
  - Background: Dark grays (#0a0a0a, #1a1a1a)
  - Success/Warning/Error: Semantic colors
- **Animations**: Framer Motion for smooth transitions

### Performance Optimizations
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Database Indexes**: Optimized queries for workout history, reactions
- **Lazy Loading**: Components loaded on demand
- **Caching**: Supabase query caching, localStorage fallbacks

## 3rd Party Libraries

| Library | Version | Usage |
|---------|---------|-------|
| `next` | ^14.0.4 | Next.js framework for SSR, routing, and API routes |
| `react` | ^18.2.0 | UI framework |
| `@supabase/supabase-js` | ^2.39.0 | Supabase client for database and auth |
| `framer-motion` | ^10.16.16 | Page transitions and UI animations |
| `lucide-react` | ^0.300.0 | Icon library |
| `recharts` | ^2.10.3 | Data visualization charts |
| `date-fns` | ^3.0.0 | Date formatting and manipulation |
| `clsx` / `tailwind-merge` | ^2.2.0 | Conditional class name management |
| `html5-qrcode` | ^2.3.8 | Barcode/QR code scanning |
| `tailwindcss` | ^3.4.15 | Utility-first CSS framework |
| `typescript` | ~5.6.2 | Type safety |



## Coding Guidelines

### Styling
- **Tailwind CSS**: Use utility classes exclusively for all styling
- **Design System**: Stick to the defined color palette (Primary: orange/red, Accent: blue, Background: dark)
- **Mobile First**: Design for mobile screens first, then add responsive breakpoints
- **Dark Theme**: App uses dark theme by default, optimized for gym lighting
- **Consistency**: Use consistent spacing (p-4, p-6, gap-4), rounded corners (rounded-xl), shadows
- **Animations**: Use Framer Motion for page transitions, modals, and interactive elements
- **Icons**: Use lucide-react icons consistently

### State Management
- **AuthContext**: User authentication state (Google OAuth session)
- **DataContext**: All workout, nutrition, and body stats data
- **Supabase Sync**: Data automatically synced to database, optimistic UI updates
- **Type Safety**: Strictly type all data models using TypeScript interfaces
- **Immutability**: Never mutate state directly, use proper React state updates

### Components
- **Functional Components**: Use React Functional Components with Hooks exclusively
- **Client Components**: Mark interactive components with `'use client'` directive at the top
- **Clean Code**: Keep components small (<300 lines), extract complex logic to custom hooks or utils
- **Reusability**: Create reusable components for common patterns (widgets, cards, buttons)
- **Navigation**: Use `useRouter` from `next/navigation` for programmatic navigation
- **Links**: Use Next.js `Link` component for declarative routing
- **Error Boundaries**: Handle errors gracefully with try/catch and error states

### Database Best Practices
- **RLS Policies**: Always implement Row Level Security for new tables
- **Migrations**: Use numbered migration files for schema changes
- **Indexes**: Add indexes for frequently queried columns (user_id, created_at, workout_id)
- **Foreign Keys**: Use proper relationships with CASCADE delete where appropriate
- **Views**: Create materialized views for complex aggregations (e.g., `user_profile_stats`)
- **Functions**: Use PostgreSQL functions for complex business logic (e.g., `get_unread_reaction_count`)

### API Routes (app/api/)
- **Server-Side**: Use Next.js API routes for server-side operations
- **Environment Variables**: Use `.env.local` for sensitive keys
- **Error Handling**: Return proper HTTP status codes and error messages
- **CORS**: Configure CORS for external API calls
- **Rate Limiting**: Consider implementing rate limiting for AI endpoints

### AI Integration Best Practices
- **Prompt Engineering**: Structure prompts with clear sections (analysis, context, instructions)
- **Response Validation**: Always validate AI responses for required fields and format
- **Error Handling**: Implement retry logic with exponential backoff (3 attempts)
- **Timeouts**: Set reasonable timeouts (30s) to prevent hanging requests
- **Cost Tracking**: Log token usage and estimated costs for monitoring
- **Graceful Degradation**: App should work without AI features if service is unavailable

### Security & Privacy
- **RLS**: Never bypass Row Level Security, always use `auth.uid()` in policies
- **Input Validation**: Validate all user inputs on both client and server
- **SQL Injection**: Use parameterized queries, never string concatenation
- **XSS Protection**: Sanitize user-generated content before rendering
- **API Keys**: Never commit API keys, use environment variables
- **Privacy**: Respect user privacy settings for social features
- **Data Minimization**: Only store necessary user data



## Data Models & Database Schema

### Core Tables
```typescript
// User Profile (user_profiles)
interface UserProfile {
  id: string              // UUID, primary key
  user_id: string         // References auth.users
  age?: number
  weight?: number         // kg
  height?: number         // cm
  gender?: 'male' | 'female' | 'other'
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  fitness_goal?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'strength'
  created_at: string
  updated_at: string
}

// Workout Schema (workout_schemas)
interface WorkoutSchema {
  id: string
  user_id: string
  name: string
  exercises: Exercise[]
  created_at: string
  updated_at: string
}

interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  restSeconds: number
  muscleGroup: string
  equipment?: string
}

// Workout History (workout_history)
interface WorkoutHistory {
  id: string
  user_id: string
  schema_id?: string
  name: string
  date: string
  duration_minutes: number
  total_volume: number      // kg
  total_exercises: number
  calories_burned?: number
  notes?: string
  created_at: string
}

// Exercise Logs (exercise_logs)
interface ExerciseLog {
  id: string
  workout_id: string
  exercise_name: string
  muscle_group: string
  sets_completed: number
  reps_completed: number[]
  weights_used: number[]    // kg
  total_volume: number      // kg
  personal_record: boolean
}

// Achievements (user_achievements)
interface Achievement {
  id: string
  user_id: string
  achievement_key: string   // e.g., 'first_workout', '100_workouts'
  unlocked_at: string
  metadata?: object         // Additional data (e.g., weight lifted)
}

// Social Profile (user_social_profiles)
interface SocialProfile {
  id: string
  user_id: string
  username: string          // Unique
  display_name?: string
  bio?: string
  avatar_url?: string
  is_public: boolean
  show_workouts: boolean
  show_achievements: boolean
  show_stats: boolean
  created_at: string
}

// Friend Relationships (user_follows)
interface UserFollow {
  id: string
  follower_id: string       // User who follows
  following_id: string      // User being followed
  created_at: string
}

// Workout Reactions (workout_reactions)
interface WorkoutReaction {
  id: string
  workout_id: string
  user_id: string
  reaction_type: 'fire' | 'strong' | 'clap' | 'beast'
  created_at: string
}

// Nutrition (nutrition_logs)
interface NutritionLog {
  id: string
  user_id: string
  date: string
  type: 'food' | 'drink'
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
  created_at: string
}

// Body Stats (body_stats)
interface BodyStat {
  id: string
  user_id: string
  date: string
  weight?: number
  chest?: number
  biceps?: number
  waist?: number
  thighs?: number
  shoulders?: number
}

// Water Intake (water_intake)
interface WaterIntake {
  id: string
  user_id: string
  date: string
  amount_ml: number
  created_at: string
}
```

### Database Views
- **user_profile_stats**: Aggregated user statistics (total workouts, achievements, 30-day activity)
- **friend_activity_feed**: Recent workouts from followed users
- **workout_reaction_counts**: Aggregated reaction counts per workout
- **workout_reaction_notifications**: Reaction notifications for workout owners

### Database Functions
- **get_unread_reaction_count(user_id)**: Returns count of unread workout reactions



## Development Workflow

### Environment Setup
1. **Install Dependencies**: `npm install`
2. **Environment Variables**: Create `.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_key
   ```
3. **Run Development Server**: `npm run dev`
4. **Access**: `http://localhost:3000`

### Database Migrations
- **Location**: `supabase/migrations/`
- **Naming**: `XXX_description.sql` (e.g., `010_social_interactions.sql`)
- **Execution**: Run via Supabase SQL Editor in dashboard
- **Testing**: Verify RLS policies and indexes after migration
- **Version Control**: Always commit migration files

### Adding New Features
1. **Plan**: Document feature requirements and data model
2. **Database**: Create migration if schema changes needed
3. **Types**: Update TypeScript interfaces
4. **Backend**: Implement database queries and RLS policies
5. **Frontend**: Build UI components
6. **Analytics**: Add relevant analytics/tracking if applicable
7. **Test**: Test with real data, edge cases, and mobile devices
8. **Document**: Update relevant guide files (e.g., `IMPLEMENTATION_SUMMARY.md`)

### Testing Checklist
- [ ] Mobile responsiveness (iPhone, Android)
- [ ] Dark theme consistency
- [ ] Authentication flow (login, logout, session persistence)
- [ ] RLS policies (can't access other users' data)
- [ ] Error handling (network errors, API failures)
- [ ] Loading states and optimistic UI
- [ ] Database constraints (unique, foreign keys)
- [ ] Performance (page load time, query efficiency)

### Code Review Guidelines
- **TypeScript**: No `any` types, strict type checking
- **Components**: Max 300 lines, single responsibility
- **Naming**: Descriptive names, consistent conventions
- **Comments**: Only for complex logic, prefer self-documenting code
- **Performance**: Avoid unnecessary re-renders, use React.memo where appropriate
- **Accessibility**: Proper labels, keyboard navigation, screen reader support

## Project-Specific Conventions

### File Naming
- **Components**: PascalCase (e.g., `WorkoutLogger.tsx`)
- **Utils**: camelCase (e.g., `plateauDetection.ts`)
- **Pages**: PascalCase (e.g., `Dashboard.tsx`)
- **Migrations**: snake_case with number prefix (e.g., `010_social_interactions.sql`)

### Import Aliases
- `@/components/*`: Components directory
- `@/lib/*`: Library functions
- `@/types/*`: TypeScript type definitions

### Git Workflow
- **Branch Naming**: `feature/description`, `fix/description`
- **Commit Messages**: Descriptive, imperative mood (e.g., "Add workout reactions feature")
- **PR Reviews**: Required for main branch
- **Migration Strategy**: Test migrations locally before production

## Common Patterns

### Fetching Data from Supabase
```typescript
const { data, error } = await supabase
  .from('workout_history')
  .select('*')
  .eq('user_id', user.id)
  .order('date', { ascending: false })
  .limit(10)

if (error) {
  console.error('Error fetching workouts:', error)
  return
}
```

### Creating Protected Routes
```typescript
'use client'

export default function ProtectedPage() {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" />
  
  return <div>Protected content</div>
}
```

### Implementing RLS Policies
```sql
-- Users can only view their own data
CREATE POLICY "Users view own data"
ON public.workout_history FOR SELECT
USING (user_id = auth.uid());

-- Users can only insert their own data
CREATE POLICY "Users insert own data"
ON public.workout_history FOR INSERT
WITH CHECK (user_id = auth.uid());
```

### Adding Analytics Widgets
1. Create widget component in `components/`
2. Implement data fetching logic
3. Add to `Dashboard.tsx` in appropriate position
4. Ensure mobile responsiveness
5. Add loading and error states

### Integrating AI Features
1. Define clear prompt structure in `lib/openrouter.ts`
2. Implement response validation
3. Add retry logic with exponential backoff
4. Track costs and token usage
5. Provide fallback behavior on errors
6. Update AI_SUGGESTIONS_GUIDE.md with documentation

## Troubleshooting

### Common Issues

**Authentication Errors**
- Check Supabase URL and anon key in `.env.local`
- Verify Google OAuth credentials in Supabase dashboard
- Clear browser cache and cookies
- Check RLS policies allow user access

**Database Query Failures**
- Verify RLS policies exist for table
- Check user is authenticated (`auth.uid()` returns value)
- Ensure foreign key relationships are correct
- Review query syntax in Supabase logs

**AI Suggestion Errors**
- Verify OpenRouter API key is valid
- Check spending limit hasn't been reached
- Inspect network tab for API response errors
- Review prompt structure and token limits

**Barcode Scanner Not Working**
- Ensure HTTPS connection (or localhost)
- Check camera permissions in browser
- Verify barcode format is supported (EAN-13, UPC-A, UPC-E)
- Test with different products/barcodes

**Performance Issues**
- Check database indexes on frequently queried columns
- Review React DevTools for unnecessary re-renders
- Optimize images using Next.js Image component
- Consider pagination for large data sets

## Future Roadmap

### Planned Features
1. **Advanced Analytics**: Predictive analytics for plateau prevention
2. **Workout Plans**: Pre-built programs for different goals
3. **Video Exercise Library**: Instructional videos for proper form
4. **Meal Planning**: AI-powered meal suggestions based on goals
5. **Wearable Integration**: Sync with fitness trackers (Apple Health, Google Fit)
6. **Progressive Web App**: Offline support, installable app
7. **Leaderboards**: Competitive rankings based on strength standards
8. **Workout Sharing**: Export/import workout programs
9. **Voice Commands**: Hands-free workout logging
10. **Exercise Form Analysis**: AI-powered form check using camera

### Technical Debt
- Migrate remaining localStorage code to Supabase
- Implement comprehensive error tracking (e.g., Sentry)
- Add E2E testing (Playwright/Cypress)
- Improve TypeScript coverage (eliminate remaining `any` types)
- Optimize bundle size (code splitting, tree shaking)

---

## Quick Reference

### Most Used Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY      # Supabase anonymous key
NEXT_PUBLIC_OPENROUTER_API_KEY     # OpenRouter API key for AI
```

### Key URLs
- **Local Dev**: http://localhost:3000
- **Supabase Dashboard**: https://app.supabase.com
- **OpenRouter Dashboard**: https://openrouter.ai
- **Open Food Facts API**: https://world.openfoodfacts.org/api/v0/product/{barcode}.json

### Important Files to Review
- `components/context/DataContext.tsx` - State management
- `components/context/AuthContext.tsx` - Authentication
- `lib/supabase.ts` - Database client
- `lib/openrouter.ts` - AI client
- `components/utils/achievementEngine.ts` - Achievement logic
- `components/utils/plateauDetection.ts` - Plateau detection logic