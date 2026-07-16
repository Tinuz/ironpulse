import { NextRequest, NextResponse } from 'next/server'
import { supabase, getAuthenticatedClient } from '@/lib/supabase'
import crypto from 'crypto'

/**
 * One-time endpoint to seed the "A1" workout schema for the authenticated user.
 * Call once from the browser console:
 *
 *   const s = (await window._supabase?.auth.getSession())?.data?.session
 *   fetch('/api/seed-schema', { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token } })
 *     .then(r => r.json()).then(console.log)
 */
export async function POST(request: NextRequest) {
  // Authenticate
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = getAuthenticatedClient(token)

  const schemaName = 'A1 — Quads / Borst / Triceps / Delts / Kuiten'

  // Prevent duplicates
  const { data: existing } = await client
    .from('schemas')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', schemaName)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: 'Schema already exists', id: existing.id })
  }

  const exercises = [
    {
      id: crypto.randomUUID(),
      name: 'Barbell Back Squat',
      type: 'strength',
      muscleGroup: 'legs',
      targetSets: 3,
      targetReps: 10,
      minReps: 6,
    },
    {
      id: crypto.randomUUID(),
      name: 'Incline Dumbbell Press',
      type: 'strength',
      muscleGroup: 'chest',
      targetSets: 3,
      targetReps: 10,
      minReps: 6,
    },
    {
      id: crypto.randomUUID(),
      name: 'Leg Extension',
      type: 'strength',
      muscleGroup: 'legs',
      targetSets: 3,
      targetReps: 15,
      minReps: 10,
    },
    {
      id: crypto.randomUUID(),
      name: 'Pec Deck',
      type: 'strength',
      muscleGroup: 'chest',
      targetSets: 3,
      targetReps: 15,
      minReps: 10,
    },
    {
      id: crypto.randomUUID(),
      name: 'Cable Lateral Raise',
      type: 'strength',
      muscleGroup: 'shoulders',
      targetSets: 4,
      targetReps: 20,
      minReps: 12,
    },
    {
      id: crypto.randomUUID(),
      name: 'Overhead Rope Triceps Extension',
      type: 'strength',
      muscleGroup: 'triceps',
      targetSets: 3,
      targetReps: 15,
      minReps: 10,
    },
    {
      id: crypto.randomUUID(),
      name: 'Standing Calf Raise',
      type: 'strength',
      muscleGroup: 'legs',
      targetSets: 4,
      targetReps: 20,
      minReps: 10,
    },
  ]

  const { data, error } = await client
    .from('schemas')
    .insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      name: schemaName,
      exercises,
      color: 'from-violet-500 to-purple-600',
    })
    .select('id, name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Schema created', schema: data })
}
