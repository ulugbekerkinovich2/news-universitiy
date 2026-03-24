import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { JobProgress } from "@/components/dashboard/JobProgress";
import { ScrapingStatsCharts } from "@/components/dashboard/ScrapingStatsCharts";
import { LastScheduledScrape } from "@/components/dashboard/LastScheduledScrape";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  getStats, 
  getActiveJobs, 
  getScrapeJobs, 
  getScrapeJobEvents,
  cancelScrapeJob,
  createScrapeJob
} from "@/lib/api";
import type { ScrapeJob, ScrapeJobEvent } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { 
  GraduationCap, 
  Newspaper, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Activity,
  History,
  Volume2,
  VolumeX,
  BarChart3
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> } | null>(null);
  const [activeJobs, setActiveJobs] = useState<ScrapeJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<ScrapeJob[]>([]);
  const [jobEvents, setJobEvents] = useState<Record<string, ScrapeJobEvent[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("scrape-sound-enabled");
    return saved !== null ? saved === "true" : true;
  });
  const previousJobsRef = useRef<Record<string, string>>({});
  const isLoadingEventsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const { play } = useNotificationSound();

  // Save sound preference
  useEffect(() => {
    localStorage.setItem("scrape-sound-enabled", String(soundEnabled));
  }, [soundEnabled]);

  // Memoized handlers to prevent recreating functions
  const loadStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  const loadActiveJobs = useCallback(async () => {
    try {
      const jobs = await getActiveJobs();
      setActiveJobs(jobs);

      // Track job statuses - only load events for jobs that don't have them yet
      for (const job of jobs) {
        previousJobsRef.current[job.id] = job.status;
        
        // Avoid loading events if already loading or already have them
        if (!isLoadingEventsRef.current.has(job.id)) {
          isLoadingEventsRef.current.add(job.id);
          getScrapeJobEvents(job.id).then(events => {
            setJobEvents(prev => ({ ...prev, [job.id]: events }));
            isLoadingEventsRef.current.delete(job.id);
          }).catch(() => {
            isLoadingEventsRef.current.delete(job.id);
          });
        }
      }
    } catch (error) {
      console.error("Failed to load active jobs:", error);
    }
  }, []);

  const loadRecentJobs = useCallback(async () => {
    try {
      const { data } = await getScrapeJobs({ limit: 5 });
      setRecentJobs(data.filter(j => j.status !== 'QUEUED' && j.status !== 'RUNNING'));
    } catch (error) {
      console.error("Failed to load recent jobs:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadStats(), loadActiveJobs(), loadRecentJobs()]);
    setIsLoading(false);
  }, [loadStats, loadActiveJobs, loadRecentJobs]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stable reference for real-time handler
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Poll active jobs every 10 seconds (replaces Supabase real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveJobs();
      loadRecentJobs();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadActiveJobs, loadRecentJobs]);

  const handleCancel = useCallback(async (jobId: string) => {
    try {
      await cancelScrapeJob(jobId);
      toast({ title: "Job cancelled" });
      loadActiveJobs();
    } catch (error) {
      toast({
        title: "Failed to cancel job",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast, loadActiveJobs]);

  const handleScrapeAll = useCallback(async () => {
    try {
      await createScrapeJob("ALL_UNIVERSITIES");
      toast({
        title: "Scrape job created",
        description: "Scraping all universities has been queued",
      });
      loadActiveJobs();
    } catch (error) {
      toast({
        title: "Failed to create job",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [toast, loadActiveJobs]);

  // Memoized components to prevent unnecessary re-renders
  const statsSection = useMemo(() => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      );
    }
    
    if (!stats) return null;
    
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Universities"
          value={stats.totalUniversities}
          icon={GraduationCap}
        />
        <StatsCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={Newspaper}
        />
        <StatsCard
          title="Completed"
          value={stats.byStatus.DONE || 0}
          icon={CheckCircle2}
        />
        <StatsCard
          title="Failed"
          value={stats.byStatus.FAILED || 0}
          icon={XCircle}
        />
      </div>
    );
  }, [isLoading, stats]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              Scrape Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Monitor scraping progress and manage jobs
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="sound-toggle" className="text-sm text-muted-foreground">
                Ovoz
              </Label>
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>

            <Button onClick={handleScrapeAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scrape All
            </Button>
          </div>
        </div>

        {/* Stats */}
        {statsSection}

        {/* Last Scheduled Scrape */}
        <LastScheduledScrape />

        {/* Active Jobs */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-info" />
            Active Jobs
          </h2>

          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={RefreshCw}
                  title="No active jobs"
                  description="Start a new scrape job to collect news from universities"
                  action={
                    <Button onClick={handleScrapeAll}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start Scraping
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <JobProgress
                  key={job.id}
                  job={job}
                  events={jobEvents[job.id]}
                  onCancel={() => handleCancel(job.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        {recentJobs.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Recent Jobs
            </h2>

            <div className="space-y-3">
              {recentJobs.map((job) => (
                <JobProgress key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {/* Scraping Statistics Charts */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Scraping Statistikasi
          </h2>
          <ScrapingStatsCharts />
        </div>
      </div>
    </Layout>
  );
}
