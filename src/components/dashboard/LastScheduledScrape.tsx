import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  CalendarClock, 
  CheckCircle2, 
  XCircle, 
  Newspaper, 
  Image, 
  Video,
  RefreshCw,
  Timer
} from "lucide-react";
import { getLastScheduledScrape, triggerScheduledScrape } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { uz } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ScheduledScrapeResult {
  id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  totals_json: {
    universities_processed?: number;
    success_count?: number;
    fail_count?: number;
    posts_found?: number;
    images_saved?: number;
    videos_saved?: number;
  } | null;
}

export function LastScheduledScrape() {
  const [data, setData] = useState<ScheduledScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const result = await getLastScheduledScrape();
      setData(result);
    } catch (error) {
      console.error("Failed to load last scheduled scrape:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerScrape = async () => {
    setIsTriggering(true);
    try {
      await triggerScheduledScrape();
      toast({
        title: "Avtomatik scrape boshlandi",
        description: "DONE statusli universitetlar scrape qilinmoqda",
      });
      // Reload after a delay
      setTimeout(loadData, 2000);
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Scrape boshlanmadi",
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totals = data?.totals_json || {};
  const hasData = data && data.finished_at;

  // Calculate next scheduled time (6:00 AM UTC daily)
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setUTCHours(6, 0, 0, 0);
  if (now >= nextRun) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-primary" />
            Avtomatik Scraping
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTriggerScrape}
            disabled={isTriggering}
          >
            {isTriggering ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Hozir ishga tushirish
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Schedule Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span>Har kuni soat 06:00 (UTC) da avtomatik ishga tushadi</span>
          </div>

          {/* Next Run */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-info" />
            <span className="font-medium">Keyingi ishga tushish:</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(nextRun, { addSuffix: true, locale: uz })}
            </span>
          </div>

          {hasData ? (
            <>
              {/* Last Run Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Oxirgi natija:</span>
                <Badge 
                  variant={data.status === 'DONE' ? 'default' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {data.status === 'DONE' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {data.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {data.finished_at && formatDistanceToNow(new Date(data.finished_at), { addSuffix: true, locale: uz })}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {totals.universities_processed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Universitetlar</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                    <Newspaper className="h-4 w-4" />
                    {totals.posts_found || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Yangi postlar</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-info flex items-center justify-center gap-1">
                    <Image className="h-4 w-4" />
                    {totals.images_saved || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Rasmlar</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-warning flex items-center justify-center gap-1">
                    <Video className="h-4 w-4" />
                    {totals.videos_saved || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Videolar</div>
                </div>
              </div>

              {/* Success Rate */}
              {(totals.success_count !== undefined || totals.fail_count !== undefined) && (
                <div className="flex items-center gap-4 text-sm pt-1">
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {totals.success_count || 0} muvaffaqiyatli
                  </span>
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                    {totals.fail_count || 0} xato
                  </span>
                </div>
              )}

              {/* Timestamp */}
              {data.finished_at && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {format(new Date(data.finished_at), "d MMMM yyyy, HH:mm", { locale: uz })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Hali avtomatik scrape ishga tushmagan</p>
              <p className="text-xs">Birinchi ishga tushish ertaga soat 06:00 da bo'ladi</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
