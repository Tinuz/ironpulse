# FitnessTracker Project Instructions

## Project Overview
FitnessTracker is a comprehensive mobile-first web application designed to help users track their workouts, nutrition, and body progress. It features an AI trainer for personalized advice and uses local storage for data persistence.

## Project Structure

### Development Stack
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Next.js**: For server-side rendering and routing (App Router)

### Core Files
- **Entry Point**: `app/page.tsx` - Main application entry point using Next.js App Router
- **Root Layout**: `app/layout.tsx` - Root layout with metadata and global styles
- **Main Component**: `components/FitnessTracker.tsx` - Main application wrapper containing DataProvider and routing logic
- **State Management**: `components/context/DataContext.tsx` - Centralized state using React Context API. Handles persistence via LocalStorage.
- **Navigation**: `components/Navigation.tsx` - Bottom tab navigation for mobile accessibility.
- **Dashboard** (`/`): `components/pages/Dashboard.tsx` - Main overview, quick actions, and daily summary.
- **Schema Builder** (`/schema`): `components/pages/SchemaBuilder.tsx` - Create and manage workout routines.
- **Workout Logger** (`/workout/:schemaId?`): `components/pages/WorkoutLogger.tsx` - Active workout session tracker.
- **History** (`/history`): `components/pages/History.tsx` - Log of past workouts.
- **Progress** (`/progress`): `components/pages/Progress.tsx` - Body measurements and weight tracking.
- **AI Trainer** (`/trainer`): `components/pages/AITrainer.tsx` - Chat interface for AI coaching.
- **Nutrition** (`/nutrition`): `componentsages/Progress.tsx` - Body measurements and weight tracking.
- **AI Trainer** (`/trainer`): `src/pages/AITrainer.tsx` - Chat interface for AI coaching.
- **Nutrition** (`/nutrition`): `src/pages/Nutrition.tsx` - Meal and macro tracking.

### Utilities
- **AI Logic**: `components/utils/aiTrainer.ts` - Helper functions for generating AI responses and analysis.

## Features & Data Models

### 1. Workouts
- **Schemas**: Templates for workouts (e.g., "Upper Body", "Leg Day").
- **Exercises**: Individual movements with target sets/reps.
- **Logging**: Real-time tracking of weights, reps, and completion status.

### 2. Nutrition
- **Logging**: Track meals (Food/Drink) with macros (Calories, Protein, Carbs, Fats).
- **Analysis**: Daily summaries and visualizations.

### 3. Body Stats
- **Measurements**: Weight, Height, Chest, Biceps, Waist, Thighs, Shoulders.
- **History**: Track changes over time.

### 4. AI Coach
- **Capabilities**: Analyzes workout history and nutrition logs to provide tips and feedback.
- **Interaction**: Chat-based interface with context-aware responses.

## 3rd Party Libraries

| Library | Usage |
|---------|-------|
| `next` | Next.js framework for SSR, routing, and production builds |
| `framer-motion` | Page transitions and UI animations. |
| `lucide-react` | Iconography. |
| `recharts` | Data visualization (charts/graphs). |
| `date-fns` | Date formatting and manipulation. |
| `clsx` / `tailwind-merge` | Conditional class name management. |

## Coding Guidelines

### Styling
- **Tailwind CSS**: Use utility classes for all styling.
- **Design System**: Stick to the defined color palette (Primary, Accent, Background, Card).
- **Mobile First**: Ensure all layouts work perfectly on mobile screens before desktop.
- **Dark Mode**: The app uses a dark theme by default.

### State Management
- **DataContext**: All shared state must reside in `components/context/DataContext.tsx`.
- **LocalStorage**: Data is automatically persisted to LocalStorage in `DataContext`.
- **Interfaces**: Strictly type all data models (see `components/context/DataContext.tsx` for definitions).

### Components
- **Functional**: Use React Functional Components with Hooks.
- **Client Components**: Mark interactive components with `'use client'` directive at the top.
- **Clean Code**: Keep components small and focused. Extract complex logic to hooks or utils.
- **Navigation**: Use `useRouter` from `next/navigation` for programmatic navigation. Use Next.js `Link` component for declarative links.

### Data persistence
- Keys used in `localStorage`:
  - `ft_schemas`: Saved workout templates
  - `ft_history`: Completed workout logs
  - `ft_active`: Currently active workout state
  - `ft_body_stats`: Body measurements history
  - `ft_nutrition`: Nutrition/meal logs

## Development Client-side routing is handled in `components/FitnessTracker.tsx` using Next.js App Router pattern with pathname-based rendering.
- **Path Aliases**: Use `@/` prefix for imports (e.g., `@/context/DataContext`).
- **Assets**: Use Project Assets (Fonts/Logos) where available.
- **AI Integration**: When modifying AI features, update `componentse.
- **AI Integration**: When modifying AI features, update `src/utils/aiTrainer.ts` to enhance response logic.