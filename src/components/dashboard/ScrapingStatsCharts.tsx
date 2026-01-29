import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  getTopUniversitiesByNews,
  getScrapingStatsByRegion,
  getScrapingStatusDistribution,
  getNewsPostsByTimePeriod,
  getLanguageDistribution,
  getMediaStats,
  getScrapingPerformanceStats,
  getRecentScrapeJobsSummary,
} from "@/lib/api";
import { 
  TrendingUp, 
  MapPin, 
  PieChart as PieChartIcon, 
  Calendar, 
  Languages, 
  Image, 
  Activity,
  BarChart3 
} from "lucide-react";

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

const LANGUAGE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--muted-foreground))",
];

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

interface TimeSeriesData {
  date: string;
  count: number;
}

interface LanguageData {
  language: string;
  count: number;
  percentage: number;
}

interface MediaStats {
  totalImages: number;
  totalVideos: number;
  postsWithMedia: number;
  avgImagesPerPost: number;
}

interface PerformanceStats {
  avgPostsPerUniversity: number;
  successRate: number;
  totalScrapedUniversities: number;
  universitiesWithNews: number;
}

interface JobsSummary {
  last24h: { total: number; successful: number; failed: number };
  last7d: { total: number; successful: number; failed: number };
  last30d: { total: number; successful: number; failed: number };
}

export function ScrapingStatsCharts() {
  const [topUniversities, setTopUniversities] = useState<TopUniversity[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [dailyPosts, setDailyPosts] = useState<TimeSeriesData[]>([]);
  const [weeklyPosts, setWeeklyPosts] = useState<TimeSeriesData[]>([]);
  const [languageData, setLanguageData] = useState<LanguageData[]>([]);
  const [mediaStats, setMediaStats] = useState<MediaStats | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [jobsSummary, setJobsSummary] = useState<JobsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        universities, 
        regions, 
        statuses, 
        daily, 
        weekly, 
        languages, 
        media, 
        performance,
        jobs
      ] = await Promise.all([
        getTopUniversitiesByNews(10),
        getScrapingStatsByRegion(),
        getScrapingStatusDistribution(),
        getNewsPostsByTimePeriod('daily', 14),
        getNewsPostsByTimePeriod('weekly', 8),
        getLanguageDistribution(),
        getMediaStats(),
        getScrapingPerformanceStats(),
        getRecentScrapeJobsSummary(),
      ]);
      setTopUniversities(universities);
      setRegionStats(regions);
      setStatusDistribution(statuses);
      setDailyPosts(daily);
      setWeeklyPosts(weekly);
      setLanguageData(languages);
      setMediaStats(media);
      setPerformanceStats(performance);
      setJobsSummary(jobs);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {performanceStats && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Muvaffaqiyat darajasi</p>
                    <p className="text-2xl font-bold text-success">{performanceStats.successRate}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-success opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">O'rtacha post/univ</p>
                    <p className="text-2xl font-bold">{performanceStats.avgPostsPerUniversity}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
        {mediaStats && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Jami rasmlar</p>
                    <p className="text-2xl font-bold">{mediaStats.totalImages.toLocaleString()}</p>
                  </div>
                  <Image className="h-8 w-8 text-info opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Jami videolar</p>
                    <p className="text-2xl font-bold">{mediaStats.totalVideos.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-warning opacity-50" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Jobs Summary */}
      {jobsSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Scrape joblar statistikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Oxirgi 24 soat</p>
                <p className="text-xl font-bold">{jobsSummary.last24h.total}</p>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="text-success">✓ {jobsSummary.last24h.successful}</span>
                  <span className="text-destructive">✕ {jobsSummary.last24h.failed}</span>
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Oxirgi 7 kun</p>
                <p className="text-xl font-bold">{jobsSummary.last7d.total}</p>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="text-success">✓ {jobsSummary.last7d.successful}</span>
                  <span className="text-destructive">✕ {jobsSummary.last7d.failed}</span>
                </div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Oxirgi 30 kun</p>
                <p className="text-xl font-bold">{jobsSummary.last30d.total}</p>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="text-success">✓ {jobsSummary.last30d.successful}</span>
                  <span className="text-destructive">✕ {jobsSummary.last30d.failed}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* News Posts Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Yangiliklar dinamikasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="daily">Kunlik</TabsTrigger>
              <TabsTrigger value="weekly">Haftalik</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {dailyPosts.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Ma'lumot topilmadi
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyPosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('uz', { day: '2-digit', month: 'short' })}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value} ta yangilik`, 'Soni']}
                      labelFormatter={(date) => new Date(date).toLocaleDateString('uz', { day: '2-digit', month: 'long', year: 'numeric' })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
            <TabsContent value="weekly">
              {weeklyPosts.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Ma'lumot topilmadi
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyPosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('uz', { day: '2-digit', month: 'short' })}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value} ta yangilik`, 'Soni']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Languages className="h-5 w-5 text-primary" />
              Tillar taqsimoti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {languageData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Ma'lumot topilmadi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={languageData.map((l) => ({
                      name: l.language,
                      value: l.count,
                      percentage: l.percentage,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {languageData.map((_, index) => (
                      <Cell 
                        key={index} 
                        fill={LANGUAGE_COLORS[index % LANGUAGE_COLORS.length]} 
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
                      `${value.toLocaleString()} ta (${props.payload.percentage}%)`,
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

        {/* Media Stats */}
        {mediaStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="h-5 w-5 text-primary" />
                Media statistikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Jami rasmlar</p>
                  <p className="text-2xl font-bold text-primary">{mediaStats.totalImages.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Jami videolar</p>
                  <p className="text-2xl font-bold text-warning">{mediaStats.totalVideos.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Media bilan postlar</p>
                  <p className="text-2xl font-bold text-success">{mediaStats.postsWithMedia.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">O'rtacha rasm/post</p>
                  <p className="text-2xl font-bold text-info">{mediaStats.avgImagesPerPost}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Region Success Rates */}
      <Card>
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
