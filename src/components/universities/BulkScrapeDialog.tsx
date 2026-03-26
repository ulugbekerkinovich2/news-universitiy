import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCw, Sparkles, Layers3 } from "lucide-react";
import type { ScrapeStatus } from "@/types/database";

interface StatusOption {
  value: ScrapeStatus;
  label: string;
  description: string;
}

const statusOptions: StatusOption[] = [
  { value: "IDLE", label: "Kutilmoqda", description: "Hali scrape qilinmagan" },
  { value: "DONE", label: "Tayyor", description: "Muvaffaqiyatli yakunlangan" },
  { value: "FAILED", label: "Xato", description: "Xato bilan yakunlangan" },
  { value: "NO_NEWS", label: "Yangilik yo'q", description: "Yangilik topilmagan" },
];

interface BulkScrapeDialogProps {
  statusCounts?: Record<string, number>;
  onScrape: (statuses: ScrapeStatus[]) => Promise<void>;
  isScraping?: boolean;
}

const presets: Array<{ label: string; statuses: ScrapeStatus[]; description: string }> = [
  { label: "Triage", statuses: ["FAILED", "NO_NEWS"], description: "Muammoli va tekshiruv talab qiladigan source'lar" },
  { label: "Fresh Start", statuses: ["IDLE"], description: "Hali ishga tushmagan universitetlar" },
  { label: "Refresh", statuses: ["DONE"], description: "Mavjud source'larni yangilash" },
];

export function BulkScrapeDialog({ 
  statusCounts, 
  onScrape, 
  isScraping 
}: BulkScrapeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<ScrapeStatus[]>([]);

  const handleToggleStatus = (status: ScrapeStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSelectAll = () => {
    if (selectedStatuses.length === statusOptions.length) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses(statusOptions.map(o => o.value));
    }
  };

  const getTotalCount = () => {
    return selectedStatuses.reduce((sum, status) => {
      return sum + (statusCounts?.[status] || 0);
    }, 0);
  };

  const selectedLabels = statusOptions
    .filter((option) => selectedStatuses.includes(option.value))
    .map((option) => option.label);

  const handleScrape = async () => {
    if (selectedStatuses.length === 0) return;
    await onScrape(selectedStatuses);
    setOpen(false);
    setSelectedStatuses([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-2xl bg-accent text-accent-foreground shadow-[0_16px_35px_rgba(20,184,166,0.22)] hover:bg-accent/90">
          <RefreshCw className="h-4 w-4 mr-2" />
          Barchasini Scrape qilish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--card)/0.9))]">
        <DialogHeader>
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            Bulk operation
          </div>
          <DialogTitle className="text-xl">Statuslar bo'yicha scrape qilish</DialogTitle>
          <DialogDescription>
            Qaysi statusdagi universitetlarni scrape qilishni tanlang
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all"
                checked={selectedStatuses.length === statusOptions.length}
                onCheckedChange={handleSelectAll}
              />
              <Label 
                htmlFor="select-all" 
                className="text-sm font-medium cursor-pointer"
              >
                Barchasini tanlash
              </Label>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              {getTotalCount()} ta universitet
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelectedStatuses(preset.statuses)}
                  className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {statusOptions.map((option) => {
              const count = statusCounts?.[option.value] || 0;
              const checked = selectedStatuses.includes(option.value);
              return (
                <label
                  key={option.value}
                  htmlFor={option.value}
                  className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                    count === 0
                      ? "cursor-not-allowed border-border/50 bg-muted/40 opacity-55 dark:border-white/6 dark:bg-white/[0.03]"
                      : checked
                        ? "border-primary/25 bg-primary/10"
                        : "cursor-pointer border-border/70 bg-background/55 hover:bg-background dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
                  }`}
                >
                  <Checkbox 
                    id={option.value}
                    checked={checked}
                    onCheckedChange={() => handleToggleStatus(option.value)}
                    disabled={count === 0}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <Label 
                        htmlFor={option.value} 
                        className={`text-sm font-medium cursor-pointer ${count === 0 ? 'text-muted-foreground' : ''}`}
                      >
                        {option.label}
                      </Label>
                      <span className="rounded-full border border-border/70 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground dark:border-white/10">
                        {count} ta
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              Jami: <span className="font-medium text-foreground">{getTotalCount()}</span> ta universitet
            </div>
            <div className="text-xs">
              Tanlangan oqim: {selectedLabels.length > 0 ? selectedLabels.join(", ") : "hali tanlanmagan"}
            </div>
          </div>
          <Button
            onClick={handleScrape}
            disabled={selectedStatuses.length === 0 || isScraping || getTotalCount() === 0}
            className="rounded-2xl"
          >
            {isScraping ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scrape qilinmoqda...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scrape qilish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
