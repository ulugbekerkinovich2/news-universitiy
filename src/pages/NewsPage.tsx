import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { getUniversities } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import type { University } from "@/types/database";
import { useDebounce } from "@/hooks/use-debounce";
import { GraduationCap, Search, Newspaper, ExternalLink } from "lucide-react";

const LIMIT = 24;

interface UniversityWithCount extends University {
  news_count?: number;
}

export default function NewsPage() {
  const [universities, setUniversities] = useState<UniversityWithCount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadUniversities();
  }, [page, debouncedSearch]);

  const loadUniversities = async () => {
    setIsLoading(true);
    try {
      // Get universities
      const { data, count } = await getUniversities({
        search: debouncedSearch || undefined,
        page,
        limit: LIMIT,
      });

      // Get news counts for each university
      const uniIds = data.map((u) => u.id);
      const { data: countData } = await supabase
        .from("news_posts")
        .select("university_id")
        .in("university_id", uniIds);

      // Count news per university
      const countsMap: Record<string, number> = {};
      countData?.forEach((post) => {
        countsMap[post.university_id] = (countsMap[post.university_id] || 0) + 1;
      });

      // Merge counts with universities and sort by news count
      const withCounts = data.map((uni) => ({
        ...uni,
        news_count: countsMap[uni.id] || 0,
      }));

      // Sort: universities with news first
      withCounts.sort((a, b) => (b.news_count || 0) - (a.news_count || 0));

      setUniversities(withCounts);
      setTotalCount(count);
    } catch (error) {
      console.error("Failed to load universities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Universitetlar Yangiliklari
          </h1>
          <p className="mt-1 text-muted-foreground">
            Universitet tanlang va yangiliklarini ko'ring ({totalCount} ta universitet)
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Universitet qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : universities.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Universitet topilmadi"
            description="Qidiruv bo'yicha universitet topilmadi. Boshqa so'z bilan qidiring."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {universities.map((uni) => (
                <UniversityNewsCard key={uni.id} university={uni} />
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

function UniversityNewsCard({ university }: { university: UniversityWithCount }) {
  const hasNews = (university.news_count || 0) > 0;

  return (
    <Link to={`/news/university/${university.id}`}>
      <Card className={`h-full transition-all hover:shadow-lg hover:border-primary/50 ${!hasNews ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {university.logo_url ? (
              <img
                src={university.logo_url}
                alt=""
                className="w-10 h-10 rounded-lg object-contain bg-muted flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
                {university.name_uz}
              </h3>
              {university.website && (
                <a
                  href={university.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">
                    {new URL(university.website).hostname}
                  </span>
                </a>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Newspaper className="h-4 w-4" />
              <span className="text-sm">
                {university.news_count || 0} ta yangilik
              </span>
            </div>
            {hasNews && (
              <Badge variant="secondary" className="text-xs">
                Ko'rish →
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
