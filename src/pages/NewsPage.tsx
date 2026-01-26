import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { NewsCard } from "@/components/news/NewsCard";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsPosts } from "@/lib/api";
import type { NewsPost } from "@/types/database";
import { useDebounce } from "@/hooks/use-debounce";
import { Newspaper, Search } from "lucide-react";

const LIMIT = 15;

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, language]);

  useEffect(() => {
    loadPosts();
  }, [page, debouncedSearch, language]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { data, count } = await getNewsPosts({
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
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            News Feed
          </h1>
          <p className="mt-1 text-muted-foreground">
            Latest news from all universities ({totalCount} posts)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search news..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="uz">O'zbek</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No news posts found"
            description="No posts match your search criteria. Try adjusting your filters or scrape some universities."
          />
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <NewsCard key={post.id} post={post} />
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
