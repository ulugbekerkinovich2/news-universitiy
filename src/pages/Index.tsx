import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { UniversityCard } from "@/components/universities/UniversityCard";
import { UniversitiesFilters } from "@/components/universities/UniversitiesFilters";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getUniversities, getRegions, getStats, createScrapeJob, scrapeFailedUniversities } from "@/lib/api";
import type { University, ScrapeStatus } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Newspaper, CheckCircle2, AlertTriangle, RefreshCw, Building2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const LIMIT = 12;

export default function Index() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [isScrapingFailed, setIsScrapingFailed] = useState(false);

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [regions, setRegions] = useState<string[]>([]);

  const [stats, setStats] = useState<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> } | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { toast } = useToast();

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

  // Initial load - only once
  useEffect(() => {
    loadRegions();
    loadStats();
  }, [loadRegions, loadStats]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, region, status]);

  // Load universities when filters or page change
  useEffect(() => {
    loadUniversities();
  }, [loadUniversities]);

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

  const handleScrapeAll = useCallback(async () => {
    try {
      await createScrapeJob("ALL_UNIVERSITIES");
      toast({
        title: "Scrape job yaratildi",
        description: "Barcha universitetlar scrape qilinmoqda",
      });
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast]);

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

  // Memoized stats section
  const statsSection = useMemo(() => {
    if (!stats) return null;
    
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Jami universitetlar"
          value={stats.totalUniversities}
          icon={GraduationCap}
        />
        <StatsCard
          title="Jami yangiliklar"
          value={stats.totalPosts}
          icon={Newspaper}
        />
        <StatsCard
          title="Muvaffaqiyatli"
          value={stats.byStatus.DONE || 0}
          icon={CheckCircle2}
          description="Scrape qilingan"
        />
        <StatsCard
          title="E'tibor talab"
          value={(stats.byStatus.FAILED || 0) + (stats.byStatus.NO_SOURCE || 0)}
          icon={AlertTriangle}
          description="Xato yoki manba yo'q"
        />
      </div>
    );
  }, [stats]);

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
        {/* Hero Section */}
        <div className="gradient-hero rounded-xl p-8 text-primary-foreground">
          <div className="max-w-2xl">
            <h1 className="font-heading text-3xl md:text-4xl font-bold">
              O'zbekiston Universitetlari Yangiliklari
            </h1>
            <p className="mt-3 text-primary-foreground/80">
              O'zbekiston bo'ylab universitetlarning rasmiy veb-saytlaridan yangiliklar to'plash va aggregatsiya qilish.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button 
                onClick={handleScrapeAll}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Barchasini Scrape qilish
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {statsSection}

        {/* Filters */}
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
        />

        {/* Universities Grid */}
        {universitiesGrid}
      </div>
    </Layout>
  );
}
