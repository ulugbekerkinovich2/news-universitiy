import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsPosts, getUniversity } from "@/lib/api";
import type { NewsPost, University } from "@/types/database";
import { useDebounce } from "@/hooks/use-debounce";
import { Newspaper, Search, ArrowLeft, GraduationCap, ExternalLink } from "lucide-react";

const LIMIT = 15;

export default function UniversityNewsPage() {
  const { universityId } = useParams<{ universityId: string }>();
  const [university, setUniversity] = useState<University | null>(null);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUni, setIsLoadingUni] = useState(true);

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (universityId) {
      loadUniversity();
    }
  }, [universityId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, language]);

  useEffect(() => {
    if (universityId) {
      loadPosts();
    }
  }, [page, debouncedSearch, language, universityId]);

  const loadUniversity = async () => {
    setIsLoadingUni(true);
    try {
      const data = await getUniversity(universityId!);
      setUniversity(data);
    } catch (error) {
      console.error("Failed to load university:", error);
    } finally {
      setIsLoadingUni(false);
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { data, count } = await getNewsPosts({
        university_id: universityId,
        search: debouncedSearch || undefined,
        language: language !== "all" ? language : undefined,
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

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back button and University header */}
        <div className="space-y-4">
          <Link to="/news">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Barcha universitetlar
            </Button>
          </Link>

          {isLoadingUni ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ) : university ? (
            <div className="flex items-start gap-4">
              {university.logo_url ? (
                <img
                  src={university.logo_url}
                  alt=""
                  className="w-16 h-16 rounded-xl object-contain bg-muted"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <GraduationCap className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  {university.name_uz}
                </h1>
                {university.website && (
                  <a
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {university.website}
                  </a>
                )}
                <p className="text-muted-foreground mt-1">
                  {totalCount} ta yangilik topildi
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="Universitet topilmadi"
              description="Bu ID bilan universitet mavjud emas"
            />
          )}
        </div>

        {university && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Yangilik qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Barcha tillar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha tillar</SelectItem>
                  <SelectItem value="uz">O'zbek</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* News list */}
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={Newspaper}
                title="Yangilik topilmadi"
                description="Bu universitet uchun yangilik mavjud emas yoki qidiruv bo'yicha topilmadi."
              />
            ) : (
              <>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <NewsCard key={post.id} post={post} showUniversity={false} />
                  ))}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}