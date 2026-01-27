import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { JsonUploader } from "@/components/admin/JsonUploader";
import { UserManagement } from "@/components/admin/UserManagement";
import { ApiKeyManagement } from "@/components/admin/ApiKeyManagement";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStats } from "@/lib/api";
import { GraduationCap, Newspaper, Database, Settings, Users, Upload, Key } from "lucide-react";

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
            Foydalanuvchilar va universitetlarni boshqarish
          </p>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard
              title="Universitetlar"
              value={stats.totalUniversities}
              icon={GraduationCap}
            />
            <StatsCard
              title="Yangiliklar"
              value={stats.totalPosts}
              icon={Newspaper}
            />
            <StatsCard
              title="Ma'lumotlar bazasi"
              value="Ulangan"
              icon={Database}
            />
          </div>
        )}

        {/* Tabs for different admin sections */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Foydalanuvchilar</span>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeyManagement />
          </TabsContent>

          <TabsContent value="import">
            <JsonUploader onImportComplete={loadStats} />
          </TabsContent>

          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.keys(stats.byStatus).length > 0 ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Hali universitetlar import qilinmagan.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
