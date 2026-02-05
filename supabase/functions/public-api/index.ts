import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Region names mapping
const REGION_NAMES: Record<string, string> = {
  "1": "Toshkent shahri",
  "2": "Toshkent viloyati",
  "3": "Andijon viloyati",
  "4": "Buxoro viloyati",
  "5": "Farg'ona viloyati",
  "6": "Jizzax viloyati",
  "7": "Xorazm viloyati",
  "8": "Namangan viloyati",
  "9": "Navoiy viloyati",
  "10": "Qashqadaryo viloyati",
  "11": "Qoraqalpog'iston Respublikasi",
  "12": "Samarqand viloyati",
  "13": "Sirdaryo viloyati",
  "14": "Surxondaryo viloyati",
};

interface RateLimitResult {
  key_id: string;
  is_valid: boolean;
  rate_limit_minute: number;
  rate_limit_day: number;
  requests_last_minute: number;
  requests_last_day: number;
}

// Hash API key using SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Log API request
async function logRequest(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any>,
  keyId: string,
  endpoint: string,
  req: Request,
  status: number,
  startTime: number
) {
  const responseTime = Date.now() - startTime;
  try {
    await supabase.from("api_request_logs").insert({
      api_key_id: keyId,
      endpoint,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown",
      user_agent: req.headers.get("user-agent"),
      response_status: status,
      response_time_ms: responseTime,
    });
  } catch (e) {
    console.error("Failed to log request:", e);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Only allow GET requests
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed", allowed: ["GET"] }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key from header
    const apiKey = req.headers.get("x-api-key") || req.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: "API key required", 
          message: "Please provide an API key via x-api-key header or Authorization: Bearer <key>" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash and validate API key
    const keyHash = await hashApiKey(apiKey);
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc("validate_api_key", { p_key_hash: keyHash });

    if (rateLimitError || !rateLimitData?.[0]?.is_valid) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateLimit: RateLimitResult = rateLimitData[0];

    // Check rate limits
    if (rateLimit.requests_last_minute >= rateLimit.rate_limit_minute) {
      await logRequest(supabase, rateLimit.key_id, "rate_limited", req, 429, startTime);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded", 
          message: `Maximum ${rateLimit.rate_limit_minute} requests per minute`,
          retry_after: 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "60",
            "X-RateLimit-Limit": String(rateLimit.rate_limit_minute),
            "X-RateLimit-Remaining": "0"
          } 
        }
      );
    }

    if (rateLimit.requests_last_day >= rateLimit.rate_limit_day) {
      await logRequest(supabase, rateLimit.key_id, "rate_limited", req, 429, startTime);
      return new Response(
        JSON.stringify({ 
          error: "Daily rate limit exceeded", 
          message: `Maximum ${rateLimit.rate_limit_day} requests per day`
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse URL and route
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const endpoint = pathParts[1] || "news"; // Default to news

    // Parse query parameters
    const params = {
      limit: Math.min(parseInt(url.searchParams.get("limit") || "20"), 100),
      offset: parseInt(url.searchParams.get("offset") || "0"),
      university_id: url.searchParams.get("university_id"),
      region_id: url.searchParams.get("region_id"),
      language: url.searchParams.get("language"),
      from_date: url.searchParams.get("from_date"),
      to_date: url.searchParams.get("to_date"),
      search: url.searchParams.get("search"),
    };

    let response: { data: unknown; count: number | null };

    switch (endpoint) {
      case "news": {
        let query = supabase
          .from("news_posts")
          .select(`
            id,
            title,
            summary,
            published_at,
            source_url,
            canonical_url,
            language,
            university:universities(id, name_uz, name_en, name_ru, region_id, website),
            media_assets:media_assets!media_assets_post_id_fkey(id, type, original_url, stored_url)
          `, { count: "exact" });

        if (params.university_id) {
          query = query.eq("university_id", params.university_id);
        }
        if (params.region_id) {
          // Get universities in this region first
          const { data: regionUnis } = await supabase
            .from("universities")
            .select("id")
            .eq("region_id", params.region_id);
          
          if (regionUnis && regionUnis.length > 0) {
            query = query.in("university_id", regionUnis.map((u: { id: string }) => u.id));
          }
        }
        if (params.language && params.language !== "all") {
          query = query.eq("language", params.language);
        }
        if (params.from_date) {
          query = query.gte("published_at", params.from_date);
        }
        if (params.to_date) {
          query = query.lte("published_at", params.to_date);
        }
        if (params.search) {
          query = query.ilike("title", `%${params.search}%`);
        }

        const { data, count, error } = await query
          .order("published_at", { ascending: false, nullsFirst: false })
          .range(params.offset, params.offset + params.limit - 1);

        if (error) throw error;
        response = { data, count };
        break;
      }

      case "news-detail": {
        const newsId = pathParts[2];
        if (!newsId) {
          return new Response(
            JSON.stringify({ error: "News ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("news_posts")
          .select(`
            id,
            title,
            summary,
            content_text,
            published_at,
            source_url,
            canonical_url,
            language,
            university:universities(id, name_uz, name_en, name_ru, region_id, website),
            media_assets:media_assets!media_assets_post_id_fkey(id, type, original_url, stored_url)
          `)
          .eq("id", newsId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          return new Response(
            JSON.stringify({ error: "News not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        response = { data, count: 1 };
        break;
      }

      case "universities": {
        let query = supabase
          .from("universities")
          .select("id, name_uz, name_en, name_ru, region_id, website", { count: "exact" });

        if (params.region_id) {
          query = query.eq("region_id", params.region_id);
        }
        if (params.search) {
          query = query.or(`name_uz.ilike.%${params.search}%,name_en.ilike.%${params.search}%`);
        }

        const { data, count, error } = await query
          .order("name_uz", { ascending: true })
          .range(params.offset, params.offset + params.limit - 1);

        if (error) throw error;
        response = { data, count };
        break;
      }

      case "regions": {
        const { data, error } = await supabase
          .from("universities")
          .select("region_id")
          .not("region_id", "is", null);

        if (error) throw error;
        
        const regionIds = [...new Set((data as { region_id: string }[]).map((d) => d.region_id))].sort();
        const regions = regionIds.map(id => ({
          id,
          name: REGION_NAMES[id] || `Viloyat ${id}`,
        }));
        response = { data: regions, count: regions.length };
        break;
      }

      default:
        await logRequest(supabase, rateLimit.key_id, endpoint, req, 404, startTime);
        return new Response(
          JSON.stringify({ 
            error: "Endpoint not found", 
            available_endpoints: ["/news", "/news-detail/:id", "/universities", "/regions"] 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log successful request
    await logRequest(supabase, rateLimit.key_id, endpoint, req, 200, startTime);

    return new Response(
      JSON.stringify({
        success: true,
        data: response.data,
        meta: {
          total: response.count,
          limit: params.limit,
          offset: params.offset,
          has_more: response.count ? params.offset + params.limit < response.count : false,
        },
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(rateLimit.rate_limit_minute),
          "X-RateLimit-Remaining": String(Math.max(0, rateLimit.rate_limit_minute - rateLimit.requests_last_minute - 1)),
        } 
      }
    );

  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
