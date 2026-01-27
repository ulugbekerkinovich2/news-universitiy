import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getTopUniversitiesByNews,
  getScrapingStatsByRegion,
  getScrapingStatusDistribution,
} from "@/lib/api";
import { TrendingUp, MapPin, PieChart as PieChartIcon } from "lucide-react";

// Region name mapping
const REGION_NAMES: Record<string, string> = {
  "1": "Andijon",
  "2": "Buxoro",
  "3": "Jizzax",
  "4": "Qashqadaryo",
  "5": "Navoiy",
  "6": "Namangan",
  "7": "Samarqand",
  "8": "Sirdaryo",
  "9": "Surxondaryo",
  "10": "Toshkent",
  "11": "Farg'ona",
  "12": "Xorazm",
  "13": "Qoraqalpog'iston",
  "14": "Toshkent sh.",
  "unknown": "Noma'lum",
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  DONE: "hsl(var(--success))",
  FAILED: "hsl(var(--destructive))",
  NO_NEWS: "hsl(var(--warning))",
  NO_SOURCE: "hsl(var(--muted-foreground))",
  IDLE: "hsl(var(--info))",
  IN_PROGRESS: "hsl(var(--primary))",
};

const STATUS_LABELS: Record<string, string> = {
  DONE: "Muvaffaqiyatli",
  FAILED: "Xato",
  NO_NEWS: "Yangilik yo'q",
  NO_SOURCE: "Manba yo'q",
  IDLE: "Kutmoqda",
  IN_PROGRESS: "Jarayonda",
};

interface TopUniversity {
  university_id: string;
  name: string;
  count: number;
}

interface RegionStats {
  region_id: string;
  total: number;
  done: number;
  failed: number;
  no_news: number;
  no_source: number;
  success_rate: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export function ScrapingStatsCharts() {
  const [topUniversities, setTopUniversities] = useState<TopUniversity[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [universities, regions, statuses] = await Promise.all([
        getTopUniversitiesByNews(10),
        getScrapingStatsByRegion(),
        getScrapingStatusDistribution(),
      ]);
      setTopUniversities(universities);
      setRegionStats(regions);
      setStatusDistribution(statuses);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Top Universities by News Count */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Eng ko'p yangilikli universitetlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topUniversities.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Ma'lumot topilmadi
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topUniversities.map((u) => ({
                  name: u.name.length > 25 ? u.name.slice(0, 25) + "..." : u.name,
                  fullName: u.name,
                  count: u.count,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={150}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string, props: { payload: { fullName: string } }) => [
                    `${value} ta yangilik`,
                    props.payload.fullName,
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Scraping Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Scraping holati taqsimoti
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Ma'lumot topilmadi
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution.map((s) => ({
                    name: STATUS_LABELS[s.status] || s.status,
                    value: s.count,
                    percentage: s.percentage,
                    status: s.status,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry) => (
                    <Cell 
                      key={entry.status} 
                      fill={STATUS_COLORS[entry.status] || "hsl(var(--muted))"} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string, props: { payload: { percentage: number } }) => [
                    `${value} ta (${props.payload.percentage}%)`,
                    name,
                  ]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => (
                    <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Region Success Rates */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Viloyatlar bo'yicha muvaffaqiyat darajasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {regionStats.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Ma'lumot topilmadi
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={regionStats.map((r) => ({
                  name: REGION_NAMES[r.region_id] || r.region_id,
                  "Muvaffaqiyatli": r.done,
                  "Xato": r.failed,
                  "Yangilik yo'q": r.no_news,
                  "Manba yo'q": r.no_source,
                  successRate: r.success_rate,
                  total: r.total,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [`${value} ta`, name]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${label} (Jami: ${data.total}, Muvaffaqiyat: ${data.successRate}%)`;
                    }
                    return label;
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Muvaffaqiyatli" stackId="a" fill="hsl(var(--success))" />
                <Bar dataKey="Xato" stackId="a" fill="hsl(var(--destructive))" />
                <Bar dataKey="Yangilik yo'q" stackId="a" fill="hsl(var(--warning))" />
                <Bar dataKey="Manba yo'q" stackId="a" fill="hsl(var(--muted-foreground))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
