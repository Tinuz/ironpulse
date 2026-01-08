/**
 * Nutrition Search API Endpoint
 * Searches Open Food Facts (primary) and USDA FoodData Central (fallback)
 * Uses LLM for Dutch to English translation when needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  NutritionSearchResponse, 
  OpenFoodFactsResponse, 
  USDAResponse 
} from '@/types/nutrition';
import { 
  mapOpenFoodFactsProduct, 
  mapUSDAFood, 
  deduplicateResults, 
  sortByRelevance 
} from '@/lib/nutritionSearch';

const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY'; // Get from env
const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 10;

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || String(MAX_RESULTS));

    // Validation
    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: 'Query must be at least 3 characters' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    let allResults: any[] = [];
    let offCount = 0;
    let usdaCount = 0;

    // ===== STEP 1: Search Open Food Facts =====
    try {
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?` +
        `search_terms=${encodeURIComponent(trimmedQuery)}` +
        `&search_simple=1` +
        `&json=true` +
        `&lang=nl` +
        `&page_size=${limit}` +
        `&fields=code,product_name,product_name_nl,brands,nutriments,serving_size,quantity,image_url`,
        {
          headers: {
            'User-Agent': 'IronPulse-FitnessTracker/1.0'
          }
        }
      );

      if (offResponse.ok) {
        const data: OpenFoodFactsResponse = await offResponse.json();
        const mapped = data.products
          .map(mapOpenFoodFactsProduct)
          .filter(Boolean);
        
        allResults.push(...mapped);
        offCount = mapped.length;
      }
    } catch (error) {
      console.error('Open Food Facts error:', error);
      // Continue to USDA fallback
    }

    // ===== STEP 2: USDA Fallback (if needed) =====
    if (allResults.length < 3) {
      try {
        // Translate query to English using LLM
        let translatedQuery = trimmedQuery;
        
        try {
          const llmResponse = await fetch(new URL('/api/chat', request.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content: `Translate this Dutch food term to English for food database search. Only respond with the translation, nothing else: "${trimmedQuery}"`
                }
              ]
            })
          });

          if (llmResponse.ok) {
            const reader = llmResponse.body?.getReader();
            const decoder = new TextDecoder();
            let translation = '';

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                translation += decoder.decode(value, { stream: true });
              }
              
              translatedQuery = translation.trim().replace(/['"]/g, '');
            }
          }
        } catch (llmError) {
          console.error('LLM translation error:', llmError);
          // Use original query as fallback
        }

        // Search USDA with translated query
        const usdaResponse = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?` +
          `query=${encodeURIComponent(translatedQuery)}` +
          `&api_key=${USDA_API_KEY}` +
          `&pageSize=${limit}` +
          `&dataType=Branded,Survey (FNDDS),SR Legacy`
        );

        if (usdaResponse.ok) {
          const data: USDAResponse = await usdaResponse.json();
          const mapped = data.foods
            .map(mapUSDAFood)
            .filter(Boolean);
          
          allResults.push(...mapped);
          usdaCount = mapped.length;
        }
      } catch (error) {
        console.error('USDA error:', error);
      }
    }

    // ===== STEP 3: Merge, Deduplicate, and Sort =====
    const deduplicated = deduplicateResults(allResults);
    const sorted = sortByRelevance(deduplicated, trimmedQuery);
    const limited = sorted.slice(0, limit);

    const response: NutritionSearchResponse = {
      results: limited,
      totalResults: limited.length,
      cached: false,
      sources: {
        openfoodfacts: offCount,
        usda: usdaCount
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Search nutrition error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
