import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { importUniversities } from "@/lib/api";
import type { UniversityImportData } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

interface JsonUploaderProps {
  onImportComplete?: () => void;
}

export function JsonUploader({ onImportComplete }: JsonUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/json") {
      setFile(selected);
      setResult(null);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a JSON file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("JSON must be an array of universities");
      }

      const universities = data as UniversityImportData[];
      const importResult = await importUniversities(universities);
      
      setResult(importResult);

      if (importResult.imported > 0) {
        toast({
          title: "Import successful",
          description: `Imported ${importResult.imported} universities`,
        });
        onImportComplete?.();
      }

      if (importResult.errors.length > 0) {
        toast({
          title: "Some imports failed",
          description: `${importResult.errors.length} errors occurred`,
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse JSON";
      toast({
        title: "Import failed",
        description: message,
        variant: "destructive",
      });
      setResult({ imported: 0, errors: [message] });
    } finally {
      setIsUploading(false);
    }
  }, [file, toast, onImportComplete]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" />
          Import Universities
        </CardTitle>
        <CardDescription>
          Upload a JSON file containing an array of university objects. 
          Each object must have id and name_uz fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="flex-1"
          />
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>

        {file && !result && (
          <p className="text-sm text-muted-foreground">
            Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        {result && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            {result.imported > 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Successfully imported {result.imported} universities
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {result.errors.length} error(s) occurred
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.map((error, i) => (
                    <p key={i} className="text-xs text-muted-foreground pl-6">
                      • {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Expected JSON format:</p>
          <pre className="bg-muted p-2 rounded overflow-x-auto">
{`[
  {
    "id": "university_1",
    "region_id": "tashkent",
    "name_uz": "Toshkent davlat universiteti",
    "name_en": "Tashkent State University",
    "name_ru": "Ташкентский государственный университет",
    "website": "https://nuu.uz"
  }
]`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
