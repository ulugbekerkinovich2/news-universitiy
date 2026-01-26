import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scope, universityId } = await req.json();

    if (!scope || (scope === 'SINGLE_UNIVERSITY' && !universityId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        scope,
        university_id: universityId || null,
        status: 'RUNNING',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    // Get universities to scrape
    let universities: Array<{ id: string; website: string | null }> = [];

    if (scope === 'ALL_UNIVERSITIES') {
      const { data } = await supabase
        .from('universities')
        .select('id, website')
        .not('website', 'is', null)
        .neq('website', '');
      
      universities = data || [];
    } else {
      const { data } = await supabase
        .from('universities')
        .select('id, website')
        .eq('id', universityId);
      
      universities = data || [];
    }

    // Update job totals
    await supabase
      .from('scrape_jobs')
      .update({
        totals_json: {
          total_universities: universities.length,
          completed: 0,
          failed: 0,
          no_news: 0,
          no_source: 0,
          posts_found: 0,
          images_saved: 0,
          videos_saved: 0,
        },
      })
      .eq('id', job.id);

    // Process universities in background
    // Note: Edge functions have a timeout, so for large batches we process sequentially
    // In production, you'd want to use a queue system
    
    const results = {
      completed: 0,
      failed: 0,
      noNews: 0,
      noSource: 0,
      postsFound: 0,
    };

    for (const university of universities) {
      if (!university.website) {
        await supabase
          .from('universities')
          .update({ scrape_status: 'NO_SOURCE' })
          .eq('id', university.id);
        
        results.noSource++;
        continue;
      }

      try {
        // Call the scrape-university function
        const scrapeResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/scrape-university`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobId: job.id,
              universityId: university.id,
            }),
          }
        );

        const scrapeResult = await scrapeResponse.json();

        if (scrapeResult.success) {
          if (scrapeResult.postsFound > 0) {
            results.completed++;
            results.postsFound += scrapeResult.postsFound;
          } else {
            results.noNews++;
          }
        } else {
          results.failed++;
        }

        // Update job progress
        await supabase
          .from('scrape_jobs')
          .update({
            totals_json: {
              total_universities: universities.length,
              completed: results.completed,
              failed: results.failed,
              no_news: results.noNews,
              no_source: results.noSource,
              posts_found: results.postsFound,
            },
          })
          .eq('id', job.id);

      } catch (error) {
        console.error(`Error scraping university ${university.id}:`, error);
        results.failed++;
      }
    }

    // Mark job as complete
    await supabase
      .from('scrape_jobs')
      .update({
        status: results.failed === universities.length ? 'FAILED' : 'DONE',
        finished_at: new Date().toISOString(),
        totals_json: {
          total_universities: universities.length,
          completed: results.completed,
          failed: results.failed,
          no_news: results.noNews,
          no_source: results.noSource,
          posts_found: results.postsFound,
        },
      })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
