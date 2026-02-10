/**
 * Meal Templates API - GET all templates or GET suggestions
 * GET /api/meal-templates - Fetch all user templates
 * GET /api/meal-templates?suggestions=true - Get auto-suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getMealTemplates, suggestTemplatesFromHistory } from '@/lib/mealTemplates';

// Use Node.js runtime for better compatibility
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify session with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const searchParams = request.nextUrl.searchParams;
    const wantsSuggestions = searchParams.get('suggestions') === 'true';

    // If requesting suggestions
    if (wantsSuggestions) {
      // Fetch nutrition logs for pattern analysis
      const { data: nutritionLogs, error: logsError } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30); // Last 30 days

      if (logsError) {
        console.error('Error fetching nutrition logs:', logsError);
        return NextResponse.json({ suggestions: [] });
      }

      const suggestions = await suggestTemplatesFromHistory(nutritionLogs || [], 5);
      
      return NextResponse.json({ suggestions });
    }

    // Otherwise, fetch all templates
    const templates = await getMealTemplates(userId);
    
    return NextResponse.json({ templates });

  } catch (error) {
    console.error('Error in meal templates GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new meal template
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify session with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const body = await request.json();

    // Validate request
    if (!body.name || !body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Invalid request - name and items required' },
        { status: 400 }
      );
    }

    // Create template
    const { createMealTemplate } = await import('@/lib/mealTemplates');
    const template = await createMealTemplate(userId, {
      name: body.name,
      category: body.category,
      items: body.items
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 201 });

  } catch (error) {
    console.error('Error in meal templates POST:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
