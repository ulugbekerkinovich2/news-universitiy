import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { JobProgress } from "@/components/dashboard/JobProgress";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
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
  VolumeX
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
  const { toast } = useToast();
  const { play } = useNotificationSound();

  // Save sound preference
  useEffect(() => {
    localStorage.setItem("scrape-sound-enabled", String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const jobsChannel = supabase
      .channel('scrape-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scrape_jobs' },
        (payload) => {
          const job = payload.new as ScrapeJob;
          const previousStatus = previousJobsRef.current[job.id];
          
          // Check if job just completed or failed
          if (previousStatus && previousStatus !== job.status) {
            if (job.status === 'DONE' && soundEnabled) {
              play('success');
              toast({
                title: "✅ Scraping tugadi!",
                description: `Job muvaffaqiyatli yakunlandi`,
              });
            } else if (job.status === 'FAILED' && soundEnabled) {
              play('error');
              toast({
                title: "❌ Scraping xatosi",
                description: "Job xato bilan tugadi",
                variant: "destructive",
              });
            }
          }
          
          // Update previous status
          previousJobsRef.current[job.id] = job.status;
          
          loadActiveJobs();
          loadRecentJobs();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel('scrape-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scrape_job_events' },
        (payload) => {
          const event = payload.new as ScrapeJobEvent;
          setJobEvents(prev => ({
            ...prev,
            [event.job_id]: [event, ...(prev[event.job_id] || [])].slice(0, 10)
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [soundEnabled, play, toast]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadStats(), loadActiveJobs(), loadRecentJobs()]);
    setIsLoading(false);
  };

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadActiveJobs = async () => {
    try {
      const jobs = await getActiveJobs();
      setActiveJobs(jobs);

      // Track job statuses and load events
      for (const job of jobs) {
        previousJobsRef.current[job.id] = job.status;
        const events = await getScrapeJobEvents(job.id);
        setJobEvents(prev => ({ ...prev, [job.id]: events }));
      }
    } catch (error) {
      console.error("Failed to load active jobs:", error);
    }
  };

  const loadRecentJobs = async () => {
    try {
      const { data } = await getScrapeJobs({ limit: 5 });
      setRecentJobs(data.filter(j => j.status !== 'QUEUED' && j.status !== 'RUNNING'));
    } catch (error) {
      console.error("Failed to load recent jobs:", error);
    }
  };

  const handleCancel = async (jobId: string) => {
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
  };

  const handleScrapeAll = async () => {
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
  };

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
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : stats && (
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
        )}

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
      </div>
    </Layout>
  );
}
