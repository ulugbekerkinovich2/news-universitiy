import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { UniversityCard } from "@/components/universities/UniversityCard";
import { UniversitiesFilters } from "@/components/universities/UniversitiesFilters";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getUniversities, getRegions, getStats, createScrapeJob } from "@/lib/api";
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

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [regions, setRegions] = useState<string[]>([]);

  const [stats, setStats] = useState<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> } | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { toast } = useToast();

  useEffect(() => {
    loadRegions();
    loadStats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, region, status]);

  useEffect(() => {
    loadUniversities();
  }, [page, debouncedSearch, region, status]);

  const loadRegions = async () => {
    try {
      const data = await getRegions();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadUniversities = async () => {
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
  };

  const handleScrape = async (universityId: string) => {
    setScrapingId(universityId);
    try {
      await createScrapeJob("SINGLE_UNIVERSITY", universityId);
      toast({
        title: "Scrape job created",
        description: "The scraping process has been queued",
      });
      loadUniversities();
    } catch (error) {
      toast({
        title: "Failed to create scrape job",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setScrapingId(null);
    }
  };

  const handleScrapeAll = async () => {
    try {
      await createScrapeJob("ALL_UNIVERSITIES");
      toast({
        title: "Scrape all job created",
        description: "Scraping all universities has been queued",
      });
    } catch (error) {
      toast({
        title: "Failed to create scrape job",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="gradient-hero rounded-xl p-8 text-primary-foreground">
          <div className="max-w-2xl">
            <h1 className="font-heading text-3xl md:text-4xl font-bold">
              Uzbek Universities News Aggregator
            </h1>
            <p className="mt-3 text-primary-foreground/80">
              Collecting and aggregating news from official university websites across Uzbekistan.
              Browse universities, read the latest news, and export data.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button 
                onClick={handleScrapeAll}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Scrape All Universities
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Universities"
              value={stats.totalUniversities}
              icon={GraduationCap}
            />
            <StatsCard
              title="Total News Posts"
              value={stats.totalPosts}
              icon={Newspaper}
            />
            <StatsCard
              title="Scraped"
              value={stats.byStatus.DONE || 0}
              icon={CheckCircle2}
              description="Successfully scraped"
            />
            <StatsCard
              title="Needs Attention"
              value={(stats.byStatus.FAILED || 0) + (stats.byStatus.NO_SOURCE || 0)}
              icon={AlertTriangle}
              description="Failed or no source"
            />
          </div>
        )}

        {/* Filters */}
        <UniversitiesFilters
          search={search}
          onSearchChange={setSearch}
          region={region}
          onRegionChange={setRegion}
          status={status}
          onStatusChange={setStatus}
          regions={regions}
        />

        {/* Universities Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : universities.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No universities found"
            description="No universities match your search criteria. Try adjusting your filters or import universities from JSON."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {universities.map((uni) => (
                <UniversityCard
                  key={uni.id}
                  university={uni}
                  onScrape={handleScrape}
                  isScraping={scrapingId === uni.id}
                />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
