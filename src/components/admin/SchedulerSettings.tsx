import { useState, useEffect } from "react";
import { Clock, Save, RefreshCw, ToggleLeft, ToggleRight, Link2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const INTERVAL_OPTIONS = [
  { value: "1",  label: "Har 1 soatda" },
  { value: "2",  label: "Har 2 soatda" },
  { value: "4",  label: "Har 4 soatda" },
  { value: "6",  label: "Har 6 soatda (standart)" },
  { value: "12", label: "Har 12 soatda" },
  { value: "24", label: "Har 24 soatda (kunlik)" },
];

const MAX_LINKS_OPTIONS = [
  { value: "10", label: "10 ta (tez)" },
  { value: "20", label: "20 ta" },
  { value: "40", label: "40 ta (standart)" },
  { value: "60", label: "60 ta" },
  { value: "100", label: "100 ta (to'liq)" },
];

type Settings = {
  scrape_interval_hours: string;
  scrape_enabled: string;
  scrape_max_links: string;
};

export function SchedulerSettings() {
  const [settings, setSettings] = useState<Settings>({
    scrape_interval_hours: "6",
    scrape_enabled: "true",
    scrape_max_links: "40",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const token = localStorage.getItem("access_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    fetch(`${API_BASE}/settings`, { headers })
      .then(r => r.json())
      .then(data => setSettings(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Saqlashda xato");
      const updated = await res.json();
      setSettings(updated);
      toast.success("✅ Sozlamalar saqlandi! Workerini qayta ishga tushiring.");
    } catch {
      toast.error("Saqlashda xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  const isEnabled = settings.scrape_enabled === "true";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm text-amber-300">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Vaqtni o'zgartirganingizdan so'ng <strong>Celery workerini qayta ishga tushiring</strong>:
          <code className="ml-1 px-1.5 py-0.5 rounded bg-black/30 font-mono text-xs">./start_worker.sh</code>
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isEnabled ? "bg-emerald-500/15" : "bg-gray-500/15"}`}>
            {isEnabled
              ? <ToggleRight className="h-5 w-5 text-emerald-400" />
              : <ToggleLeft className="h-5 w-5 text-gray-400" />
            }
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Avtomatik scraping</p>
            <p className="text-xs text-muted-foreground">Belgilangan vaqtda universitetlarni avtomatik scrape qilish</p>
          </div>
        </div>
        <button
          onClick={() => setSettings(s => ({
            ...s,
            scrape_enabled: s.scrape_enabled === "true" ? "false" : "true"
          }))}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
            isEnabled ? "bg-emerald-500" : "bg-gray-600"
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            isEnabled ? "translate-x-7" : "translate-x-1"
          }`} />
        </button>
      </div>

      {/* Interval picker */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="font-medium text-foreground text-sm">Scraping vaqti</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INTERVAL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSettings(s => ({ ...s, scrape_interval_hours: opt.value }))}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                settings.scrape_interval_hours === opt.value
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-white/20"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Hozirgi: <span className="text-foreground font-medium">har {settings.scrape_interval_hours} soatda</span>
        </p>
      </div>

      {/* Max links picker */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <p className="font-medium text-foreground text-sm">Har bir universitetdan maksimal maqolalar</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {MAX_LINKS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSettings(s => ({ ...s, scrape_max_links: opt.value }))}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                settings.scrape_max_links === opt.value
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-white/20"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving
          ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saqlanmoqda...</>
          : <><Save className="h-4 w-4" /> Sozlamalarni saqlash</>
        }
      </button>
    </div>
  );
}
