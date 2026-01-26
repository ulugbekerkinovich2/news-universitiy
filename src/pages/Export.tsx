import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ExportPanel } from "@/components/export/ExportPanel";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getUniversities, getRegions, getStats } from "@/lib/api";
import type { University } from "@/types/database";
import { Newspaper, GraduationCap, Download } from "lucide-react";

export default function Export() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [stats, setStats] = useState<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [uniResult, regionsData, statsData] = await Promise.all([
        getUniversities({ limit: 500 }),
        getRegions(),
        getStats()
      ]);
      setUniversities(uniResult.data);
      setRegions(regionsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <Download className="h-8 w-8" />
            Export Data
          </h1>
          <p className="mt-1 text-muted-foreground">
            Export news posts and university data as JSON
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard
              title="Universities"
              value={stats.totalUniversities}
              icon={GraduationCap}
            />
            <StatsCard
              title="Available Posts"
              value={stats.totalPosts}
              icon={Newspaper}
            />
            <StatsCard
              title="Export Format"
              value="JSON"
              icon={Download}
            />
          </div>
        )}

        {/* Export Panel */}
        <ExportPanel universities={universities} regions={regions} />
      </div>
    </Layout>
  );
}
