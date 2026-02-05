 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { corsHeaders } from "../_shared/cors.ts";
 
 const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
 
 interface ClassifyLinksRequest {
   type: "classify_links";
   links: string[];
   baseUrl: string;
 }
 
 interface ExtractContentRequest {
   type: "extract_content";
   html: string;
   url: string;
 }
 
 interface BatchClassifyRequest {
   type: "batch_classify";
   htmlSnippets: Array<{ url: string; snippet: string }>;
 }
 
 type RequestBody = ClassifyLinksRequest | ExtractContentRequest | BatchClassifyRequest;
 
 // Use AI to classify which URLs are likely news article links
 async function classifyNewsLinks(
   links: string[],
   baseUrl: string
 ): Promise<{ newsLinks: string[]; confidence: Record<string, number> }> {
   if (!LOVABLE_API_KEY) {
     throw new Error("LOVABLE_API_KEY is not configured");
   }
 
   // Batch links into groups of 30 for efficiency
   const batchSize = 30;
   const allNewsLinks: string[] = [];
   const allConfidence: Record<string, number> = {};
 
   for (let i = 0; i < links.length; i += batchSize) {
     const batch = links.slice(i, i + batchSize);
     
     const prompt = `Analyze these URLs from a university website (${baseUrl}) and classify each as a news/article link or not.
 
 URLs to analyze:
 ${batch.map((url, idx) => `${idx + 1}. ${url}`).join("\n")}
 
 For each URL, determine if it's likely a news article, blog post, announcement, or event page (NOT a category page, listing page, or static page like about/contact).
 
 Return JSON with:
 - "news": array of URL indices (1-based) that ARE news articles
 - "confidence": object mapping URL index to confidence score (0.0-1.0)`;
 
     try {
       const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
         method: "POST",
         headers: {
           Authorization: `Bearer ${LOVABLE_API_KEY}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           model: "google/gemini-2.5-flash-lite",
           messages: [
             {
               role: "system",
               content: "You are an expert at analyzing URLs to identify news article pages. Respond only with valid JSON.",
             },
             { role: "user", content: prompt },
           ],
           temperature: 0.1,
         }),
       });
 
       if (!response.ok) {
         console.error("AI classification failed:", response.status);
         // Fallback: return all links
         batch.forEach((url) => {
           allNewsLinks.push(url);
           allConfidence[url] = 0.5;
         });
         continue;
       }
 
       const data = await response.json();
       const content = data.choices?.[0]?.message?.content || "";
       
       // Extract JSON from response
       const jsonMatch = content.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         const result = JSON.parse(jsonMatch[0]);
         const newsIndices = result.news || [];
         const confidenceMap = result.confidence || {};
 
         for (const idx of newsIndices) {
           if (idx >= 1 && idx <= batch.length) {
             const url = batch[idx - 1];
             allNewsLinks.push(url);
             allConfidence[url] = confidenceMap[idx] || 0.8;
           }
         }
       }
     } catch (error) {
       console.error("AI classification error:", error);
       // Fallback
       batch.forEach((url) => {
         allNewsLinks.push(url);
         allConfidence[url] = 0.5;
       });
     }
   }
 
   return { newsLinks: allNewsLinks, confidence: allConfidence };
 }
 
 // Use AI to extract article content more accurately
 async function extractArticleContent(
   html: string,
   url: string
 ): Promise<{
   title: string;
   content: string;
   summary: string;
   publishedAt: string | null;
   language: string;
 }> {
   if (!LOVABLE_API_KEY) {
     throw new Error("LOVABLE_API_KEY is not configured");
   }
 
   // Reduce HTML to relevant parts (first 15000 chars after removing scripts/styles)
   let cleanHtml = html
     .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
     .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
     .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
     .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
     .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
     .replace(/<!--[\s\S]*?-->/gi, "")
     .slice(0, 15000);
 
   const prompt = `Extract the main article content from this HTML page (${url}).
 
 HTML:
 ${cleanHtml}
 
 Extract and return JSON with:
 - "title": The article/news title (string)
 - "content": The main article text content, cleaned (string, preserve paragraphs)
 - "summary": A 1-2 sentence summary (string)
 - "publishedAt": Publication date in ISO format if found, or null
 - "language": Detected language code (uz, ru, or en)
 
 Focus on the MAIN article content, ignore navigation, ads, sidebars, related articles.`;
 
   try {
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-flash",
         messages: [
           {
             role: "system",
             content: "You are an expert at extracting article content from HTML. Respond only with valid JSON.",
           },
           { role: "user", content: prompt },
         ],
         temperature: 0.1,
       }),
     });
 
     if (!response.ok) {
       throw new Error(`AI extraction failed: ${response.status}`);
     }
 
     const data = await response.json();
     const content = data.choices?.[0]?.message?.content || "";
 
     const jsonMatch = content.match(/\{[\s\S]*\}/);
     if (jsonMatch) {
       return JSON.parse(jsonMatch[0]);
     }
 
     throw new Error("No valid JSON in response");
   } catch (error) {
     console.error("AI extraction error:", error);
     throw error;
   }
 }
 
 // Batch classify HTML snippets to find news articles
 async function batchClassifyHtmlSnippets(
   snippets: Array<{ url: string; snippet: string }>
 ): Promise<Array<{ url: string; isNews: boolean; title: string | null }>> {
   if (!LOVABLE_API_KEY) {
     throw new Error("LOVABLE_API_KEY is not configured");
   }
 
   const batchSize = 10;
   const results: Array<{ url: string; isNews: boolean; title: string | null }> = [];
 
   for (let i = 0; i < snippets.length; i += batchSize) {
     const batch = snippets.slice(i, i + batchSize);
     
     const prompt = `Analyze these HTML snippets and determine which are news article pages (not listing/category pages).
 
 ${batch.map((s, idx) => `--- Page ${idx + 1} (${s.url}) ---
 ${s.snippet.slice(0, 1500)}
 `).join("\n")}
 
 Return JSON array with objects for each page:
 - "pageIndex": 1-based index
 - "isNews": boolean (true if it's a single news article, false if listing/category/other)
 - "title": article title if it's news, null otherwise`;
 
     try {
       const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
         method: "POST",
         headers: {
           Authorization: `Bearer ${LOVABLE_API_KEY}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           model: "google/gemini-2.5-flash-lite",
           messages: [
             {
               role: "system",
               content: "You are an expert at identifying news article pages. Respond only with valid JSON array.",
             },
             { role: "user", content: prompt },
           ],
           temperature: 0.1,
         }),
       });
 
       if (!response.ok) {
         console.error("AI batch classify failed:", response.status);
         batch.forEach((s) => results.push({ url: s.url, isNews: true, title: null }));
         continue;
       }
 
       const data = await response.json();
       const content = data.choices?.[0]?.message?.content || "";
 
       const jsonMatch = content.match(/\[[\s\S]*\]/);
       if (jsonMatch) {
         const parsed = JSON.parse(jsonMatch[0]);
         for (const item of parsed) {
           const idx = (item.pageIndex || item.index || 0) - 1;
           if (idx >= 0 && idx < batch.length) {
             results.push({
               url: batch[idx].url,
               isNews: item.isNews ?? true,
               title: item.title || null,
             });
           }
         }
         // Add any missing items
         batch.forEach((s) => {
           if (!results.find((r) => r.url === s.url)) {
             results.push({ url: s.url, isNews: true, title: null });
           }
         });
       } else {
         batch.forEach((s) => results.push({ url: s.url, isNews: true, title: null }));
       }
     } catch (error) {
       console.error("AI batch classify error:", error);
       batch.forEach((s) => results.push({ url: s.url, isNews: true, title: null }));
     }
   }
 
   return results;
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const body: RequestBody = await req.json();
 
     if (body.type === "classify_links") {
       const result = await classifyNewsLinks(body.links, body.baseUrl);
       return new Response(JSON.stringify(result), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     if (body.type === "extract_content") {
       const result = await extractArticleContent(body.html, body.url);
       return new Response(JSON.stringify(result), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     if (body.type === "batch_classify") {
       const result = await batchClassifyHtmlSnippets(body.htmlSnippets);
       return new Response(JSON.stringify(result), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     return new Response(JSON.stringify({ error: "Unknown request type" }), {
       status: 400,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("AI scrape helper error:", error);
     const errorMessage = error instanceof Error ? error.message : "Unknown error";
     
     if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
       return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
         status: 429,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
     
     if (errorMessage.includes("402")) {
       return new Response(JSON.stringify({ error: "Payment required" }), {
         status: 402,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     return new Response(JSON.stringify({ error: errorMessage }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });