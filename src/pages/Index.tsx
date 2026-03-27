import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { UniversityCard } from "@/components/universities/UniversityCard";
import { UniversitiesFilters } from "@/components/universities/UniversitiesFilters";
import { BulkScrapeDialog } from "@/components/universities/BulkScrapeDialog";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getUniversities, getRegions, getStats, createScrapeJob, scrapeFailedUniversities } from "@/lib/api";
import type { University, ScrapeStatus } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Newspaper, CheckCircle2, AlertTriangle, Building2, ArrowRight, Sparkles, TimerReset, Activity } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/useAuth";

const LIMIT = 12;

export default function Index() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [isScrapingFailed, setIsScrapingFailed] = useState(false);
  const [isBulkScraping, setIsBulkScraping] = useState(false);

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [regions, setRegions] = useState<string[]>([]);

  const [stats, setStats] = useState<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> } | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Memoized load functions
  const loadRegions = useCallback(async () => {
    try {
      const data = await getRegions();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  const loadUniversities = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, count } = await getUniversities({
        search: debouncedSearch || undefined,
        region_id: region !== "all" ? region : undefined,
        status: status !== "all" ? status as ScrapeStatus : undefined,
        page,
        limit: LIMIT,
      });
      setUniversities(data);
      setTotalCount(count);
    } catch (error) {
      toast({
        title: "Failed to load universities",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, region, status, page, toast]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const { getDashboardInit } = await import("@/lib/api");
      const data = await getDashboardInit();
      setStats(data.stats);
      setRegions(data.regions);
      setUniversities(data.universities.data);
      setTotalCount(data.universities.count);
    } catch (error) {
      console.error("Failed to load dashboard init:", error);
      // Fallback
      loadRegions();
      loadStats();
      loadUniversities();
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [loadRegions, loadStats, loadUniversities]);

  // Initial load - only once
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Reset page when filters change
  useEffect(() => {
    if (!isInitialLoad) {
      setPage(1);
    }
  }, [debouncedSearch, region, status, isInitialLoad]);

  // Load universities when filters or page change
  useEffect(() => {
    if (!isInitialLoad) {
      loadUniversities();
    }
  }, [loadUniversities, isInitialLoad]);

  const handleScrape = useCallback(async (universityId: string) => {
    setScrapingId(universityId);
    try {
      await createScrapeJob("SINGLE_UNIVERSITY", universityId);
      toast({
        title: "Scrape job yaratildi",
        description: "Scraping jarayoni boshlandi",
      });
      loadUniversities();
      loadStats();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setScrapingId(null);
    }
  }, [toast, loadUniversities, loadStats]);

  const handleBulkScrape = useCallback(async (statuses: ScrapeStatus[]) => {
    setIsBulkScraping(true);
    try {
      const job = await createScrapeJob("ALL_UNIVERSITIES", undefined, statuses);
      const queued = job.totals_json?.queued || 0;
      toast({
        title: "Scrape job yaratildi",
        description: `${queued} ta universitet parallel scrape navbatiga qo'shildi`,
      });
      loadUniversities();
      loadStats();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsBulkScraping(false);
    }
  }, [toast, loadUniversities, loadStats]);

  const handleScrapeAllFailed = useCallback(async () => {
    setIsScrapingFailed(true);
    try {
      const result = await scrapeFailedUniversities();
      toast({
        title: "Qayta scrape boshlandi",
        description: `${result.queued} ta universitet qayta scrape qilinmoqda`,
      });
      loadUniversities();
      loadStats();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScrapingFailed(false);
    }
  }, [toast, loadUniversities, loadStats]);

  const totalPages = Math.ceil(totalCount / LIMIT);
  const needAttentionCount = (stats?.byStatus.FAILED || 0) + (stats?.byStatus.NO_SOURCE || 0);
  const healthyCount = stats?.byStatus.DONE || 0;
  const queuedEstimate = (stats?.byStatus.IDLE || 0) + (stats?.byStatus.FAILED || 0) + (stats?.byStatus.NO_NEWS || 0);
  const coverageRate = stats?.totalUniversities ? Math.round((healthyCount / stats.totalUniversities) * 100) : 0;
  const canManageScraping = hasPermission("manage_scraping");

  const statsSection = useMemo(() => {
    if (!stats) return null;
    
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Jami universitetlar"
          value={stats.totalUniversities}
          icon={GraduationCap}
          description="Monitoring bazasi"
          className="border-border/70 bg-card/80 backdrop-blur dark:border-white/10 dark:bg-white/5"
        />
        <StatsCard
          title="Jami yangiliklar"
          value={stats.totalPosts}
          icon={Newspaper}
          description="Yig'ilgan kontent"
          className="border-border/70 bg-card/80 backdrop-blur dark:border-white/10 dark:bg-white/5"
        />
        <StatsCard
          title="Muvaffaqiyatli"
          value={stats.byStatus.DONE || 0}
          icon={CheckCircle2}
          description="Scrape qilingan"
          className="border-emerald-500/20 bg-emerald-500/8"
        />
        <StatsCard
          title="E'tibor talab"
          value={needAttentionCount}
          icon={AlertTriangle}
          description="Xato yoki manba yo'q"
          className="border-amber-500/20 bg-amber-500/8"
        />
      </div>
    );
  }, [stats, needAttentionCount]);

  const handleTriageScrape = useCallback(async (statuses: ScrapeStatus[]) => {
    await handleBulkScrape(statuses);
  }, [handleBulkScrape]);

  // Memoized grid
  const universitiesGrid = useMemo(() => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      );
    }
    
    if (universities.length === 0) {
      return (
        <EmptyState
          icon={Building2}
          title="Universitet topilmadi"
          description="Qidiruv mezonlariga mos universitet topilmadi. Filtrlarni o'zgartirib ko'ring."
        />
      );
    }
    
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((uni) => (
            <UniversityCard
              key={uni.id}
              university={uni}
              onScrape={handleScrape}
              isScraping={scrapingId === uni.id}
              onUpdate={() => {
                loadUniversities();
                loadStats();
              }}
            />
          ))}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </>
    );
  }, [isLoading, universities, handleScrape, scrapingId, loadUniversities, loadStats, page, totalPages]);

  return (
    <Layout>
      <div className="space-y-8">
        <section className="hero-shell overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-medium text-foreground/80 dark:border-white/10 dark:bg-white/8 dark:text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Tezkor scrape va jonli monitoring
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="font-heading text-4xl font-bold leading-tight text-foreground dark:text-white md:text-5xl xl:text-6xl">
                  Universitet yangiliklari uchun
                  <span className="block text-gradient">toza, tez va boshqarilishi oson markaz</span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-foreground/72 dark:text-white/72 sm:text-base">
                  Rasmiy saytlarni kuzatish, muammoli manbalarni ajratish va scraping oqimini bir joydan ishga tushirish uchun soddalashtirilgan panel.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {canManageScraping && (
                  <>
                    <BulkScrapeDialog
                      statusCounts={stats?.byStatus}
                      onScrape={handleBulkScrape}
                      isScraping={isBulkScraping}
                    />
                    <Button
                      variant="outline"
                      onClick={handleScrapeAllFailed}
                      disabled={isScrapingFailed || needAttentionCount === 0}
                      className="border-border/70 bg-background/55 text-foreground hover:bg-background dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                      <TimerReset className={`mr-2 h-4 w-4 ${isScrapingFailed ? "animate-spin" : ""}`} />
                      Xatolarni qayta scrape
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="premium-panel p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground dark:text-white/45">Signal</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-semibold text-foreground dark:text-white">{healthyCount}</p>
                    <p className="mt-1 text-sm text-muted-foreground dark:text-white/65">Sog'lom manbalar</p>
                  </div>
                  <Activity className="h-10 w-10 text-emerald-300" />
                </div>
              </div>

              <div className="premium-panel p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground dark:text-white/45">Attention</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-semibold text-foreground dark:text-white">{needAttentionCount}</p>
                    <p className="mt-1 text-sm text-muted-foreground dark:text-white/65">Tekshiruv talab qiladi</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-amber-300" />
                </div>
              </div>

              <div className="premium-panel p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground dark:text-white/45">Coverage</p>
                <div className="mt-4">
                  <p className="text-3xl font-semibold text-foreground dark:text-white">{totalCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-white/65">Joriy filtrdagi universitetlar</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {statsSection}

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="premium-panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Operator signal</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">Hozirgi eng muhim ish</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              Panel endi faqat statistikani emas, keyingi actionni ham ko'rsatadi. Muammoli manbalarni qayta run qiling, `NO_SOURCE` bo'lganlarini tuzating, qolganlarini monitoring qiling.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => handleTriageScrape(["FAILED", "NO_NEWS", "NO_SOURCE"])} disabled={isBulkScraping}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Attention queue ni ishlatish
              </Button>
              <Button variant="outline" onClick={() => handleTriageScrape(["IDLE"])} disabled={isBulkScraping}>
                <Activity className="mr-2 h-4 w-4" />
                Yangi source'larni boshlash
              </Button>
            </div>
          </div>

          <div className="premium-panel p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Coverage pulse</p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sog'lom qamrov</span>
                  <span className="font-semibold text-foreground">{coverageRate}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coverageRate}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <p className="text-muted-foreground">Attention queue</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{needAttentionCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <p className="text-muted-foreground">Ishga tushishi mumkin</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{queuedEstimate}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-panel p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Universitetlar bazasi</p>
              <p className="text-sm text-muted-foreground">
                Filtrlang, monitoring qiling va kerakli manbani bir bosishda scrape qiling.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              <span>{totalCount} ta natija</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>{totalPages || 1} sahifa</span>
            </div>
          </div>
          
          <UniversitiesFilters
            search={search}
            onSearchChange={setSearch}
            region={region}
            onRegionChange={setRegion}
            status={status}
            onStatusChange={setStatus}
            regions={regions}
            statusCounts={stats?.byStatus}
            onScrapeAllFailed={handleScrapeAllFailed}
            isScraping={isScrapingFailed}
            onQuickTriage={handleTriageScrape}
          />
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                Universitetlar
              </h2>
              <p className="text-sm text-muted-foreground">
                Kartalardan sayt holati, oxirgi scrape va tezkor actionlar ko‘rinadi.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <span>Batafsil ko‘rish uchun kartani oching</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {universitiesGrid}
        </section>
      </div>
    </Layout>
  );
}
