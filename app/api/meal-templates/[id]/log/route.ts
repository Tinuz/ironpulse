/**
 * Log Meal Template API
 * POST /api/meal-templates/[id]/log - Log template to daily nutrition
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  getMealTemplate,
  incrementTemplateUsage,
  templateToNutritionItems 
} from '@/lib/mealTemplates';

// Use Node.js runtime for better compatibility
export const runtime = 'nodejs';

/**
 * POST - Log template as meal
 */
export async function POST(
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

    const userId = user.id;
    const body = await request.json();
    const { date, adjustments } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date required' },
        { status: 400 }
      );
    }

    // Get template
    const template = await getMealTemplate(params.id);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (template.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Convert template to nutrition items
    let nutritionItems = templateToNutritionItems(template);

    // Apply adjustments if provided
    if (adjustments && Array.isArray(adjustments)) {
      adjustments.forEach(adj => {
        const item = template.items.find(i => i.id === adj.itemId);
        if (item) {
          const newMultiplier = adj.quantity / 100;
          const index = nutritionItems.findIndex(ni => 
            ni.name === (item.foodBrand ? `${item.foodBrand} - ${item.foodName}` : item.foodName)
          );
          if (index !== -1) {
            nutritionItems[index] = {
              ...nutritionItems[index],
              calories: Math.round(item.caloriesPer100g * newMultiplier),
              protein: Math.round(item.proteinPer100g * newMultiplier * 10) / 10,
              carbs: Math.round(item.carbsPer100g * newMultiplier * 10) / 10,
              fats: Math.round(item.fatsPer100g * newMultiplier * 10) / 10
            };
          }
        }
      });
    }

    // Get or create nutrition log for this date
    const { data: existingLog } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    const itemsWithIds = nutritionItems.map(item => ({
      ...item,
      id: crypto.randomUUID()
    }));

    if (existingLog) {
      // Update existing log
      const updatedItems = [...existingLog.items, ...itemsWithIds];
      
      const { error: updateError } = await supabase
        .from('nutrition_logs')
        .update({ items: updatedItems })
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('Error updating nutrition log:', updateError);
        return NextResponse.json(
          { error: 'Failed to log template' },
          { status: 500 }
        );
      }
    } else {
      // Create new log
      const { error: insertError } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: userId,
          date,
          items: itemsWithIds,
          water_intake: 0
        });

      if (insertError) {
        console.error('Error creating nutrition log:', insertError);
        return NextResponse.json(
          { error: 'Failed to log template' },
          { status: 500 }
        );
      }
    }

    // Increment template usage count
    await incrementTemplateUsage(params.id);

    return NextResponse.json({ 
      success: true,
      itemsAdded: itemsWithIds.length 
    });

  } catch (error) {
    console.error('Error in POST log template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
