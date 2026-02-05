import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Newspaper, Search, ArrowLeft, GraduationCap, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";

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
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-xl" />
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
                {/* Featured post - first one larger */}
                {posts.length > 0 && (
                  <FeaturedNewsCard post={posts[0]} />
                )}

                {/* Rest of posts in grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.slice(1).map((post, index) => (
                    <NewsGridCard key={post.id} post={post} index={index} />
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

const languageLabels: Record<string, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
  unknown: "Noma'lum",
};

function FeaturedNewsCard({ post }: { post: NewsPost }) {
  const coverImage = post.cover_image?.original_url || post.cover_image?.stored_url;

  return (
    <Link to={`/news/${post.id}`} className="block group">
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="relative aspect-[21/9] bg-muted overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Newspaper className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground">
                {languageLabels[post.language || "unknown"]}
              </Badge>
              {post.published_at && (
                <span className="flex items-center gap-1.5 text-sm text-white/80">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(post.published_at), "d MMMM, yyyy")}
                </span>
              )}
            </div>
            
            <h2 className="font-heading text-2xl md:text-3xl font-bold leading-tight group-hover:text-primary-foreground/90 transition-colors">
              {post.title}
            </h2>
            
            {post.summary && (
              <p className="mt-3 text-white/70 line-clamp-2 text-lg">
                {post.summary}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function NewsGridCard({ post, index }: { post: NewsPost; index: number }) {
  const coverImage = post.cover_image?.original_url || post.cover_image?.stored_url;

  return (
    <Link 
      to={`/news/${post.id}`} 
      className="block group animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-video bg-muted overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Newspaper className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm"
          >
            {languageLabels[post.language || "unknown"]}
          </Badge>
        </div>
        
        <CardContent className="p-4">
          {post.published_at && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Calendar className="h-3 w-3" />
              {format(new Date(post.published_at), "d MMMM, yyyy")}
            </span>
          )}
          
          <h3 className="font-heading font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {post.title}
          </h3>
          
          {post.summary && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {post.summary}
            </p>
          )}
          
          <div className="mt-4 pt-3 border-t">
            <span className="text-sm font-medium text-primary group-hover:underline">
              Batafsil o'qish →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}