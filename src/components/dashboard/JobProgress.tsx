import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ScrapeJob, ScrapeJobEvent } from "@/types/database";
import { XCircle, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface JobProgressProps {
  job: ScrapeJob;
  events?: ScrapeJobEvent[];
  onCancel?: () => void;
}

export function JobProgress({ job, events = [], onCancel }: JobProgressProps) {
  const totals = job.totals_json || {};
  const total = totals.total_universities || 1;
  const completed = (totals.completed || 0) + (totals.failed || 0) + (totals.no_news || 0) + (totals.no_source || 0);
  const progress = Math.round((completed / total) * 100);
  const isActive = job.status === 'RUNNING' || job.status === 'QUEUED';

  return (
    <Card className={isActive ? "border-info/50 bg-info/5" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isActive && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/20">
                <Activity className="h-4 w-4 text-info animate-pulse" />
              </div>
            )}
            <div>
              <CardTitle className="text-base font-semibold">
                {job.scope === 'ALL_UNIVERSITIES' ? 'Full Scrape' : 'Single University'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Started {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            {isActive && onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xl font-bold text-foreground">{totals.completed || 0}</p>
            <p className="text-[11px] text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xl font-bold text-foreground">{totals.failed || 0}</p>
            <p className="text-[11px] text-muted-foreground">Failed</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xl font-bold text-foreground">{totals.posts_found || 0}</p>
            <p className="text-[11px] text-muted-foreground">Posts Found</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xl font-bold text-foreground">{totals.images_saved || 0}</p>
            <p className="text-[11px] text-muted-foreground">Images Saved</p>
          </div>
        </div>

        {events.length > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
            {events.slice(0, 5).map((event) => (
              <div 
                key={event.id} 
                className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/30"
              >
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted">
                  {event.stage}
                </span>
                <span className="flex-1 truncate">{event.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
