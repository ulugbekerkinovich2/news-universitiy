import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { NewsPost } from "@/types/database";
import { Calendar, ExternalLink, Building2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { deleteNewsPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface NewsCardProps {
  post: NewsPost;
  showUniversity?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
}

const languageLabels: Record<string, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
  unknown: "Unknown",
};

export function NewsCard({ post, showUniversity = true, showDelete = false, onDelete }: NewsCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const coverImage = post.cover_image?.original_url || post.cover_image?.stored_url;
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNewsPost(post.id);
      toast({
        title: "Post o'chirildi",
        description: "Yangilik muvaffaqiyatli o'chirildi",
      });
      onDelete?.();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Post o'chirishda xatolik",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {/* Cover Image */}
          {coverImage && !imageError ? (
            <div className="w-32 sm:w-40 shrink-0">
              <img
                src={coverImage}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            </div>
          ) : null}
          
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link to={`/news/${post.id}`} className="group">
                  <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                </Link>

                {post.summary && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {post.summary}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {post.published_at && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.published_at), "MMM d, yyyy")}
                    </span>
                  )}

                  {showUniversity && post.university && (
                    <Link
                      to={`/universities/${post.university_id}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Building2 className="h-3 w-3" />
                      {post.university.name_uz}
                    </Link>
                  )}

                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {languageLabels[post.language] || post.language}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Link
                to={`/news/${post.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Batafsil →
              </Link>

              <div className="flex items-center gap-2">
                {showDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Postni o'chirish</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ushbu yangilikni o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          O'chirish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Original
                </a>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
