import { useState, memo, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EditWebsiteDialog } from "./EditWebsiteDialog";
import type { University } from "@/types/database";
import { ExternalLink, Globe, RefreshCw, MapPin, Pencil, GraduationCap, Image, ArrowUpRight, ShieldAlert } from "lucide-react";
import { fmtRelative } from "@/lib/tz";
import { updateUniversityLogoFromWebsite, uploadUniversityLogo } from "@/lib/api";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { REGION_NAMES } from "@/lib/regions";

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
  const [isFetchingLogo, setIsFetchingLogo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayName = university.name_uz;
  const hasSSLError = university.last_error_message?.includes("certificate") || 
                      university.last_error_message?.includes("SSL") ||
                      university.last_error_message?.includes("fetch");
  const statusMeta = {
    IDLE: {
      helper: "Hali scrape qilinmagan. Birinchi ishga tushirish kerak.",
      primaryLabel: "Scrape boshlash",
    },
    IN_PROGRESS: {
      helper: "Jarayon ishlayapti. Natija chiqishini kuting.",
      primaryLabel: "Jarayonda",
    },
    DONE: {
      helper: "Kontent topilgan yoki mavjud postlar bilan mos tushgan.",
      primaryLabel: "Yangiliklarni ko'rish",
    },
    FAILED: {
      helper: hasSSLError ? "URL yoki sertifikat muammosi bor. Avval manbani tekshiring." : "Scrape xato bilan tugagan. Retry yoki source check kerak.",
      primaryLabel: hasSSLError ? "URL ni tuzatish" : "Retry qilish",
    },
    NO_SOURCE: {
      helper: "Website biriktirilmagan. Avval source URL qo'shing.",
      primaryLabel: "Website qo'shish",
    },
    NO_NEWS: {
      helper: "Yangilik topilmadi. Source bo'limini tekshirish yoki qayta run qilish kerak.",
      primaryLabel: "Qayta tekshirish",
    },
  }[university.scrape_status];
  
  const handleFetchLogo = async () => {
    if (!university.website) {
      toast.error("Website URL mavjud emas");
      return;
    }
    setIsFetchingLogo(true);
    try {
      await updateUniversityLogoFromWebsite(university.id, university.website);
      toast.success("Logo muvaffaqiyatli yangilandi");
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo yangilashda xatolik");
    } finally {
      setIsFetchingLogo(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm fayllarini yuklash mumkin");
      return;
    }

    setIsUploading(true);
    try {
      await uploadUniversityLogo(university.id, file);
      toast.success("Logo yuklandi!");
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fayl yuklashda xatolik");
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <>
      <Card className="card-hover overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="relative group">
              <Avatar className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 bg-background/70 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                {university.logo_url ? (
                  <AvatarImage 
                    src={university.logo_url} 
                    alt={`${displayName} logo`}
                    className="object-contain p-1"
                  />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-muted">
                  <GraduationCap className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                accept="image/*" 
                onChange={handleFileChange} 
              />

              <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-2xl bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {university.website && (
                  <button
                    onClick={handleFetchLogo}
                    disabled={isFetchingLogo || isUploading}
                    className="p-1 rounded-md hover:bg-white/20 text-white transition-colors"
                    title="Website'dan logoni olish"
                  >
                    <Image className={`h-3.5 w-3.5 ${isFetchingLogo ? 'animate-pulse' : ''}`} />
                  </button>
                )}
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isFetchingLogo}
                  className="p-1 rounded-md hover:bg-white/20 text-white transition-colors"
                  title="Kompyuterdan rasm yuklash"
                >
                  <Upload className={`h-3.5 w-3.5 ${isUploading ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/universities/${university.id}`}
                    className="group"
                  >
                    <h3 className="font-heading text-lg font-semibold text-foreground transition-colors line-clamp-2 group-hover:text-primary">
                      {displayName}
                    </h3>
                  </Link>
                  
                  {university.name_uz !== displayName && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {university.name_uz}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={university.scrape_status} size="sm" />
                  
                  {university.last_scraped_at && (
                    <span className="text-[11px] text-muted-foreground">
                      {fmtRelative(university.last_scraped_at)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {university.region_id && REGION_NAMES[university.region_id] && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {REGION_NAMES[university.region_id]}
                  </span>
                )}
                
                {university.website ? (
                  <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2.5 py-1">
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

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {statusMeta.helper}
              </p>

              {university.last_error_message && university.scrape_status === 'FAILED' && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-xs leading-5 text-destructive/90 line-clamp-2">
                    {university.last_error_message}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
            <Link 
              to={`/universities/${university.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Yangiliklarni ko'rish
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2">
              {(university.scrape_status === 'FAILED' && hasSSLError) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  {statusMeta.primaryLabel}
                </Button>
              )}

              {university.scrape_status === "NO_SOURCE" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  {statusMeta.primaryLabel}
                </Button>
              )}

              {university.scrape_status !== 'NO_SOURCE' && !((university.scrape_status === 'FAILED') && hasSSLError) && (
                <Button
                  variant={university.scrape_status === "FAILED" || university.scrape_status === "NO_NEWS" || university.scrape_status === "IDLE" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onScrape?.(university.id)}
                  disabled={isScraping || university.scrape_status === 'IN_PROGRESS'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isScraping ? 'animate-spin' : ''}`} />
                  {statusMeta.primaryLabel}
                </Button>
              )}
            </div>
          </div>
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
