import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2, FileJson } from "lucide-react";
import { exportNewsPosts } from "@/lib/api";
import type { ExportFilters, University } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

interface ExportPanelProps {
  universities: University[];
  regions: string[];
}

export function ExportPanel({ universities, regions }: ExportPanelProps) {
  const [filters, setFilters] = useState<ExportFilters>({});
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportNewsPosts(filters);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uzbek-universities-news-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} news posts`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" />
          Export News Posts
        </CardTitle>
        <CardDescription>
          Export all or filtered news posts as JSON. Includes university data and media assets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="university">University</Label>
            <Select 
              value={filters.university_id || "all"} 
              onValueChange={(v) => setFilters(f => ({ ...f, university_id: v === "all" ? undefined : v }))}
            >
              <SelectTrigger id="university">
                <SelectValue placeholder="All Universities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {universities.map((uni) => (
                  <SelectItem key={uni.id} value={uni.id}>
                    {uni.name_en || uni.name_uz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select 
              value={filters.region_id || "all"} 
              onValueChange={(v) => setFilters(f => ({ ...f, region_id: v === "all" ? undefined : v }))}
            >
              <SelectTrigger id="region">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">From Date</Label>
            <Input
              id="from"
              type="date"
              value={filters.from_date || ""}
              onChange={(e) => setFilters(f => ({ ...f, from_date: e.target.value || undefined }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To Date</Label>
            <Input
              id="to"
              type="date"
              value={filters.to_date || ""}
              onChange={(e) => setFilters(f => ({ ...f, to_date: e.target.value || undefined }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select 
              value={filters.language || "all"} 
              onValueChange={(v) => setFilters(f => ({ ...f, language: v === "all" ? undefined : v }))}
            >
              <SelectTrigger id="language">
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
        </div>

        <Button onClick={handleExport} disabled={isExporting} className="w-full">
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
