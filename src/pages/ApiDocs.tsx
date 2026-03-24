import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Book, Zap, Shield, Globe } from "lucide-react";

const API_BASE_URL = `http://localhost:8000/api/v1`;

const endpoints = [
  {
    method: "GET",
    path: "/news",
    description: "Barcha yangiliklar ro'yxatini olish",
    params: [
      { name: "limit", type: "integer", default: "20", description: "Qaytariladigan natijalar soni (max: 100)" },
      { name: "offset", type: "integer", default: "0", description: "Pagination uchun offset" },
      { name: "university_id", type: "string", optional: true, description: "Universitet ID bo'yicha filter" },
      { name: "language", type: "string", optional: true, description: "Til bo'yicha filter (uz, en, ru)" },
      { name: "from_date", type: "string", optional: true, description: "Boshlanish sanasi (YYYY-MM-DD)" },
      { name: "to_date", type: "string", optional: true, description: "Tugash sanasi (YYYY-MM-DD)" },
      { name: "search", type: "string", optional: true, description: "Sarlavha bo'yicha qidirish" },
    ],
    response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Yangilik sarlavhasi",
      "summary": "Qisqacha mazmuni...",
      "published_at": "2026-01-27T10:00:00Z",
      "source_url": "https://...",
      "language": "uz",
      "university": {
        "id": "123",
        "name_uz": "Universitet nomi",
        "name_en": "University name",
        "region_id": "10"
      }
    }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}`,
  },
  {
    method: "GET",
    path: "/news-detail/:id",
    description: "Bitta yangilik to'liq ma'lumotini olish",
    params: [
      { name: "id", type: "uuid", description: "Yangilik ID (URL path da)" },
    ],
    response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Yangilik sarlavhasi",
    "summary": "Qisqacha mazmuni...",
    "content_text": "To'liq matni...",
    "published_at": "2026-01-27T10:00:00Z",
    "source_url": "https://...",
    "language": "uz",
    "university": { ... },
    "media_assets": [
      {
        "id": "uuid",
        "type": "image",
        "original_url": "https://..."
      }
    ]
  }
}`,
  },
  {
    method: "GET",
    path: "/universities",
    description: "Universitetlar ro'yxatini olish",
    params: [
      { name: "limit", type: "integer", default: "20", description: "Qaytariladigan natijalar soni" },
      { name: "offset", type: "integer", default: "0", description: "Pagination uchun offset" },
      { name: "region_id", type: "string", optional: true, description: "Viloyat ID bo'yicha filter" },
      { name: "search", type: "string", optional: true, description: "Nom bo'yicha qidirish" },
    ],
    response: `{
  "success": true,
  "data": [
    {
      "id": "123",
      "name_uz": "Toshkent davlat universiteti",
      "name_en": "Tashkent State University",
      "name_ru": "Ташкентский государственный университет",
      "region_id": "10",
      "website": "https://tdu.uz"
    }
  ],
  "meta": { ... }
}`,
  },
  {
    method: "GET",
    path: "/regions",
    description: "Viloyatlar ro'yxatini olish",
    params: [],
    response: `{
  "success": true,
  "data": ["1", "2", "3", "10", "11", "12", "13", "14"],
  "meta": {
    "total": 8
  }
}`,
  },
];

const codeExamples = {
  curl: `curl -X GET "${API_BASE_URL}/news?limit=10" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
  javascript: `const response = await fetch(
  "${API_BASE_URL}/news?limit=10",
  {
    headers: {
      "x-api-key": "YOUR_API_KEY",
      "Content-Type": "application/json"
    }
  }
);
const data = await response.json();
console.log(data);`,
  python: `import requests

response = requests.get(
    "${API_BASE_URL}/news",
    params={"limit": 10},
    headers={"x-api-key": "YOUR_API_KEY"}
)
data = response.json()
print(data)`,
};

export default function ApiDocs() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
              <Book className="h-8 w-8" />
              API Documentation
            </h1>
            <p className="mt-1 text-muted-foreground">
              O'zbekiston universitetlari yangiliklari API'si
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            v1.0
          </Badge>
        </div>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Tez Boshlash
            </CardTitle>
            <CardDescription>
              API'dan foydalanish uchun API kalit kerak. Admin panelidagi "API Keys" bo'limidan kalit oling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="font-medium">Base URL</span>
                </div>
                <code className="text-xs break-all">{API_BASE_URL}</code>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Authentication</span>
                </div>
                <code className="text-xs">x-api-key: YOUR_KEY</code>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Rate Limit</span>
                </div>
                <code className="text-xs">60 req/min, 10K/day</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Kod Namunalari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl" className="w-full">
              <TabsList>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              {Object.entries(codeExamples).map(([lang, code]) => (
                <TabsContent key={lang} value={lang}>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/30">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{code}</pre>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Endpoints</h2>
          
          {endpoints.map((endpoint, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-green-600">
                    {endpoint.method}
                  </Badge>
                  <code className="text-lg font-mono">{endpoint.path}</code>
                </div>
                <CardDescription>{endpoint.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {endpoint.params.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Parametrlar</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3">Nomi</th>
                            <th className="text-left p-3">Turi</th>
                            <th className="text-left p-3">Default</th>
                            <th className="text-left p-3">Tavsif</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoint.params.map((param, pIndex) => (
                            <tr key={pIndex} className="border-t">
                              <td className="p-3">
                                <code className="text-primary">{param.name}</code>
                                {param.optional && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    optional
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-muted-foreground">{param.type}</td>
                              <td className="p-3 text-muted-foreground">{param.default || "-"}</td>
                              <td className="p-3">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Response</h4>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/30">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{endpoint.response}</pre>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Error Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Xatolik Kodlari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Kod</th>
                    <th className="text-left p-3">Tavsif</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-3"><Badge variant="outline">401</Badge></td>
                    <td className="p-3">API kalit noto'g'ri yoki berilmagan</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3"><Badge variant="outline">404</Badge></td>
                    <td className="p-3">Endpoint yoki ma'lumot topilmadi</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3"><Badge variant="outline">429</Badge></td>
                    <td className="p-3">Rate limit oshib ketdi</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3"><Badge variant="outline">500</Badge></td>
                    <td className="p-3">Server xatoligi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
