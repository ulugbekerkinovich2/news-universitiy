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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/common/Pagination";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Send, ShieldCheck, Tags, University, XCircle, Sparkles, Activity, Radar, Clock3, AlertTriangle } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isSyncingTags, setIsSyncingTags] = useState(false);
  const [isSyncingUniversities, setIsSyncingUniversities] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 12;

  const stats = useMemo(() => overview?.news_by_status || {}, [overview]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isBusy = isSyncingTags || isSyncingUniversities || isBulkSending;

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [status, page]);

  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const overviewData = await getMentalabaOverview();
      setOverview(overviewData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mentalaba panel yuklanmadi");
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const queueData = await getMentalabaQueue({
        syndication_status: status,
        eligible_only: status === "PENDING",
        page,
        limit: pageSize,
      });
      setQueue(queueData.data);
      setTotalCount(queueData.count);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Eksport queue yuklanmadi");
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadOverview(), loadQueue()]);
  };

  const toggleExpanded = (postId: string) => {
    setExpandedId((current) => current === postId ? null : postId);
  };

  const handleModeToggle = async (checked: boolean) => {
    try {
      const result = await updateMentalabaExportMode(checked ? "auto" : "manual");
      setOverview((current) => current ? { ...current, export_mode: result.export_mode } : current);
      toast.success(`Eksport rejimi ${result.export_mode} qilindi`);
      await loadQueue();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rejim saqlanmadi");
    }
  };

  const handleSyncTags = async () => {
    setIsSyncingTags(true);
    try {
      const result = await syncMentalabaTags();
      toast.success(`${result.count} ta tag sinxron qilindi`);
      await refreshAll();
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
      await refreshAll();
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
      await refreshAll();
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
      await refreshAll();
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
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status yangilanmadi");
    } finally {
      setBusyPostId(null);
    }
  };

  const getDeactivateLabel = (item: MentalabaQueueItem) => {
    if (item.post.syndication_remote_id) {
      return "Non-active qilish";
    }
    return "Reject";
  };

  const handleStatusChange = (value: QueueStatus) => {
    setStatus(value);
    setPage(1);
    setExpandedId(null);
  };

  const metricCards = [
    {
      label: "Token Health",
      value: overview?.token_configured ? "Ready" : "Missing",
      meta: overview?.token_configured ? "API ulanadi" : "Backend .env tekshiring",
      icon: ShieldCheck,
      tone: overview?.token_configured ? "text-emerald-500" : "text-destructive",
    },
    {
      label: "Tag Intelligence",
      value: String(overview?.tags_count || 0),
      meta: formatDate(overview?.last_tags_sync_at),
      icon: Tags,
      tone: "text-primary",
    },
    {
      label: "Mapped Universities",
      value: String(overview?.mapped_universities_count || 0),
      meta: `${overview?.unmapped_universities_count || 0} ta hali map emas`,
      icon: Radar,
      tone: "text-sky-500",
    },
    {
      label: "Pending Queue",
      value: String(stats.PENDING || 0),
      meta: `${stats.EXPORTED || 0} ta export qilingan`,
      icon: Activity,
      tone: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-background via-background to-primary/5">
        <CardContent className="space-y-6 p-0">
          <div className="relative overflow-hidden px-6 py-6 sm:px-7">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_55%)]" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Mentalaba Delivery Rail
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    News export operatsiyalarini bitta command center’dan boshqaring
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Queue holati, sync, upload requestlari va remote response’lar endi bitta joyda. Operator uchun tez, tushunarli va nazoratga qulay oqim.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                {isLoadingOverview ? (
                  <>
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                  </>
                ) : metricCards.map((item) => (
                  <div key={item.label} className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-2.5">
                        <item.icon className={cn("h-4 w-4", item.tone)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-border/50 bg-card/30 px-6 py-5 sm:px-7 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Eksport rejimi</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Hozir <span className="font-medium text-foreground">{overview?.export_mode === "auto" ? "Auto" : "Manual"}</span> rejim. Manual default bo‘lib turadi.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">Manual</span>
                  <Switch checked={overview?.export_mode === "auto"} onCheckedChange={handleModeToggle} />
                  <span className="text-sm font-medium text-foreground">Auto</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Last Tag Sync</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(overview?.last_tags_sync_at)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unmapped OTM</p>
                    <p className="text-sm font-medium text-foreground">{overview?.unmapped_universities_count || 0} ta</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-2xl" onClick={() => void handleSyncTags()} disabled={isSyncingTags}>
                {isSyncingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tags className="mr-2 h-4 w-4" />}
                Tag sync
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => void handleSyncUniversities()} disabled={isSyncingUniversities}>
                {isSyncingUniversities ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <University className="mr-2 h-4 w-4" />}
                University sync
              </Button>
              <Button className="rounded-2xl" onClick={() => void handleBulkSend()} disabled={isBulkSending || !overview?.token_configured}>
                {isBulkSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Pending yuborish
              </Button>
              <Button variant="ghost" className="rounded-2xl" onClick={() => void refreshAll()} disabled={isBusy && isLoadingQueue}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Eksport Queue</CardTitle>
              <CardDescription>
                Qaysi news yuborilgan, qaysisi pending yoki reject ekanini shu yerdan boshqaramiz.
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {queueStatuses.map((item) => (
                <div key={item} className={cn(
                  "rounded-2xl border px-3 py-2 text-center",
                  status === item ? "border-primary/30 bg-primary/10" : "border-border/60 bg-background/60"
                )}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{stats[item] || 0}</p>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={status} onValueChange={(value) => handleStatusChange(value as QueueStatus)}>
            <TabsList className="flex h-auto flex-wrap gap-2 rounded-2xl bg-muted/40 p-1.5">
              {queueStatuses.map((item) => (
                <TabsTrigger key={item} value={item} className="rounded-xl px-4">
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {status} oqimi
              </p>
              <p className="text-sm text-muted-foreground">
                Jami <span className="font-medium text-foreground">{totalCount}</span> ta yozuv. Sahifa {page}/{totalPages}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Faqat tayyor yozuvlar tezroq ko‘rinsin deb `Pending` holatda eligible-only filter ishlaydi.
            </div>
          </div>

          {isLoadingQueue ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-border/60 bg-card/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <Skeleton className="h-40 w-full rounded-2xl lg:w-64" />
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-7 w-3/4 rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-2xl" />
                      <Skeleton className="h-10 w-full rounded-2xl" />
                    </div>
                  </div>
                </div>
              ))}
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
                        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                          <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                            <span className="block uppercase tracking-[0.18em]">Action</span>
                            <span className="mt-1 block font-medium text-foreground">{post.syndication_last_action || "Hali yo'q"}</span>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                            <span className="block uppercase tracking-[0.18em]">HTTP</span>
                            <span className="mt-1 block font-medium text-foreground">{post.syndication_last_status_code ?? "?"}</span>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                            <span className="block uppercase tracking-[0.18em]">Remote ID</span>
                            <span className="mt-1 block truncate font-medium text-foreground">{post.syndication_remote_id || "Hali yo'q"}</span>
                          </div>
                        </div>
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
                            {getDeactivateLabel(item)}
                          </Button>
                          <Button asChild variant="ghost">
                            <a href={post.source_url} target="_blank" rel="noreferrer">Manba</a>
                          </Button>
                          <Button variant="secondary" onClick={() => toggleExpanded(post.id)}>
                            {expandedId === post.id ? "Detalni yopish" : "API detail"}
                          </Button>
                        </div>
                        {expandedId === post.id && (
                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Image Upload Request</p>
                              <ScrollArea className="h-48 rounded-2xl border border-border/70 bg-background/80 p-3">
                                <pre className="text-xs leading-5 text-foreground whitespace-pre-wrap">
                                  {post.syndication_image_payload || "Hali yuborilmagan"}
                                </pre>
                              </ScrollArea>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Image Upload Response</p>
                              <ScrollArea className="h-48 rounded-2xl border border-border/70 bg-background/80 p-3">
                                <pre className="text-xs leading-5 text-foreground whitespace-pre-wrap">
                                  {post.syndication_image_response || "Response yo'q"}
                                </pre>
                              </ScrollArea>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">News Request</p>
                              <ScrollArea className="h-56 rounded-2xl border border-border/70 bg-background/80 p-3">
                                <pre className="text-xs leading-5 text-foreground whitespace-pre-wrap">
                                  {post.syndication_request_payload || "Hali yuborilmagan"}
                                </pre>
                              </ScrollArea>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">News Response</p>
                              <ScrollArea className="h-56 rounded-2xl border border-border/70 bg-background/80 p-3">
                                <pre className="text-xs leading-5 text-foreground whitespace-pre-wrap">
                                  {post.syndication_response_payload || post.syndication_last_error || "Response yo'q"}
                                </pre>
                              </ScrollArea>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
