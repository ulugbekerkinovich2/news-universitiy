import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all universities with DONE status (successfully scraped before)
    const { data: universities, error: fetchError } = await supabase
      .from('universities')
      .select('id, name_uz')
      .eq('scrape_status', 'DONE')
      .not('website', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch universities: ${fetchError.message}`);
    }

    if (!universities || universities.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No universities with DONE status to scrape',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting scheduled scrape for ${universities.length} universities`);

    // Create a single job for all universities
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        scope: 'ALL_UNIVERSITIES',
        status: 'QUEUED',
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create scrape job: ${jobError.message}`);
    }

    // Update job to running
    await supabase
      .from('scrape_jobs')
      .update({ 
        status: 'RUNNING', 
        started_at: new Date().toISOString() 
      })
      .eq('id', job.id);

    let totalPosts = 0;
    let totalImages = 0;
    let totalVideos = 0;
    let successCount = 0;
    let failCount = 0;

    // Process universities sequentially to avoid overwhelming servers
    for (const university of universities) {
      try {
        // Call scrape-university function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/scrape-university`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'X-Internal-Call': 'true',
          },
          body: JSON.stringify({
            jobId: job.id,
            universityId: university.id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            totalPosts += result.postsFound || 0;
            totalImages += result.imagesSaved || 0;
            totalVideos += result.videosSaved || 0;
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }

        // Small delay between universities
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error scraping ${university.name_uz}:`, error);
        failCount++;
      }
    }

    // Update job with final stats
    await supabase
      .from('scrape_jobs')
      .update({
        status: failCount === universities.length ? 'FAILED' : 'DONE',
        finished_at: new Date().toISOString(),
        totals_json: {
          universities_processed: universities.length,
          success_count: successCount,
          fail_count: failCount,
          posts_found: totalPosts,
          images_saved: totalImages,
          videos_saved: totalVideos,
        },
      })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        universitiesProcessed: universities.length,
        successCount,
        failCount,
        totalPosts,
        totalImages,
        totalVideos,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scheduled scrape error:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
