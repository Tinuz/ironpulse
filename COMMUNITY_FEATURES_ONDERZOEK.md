# Community & Leaderboard Features - Implementatie Onderzoek

## Executive Summary

Dit document beschrijft een gefaseerde aanpak voor het toevoegen van community en leaderboard features aan NXT•REP. De implementatie is ontworpen om:
- Engagement en retention te verhogen
- Competitief en sociaal aspect toe te voegen
- Privacy en data security te waarborgen
- Gradueel uit te rollen zonder bestaande functionaliteit te verstoren

---

## Huidige Architectuur Analyse

### Bestaande Infrastructuur
- ✅ **Supabase PostgreSQL** - Scalable database
- ✅ **Google Auth** - User authenticatie
- ✅ **User Profiles** - Age, weight, height, gender, activity level
- ✅ **Workout History** - Alle workouts met exercises, sets, reps, weight
- ✅ **Achievements System** - Al geïmplementeerd met database persistence
- ✅ **Real-time data sync** - Via Supabase

### Data die we al hebben per user:
1. **Workout data**: Exercises, volume, frequency, PR's
2. **Body metrics**: Weight, measurements
3. **Nutrition**: Calorie intake, macros
4. **Achievements**: Unlocked achievements
5. **Streak data**: Workout consistency

---

## Fase 1: Basis Social Features (Week 1-2)

### 1.1 Public Profiles
**Doel**: Users kunnen hun profiel delen en anderen bekijken

#### Database Schema
```sql
-- Migration: 006_social_profiles.sql
CREATE TABLE IF NOT EXISTS public.user_social_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT false,
    show_workouts BOOLEAN DEFAULT false,
    show_achievements BOOLEAN DEFAULT true,
    show_stats BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor snelle lookups
CREATE INDEX idx_social_profiles_username ON public.user_social_profiles(username);
CREATE INDEX idx_social_profiles_is_public ON public.user_social_profiles(is_public) WHERE is_public = true;

-- RLS Policies
ALTER TABLE public.user_social_profiles ENABLE ROW LEVEL SECURITY;

-- Iedereen kan publieke profielen zien
CREATE POLICY "Public profiles are viewable by everyone"
ON public.user_social_profiles FOR SELECT
USING (is_public = true OR user_id = auth.uid()::text);

-- Users kunnen alleen hun eigen profiel updaten
CREATE POLICY "Users can update their own profile"
ON public.user_social_profiles FOR UPDATE
USING (user_id = auth.uid()::text);

-- Users kunnen hun eigen profiel aanmaken
CREATE POLICY "Users can create their own profile"
ON public.user_social_profiles FOR INSERT
WITH CHECK (user_id = auth.uid()::text);
```

#### UI Components
```typescript
// components/pages/PublicProfile.tsx
- Username + Display name
- Bio (max 150 chars)
- Profile stats (workouts, achievements, streak)
- Workout feed (optioneel, privacy setting)
- Share profile button (deep link)
```

#### Settings Integration
```typescript
// In Settings.tsx
<Section title="Privacy & Delen">
  <Toggle label="Publiek profiel" value={isPublic} />
  <Toggle label="Toon workouts" value={showWorkouts} />
  <Toggle label="Toon achievements" value={showAchievements} />
  <Input placeholder="Username" value={username} />
</Section>
```

---

## Fase 2: Friend System (Week 3-4)

### 2.1 Friends & Following
**Doel**: Users kunnen elkaar volgen en elkaars voortgang zien

#### Database Schema
```sql
-- Migration: 007_friends.sql
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_follows_following ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
ON public.user_follows FOR SELECT
USING (follower_id = auth.uid()::text OR following_id = auth.uid()::text);

CREATE POLICY "Users can follow others"
ON public.user_follows FOR INSERT
WITH CHECK (follower_id = auth.uid()::text);

CREATE POLICY "Users can unfollow others"
ON public.user_follows FOR DELETE
USING (follower_id = auth.uid()::text);

-- Friend stats view
CREATE OR REPLACE VIEW public.user_friend_stats AS
SELECT 
    user_id,
    (SELECT COUNT(*) FROM user_follows WHERE follower_id = user_id) as following_count,
    (SELECT COUNT(*) FROM user_follows WHERE following_id = user_id) as followers_count
FROM user_social_profiles;
```

#### UI Components
```typescript
// components/pages/Social.tsx (nieuwe pagina)
- Following feed (recent workouts van mensen die je volgt)
- Discover users (suggesties)
- Friend requests / Following list

// components/UserCard.tsx
- Avatar, username, stats
- Follow/Unfollow button
- View profile button
```

---

## Fase 3: Leaderboards (Week 5-6)

### 3.1 Leaderboard Types
**Verschillende competitie categorieën voor diverse doelen**

#### Database Schema
```sql
-- Migration: 008_leaderboards.sql

-- Leaderboard entries (materialized view voor performance)
CREATE MATERIALIZED VIEW public.leaderboard_total_volume AS
SELECT 
    user_id,
    SUM(
        (exercises->>'sets')::jsonb_array_length * 
        (exercises->>'reps')::int * 
        (exercises->>'weight')::numeric
    ) as total_volume,
    COUNT(DISTINCT id) as workout_count,
    MAX(date) as last_workout
FROM workout_history
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

CREATE UNIQUE INDEX idx_leaderboard_volume_user ON leaderboard_total_volume(user_id);

-- Streak leaderboard
CREATE MATERIALIZED VIEW public.leaderboard_streaks AS
WITH streak_calc AS (
    SELECT 
        user_id,
        date::date as workout_date,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date::date) -
        DENSE_RANK() OVER (PARTITION BY user_id ORDER BY date::date) as streak_group
    FROM workout_history
    WHERE date >= NOW() - INTERVAL '90 days'
)
SELECT 
    user_id,
    MAX(streak_length) as longest_streak,
    COUNT(DISTINCT workout_date) as total_days_active
FROM (
    SELECT 
        user_id,
        streak_group,
        COUNT(*) as streak_length
    FROM streak_calc
    GROUP BY user_id, streak_group
) streaks
GROUP BY user_id;

-- PR's leaderboard (personal records per exercise)
CREATE TABLE IF NOT EXISTS public.exercise_leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    max_weight NUMERIC NOT NULL,
    reps_at_max INTEGER NOT NULL,
    one_rep_max NUMERIC GENERATED ALWAYS AS (
        max_weight * (1 + reps_at_max / 30.0)
    ) STORED,
    achieved_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exercise_name, user_id)
);

CREATE INDEX idx_exercise_leaderboard_exercise ON exercise_leaderboards(exercise_name);
CREATE INDEX idx_exercise_leaderboard_1rm ON exercise_leaderboards(one_rep_max DESC);

-- Refresh materialized views (run via cron job)
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_total_volume;
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_streaks;
END;
$$ LANGUAGE plpgsql;
```

#### Leaderboard Categories
1. **Volume Kings** 👑 - Meeste totale volume (30 dagen)
2. **Consistency Champions** 🔥 - Langste workout streak
3. **Exercise PR's** 💪 - Beste 1RM per exercise (Bench, Squat, Deadlift, etc.)
4. **Weekly Warriors** ⚡ - Most workouts deze week
5. **Achievement Hunters** 🏆 - Meeste achievements unlocked

#### UI Components
```typescript
// components/pages/Leaderboards.tsx
interface LeaderboardEntry {
    rank: number
    userId: string
    username: string
    avatar: string
    score: number
    change: number // rank change vs last period
    isCurrentUser: boolean
}

// Features:
- Tab voor elke leaderboard category
- Current user's position highlighted
- Podium (top 3) met special styling
- Filter: Global / Friends only / Local gym
- Time period filter: Week / Month / All-time
```

---

## Fase 4: Challenges & Competitions (Week 7-8)

### 4.1 Community Challenges
**Doel**: Georganiseerde competities met tijdslimiet**

#### Database Schema
```sql
-- Migration: 009_challenges.sql
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN (
        'total_volume', 'workout_count', 'streak', 'specific_exercise', 'total_reps'
    )),
    target_exercise TEXT, -- voor specific_exercise type
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT REFERENCES auth.users(id),
    prize_description TEXT,
    max_participants INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    current_score NUMERIC DEFAULT 0,
    rank INTEGER,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_score ON challenge_participants(challenge_id, current_score DESC);

-- Update score functie (call na elke workout)
CREATE OR REPLACE FUNCTION update_challenge_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Update alle actieve challenges waar user aan deelneemt
    UPDATE challenge_participants cp
    SET current_score = (
        SELECT CASE c.challenge_type
            WHEN 'total_volume' THEN calculate_volume(NEW.user_id, c.start_date, c.end_date)
            WHEN 'workout_count' THEN count_workouts(NEW.user_id, c.start_date, c.end_date)
            -- etc.
        END
        FROM challenges c
        WHERE c.id = cp.challenge_id
    )
    WHERE cp.user_id = NEW.user_id
    AND EXISTS (
        SELECT 1 FROM challenges c 
        WHERE c.id = cp.challenge_id 
        AND c.is_active = true
        AND NOW() BETWEEN c.start_date AND c.end_date
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_challenge_scores_trigger
AFTER INSERT ON workout_history
FOR EACH ROW EXECUTE FUNCTION update_challenge_scores();
```

#### Challenge Types
1. **30-Day Volume Challenge** - Meeste total volume in 30 dagen
2. **Perfect Week** - 5+ workouts deze week
3. **Bench Press Championship** - Beste 1RM bench press
4. **10K Rep Challenge** - Eerste naar 10,000 total reps
5. **Consistency Streak** - Langste dagelijkse streak

#### UI Components
```typescript
// components/pages/Challenges.tsx
- Active challenges carousel
- "Join Challenge" CTA
- Live leaderboard voor actieve challenge
- Challenge progress tracker
- Past challenges archive
- Create custom challenge (voor admins/premium?)
```

---

## Fase 5: Social Interactions (Week 9-10)

### 5.1 Workout Reactions & Comments

#### Database Schema
```sql
-- Migration: 010_social_interactions.sql
CREATE TABLE IF NOT EXISTS public.workout_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID REFERENCES public.workout_history(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN (
        'fire', 'strong', 'clap', 'beast'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workout_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workout_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID REFERENCES public.workout_history(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL CHECK (char_length(comment_text) <= 280),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reactions_workout ON workout_reactions(workout_id);
CREATE INDEX idx_comments_workout ON workout_comments(workout_id);

-- Reaction counts view
CREATE OR REPLACE VIEW workout_reaction_counts AS
SELECT 
    workout_id,
    COUNT(*) as total_reactions,
    COUNT(*) FILTER (WHERE reaction_type = 'fire') as fire_count,
    COUNT(*) FILTER (WHERE reaction_type = 'strong') as strong_count,
    COUNT(*) FILTER (WHERE reaction_type = 'clap') as clap_count,
    COUNT(*) FILTER (WHERE reaction_type = 'beast') as beast_count
FROM workout_reactions
GROUP BY workout_id;
```

#### UI Features
```typescript
// Workout Detail Page additions:
- Reaction buttons: 🔥 💪 👏 😈
- Comment section
- Share workout (deep link / social media)

// Feed updates:
- "X gave you a 🔥 reaction"
- "Y commented on your workout"
```

---

## Fase 6: Gamification & Rewards (Week 11-12)

### 6.1 Enhanced Achievement System

#### New Achievement Categories
```sql
-- Migration: 011_social_achievements.sql
INSERT INTO achievements (id, name, description, category, threshold) VALUES
-- Social achievements
('social_first_friend', 'Teamplayer', 'Volg je eerste vriend', 'social', 1),
('social_10_friends', 'Popular', 'Volg 10 vrienden', 'social', 10),
('social_first_reaction', 'Motivator', 'Geef je eerste reactie', 'social', 1),
('social_100_reactions', 'Hype Machine', 'Geef 100 reacties', 'social', 100),

-- Leaderboard achievements  
('leaderboard_top10', 'Top 10', 'Bereik top 10 in een leaderboard', 'competitive', 1),
('leaderboard_top3', 'Podium', 'Bereik top 3 in een leaderboard', 'competitive', 1),
('leaderboard_first', 'Champion', 'Bereik #1 in een leaderboard', 'competitive', 1),

-- Challenge achievements
('challenge_winner', 'Challenge Victor', 'Win een challenge', 'competitive', 1),
('challenge_participant', 'Challenger', 'Doe mee aan 5 challenges', 'participation', 5),
('challenge_streak', 'Challenge Master', 'Win 3 challenges', 'competitive', 3);
```

### 6.2 Levels & XP System
```sql
CREATE TABLE IF NOT EXISTS public.user_xp (
    user_id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    xp_to_next_level INTEGER DEFAULT 100,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP earning actions
CREATE TABLE IF NOT EXISTS public.xp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    xp_earned INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP earning rates:
-- Complete workout: 10 XP
-- New PR: 25 XP  
-- Unlock achievement: 50 XP
-- Win challenge: 100 XP
-- Workout streak 7 days: 75 XP
-- Give reaction: 1 XP
-- Receive reaction: 2 XP
```

---

## Privacy & Moderation

### Privacy Controls (Settings)
```typescript
interface PrivacySettings {
    isPublic: boolean              // Public profile
    showWorkouts: boolean          // Show workout history
    showAchievements: boolean      // Show unlocked achievements  
    showStats: boolean             // Show stats (PR's, volume, etc.)
    allowFollow: boolean           // Allow others to follow
    showOnLeaderboards: boolean    // Appear in global leaderboards
    friendsOnlyLeaderboards: boolean // Only compete with friends
}
```

### Content Moderation
```sql
-- Reporting system
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by TEXT REFERENCES auth.users(id),
    content_type TEXT NOT NULL, -- 'profile', 'comment', 'workout'
    content_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked users
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);
```

---

## Navigation & UX Integration

### Navigation Updates
```typescript
// components/Navigation.tsx
const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dash' },
    { path: '/exercises', icon: Dumbbell, label: 'Exercises' },
    { path: '/play', icon: Play, label: 'Play', isCenter: true },
    { path: '/social', icon: Users, label: 'Social' }, // NEW
    { path: '/progress', icon: User, label: 'Me' },
]
```

### Social Tab Structure
```typescript
// components/pages/Social.tsx
<Tabs>
    <Tab name="Feed">
        - Following feed (friend workouts)
        - Achievement notifications
        - Challenge updates
    </Tab>
    <Tab name="Leaderboards">
        - All leaderboard categories
        - Your rankings
    </Tab>
    <Tab name="Challenges">
        - Active challenges
        - Your challenges
    </Tab>
    <Tab name="Discover">
        - Find friends
        - Suggested follows
        - Popular profiles
    </Tab>
</Tabs>
```

---

## Performance Optimizations

### Caching Strategy
```typescript
// Real-time updates met Supabase Realtime
const leaderboardChannel = supabase
    .channel('leaderboard-updates')
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leaderboard_total_volume'
    }, (payload) => {
        // Update UI
    })
    .subscribe()

// Cache leaderboards client-side (5 min)
const { data, error } = await supabase
    .from('leaderboard_total_volume')
    .select('*')
    .order('total_volume', { ascending: false })
    .limit(100)
    
// SWR voor automatic revalidation
const { data: leaderboard } = useSWR(
    'leaderboard-volume',
    fetchLeaderboard,
    { refreshInterval: 300000 } // 5 min
)
```

### Database Optimization
- Materialized views voor leaderboards (refresh every 15 min)
- Indexes op alle foreign keys
- Partitioning voor workout_history (per month)
- Caching layer (Redis) voor leaderboard queries

---

## Roadmap & Prioriteit

### Must Have (MVP)
1. ✅ Public profiles met privacy settings
2. ✅ Follow system
3. ✅ Basis leaderboard (volume + streaks)
4. ✅ Achievement system uitbreiden

### Should Have (V2)
5. ⚡ Challenges system
6. ⚡ Workout reactions
7. ⚡ Social feed
8. ⚡ XP & levels

### Nice to Have (V3)
9. 🔮 Comments op workouts
10. 🔮 Groups/Teams
11. 🔮 Local gym leaderboards (geolocation)
12. 🔮 Video workout sharing
13. 🔮 Workout templates marketplace

---

## Technical Stack Additions

### Dependencies
```json
{
    "@supabase/realtime-js": "^2.9.0",  // Real-time updates
    "swr": "^2.2.4",                    // Client-side caching
    "react-share": "^5.0.3",            // Social sharing
    "react-avatar": "^5.0.3"            // Profile avatars
}
```

### Supabase Features to Enable
- ✅ Realtime subscriptions
- ✅ Storage (voor profile pictures)
- ✅ Edge Functions (voor challenge scoring)
- ✅ Scheduled jobs (leaderboard refresh)

---

## Launch Strategy

### Soft Launch (Friends & Family)
- Invite-only access
- 50-100 beta testers
- Collect feedback
- Fix bugs
- Iterate on UX

### Public Beta
- Open registration
- Feature announcements
- Seeding initial challenges
- Influencer partnerships
- Community building

### Full Launch
- Marketing campaign
- Press release
- App store optimization
- Community events (virtual workouts)

---

## Metrics & KPIs

### Engagement Metrics
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Friend connections per user
- Leaderboard views
- Challenge participation rate
- Reaction/comment frequency

### Retention Metrics
- 7-day retention
- 30-day retention
- Churn rate
- Feature adoption rates

### Social Metrics
- Avg friends per user
- Social activity ratio (reactions/workouts)
- Challenge completion rate
- Leaderboard climb rate

---

## Risico's & Mitigatie

### Data Integrity & Fraud Prevention ⚠️
**Risico**: Users kunnen fake workouts loggen, weights/reps overstaten voor betere leaderboard posities
**Realiteit**: Dit is onvermijdelijk - we kunnen niet fysiek verifiëren of iemand echt 200kg bench pressed

#### Mitigatie Strategieën:

**1. AI-Powered Anomaly Detection**
```sql
-- Detecteer onrealistische progressie
CREATE OR REPLACE FUNCTION detect_suspicious_workout(
    user_id TEXT,
    exercise_name TEXT,
    new_weight NUMERIC,
    new_reps INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    previous_max NUMERIC;
    previous_date TIMESTAMPTZ;
    days_between INTEGER;
    progression_rate NUMERIC;
BEGIN
    -- Haal vorige beste poging op
    SELECT max_weight, achieved_at INTO previous_max, previous_date
    FROM exercise_leaderboards
    WHERE user_id = user_id AND exercise_name = exercise_name;
    
    IF previous_max IS NULL THEN
        RETURN FALSE; -- Eerste entry, kan niet checken
    END IF;
    
    days_between := EXTRACT(DAY FROM NOW() - previous_date);
    progression_rate := ((new_weight - previous_max) / previous_max) * 100;
    
    -- Red flags:
    -- 1. Meer dan 50% toename in minder dan 7 dagen
    -- 2. Meer dan 100% toename ever
    -- 3. Onmogelijke absolute waarden (>400kg bench voor beginners)
    
    IF (progression_rate > 50 AND days_between < 7) 
       OR progression_rate > 100 
       OR (new_weight > 300 AND previous_max < 100) THEN
        -- Log suspicious activity
        INSERT INTO suspicious_activities (user_id, workout_id, reason, detected_at)
        VALUES (user_id, workout_id, 'Unrealistic progression', NOW());
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Automatische flagging tabel
CREATE TABLE IF NOT EXISTS public.suspicious_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    workout_id UUID,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'legit', 'fraud'
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT
);
```

**2. Community Verification & Reporting**
```typescript
// Laat community helpen met verification
interface WorkoutVerification {
    workoutId: string
    verifiedBy: string[]  // Users die workout als legit markeren
    reportedBy: string[]  // Users die twijfelen
    verificationScore: number // Net positief = trusted
}

// UI Feature: "Deze workout lijkt onrealistisch" button
// Meerdere reports = automatic review trigger
```

**3. Plausibility Bounds per Experience Level**
```typescript
// Automatische validatie grenzen
const PLAUSIBILITY_LIMITS = {
    bench_press: {
        beginner: { max: 80, progression_per_week: 5 },
        intermediate: { max: 140, progression_per_week: 2.5 },
        advanced: { max: 200, progression_per_week: 1 },
        elite: { max: 300, progression_per_week: 0.5 }
    },
    squat: {
        beginner: { max: 100, progression_per_week: 7.5 },
        intermediate: { max: 180, progression_per_week: 5 },
        advanced: { max: 250, progression_per_week: 2.5 },
        elite: { max: 350, progression_per_week: 1 }
    }
    // etc.
}

// Bij nieuwe PR: check tegen user's experience level
// Experience level = bepaald door workout history consistency
```

**4. Verified Badges & Reputation System**
```sql
-- User reputation score (0-100)
CREATE TABLE IF NOT EXISTS public.user_reputation (
    user_id TEXT PRIMARY KEY,
    reputation_score INTEGER DEFAULT 50,
    verified_athlete BOOLEAN DEFAULT false,
    verification_method TEXT, -- 'video', 'competition', 'trusted_reporter'
    verified_at TIMESTAMPTZ,
    trusted_reports INTEGER DEFAULT 0, -- Aantal correcte fraud reports
    false_reports INTEGER DEFAULT 0,   -- Aantal foute reports
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verified badges:
-- ✓ Verified Athlete (video bewijs van PR)
-- ✓ Competition Lifter (officiële wedstrijd resultaten)
-- ✓ Trusted Reporter (goede track record van accurate reports)
-- ✓ Long-term Consistent (2+ jaar consistent data)
```

**5. Video Verification (Optioneel voor Competitive)**
```sql
-- Voor top 10 leaderboard claims: optionele video upload
CREATE TABLE IF NOT EXISTS public.workout_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID REFERENCES workout_history(id),
    exercise_name TEXT NOT NULL,
    video_url TEXT NOT NULL, -- Supabase Storage URL
    verified_by_mod BOOLEAN DEFAULT false,
    upload_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video requirements:
-- - Full ROM visible
-- - Weight plates clearly visible
-- - Unedited, continuous recording
-- - Max 60 seconds per lift
```

**6. Segregate Casual vs Competitive**
```typescript
// Verschillende modes:
interface LeaderboardModes {
    casual: {
        // Geen fraud checks
        // For fun only
        // Opt-in, default
    },
    verified: {
        // Strict anomaly detection
        // Community reporting enabled
        // Video verification voor top 10
        // Opt-in
    },
    competitive: {
        // Verified athletes only
        // Mandatory video proof
        // Prize-eligible
        // Application required
    }
}
```

**7. Focus op Personal Progress > Absolute Rankings**
```typescript
// Shift focus naar jezelf verbeteren ipv #1 worden
interface PersonalizedLeaderboards {
    // "Beat Your Own Records" - persoonlijke PR tracking
    // "Most Improved" - relatieve progressie ipv absolute numbers
    // "Consistency King" - focus op discipline ipv max weight
    // "Friends Circle" - compete alleen met mensen die je kent
}

// Gamification zonder "winning":
// - Unlock achievements voor milestones
// - XP voor effort, niet results
// - Streak rewards voor consistency
```

**8. Statistical Analysis & Pattern Detection**
```sql
-- Machine learning model voor fraud detection
CREATE TABLE IF NOT EXISTS public.workout_patterns (
    user_id TEXT PRIMARY KEY,
    avg_workout_duration INTEGER, -- in minutes
    typical_exercises JSONB,      -- user's usual exercises
    consistency_score NUMERIC,     -- hoe consistent zijn workouts
    volume_trend TEXT,            -- 'increasing', 'stable', 'decreasing'
    anomaly_count INTEGER DEFAULT 0,
    last_analyzed TIMESTAMPTZ
);

-- Red flags:
-- 1. User plots altijd dezelfde workout exact (copy-paste)
-- 2. Volume spikes zonder buildup (0 to 100 real quick)
-- 3. Perfect numbers (altijd rondes: 100kg, 200kg, never 97.5kg)
-- 4. Workout duration = 5 min voor 20 exercises (onmogelijk)
-- 5. Geen rest days (7 days/week maanden lang)
```

**9. Transparency & Education**
```typescript
// UI Communicatie:
const CommunityGuidelines = {
    message: `
        🏋️ NXT•REP is gebouwd op vertrouwen en eerlijkheid
        
        We snappen dat leaderboards competitief zijn, maar:
        - Deze app is voor JOUW voortgang, niet om anderen te verslaan
        - Vals spelen helpt alleen jezelf misleiden
        - We detecteren onrealistische data automatisch
        - Community kan verdachte workouts rapporteren
        - Verified badges voor bewezen prestaties
        
        💪 Laten we een positive, supportive community bouwen!
    `,
    
    reportThresholds: {
        3: 'Workout wordt gemarkeerd voor review',
        5: 'Workout wordt verwijderd van leaderboard',
        10: 'Account wordt geflagged voor moderator review'
    }
}
```

**10. Incentive Structure Aanpassen**
```typescript
// Maak fraud minder aantrekkelijk:
const RewardSystem = {
    // Beloon CONSISTENCY over absolute performance
    achievements: {
        '30_day_streak': { xp: 500, badge: '🔥 Consistency King' },
        '100_workouts': { xp: 1000, badge: '💯 Century Club' },
        'pr_every_month_6months': { xp: 750, badge: '📈 Steady Progress' }
    },
    
    // Geen grote prizes voor #1 rankings
    // Wel recognition voor verified improvements
    // Community spotlight voor inspirerende journeys
    
    leaderboards: {
        featured: 'Most Improved (percentage)', // Niet absolute beste
        categories: 'Multiple (volume, consistency, variety)', // Iedereen kan ergens winnen
        time_periods: 'Weekly resets' // Minder waard om te frauderen
    }
}
```

#### Uiteindelijke Strategie: **"Trust but Verify"**

We accepteren dat 100% fraud prevention onmogelijk is, maar maken het:
1. **Moeilijk** - Anomaly detection catches obvious cheating
2. **Minder waard** - Geen grote prizes, focus op personal growth
3. **Risicovol** - Account bans, reputation damage
4. **Zichtbaar** - Community kan rapporteren
5. **Optioneel** - Casual mode = no pressure, verified mode = strict checks

**Vergelijk met andere apps:**
- **Strava**: Heeft hetzelfde probleem, lost op met segment leaderboards + community flagging
- **MyFitnessPal**: Accepteert self-reported data, focus op personal tracking
- **Zwift**: Hardware verification (power meters), maar ook duur
- **Garmin Connect**: Device data is betrouwbaarder maar ook te manipuleren

**Bottom line**: We bouwen voor de 95% eerlijke users, niet de 5% cheaters. Met goede detectie, community moderation en de juiste incentives kunnen we een gezonde competitive environment creëren zonder perfecte verification.

---

### Privacy Concerns
**Risico**: Users willen misschien niet alles publiek delen
**Mitigatie**: Granular privacy controls, opt-in defaults, clear communication

### Toxic Competition
**Risico**: Ongezonde competitie, body shaming, etc.
**Mitigatie**: Reporting system, moderation, positive community guidelines, diverse leaderboard categories

### Performance Issues
**Risico**: Leaderboards kunnen slow worden met veel users
**Mitigatie**: Materialized views, caching, pagination, CDN

### Data Privacy (GDPR)
**Risico**: Compliance met privacy regulations
**Mitigatie**: Clear privacy policy, data export, right to deletion, consent management

---

## Conclusie

Community features kunnen NXT•REP transformeren van een personal tracking app naar een social fitness platform. Door gefaseerd uit te rollen:

1. **Week 1-4**: Social foundation (profiles, friends)
2. **Week 5-8**: Competitive elements (leaderboards, challenges)  
3. **Week 9-12**: Engagement features (reactions, gamification)

Kunnen we user engagement en retention significant verbeteren terwijl we privacy en security waarborgen.

**Next Steps**:
1. Prioritize MVP features
2. Design mockups voor Social tab
3. Start met database migrations
4. Build MVP in sprints van 2 weken
5. Beta test met core users
6. Iterate & launch

---

*Vragen of aanvullingen? Laten we prioriteren welke features als eerste te implementeren!* 🚀
