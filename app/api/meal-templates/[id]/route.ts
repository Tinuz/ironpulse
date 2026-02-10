/**
 * Meal Templates API - Individual template operations
 * GET /api/meal-templates/[id] - Get single template
 * PUT /api/meal-templates/[id] - Update template
 * DELETE /api/meal-templates/[id] - Delete template
 * POST /api/meal-templates/[id]/log - Log template to nutrition
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  getMealTemplate, 
  updateMealTemplate, 
  deleteMealTemplate
} from '@/lib/mealTemplates';

// Use Node.js runtime for better compatibility
export const runtime = 'nodejs';

/**
 * GET single template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = await getMealTemplate(params.id);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (template.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ template });

  } catch (error) {
    console.error('Error in GET template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const existingTemplate = await getMealTemplate(params.id);
    if (!existingTemplate || existingTemplate.userId !== user.id) {
      return NextResponse.json(
        { error: 'Template not found or forbidden' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updatedTemplate = await updateMealTemplate(params.id, body);

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template: updatedTemplate });

  } catch (error) {
    console.error('Error in PUT template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const existingTemplate = await getMealTemplate(params.id);
    if (!existingTemplate || existingTemplate.userId !== user.id) {
      return NextResponse.json(
        { error: 'Template not found or forbidden' },
        { status: 404 }
      );
    }

    const success = await deleteMealTemplate(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
