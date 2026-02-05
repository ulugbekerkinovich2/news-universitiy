 import { Layout } from "@/components/layout/Layout";
 import SwaggerUI from "swagger-ui-react";
 import "swagger-ui-react/swagger-ui.css";
 
 const API_BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-api`;
 
 const openApiSpec = {
   openapi: "3.0.3",
   info: {
     title: "O'zbekiston Universitetlari Yangiliklari API",
     description: "O'zbekiston universitetlari yangiliklari va ma'lumotlariga kirish uchun REST API",
     version: "1.0.0",
     contact: {
       name: "API Support",
     },
   },
   servers: [
     {
       url: API_BASE_URL,
       description: "Production Server",
     },
   ],
   security: [
     {
       ApiKeyAuth: [],
     },
   ],
   components: {
     securitySchemes: {
       ApiKeyAuth: {
         type: "apiKey",
         in: "header",
         name: "x-api-key",
         description: "API kalitingizni kiriting",
       },
       BearerAuth: {
         type: "http",
         scheme: "bearer",
         description: "Authorization: Bearer YOUR_API_KEY",
       },
     },
     schemas: {
       University: {
         type: "object",
         properties: {
           id: { type: "string", example: "123" },
           name_uz: { type: "string", example: "Toshkent davlat universiteti" },
           name_en: { type: "string", example: "Tashkent State University" },
           name_ru: { type: "string", example: "Ташкентский государственный университет" },
           region_id: { type: "string", example: "10" },
           website: { type: "string", example: "https://tdu.uz" },
         },
       },
       NewsPost: {
         type: "object",
         properties: {
           id: { type: "string", format: "uuid" },
           title: { type: "string", example: "Yangilik sarlavhasi" },
           summary: { type: "string", example: "Qisqacha mazmuni..." },
           published_at: { type: "string", format: "date-time" },
           source_url: { type: "string", format: "uri" },
           canonical_url: { type: "string", format: "uri", nullable: true },
           language: { type: "string", enum: ["uz", "en", "ru", "unknown"] },
           university: { $ref: "#/components/schemas/University" },
         },
       },
       NewsDetail: {
         allOf: [
           { $ref: "#/components/schemas/NewsPost" },
           {
             type: "object",
             properties: {
               content_text: { type: "string", example: "To'liq matni..." },
               media_assets: {
                 type: "array",
                 items: { $ref: "#/components/schemas/MediaAsset" },
               },
             },
           },
         ],
       },
       MediaAsset: {
         type: "object",
         properties: {
           id: { type: "string", format: "uuid" },
           type: { type: "string", enum: ["image", "video"] },
           original_url: { type: "string", format: "uri" },
           stored_url: { type: "string", format: "uri", nullable: true },
         },
       },
       PaginationMeta: {
         type: "object",
         properties: {
           total: { type: "integer", example: 150 },
           limit: { type: "integer", example: 20 },
           offset: { type: "integer", example: 0 },
           has_more: { type: "boolean", example: true },
         },
       },
       Error: {
         type: "object",
         properties: {
           error: { type: "string" },
           message: { type: "string" },
         },
       },
       RateLimitError: {
         type: "object",
         properties: {
           error: { type: "string", example: "Rate limit exceeded" },
           message: { type: "string", example: "Maximum 60 requests per minute" },
           retry_after: { type: "integer", example: 60 },
         },
       },
     },
   },
   paths: {
     "/news": {
       get: {
         tags: ["Yangiliklar"],
         summary: "Yangiliklar ro'yxatini olish",
         description: "Barcha universitetlardan yangiliklar ro'yxatini qaytaradi. Filtrlash va pagination qo'llab-quvvatlanadi.",
         parameters: [
           {
             name: "limit",
             in: "query",
             schema: { type: "integer", default: 20, maximum: 100 },
             description: "Qaytariladigan natijalar soni (max: 100)",
           },
           {
             name: "offset",
             in: "query",
             schema: { type: "integer", default: 0 },
             description: "Pagination uchun offset",
           },
           {
             name: "university_id",
             in: "query",
             schema: { type: "string" },
             description: "Universitet ID bo'yicha filter",
           },
            {
              name: "region_id",
              in: "query",
              schema: { type: "string" },
              description: "Viloyat ID bo'yicha filter (1-14)",
            },
           {
             name: "language",
             in: "query",
             schema: { type: "string", enum: ["uz", "en", "ru", "all"] },
             description: "Til bo'yicha filter",
           },
           {
             name: "from_date",
             in: "query",
             schema: { type: "string", format: "date" },
             description: "Boshlanish sanasi (YYYY-MM-DD)",
           },
           {
             name: "to_date",
             in: "query",
             schema: { type: "string", format: "date" },
             description: "Tugash sanasi (YYYY-MM-DD)",
           },
           {
             name: "search",
             in: "query",
             schema: { type: "string" },
             description: "Sarlavha bo'yicha qidirish",
           },
         ],
         responses: {
           "200": {
             description: "Muvaffaqiyatli",
             content: {
               "application/json": {
                 schema: {
                   type: "object",
                   properties: {
                     success: { type: "boolean", example: true },
                     data: {
                       type: "array",
                       items: { $ref: "#/components/schemas/NewsPost" },
                     },
                     meta: { $ref: "#/components/schemas/PaginationMeta" },
                   },
                 },
               },
             },
           },
           "401": {
             description: "API kalit noto'g'ri yoki berilmagan",
             content: {
               "application/json": {
                 schema: { $ref: "#/components/schemas/Error" },
               },
             },
           },
           "429": {
             description: "Rate limit oshib ketdi",
             content: {
               "application/json": {
                 schema: { $ref: "#/components/schemas/RateLimitError" },
               },
             },
           },
         },
       },
     },
     "/news-detail/{id}": {
       get: {
         tags: ["Yangiliklar"],
         summary: "Bitta yangilik to'liq ma'lumoti",
         description: "Yangilik ID bo'yicha to'liq ma'lumotni, shu jumladan kontent matnini va media fayllarni qaytaradi.",
         parameters: [
           {
             name: "id",
             in: "path",
             required: true,
             schema: { type: "string", format: "uuid" },
             description: "Yangilik UUID",
           },
         ],
         responses: {
           "200": {
             description: "Muvaffaqiyatli",
             content: {
               "application/json": {
                 schema: {
                   type: "object",
                   properties: {
                     success: { type: "boolean", example: true },
                     data: { $ref: "#/components/schemas/NewsDetail" },
                     meta: {
                       type: "object",
                       properties: {
                         total: { type: "integer", example: 1 },
                       },
                     },
                   },
                 },
               },
             },
           },
           "404": {
             description: "Yangilik topilmadi",
             content: {
               "application/json": {
                 schema: { $ref: "#/components/schemas/Error" },
               },
             },
           },
         },
       },
     },
     "/universities": {
       get: {
         tags: ["Universitetlar"],
         summary: "Universitetlar ro'yxatini olish",
         description: "Barcha universitetlar ro'yxatini qaytaradi. Viloyat bo'yicha filtrlash va qidirish qo'llab-quvvatlanadi.",
         parameters: [
           {
             name: "limit",
             in: "query",
             schema: { type: "integer", default: 20, maximum: 100 },
             description: "Qaytariladigan natijalar soni",
           },
           {
             name: "offset",
             in: "query",
             schema: { type: "integer", default: 0 },
             description: "Pagination uchun offset",
           },
           {
             name: "region_id",
             in: "query",
             schema: { type: "string" },
             description: "Viloyat ID bo'yicha filter",
           },
           {
             name: "search",
             in: "query",
             schema: { type: "string" },
             description: "Nom bo'yicha qidirish (uz yoki en)",
           },
         ],
         responses: {
           "200": {
             description: "Muvaffaqiyatli",
             content: {
               "application/json": {
                 schema: {
                   type: "object",
                   properties: {
                     success: { type: "boolean", example: true },
                     data: {
                       type: "array",
                       items: { $ref: "#/components/schemas/University" },
                     },
                     meta: { $ref: "#/components/schemas/PaginationMeta" },
                   },
                 },
               },
             },
           },
         },
       },
     },
     "/regions": {
       get: {
         tags: ["Hududlar"],
          summary: "Viloyatlar ro'yxatini olish (nomlari bilan)",
          description: "Ma'lumotlar bazasida mavjud bo'lgan barcha viloyatlar ID va nomlarini qaytaradi.",
         responses: {
           "200": {
             description: "Muvaffaqiyatli",
             content: {
               "application/json": {
                 schema: {
                   type: "object",
                   properties: {
                     success: { type: "boolean", example: true },
                     data: {
                       type: "array",
                        items: { 
                          type: "object",
                          properties: {
                            id: { type: "string", example: "1" },
                            name: { type: "string", example: "Toshkent shahri" },
                          },
                        },
                        example: [
                          { id: "1", name: "Toshkent shahri" },
                          { id: "2", name: "Toshkent viloyati" },
                          { id: "3", name: "Andijon viloyati" },
                        ],
                     },
                     meta: {
                       type: "object",
                       properties: {
                         total: { type: "integer" },
                       },
                     },
                   },
                 },
               },
             },
           },
         },
       },
     },
   },
   tags: [
     {
       name: "Yangiliklar",
       description: "Universitetlar yangiliklari bilan ishlash",
     },
     {
       name: "Universitetlar",
       description: "Universitetlar ma'lumotlari",
     },
     {
       name: "Hududlar",
       description: "Viloyatlar ro'yxati",
     },
   ],
 };
 
 export default function ApiSwagger() {
   return (
     <Layout>
       <div className="space-y-4">
         <div>
           <h1 className="font-heading text-3xl font-bold text-foreground">
             API Swagger Documentation
           </h1>
           <p className="mt-1 text-muted-foreground">
             Interaktiv API dokumentatsiyasi - endpointlarni sinab ko'ring
           </p>
         </div>
         
         <div className="rounded-lg border bg-card overflow-hidden swagger-container">
           <SwaggerUI spec={openApiSpec} />
         </div>
       </div>
       
       <style>{`
         .swagger-container .swagger-ui {
           font-family: inherit;
         }
         .swagger-container .swagger-ui .info .title {
           font-size: 1.5rem;
         }
         .swagger-container .swagger-ui .opblock-tag {
           font-size: 1.1rem;
         }
         .swagger-container .swagger-ui .btn {
           border-radius: 0.375rem;
         }
         .swagger-container .swagger-ui .opblock {
           border-radius: 0.5rem;
           margin-bottom: 0.5rem;
         }
         .swagger-container .swagger-ui .opblock .opblock-summary {
           border-radius: 0.5rem;
         }
         .swagger-container .swagger-ui .opblock.opblock-get {
           border-color: hsl(var(--primary));
           background: hsl(var(--primary) / 0.05);
         }
         .swagger-container .swagger-ui .opblock.opblock-get .opblock-summary {
           border-color: hsl(var(--primary));
         }
         .swagger-container .swagger-ui section.models {
           border-radius: 0.5rem;
         }
         .swagger-container .swagger-ui .model-box {
           background: hsl(var(--muted) / 0.3);
         }
         @media (prefers-color-scheme: dark) {
           .swagger-container .swagger-ui,
           .swagger-container .swagger-ui .opblock .opblock-section-header {
             background: transparent;
           }
           .swagger-container .swagger-ui .opblock-body pre.microlight {
             background: hsl(var(--muted));
           }
           .swagger-container .swagger-ui textarea,
           .swagger-container .swagger-ui input[type="text"] {
             background: hsl(var(--background));
             color: hsl(var(--foreground));
           }
         }
       `}</style>
     </Layout>
   );
 }