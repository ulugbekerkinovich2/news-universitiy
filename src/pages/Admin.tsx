import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { JsonUploader } from "@/components/admin/JsonUploader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStats, getUniversities } from "@/lib/api";
import { GraduationCap, Newspaper, Database, Settings } from "lucide-react";

export default function Admin() {
  const [stats, setStats] = useState<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Admin Panel
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage universities and configure the aggregator
          </p>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard
              title="Universities"
              value={stats.totalUniversities}
              icon={GraduationCap}
            />
            <StatsCard
              title="News Posts"
              value={stats.totalPosts}
              icon={Newspaper}
            />
            <StatsCard
              title="Database Status"
              value="Connected"
              icon={Database}
            />
          </div>
        )}

        {/* Import Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <JsonUploader onImportComplete={loadStats} />

          <Card>
            <CardHeader>
              <CardTitle>Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-3">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">
                        {status.replace('_', ' ').toLowerCase()}
                      </span>
                      <span className="font-mono font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!stats || Object.keys(stats.byStatus).length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No universities imported yet. Use the uploader to import your JSON file.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
