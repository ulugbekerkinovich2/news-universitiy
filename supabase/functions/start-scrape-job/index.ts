import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import { corsHeaders } from '../_shared/cors.ts';
import { validateStartJobInput } from '../_shared/validation.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;

    // Check if user is admin using service role
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: roleData, error: roleError } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    let rawInput: unknown;
    try {
      rawInput = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateStartJobInput(rawInput);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { scope, universityId } = validation.data!;

    // Create the job
    const { data: job, error: jobError } = await supabaseService
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
      const { data } = await supabaseService
        .from('universities')
        .select('id, website')
        .not('website', 'is', null)
        .neq('website', '');
      
      universities = data || [];
    } else {
      // Verify the university exists
      const { data, error } = await supabaseService
        .from('universities')
        .select('id, website')
        .eq('id', universityId);
      
      if (error || !data || data.length === 0) {
        return new Response(
          JSON.stringify({ error: 'University not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      universities = data;
    }

    // Update job totals
    await supabaseService
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

    // Process universities
    const results = {
      completed: 0,
      failed: 0,
      noNews: 0,
      noSource: 0,
      postsFound: 0,
      imagesSaved: 0,
      videosSaved: 0,
    };

    // Track universities we've started processing
    const processingUniversityIds: string[] = [];

    for (const university of universities) {
      // Check if job was cancelled
      const { data: currentJob } = await supabaseService
        .from('scrape_jobs')
        .select('status')
        .eq('id', job.id)
        .single();
      
      if (currentJob?.status === 'CANCELLED') {
        console.log(`Job ${job.id} was cancelled, stopping...`);
        
        // Reset any universities that are still IN_PROGRESS back to IDLE
        await supabaseService
          .from('universities')
          .update({ 
            scrape_status: 'IDLE',
            last_error_message: 'Job was cancelled'
          })
          .eq('scrape_status', 'IN_PROGRESS');
        
        break;
      }

      if (!university.website) {
        await supabaseService
          .from('universities')
          .update({ scrape_status: 'NO_SOURCE' })
          .eq('id', university.id);
        
        results.noSource++;
        continue;
      }

      try {
        // Call the scrape-university function with service role key
        const scrapeResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/scrape-university`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'X-Internal-Call': 'true',
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
            results.imagesSaved += scrapeResult.imagesSaved || 0;
            results.videosSaved += scrapeResult.videosSaved || 0;
          } else {
            results.noNews++;
          }
        } else {
          results.failed++;
        }

        // Update job progress
        await supabaseService
          .from('scrape_jobs')
          .update({
            totals_json: {
              total_universities: universities.length,
              completed: results.completed,
              failed: results.failed,
              no_news: results.noNews,
              no_source: results.noSource,
              posts_found: results.postsFound,
              images_saved: results.imagesSaved,
              videos_saved: results.videosSaved,
            },
          })
          .eq('id', job.id);

      } catch (error) {
        console.error(`Error scraping university ${university.id}:`, error);
        results.failed++;
      }
    }

    // Check if job was cancelled before marking complete
    const { data: finalJob } = await supabaseService
      .from('scrape_jobs')
      .select('status')
      .eq('id', job.id)
      .single();
    
    // Only update status if not already cancelled
    if (finalJob?.status !== 'CANCELLED') {
      await supabaseService
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
            images_saved: results.imagesSaved,
            videos_saved: results.videosSaved,
          },
        })
        .eq('id', job.id);
    }

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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
