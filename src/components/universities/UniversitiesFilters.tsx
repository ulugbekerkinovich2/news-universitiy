import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import type { ScrapeStatus } from "@/types/database";

interface UniversitiesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  region: string;
  onRegionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  regions: string[];
  statusCounts?: Record<string, number>;
  onScrapeAllFailed?: () => void;
  isScraping?: boolean;
  onQuickTriage?: (statuses: ScrapeStatus[]) => void;
}

const statusOptions: { value: string; label: string; color?: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "IDLE", label: "Kutilmoqda" },
  { value: "IN_PROGRESS", label: "Jarayonda" },
  { value: "DONE", label: "Tayyor" },
  { value: "FAILED", label: "Xato", color: "text-destructive" },
  { value: "NO_SOURCE", label: "Manba yo'q" },
  { value: "NO_NEWS", label: "Yangilik yo'q" },
];

export function UniversitiesFilters({
  search,
  onSearchChange,
  region,
  onRegionChange,
  status,
  onStatusChange,
  regions,
  statusCounts,
  onScrapeAllFailed,
  isScraping,
  onQuickTriage,
}: UniversitiesFiltersProps) {
  const failedCount = statusCounts?.FAILED || 0;
  const needsAttentionCount = failedCount + (statusCounts?.NO_NEWS || 0) + (statusCounts?.NO_SOURCE || 0);
  
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.9fr]">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Universitet qidirish..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 rounded-2xl border-border/70 bg-background/60 pl-11 text-sm shadow-none dark:border-white/10 dark:bg-white/5"
          />
        </div>

        <Select value={region} onValueChange={onRegionChange}>
          <SelectTrigger className="h-12 w-full rounded-2xl border-border/70 bg-background/60 shadow-none dark:border-white/10 dark:bg-white/5">
            <SelectValue placeholder="Barcha viloyatlar" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">Barcha viloyatlar</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-12 w-full rounded-2xl border-border/70 bg-background/60 shadow-none dark:border-white/10 dark:bg-white/5">
            <SelectValue placeholder="Barcha statuslar" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className={opt.color}>
                  {opt.label}
                  {statusCounts && opt.value !== "all" && (
                    <span className="ml-2 text-muted-foreground">
                      ({statusCounts[opt.value] || 0})
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {onQuickTriage && (
          <button
            type="button"
            onClick={() => onQuickTriage(["FAILED", "NO_NEWS", "NO_SOURCE"])}
            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 transition-all hover:bg-amber-500/15 dark:text-amber-300"
          >
            Attention queue
            <span className="ml-1.5 text-[11px] opacity-75">{needsAttentionCount}</span>
          </button>
        )}
        {statusOptions.filter((opt) => opt.value !== "all").map((opt) => {
          const count = statusCounts?.[opt.value] || 0;
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange(active ? "all" : opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-primary/30 bg-primary/12 text-primary"
                  : "border-border/70 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              }`}
            >
              {opt.label}
              <span className="ml-1.5 text-[11px] opacity-75">{count}</span>
            </button>
          );
        })}
      </div>
      
      {failedCount > 0 && onScrapeAllFailed && (
        <div className="flex flex-col gap-3 rounded-[22px] border border-destructive/20 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">
              {failedCount} ta universitet xato bilan yakunlangan
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onScrapeAllFailed}
            disabled={isScraping}
            className="rounded-xl border-destructive/40 bg-background/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isScraping ? 'animate-spin' : ''}`} />
            Barchasini qayta scrape qilish
          </Button>
        </div>
      )}
    </div>
  );
}
