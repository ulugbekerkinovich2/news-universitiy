import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getUniversity, getNewsPosts, createScrapeJob } from "@/lib/api";
import type { University, NewsPost } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { REGION_NAMES } from "@/lib/regions";
import { 
  ArrowLeft, 
  ExternalLink, 
  Globe, 
  MapPin, 
  RefreshCw, 
  Newspaper,
  Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const LIMIT = 10;

export default function UniversityDetail() {
  const { id } = useParams<{ id: string }>();
  const [university, setUniversity] = useState<University | null>(null);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadUniversity();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadPosts();
    }
  }, [id, page]);

  const loadUniversity = async () => {
    try {
      const data = await getUniversity(id!);
      setUniversity(data);
    } catch (error) {
      toast({
        title: "Failed to load university",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { data, count } = await getNewsPosts({
        university_id: id,
        page,
        limit: LIMIT,
      });
      setPosts(data);
      setTotalCount(count);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!university) return;
    setIsScraping(true);
    try {
      await createScrapeJob("SINGLE_UNIVERSITY", university.id);
      toast({
        title: "Scrape job created",
        description: "The scraping process has been queued",
      });
      loadUniversity();
    } catch (error) {
      toast({
        title: "Failed to create scrape job",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const totalPages = Math.ceil(totalCount / LIMIT);

  if (!university && !isLoading) {
    return (
      <Layout>
        <EmptyState
          icon={Newspaper}
          title="University not found"
          description="The university you're looking for doesn't exist."
          action={
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Universities
              </Button>
            </Link>
          }
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Universities
        </Link>

        {university ? (
          <div className="gradient-hero rounded-xl p-6 md:p-8 text-primary-foreground">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <h1 className="font-heading text-2xl md:text-3xl font-bold">
                  {university.name_en || university.name_uz}
                </h1>
                {university.name_en && university.name_uz !== university.name_en && (
                  <p className="mt-1 text-primary-foreground/80">
                    {university.name_uz}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-4">
                  {university.region_id && REGION_NAMES[university.region_id] && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/80">
                      <MapPin className="h-4 w-4" />
                      {REGION_NAMES[university.region_id]}
                    </span>
                  )}

                  {university.website && (
                    <a
                      href={university.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      {new URL(university.website).hostname}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {university.last_scraped_at && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/80">
                      <Calendar className="h-4 w-4" />
                      Last scraped {formatDistanceToNow(new Date(university.last_scraped_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={university.scrape_status} />
                {university.scrape_status !== 'NO_SOURCE' && (
                  <Button
                    onClick={handleScrape}
                    disabled={isScraping || university.scrape_status === 'IN_PROGRESS'}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
                    Scrape Now
                  </Button>
                )}
              </div>
            </div>

            {university.last_error_message && university.scrape_status === 'FAILED' && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/20 text-sm">
                <strong>Last error:</strong> {university.last_error_message}
              </div>
            )}
          </div>
        ) : (
          <Skeleton className="h-48 rounded-xl" />
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold">
            News Posts ({totalCount})
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No news posts yet"
            description="This university doesn't have any news posts. Try scraping to collect news."
            action={
              university?.scrape_status !== 'NO_SOURCE' && (
                <Button onClick={handleScrape} disabled={isScraping}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
                  Scrape News
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <NewsCard 
                  key={post.id} 
                  post={post} 
                  showUniversity={false} 
                  showDelete={true}
                  onDelete={loadPosts}
                />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
