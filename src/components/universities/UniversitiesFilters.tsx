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
}: UniversitiesFiltersProps) {
  const failedCount = statusCounts?.FAILED || 0;
  
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Universitet qidirish..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={region} onValueChange={onRegionChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <SelectTrigger className="w-full sm:w-[200px]">
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
      
      {/* Quick action for failed universities */}
      {failedCount > 0 && onScrapeAllFailed && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">
              {failedCount} ta universitet xato bilan yakunlangan
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onScrapeAllFailed}
            disabled={isScraping}
            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isScraping ? 'animate-spin' : ''}`} />
            Barchasini qayta scrape qilish
          </Button>
        </div>
      )}
    </div>
  );
}
