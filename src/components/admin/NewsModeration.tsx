import { useEffect, useState } from "react";
import { reviewNewsPost, getNewsReviewQueue } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, Trash2, Newspaper } from "lucide-react";
import type { NewsPost } from "@/types/database";
import { toast } from "sonner";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "TRASH";

export function NewsModeration() {
  const [status, setStatus] = useState<ReviewStatus>("PENDING");
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadQueue();
  }, [status]);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const data = await getNewsReviewQueue({ moderation_status: status, has_image: true, limit: 50 });
      setPosts(data.data);
    } catch (error) {
      toast.error("News moderation queue yuklanmadi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (postId: string, nextStatus: ReviewStatus) => {
    setSavingId(postId);
    try {
      await reviewNewsPost(postId, nextStatus, notes[postId]);
      toast.success(`Yangilik ${nextStatus} holatiga o'tkazildi`);
      await loadQueue();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Moderation xatosi");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          News Moderation
        </CardTitle>
        <CardDescription>
          Scraper topgan yangiliklardan trash bo'lmagan, rasmli postlarni approve/reject qiling.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={status} onValueChange={(value) => setStatus(value as ReviewStatus)}>
          <TabsList>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            <TabsTrigger value="TRASH">Trash</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            Bu status uchun rasmli yangilik topilmadi.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const coverImage = post.cover_image?.original_url || post.cover_image?.stored_url || post.media_assets?.[0]?.original_url;
              const isSaving = savingId === post.id;
              return (
                <div key={post.id} className="rounded-3xl border border-border/60 bg-card/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt=""
                        className="h-40 w-full rounded-2xl object-cover lg:w-64"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{post.university?.name_uz || post.university_id}</Badge>
                        <Badge>{post.moderation_status || status}</Badge>
                        {post.language && <Badge variant="secondary">{post.language}</Badge>}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
                      {post.summary && (
                        <p className="text-sm leading-6 text-muted-foreground">{post.summary}</p>
                      )}
                      <a
                        href={post.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-sm font-medium text-primary hover:underline"
                      >
                        Original manba
                      </a>
                      <Textarea
                        placeholder="Moderation note..."
                        value={notes[post.id] || ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [post.id]: event.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={isSaving} onClick={() => void handleReview(post.id, "APPROVED")}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Approve
                        </Button>
                        <Button variant="outline" disabled={isSaving} onClick={() => void handleReview(post.id, "REJECTED")}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button variant="destructive" disabled={isSaving} onClick={() => void handleReview(post.id, "TRASH")}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Trash
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
  );
}
