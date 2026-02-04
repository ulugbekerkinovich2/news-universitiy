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
import { RefreshCw } from "lucide-react";
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

  const handleScrape = async () => {
    if (selectedStatuses.length === 0) return;
    await onScrape(selectedStatuses);
    setOpen(false);
    setSelectedStatuses([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <RefreshCw className="h-4 w-4 mr-2" />
          Barchasini Scrape qilish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Statuslar bo'yicha scrape qilish</DialogTitle>
          <DialogDescription>
            Qaysi statusdagi universitetlarni scrape qilishni tanlang
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
          
          <div className="border-t pt-4 space-y-3">
            {statusOptions.map((option) => {
              const count = statusCounts?.[option.value] || 0;
              return (
                <div key={option.value} className="flex items-start space-x-3">
                  <Checkbox 
                    id={option.value}
                    checked={selectedStatuses.includes(option.value)}
                    onCheckedChange={() => handleToggleStatus(option.value)}
                    disabled={count === 0}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={option.value} 
                      className={`text-sm font-medium cursor-pointer ${count === 0 ? 'text-muted-foreground' : ''}`}
                    >
                      {option.label}
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({count})
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="text-sm text-muted-foreground">
            Jami: <span className="font-medium text-foreground">{getTotalCount()}</span> ta universitet
          </div>
          <Button
            onClick={handleScrape}
            disabled={selectedStatuses.length === 0 || isScraping || getTotalCount() === 0}
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
