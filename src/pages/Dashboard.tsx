import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStats, createScrapeJob } from "@/lib/api";
import {
  Activity, RefreshCw, GraduationCap, Newspaper,
  CheckCircle2, XCircle, Clock, Zap, Terminal,
  TrendingUp, AlertCircle, Play, StopCircle, Wifi
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

type JobEvent = {
  id: string;
  stage: string;
  message: string;
  timestamp: string;
  counters_json?: Record<string, number>;
};

type LiveJob = {
  id: string;
  scope: string;
  university_id: string | null;
  university_name: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  totals_json?: Record<string, number>;
  events: JobEvent[];
};

type Stats = {
  totalUniversities: number;
  totalPosts: number;
  byStatus: Record<string, number>;
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  RUNNING: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", dot: "bg-blue-400 animate-pulse", label: "Ishlayapti" },
  QUEUED:  { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", dot: "bg-yellow-400 animate-pulse", label: "Navbatda" },
  DONE:    { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400", label: "Tayyor" },
  FAILED:  { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", dot: "bg-red-400", label: "Xato" },
  CANCELLED: { color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/30", dot: "bg-gray-400", label: "Bekor" },
};

const STAGE_ICON: Record<string, string> = {
  DISCOVER: "🔍",
  CRAWL:    "🕷️",
  PARSE:    "📄",
  SAVE_POSTS: "💾",
  SAVE_MEDIA: "🖼️",
  DONE:     "✅",
};

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Live terminal log per job ───────────────────────────────────────────────
function JobTerminal({ job }: { job: LiveJob }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.QUEUED;

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [job.events]);

  const totals = job.totals_json || {};

  return (
    <div className={`rounded-xl border ${cfg.bg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <div>
            <p className="text-sm font-semibold text-white leading-none">
              {job.university_name || (job.scope === "ALL_UNIVERSITIES" ? "Barcha universitetlar" : `Job ${job.id.slice(0, 8)}`)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatTime(job.created_at)} · {formatDuration(job.started_at, job.finished_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totals.saved !== undefined && (
            <span className="text-xs text-emerald-400 font-mono">+{totals.saved} maqola</span>
          )}
          <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="bg-black/40 font-mono text-xs p-3 h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
      >
        {job.events.length === 0 ? (
          <p className="text-gray-600 italic">Voqealar kutilmoqda...</p>
        ) : (
          job.events.map((ev) => (
            <div key={ev.id} className="flex gap-2 mb-1 group">
              <span className="text-gray-600 shrink-0">{formatTime(ev.timestamp)}</span>
              <span className="text-gray-500 shrink-0">{STAGE_ICON[ev.stage] || "·"}</span>
              <span className={`${job.status === "FAILED" && ev.stage === "DONE" ? "text-red-400" : "text-gray-300"} break-all`}>
                {ev.message}
                {ev.counters_json && Object.keys(ev.counters_json).length > 0 && (
                  <span className="text-gray-500 ml-2">
                    {Object.entries(ev.counters_json).map(([k, v]) => `${k}:${v}`).join(" ")}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
        {(job.status === "RUNNING" || job.status === "QUEUED") && (
          <div className="flex gap-2 mt-1">
            <span className="text-blue-400 animate-pulse">▋</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

// ── University status grid ───────────────────────────────────────────────────
function UniStatusGrid({ byStatus }: { byStatus: Record<string, number> }) {
  const items = [
    { key: "DONE", label: "Tayyor", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { key: "IN_PROGRESS", label: "Jarayonda", color: "text-blue-400", bg: "bg-blue-500/10" },
    { key: "FAILED", label: "Xato", color: "text-red-400", bg: "bg-red-500/10" },
    { key: "NO_NEWS", label: "Yangilik yo'q", color: "text-orange-400", bg: "bg-orange-500/10" },
    { key: "NO_SOURCE", label: "Sayt yo'q", color: "text-gray-400", bg: "bg-gray-500/10" },
    { key: "IDLE", label: "Kutmoqda", color: "text-gray-500", bg: "bg-gray-500/5" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {items.map(({ key, label, color, bg }) => (
        <div key={key} className={`rounded-lg ${bg} p-2 text-center`}>
          <p className={`text-lg font-bold ${color} tabular-nums`}>{byStatus[key] || 0}</p>
          <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const { toast } = useToast();

  const token = localStorage.getItem("access_token");

  const fetchLiveJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/live?limit=15`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data: LiveJob[] = await res.json();
        setJobs(data);
        setLastUpdated(new Date());
      }
    } catch {}
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchLiveJobs(), fetchStats()]).finally(() => setIsLoading(false));
  }, [fetchLiveJobs, fetchStats]);

  // 3-second live polling
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchLiveJobs();
    }, 3000);
    // Stats every 15s
    const statsInterval = setInterval(fetchStats, 15000);
    return () => { clearInterval(interval); clearInterval(statsInterval); };
  }, [isLive, fetchLiveJobs, fetchStats]);

  const handleScrapeAll = async () => {
    setIsScraping(true);
    try {
      await createScrapeJob("ALL_UNIVERSITIES");
      toast({ title: "✅ Scraping boshlandi", description: "Barcha universitetlar uchun job navbatga qo'shildi" });
      await fetchLiveJobs();
    } catch (e) {
      toast({ title: "Xato", description: String(e), variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const activeJobs = jobs.filter(j => j.status === "RUNNING" || j.status === "QUEUED");
  const recentJobs = jobs.filter(j => j.status !== "RUNNING" && j.status !== "QUEUED");

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Activity className="h-7 w-7 text-blue-400" />
              Real-time Monitor
            </h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              {isLive ? "Jonli — har 3 soniyada yangilanadi" : "To'xtatildi"}
              {lastUpdated && (
                <span className="text-gray-600">
                  · {lastUpdated.toLocaleTimeString("uz-UZ")}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLive(v => !v)}
              className={isLive ? "border-emerald-500/40 text-emerald-400" : "border-gray-600 text-gray-400"}
            >
              {isLive ? <Zap className="h-4 w-4 mr-1" /> : <StopCircle className="h-4 w-4 mr-1" />}
              {isLive ? "Jonli" : "To'xtatildi"}
            </Button>

            <Button
              onClick={handleScrapeAll}
              disabled={isScraping}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isScraping
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Qo'shilmoqda...</>
                : <><Play className="h-4 w-4 mr-2" />Barchasini Scrape</>
              }
            </Button>
          </div>
        </div>

        {/* Stats row */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={GraduationCap} label="Jami universitetlar" value={stats.totalUniversities} color="bg-violet-600" />
              <StatCard icon={Newspaper} label="Jami yangiliklar" value={stats.totalPosts} color="bg-blue-600" />
              <StatCard icon={CheckCircle2} label="Muvaffaqiyatli" value={stats.byStatus?.DONE || 0} color="bg-emerald-600" />
              <StatCard icon={XCircle} label="Xato" value={stats.byStatus?.FAILED || 0} color="bg-red-600" />
            </div>
            <UniStatusGrid byStatus={stats.byStatus || {}} />
          </div>
        )}

        {/* ACTIVE JOBS — live terminals */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h2 className="font-semibold text-white text-lg">
              Faol joblar
            </h2>
            {activeJobs.length > 0 && (
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                {activeJobs.length}
              </Badge>
            )}
          </div>

          {activeJobs.length === 0 ? (
            <div className="rounded-xl border border-white/6 bg-white/2 py-10 text-center">
              <Terminal className="h-10 w-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Hech qanday faol job yo'q</p>
              <p className="text-gray-600 text-xs mt-1">Yuqoridagi "Barchasini Scrape" tugmasi orqali boshlang</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map(job => <JobTerminal key={job.id} job={job} />)}
            </div>
          )}
        </div>

        {/* RECENT JOBS */}
        {recentJobs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-500" />
              <h2 className="font-semibold text-gray-300 text-lg">So'nggi joblar</h2>
            </div>
            <div className="space-y-2">
              {recentJobs.map(job => <JobTerminal key={job.id} job={job} />)}
            </div>
          </div>
        )}

        {jobs.length === 0 && !isLoading && (
          <div className="rounded-xl border border-white/6 bg-white/2 py-16 text-center">
            <TrendingUp className="h-12 w-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Hali hech qanday job bo'lmagan</p>
            <p className="text-gray-600 text-sm mt-1">Scraping boshlash uchun yuqoridagi tugmani bosing</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
