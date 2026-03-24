import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScrapeJob, ScrapeJobEvent } from "@/types/database";
import { XCircle, Activity, CheckCircle2, AlertCircle, Loader2, Search, FileText, Image, Database, GraduationCap } from "lucide-react";
import { fmtTime, fmtRelative } from "@/lib/tz";
import { cn } from "@/lib/utils";

interface JobProgressProps {
  job: ScrapeJob;
  events?: ScrapeJobEvent[];
  onCancel?: () => void;
}

const stageIcons: Record<string, React.ReactNode> = {
  DISCOVER: <Search className="h-3 w-3" />,
  CRAWL: <Loader2 className="h-3 w-3 animate-spin" />,
  PARSE: <FileText className="h-3 w-3" />,
  SAVE_POSTS: <Database className="h-3 w-3" />,
  SAVE_MEDIA: <Image className="h-3 w-3" />,
  DONE: <CheckCircle2 className="h-3 w-3" />,
};

const stageColors: Record<string, string> = {
  DISCOVER: "bg-info/20 text-info border-info/30",
  CRAWL: "bg-warning/20 text-warning border-warning/30",
  PARSE: "bg-secondary text-secondary-foreground border-secondary/50",
  SAVE_POSTS: "bg-primary/20 text-primary border-primary/30",
  SAVE_MEDIA: "bg-accent text-accent-foreground border-accent/50",
  DONE: "bg-primary/20 text-primary border-primary/30",
};

// Memoized event item to prevent re-renders
const EventItem = memo(function EventItem({ 
  event, 
  isFirst 
}: { 
  event: ScrapeJobEvent; 
  isFirst: boolean;
}) {
  const counters = event.counters_json || {};
  const hasError = event.message?.toLowerCase().includes('error') || 
                   event.message?.toLowerCase().includes('failed');
  const universityName = event.university?.name_uz;
  
  return (
    <div 
      className={cn(
        "flex flex-col gap-1 p-2 rounded-md text-xs transition-all",
        isFirst ? "bg-background border shadow-sm" : "bg-muted/50",
        hasError && "border-destructive/30 bg-destructive/5"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono">
          {fmtTime(event.timestamp)}
        </span>
        <span className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
          stageColors[event.stage] || "bg-muted"
        )}>
          {stageIcons[event.stage]}
          {event.stage}
        </span>
        {universityName && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 truncate max-w-[200px]">
            <GraduationCap className="h-3 w-3 shrink-0" />
            {universityName}
          </span>
        )}
        {hasError && (
          <AlertCircle className="h-3 w-3 text-destructive" />
        )}
      </div>
      
      {event.message && (
        <p className={cn(
          "text-muted-foreground pl-1",
          hasError && "text-destructive"
        )}>
          {event.message}
        </p>
      )}
      
      {/* Show counters if available */}
      {Object.keys(counters).length > 0 && (
        <div className="flex flex-wrap gap-2 pl-1 mt-1">
          {counters.pages_discovered !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info">
              {counters.pages_discovered} sahifa topildi
            </span>
          )}
          {counters.posts_found !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {counters.posts_found} yangilik
            </span>
          )}
          {counters.images_saved !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
              {counters.images_saved} rasm
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export const JobProgress = memo(function JobProgress({ job, events = [], onCancel }: JobProgressProps) {
  const totals = job.totals_json || {};
  const total = totals.total_universities || 1;
  const completed = (totals.completed || 0) + (totals.failed || 0) + (totals.no_news || 0) + (totals.no_source || 0);
  const progress = Math.round((completed / total) * 100);
  const isActive = job.status === 'RUNNING' || job.status === 'QUEUED';

  // Get the current stage from latest event
  const latestEvent = events[0];
  const currentStage = latestEvent?.stage || 'DISCOVER';

  // Memoize the stats grid
  const statsGrid = useMemo(() => (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-lg font-bold text-primary">{totals.completed || 0}</p>
        <p className="text-[10px] text-muted-foreground">Muvaffaqiyatli</p>
      </div>
      <div className="text-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-lg font-bold text-destructive">{totals.failed || 0}</p>
        <p className="text-[10px] text-muted-foreground">Xato</p>
      </div>
      <div className="text-center p-2 rounded-lg bg-warning/10 border border-warning/20">
        <p className="text-lg font-bold text-warning">{totals.no_source || 0}</p>
        <p className="text-[10px] text-muted-foreground">Manba yo'q</p>
      </div>
      <div className="text-center p-2 rounded-lg bg-info/10 border border-info/20">
        <p className="text-lg font-bold text-info">{totals.posts_found || 0}</p>
        <p className="text-[10px] text-muted-foreground">Yangiliklar</p>
      </div>
      <div className="text-center p-2 rounded-lg bg-secondary border border-secondary/50">
        <p className="text-lg font-bold text-secondary-foreground">{totals.images_saved || 0}</p>
        <p className="text-[10px] text-muted-foreground">Rasmlar</p>
      </div>
    </div>
  ), [totals.completed, totals.failed, totals.no_source, totals.posts_found, totals.images_saved]);

  return (
    <Card className={cn(
      "transition-all duration-300",
      isActive ? "border-info/50 bg-info/5 shadow-lg shadow-info/10" : ""
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isActive && (
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/20">
                  <Activity className="h-5 w-5 text-info animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-info"></span>
                </span>
              </div>
            )}
            <div>
              <CardTitle className="text-base font-semibold">
                {job.scope === 'ALL_UNIVERSITIES' ? "Barcha universitetlar" : "Bitta universitet"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Boshlangan: {fmtRelative(job.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            {isActive && onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <XCircle className="h-4 w-4 mr-1" />
                Bekor qilish
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Stage Indicator */}
        {isActive && latestEvent && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-muted">
            <div className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md border",
              stageColors[currentStage] || "bg-muted"
            )}>
              {stageIcons[currentStage]}
              <span className="text-xs font-medium">{currentStage}</span>
            </div>
            {latestEvent.university?.name_uz && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary truncate max-w-[250px]">
                  {latestEvent.university.name_uz}
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground flex-1 truncate">
              {latestEvent.message || "Ishlayapti..."}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jarayon</span>
              <span className="font-medium">{completed} / {total} ({progress}%)</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        {statsGrid}

        {/* Live Event Log */}
        {events.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Jonli loglar
              </h4>
              <span className="text-[10px] text-muted-foreground">
                {events.length} ta yozuv
              </span>
            </div>
            
            <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-2">
              <div className="space-y-1.5">
                {events.map((event, index) => (
                  <EventItem 
                    key={event.id} 
                    event={event} 
                    isFirst={index === 0} 
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Show message when no events */}
        {isActive && events.length === 0 && (
          <div className="flex items-center justify-center p-6 rounded-lg border border-dashed bg-muted/30">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Jarayon boshlanmoqda...</p>
              <p className="text-xs text-muted-foreground mt-1">Loglar tez orada ko'rinadi</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
