import { useEffect, useMemo, useState } from "react";
import {
  getMentalabaOverview,
  getMentalabaQueue,
  sendMentalabaPending,
  sendNewsToMentalaba,
  syncMentalabaTags,
  syncMentalabaUniversities,
  updateMentalabaExportMode,
  updateMentalabaQueueStatus,
} from "@/lib/api";
import type { MentalabaOverview, MentalabaQueueItem } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, Send, ShieldCheck, Tags, University, XCircle } from "lucide-react";
import { toast } from "sonner";

type QueueStatus = "PENDING" | "EXPORTED" | "FAILED" | "REJECTED" | "DRAFT";

const queueStatuses: QueueStatus[] = ["PENDING", "EXPORTED", "FAILED", "REJECTED", "DRAFT"];

function formatDate(value?: string | null) {
  if (!value) return "Hali yo'q";
  return new Date(value).toLocaleString("uz-UZ");
}

export function MentalabaExportPanel() {
  const [overview, setOverview] = useState<MentalabaOverview | null>(null);
  const [status, setStatus] = useState<QueueStatus>("PENDING");
  const [queue, setQueue] = useState<MentalabaQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingTags, setIsSyncingTags] = useState(false);
  const [isSyncingUniversities, setIsSyncingUniversities] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  const stats = useMemo(() => overview?.news_by_status || {}, [overview]);

  useEffect(() => {
    void loadAll();
  }, [status]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [overviewData, queueData] = await Promise.all([
        getMentalabaOverview(),
        getMentalabaQueue({ syndication_status: status, eligible_only: status === "PENDING", limit: 40 }),
      ]);
      setOverview(overviewData);
      setQueue(queueData.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mentalaba panel yuklanmadi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeToggle = async (checked: boolean) => {
    try {
      const result = await updateMentalabaExportMode(checked ? "auto" : "manual");
      setOverview((current) => current ? { ...current, export_mode: result.export_mode } : current);
      toast.success(`Eksport rejimi ${result.export_mode} qilindi`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rejim saqlanmadi");
    }
  };

  const handleSyncTags = async () => {
    setIsSyncingTags(true);
    try {
      const result = await syncMentalabaTags();
      toast.success(`${result.count} ta tag sinxron qilindi`);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tag sync xatosi");
    } finally {
      setIsSyncingTags(false);
    }
  };

  const handleSyncUniversities = async () => {
    setIsSyncingUniversities(true);
    try {
      const result = await syncMentalabaUniversities();
      toast.success(`${result.matched} ta universitet map qilindi`);
      if (result.unmatched > 0) {
        toast.warning(`${result.unmatched} ta universitet hali map bo'lmadi`);
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "University sync xatosi");
    } finally {
      setIsSyncingUniversities(false);
    }
  };

  const handleBulkSend = async () => {
    setIsBulkSending(true);
    try {
      const result = await sendMentalabaPending(20);
      toast.success(`${result.exported} ta news yuborildi`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} ta news yiqildi`);
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk send xatosi");
    } finally {
      setIsBulkSending(false);
    }
  };

  const handleSend = async (postId: string) => {
    setBusyPostId(postId);
    try {
      const result = await sendNewsToMentalaba(postId);
      if (result.syndication_status === "EXPORTED") {
        toast.success("News Mentalaba'ga yuborildi");
      } else {
        toast.error(result.syndication_last_error || "Yuborishda xato");
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yuborishda xato");
    } finally {
      setBusyPostId(null);
    }
  };

  const handleReject = async (postId: string) => {
    setBusyPostId(postId);
    try {
      await updateMentalabaQueueStatus(postId, "REJECTED");
      toast.success("News eksport queue'dan chiqarildi");
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status yangilanmadi");
    } finally {
      setBusyPostId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Mentalaba Syndication
          </CardTitle>
          <CardDescription>
            Rasmli, tasdiqlangan newslarni manual yoki avtomatik rejimda Mentalaba tizimiga yuboring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Token</p>
              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck className={`h-4 w-4 ${overview?.token_configured ? "text-emerald-500" : "text-destructive"}`} />
                <span className="font-medium">{overview?.token_configured ? "Configured" : "Missing"}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tags</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{overview?.tags_count || 0}</p>
              <p className="text-xs text-muted-foreground">{formatDate(overview?.last_tags_sync_at)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Mapped OTM</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{overview?.mapped_universities_count || 0}</p>
              <p className="text-xs text-muted-foreground">{overview?.unmapped_universities_count || 0} ta hali map emas</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Queue</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.PENDING || 0}</p>
              <p className="text-xs text-muted-foreground">{stats.EXPORTED || 0} ta yuborilgan</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/80 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium text-foreground">Avtomatik yuborish</p>
              <p className="text-sm text-muted-foreground">
                Hozir {overview?.export_mode === "auto" ? "auto" : "manual"} rejimda. Manual default bo'lib turadi.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Manual</span>
              <Switch checked={overview?.export_mode === "auto"} onCheckedChange={handleModeToggle} />
              <span className="text-sm font-medium text-foreground">Auto</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void handleSyncTags()} disabled={isSyncingTags}>
              {isSyncingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tags className="mr-2 h-4 w-4" />}
              Tag sync
            </Button>
            <Button variant="outline" onClick={() => void handleSyncUniversities()} disabled={isSyncingUniversities}>
              {isSyncingUniversities ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <University className="mr-2 h-4 w-4" />}
              University sync
            </Button>
            <Button onClick={() => void handleBulkSend()} disabled={isBulkSending || !overview?.token_configured}>
              {isBulkSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Pending yuborish
            </Button>
            <Button variant="ghost" onClick={() => void loadAll()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eksport Queue</CardTitle>
          <CardDescription>
            Qaysi news yuborilgan, qaysisi pending yoki reject ekanini shu yerdan boshqaramiz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={status} onValueChange={(value) => setStatus(value as QueueStatus)}>
            <TabsList>
              {queueStatuses.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
              Bu status uchun news topilmadi.
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => {
                const post = item.post;
                const isBusy = busyPostId === post.id;
                return (
                  <div key={post.id} className="rounded-3xl border border-border/60 bg-card/70 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row">
                      {item.cover_image_url ? (
                        <img
                          src={item.cover_image_url}
                          alt=""
                          className="h-40 w-full rounded-2xl object-cover lg:w-64"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/40 text-sm text-muted-foreground lg:w-64">
                          Rasm yo'q
                        </div>
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{post.university?.name_uz || post.university_id}</Badge>
                          <Badge>{post.syndication_status || "DRAFT"}</Badge>
                          {item.mentalaba_university_id ? (
                            <Badge variant="secondary">Mentalaba #{item.mentalaba_university_id}</Badge>
                          ) : (
                            <Badge variant="destructive">Mapping yo'q</Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
                        {post.summary && <p className="text-sm leading-6 text-muted-foreground">{post.summary}</p>}
                        <div className="flex flex-wrap gap-2">
                          {item.suggested_tags.length > 0 ? item.suggested_tags.map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          )) : (
                            <span className="text-xs text-muted-foreground">Tag topilmadi, fallback ishlaydi</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Holat: <span className="font-medium text-foreground">{item.export_reason}</span>
                        </p>
                        {post.syndication_last_error && (
                          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            {post.syndication_last_error}
                          </p>
                        )}
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => void handleSend(post.id)}
                            disabled={isBusy || !item.is_exportable || !overview?.token_configured}
                          >
                            {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Yuborish
                          </Button>
                          <Button variant="outline" onClick={() => void handleReject(post.id)} disabled={isBusy}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button asChild variant="ghost">
                            <a href={post.source_url} target="_blank" rel="noreferrer">Manba</a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
