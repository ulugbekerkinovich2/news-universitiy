import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import { corsHeaders } from '../_shared/cors.ts';
import { scrapeUniversity } from '../_shared/scraper.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, universityId } = await req.json();

    if (!jobId || !universityId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId or universityId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get university
    const { data: university, error: uniError } = await supabase
      .from('universities')
      .select('*')
      .eq('id', universityId)
      .single();

    if (uniError || !university) {
      return new Response(
        JSON.stringify({ error: 'University not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!university.website) {
      await supabase
        .from('universities')
        .update({ scrape_status: 'NO_SOURCE' })
        .eq('id', universityId);

      return new Response(
        JSON.stringify({ success: true, message: 'No website configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start scraping
    const result = await scrapeUniversity(jobId, universityId, university.website);

    return new Response(
      JSON.stringify(result),
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
