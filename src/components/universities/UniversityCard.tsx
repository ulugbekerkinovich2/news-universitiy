import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EditWebsiteDialog } from "./EditWebsiteDialog";
import type { University } from "@/types/database";
import { ExternalLink, Globe, RefreshCw, MapPin, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UniversityCardProps {
  university: University;
  onScrape?: (id: string) => void;
  isScraping?: boolean;
  onUpdate?: () => void;
}

export const UniversityCard = memo(function UniversityCard({ 
  university, 
  onScrape, 
  isScraping, 
  onUpdate 
}: UniversityCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const displayName = university.name_en || university.name_uz;
  const hasSSLError = university.last_error_message?.includes("certificate") || 
                      university.last_error_message?.includes("SSL") ||
                      university.last_error_message?.includes("fetch");
  
  return (
    <>
      <Card className="card-hover overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link 
                to={`/universities/${university.id}`}
                className="group"
              >
                <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {displayName}
                </h3>
              </Link>
              
              {university.name_uz !== displayName && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {university.name_uz}
                </p>
              )}

              <div className="flex items-center gap-3 mt-3">
                {university.region_id && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {university.region_id}
                  </span>
                )}
                
                {university.website ? (
                  <div className="flex items-center gap-1">
                    <a
                      href={university.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">
                        {new URL(university.website).hostname}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => setEditOpen(true)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Edit website"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    Add website
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={university.scrape_status} size="sm" />
              
              {university.last_scraped_at && (
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(university.last_scraped_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Link 
              to={`/universities/${university.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View News →
            </Link>

            <div className="flex items-center gap-2">
              {(university.scrape_status === 'FAILED' && hasSSLError) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Fix URL
                </Button>
              )}
              
              {university.scrape_status !== 'NO_SOURCE' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onScrape?.(university.id)}
                  disabled={isScraping || university.scrape_status === 'IN_PROGRESS'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isScraping ? 'animate-spin' : ''}`} />
                  {university.scrape_status === 'FAILED' ? 'Retry' : 'Scrape'}
                </Button>
              )}
            </div>
          </div>

          {university.last_error_message && university.scrape_status === 'FAILED' && (
            <p className="mt-3 text-xs text-destructive bg-destructive/10 rounded-md p-2 line-clamp-2">
              {university.last_error_message}
            </p>
          )}
        </CardContent>
      </Card>

      <EditWebsiteDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        universityId={university.id}
        universityName={displayName}
        currentWebsite={university.website}
        errorMessage={university.scrape_status === 'FAILED' ? university.last_error_message : null}
        onSuccess={() => onUpdate?.()}
      />
    </>
  );
});
