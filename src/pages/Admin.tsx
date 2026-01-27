import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { JsonUploader } from "@/components/admin/JsonUploader";
import { UserManagement } from "@/components/admin/UserManagement";
import { ApiKeyManagement } from "@/components/admin/ApiKeyManagement";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getStats, updateAllUniversityLogos } from "@/lib/api";
import { GraduationCap, Newspaper, Database, Settings, Users, Upload, Key, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [stats, setStats] = useState<{ totalUniversities: number; totalPosts: number; byStatus: Record<string, number> } | null>(null);
  const [isLoadingLogos, setIsLoadingLogos] = useState(false);

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

  const handleBulkLoadLogos = async () => {
    setIsLoadingLogos(true);
    try {
      const result = await updateAllUniversityLogos();
      toast.success(`${result.updated} ta universitet logosi yangilandi`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} ta xatolik yuz berdi`);
      }
    } catch (error) {
      toast.error("Logolarni yuklashda xatolik yuz berdi");
    } finally {
      setIsLoadingLogos(false);
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
            <div className="space-y-4">
              <JsonUploader onImportComplete={loadStats} />
              
              {/* Bulk Logo Loader */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Logolarni yuklash
                  </CardTitle>
                  <CardDescription>
                    Barcha universitetlar uchun websitlardan logolarni avtomatik yuklash
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleBulkLoadLogos} 
                    disabled={isLoadingLogos}
                    className="w-full sm:w-auto"
                  >
                    {isLoadingLogos ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Yuklanmoqda...
                      </>
                    ) : (
                      <>
                        <Image className="mr-2 h-4 w-4" />
                        Barcha logolarni yuklash
                      </>
                    )}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Bu jarayon bir necha daqiqa davom etishi mumkin
                  </p>
                </CardContent>
              </Card>
            </div>
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
