/**
 * Nutrition Search API Endpoint
 * Searches Open Food Facts (primary) and USDA FoodData Central (fallback)
 * Uses LLM for Dutch to English translation when needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rateLimit';
import { supabase } from '@/lib/supabase';

const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const MIN_QUERY_LENGTH = 3;
const DEFAULT_PAGE_SIZE = 20;

export const runtime = 'edge';

// Query validation schema
const NutritionSearchSchema = z.object({
  query: z.string().min(MIN_QUERY_LENGTH, 'Query must be at least 3 characters').max(100),
  limit: z.number().min(1).max(50).optional().default(DEFAULT_PAGE_SIZE),
  page: z.number().min(1).max(10).optional().default(1)
})

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

    // Rate limiting
    const identifier = getClientIdentifier(request, user.id);
    const rateLimit = checkRateLimit(identifier, RATE_LIMITS.NUTRITION_SEARCH);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validation = NutritionSearchSchema.safeParse({
      query: searchParams.get('query'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined
    })

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { query, limit, page } = validation.data

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
        `&page=${page}` +
        `&page_size=${limit}` +
        `&fields=code,product_name,product_name_nl,brands,nutriments,serving_size,quantity,image_url,image_front_url,image_small_url`,
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

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.reset.toString()
      }
    });

  } catch (error) {
    console.error('Search nutrition error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
