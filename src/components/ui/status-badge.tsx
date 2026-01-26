import { cn } from "@/lib/utils";
import type { ScrapeStatus, JobStatus } from "@/types/database";
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileQuestion
} from "lucide-react";

interface StatusBadgeProps {
  status: ScrapeStatus | JobStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  IDLE: { label: "Idle", className: "status-idle", icon: Clock },
  QUEUED: { label: "Queued", className: "status-idle", icon: Clock },
  IN_PROGRESS: { label: "In Progress", className: "status-progress", icon: Loader2 },
  RUNNING: { label: "Running", className: "status-progress", icon: Loader2 },
  DONE: { label: "Done", className: "status-done", icon: CheckCircle2 },
  FAILED: { label: "Failed", className: "status-failed", icon: XCircle },
  CANCELLED: { label: "Cancelled", className: "status-failed", icon: XCircle },
  NO_SOURCE: { label: "No Source", className: "status-no-source", icon: AlertTriangle },
  NO_NEWS: { label: "No News", className: "status-no-news", icon: FileQuestion },
};

export function StatusBadge({ status, showIcon = true, size = "md", className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.IDLE;
  const Icon = config.icon;
  const isAnimated = status === "IN_PROGRESS" || status === "RUNNING";

  return (
    <span
      className={cn(
        "status-badge",
        config.className,
        size === "sm" && "px-2 py-0.5 text-[11px]",
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            "h-3 w-3",
            isAnimated && "animate-spin"
          )} 
        />
      )}
      {config.label}
    </span>
  );
}
