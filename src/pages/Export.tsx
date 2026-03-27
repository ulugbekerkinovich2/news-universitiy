import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ExportPanel } from "@/components/export/ExportPanel";
import { getUniversities, getRegions } from "@/lib/api";
import type { University } from "@/types/database";
import { Download } from "lucide-react";

export default function Export() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [uniResult, regionsData] = await Promise.all([
        getUniversities({ limit: 500 }),
        getRegions(),
      ]);
      setUniversities(uniResult.data);
      setRegions(regionsData);
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

        {/* Export Panel */}
        <ExportPanel universities={universities} regions={regions} />
      </div>
    </Layout>
  );
}
