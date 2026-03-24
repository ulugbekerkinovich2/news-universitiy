import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { getUniversities } from "@/lib/api";
import type { University } from "@/types/database";
import { useDebounce } from "@/hooks/use-debounce";
import { GraduationCap, Search, Newspaper, ExternalLink, Globe } from "lucide-react";

const LIMIT = 24;

const SCRAPE_STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  DONE:        { dot: "bg-emerald-400", label: "Yangiliklar bor" },
  IN_PROGRESS: { dot: "bg-blue-400 animate-pulse", label: "Jarayonda" },
  FAILED:      { dot: "bg-red-400", label: "Xato" },
  NO_NEWS:     { dot: "bg-orange-400", label: "Yangilik yo'q" },
  NO_SOURCE:   { dot: "bg-gray-500", label: "Sayt yo'q" },
  IDLE:        { dot: "bg-gray-600", label: "Kutmoqda" },
};

export default function NewsPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  useEffect(() => {
    setIsLoading(true);
    // Only fetch universities — no N+1 news count requests
    getUniversities({ search: debouncedSearch || undefined, page, limit: LIMIT })
      .then(({ data, count }) => {
        setUniversities(data);
        setTotalCount(count);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Yangiliklar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalCount > 0 ? `${totalCount} ta universitetdan yangiliklar` : "Universitetlardan yangiliklar"}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Universitet qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl shimmer" />
            ))}
          </div>
        ) : universities.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Universitet topilmadi"
            description="Boshqa so'z bilan qidiring"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {universities.map((uni) => (
                <UniversityNewsCard key={uni.id} university={uni} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </Layout>
  );
}

function UniversityNewsCard({ university }: { university: University }) {
  const status = university.scrape_status || "IDLE";
  const statusStyle = SCRAPE_STATUS_STYLE[status] || SCRAPE_STATUS_STYLE.IDLE;
  const hasDone = status === "DONE";

  let hostname = "";
  if (university.website) {
    try { hostname = new URL(university.website).hostname.replace("www.", ""); } catch {}
  }

  return (
    <Link to={`/news/university/${university.id}`}>
      <div className={`card-hover rounded-xl p-4 bg-card h-full flex flex-col gap-3 ${!hasDone ? "opacity-60" : ""}`}>
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border">
            {university.logo_url ? (
              <img src={university.logo_url} alt="" className="w-8 h-8 object-contain" />
            ) : (
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
              {university.name_uz}
            </p>
            {hostname && (
              <div className="flex items-center gap-1 mt-1">
                <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground truncate">{hostname}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            <span className="text-[11px] text-muted-foreground">{statusStyle.label}</span>
          </div>
          {hasDone && (
            <span className="text-[11px] text-primary font-medium">Ko'rish →</span>
          )}
        </div>
      </div>
    </Link>
  );
}
