import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const API_BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}`;

export const openApiSpec = {
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
      description: "Active API Server",
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
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "university_id", in: "query", schema: { type: "string" } },
          { name: "slug", in: "query", schema: { type: "string" } },
          { name: "university_mt_id", in: "query", schema: { type: "integer" } },
          { name: "region_id", in: "query", schema: { type: "string" } },
          { name: "language", in: "query", schema: { type: "string", enum: ["uz", "en", "ru", "all"] } },
          { name: "from_date", in: "query", schema: { type: "string", format: "date" } },
          { name: "to_date", in: "query", schema: { type: "string", format: "date" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Muvaffaqiyatli" },
        },
      },
    },
    "/universities": {
      get: {
        tags: ["Universitetlar"],
        summary: "Universitetlar ro'yxati",
        responses: {
          "200": { description: "Muvaffaqiyatli" },
        },
      },
    },
    "/jobs": {
      post: {
        tags: ["Scrape Jobs"],
        summary: "Scrape job yaratish",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  scope: { type: "string", enum: ["SINGLE_UNIVERSITY", "ALL_UNIVERSITIES"] },
                  university_id: { type: "string", nullable: true },
                  status_filters: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Job yaratildi" },
        },
      },
    },
    "/auth/token": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        responses: {
          "200": { description: "Token qaytdi" },
        },
      },
    },
  },
};

export function AdminSwaggerPanel() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border/60 bg-card/90 shadow-sm">
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="text-lg font-semibold text-foreground">Swagger UI</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Endpointlarni shu joyning o'zidan test qiling. Kerak bo'lsa bearer yoki `x-api-key` kiriting.
        </p>
      </div>
      <div className="max-h-[78vh] overflow-auto bg-background">
        <SwaggerUI spec={openApiSpec} docExpansion="list" persistAuthorization />
      </div>
    </div>
  );
}
