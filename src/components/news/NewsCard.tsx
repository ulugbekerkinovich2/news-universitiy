import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NewsPost } from "@/types/database";
import { Calendar, ExternalLink, Building2, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface NewsCardProps {
  post: NewsPost;
  showUniversity?: boolean;
}

const languageLabels: Record<string, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
  unknown: "Unknown",
};

export function NewsCard({ post, showUniversity = true }: NewsCardProps) {
  const [imageError, setImageError] = useState(false);
  const coverImage = post.cover_image?.original_url || post.cover_image?.stored_url;
  
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
                      {post.university.name_en || post.university.name_uz}
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
                Read More →
              </Link>

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
      </CardContent>
    </Card>
  );
}
