import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import { corsHeaders } from '../_shared/cors.ts';
import { scrapeUniversity } from '../_shared/scraper.ts';
import { validateScrapeUniversityInput } from '../_shared/validation.ts';
import { isValidExternalUrl } from '../_shared/url-validator.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if this is an internal call from start-scrape-job
    const isInternalCall = req.headers.get('X-Internal-Call') === 'true';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // If internal call with service role key, skip user verification
    if (!isInternalCall) {
      // Verify user token
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

      // Check if user is admin
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

    const validation = validateScrapeUniversityInput(rawInput);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobId, universityId } = validation.data!;

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

    // SSRF Protection: Validate the website URL before fetching
    if (!isValidExternalUrl(university.website)) {
      console.error(`SSRF attempt blocked for university ${universityId}: ${university.website}`);
      
      await supabase
        .from('universities')
        .update({ 
          scrape_status: 'FAILED',
          last_error_message: 'Invalid or unsafe website URL'
        })
        .eq('id', universityId);

      return new Response(
        JSON.stringify({ error: 'Invalid or unsafe website URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
