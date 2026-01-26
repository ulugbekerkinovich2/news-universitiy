import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsPost } from "@/lib/api";
import type { NewsPost } from "@/types/database";
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  Building2,
  Newspaper,
  Image as ImageIcon,
  Video
} from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";

const languageLabels: Record<string, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
  unknown: "Unknown",
};

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    setIsLoading(true);
    try {
      const data = await getNewsPost(id!);
      setPost(data);
    } catch (error) {
      console.error("Failed to load post:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <EmptyState
          icon={Newspaper}
          title="News post not found"
          description="The news post you're looking for doesn't exist."
          action={
            <Link to="/news">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to News
              </Button>
            </Link>
          }
        />
      </Layout>
    );
  }

  const images = post.media_assets?.filter(m => m.type === 'image') || [];
  const videos = post.media_assets?.filter(m => m.type === 'video') || [];

  const sanitizedHtml = post.content_html 
    ? DOMPurify.sanitize(post.content_html, { USE_PROFILES: { html: true } })
    : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link 
          to="/news" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to News
        </Link>

        <article className="space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {post.published_at && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(post.published_at), "MMMM d, yyyy")}
                </span>
              )}

              {post.university && (
                <Link
                  to={`/universities/${post.university_id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  {post.university.name_en || post.university.name_uz}
                </Link>
              )}

              <Badge variant="secondary">
                {languageLabels[post.language] || post.language}
              </Badge>
            </div>

            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground text-balance">
              {post.title}
            </h1>

            {post.summary && (
              <p className="text-lg text-muted-foreground leading-relaxed">
                {post.summary}
              </p>
            )}
          </header>

          {/* Content */}
          {sanitizedHtml ? (
            <div 
              className="article-content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : post.content_text ? (
            <div className="prose prose-slate max-w-none">
              {post.content_text.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {/* Image Gallery */}
          {images.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="flex items-center gap-2 font-semibold mb-4">
                  <ImageIcon className="h-4 w-4" />
                  Images ({images.length})
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {images.map((img) => (
                    <a
                      key={img.id}
                      href={img.stored_url || img.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={img.stored_url || img.original_url}
                        alt=""
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Links */}
          {videos.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="flex items-center gap-2 font-semibold mb-4">
                  <Video className="h-4 w-4" />
                  Videos ({videos.length})
                </h3>
                <div className="space-y-3">
                  {videos.map((video) => {
                    const isYouTube = video.provider === 'youtube' || video.original_url.includes('youtube.com') || video.original_url.includes('youtu.be');
                    const isVimeo = video.provider === 'vimeo' || video.original_url.includes('vimeo.com');

                    if (isYouTube) {
                      const videoId = video.original_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                      if (videoId) {
                        return (
                          <div key={video.id} className="aspect-video rounded-lg overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}`}
                              className="w-full h-full"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          </div>
                        );
                      }
                    }

                    return (
                      <a
                        key={video.id}
                        href={video.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate text-sm">{video.original_url}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source Link */}
          <div className="pt-6 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {post.canonical_url && post.canonical_url !== post.source_url && (
                <p>Canonical: {post.canonical_url}</p>
              )}
            </div>
            <a
              href={post.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original Source
              </Button>
            </a>
          </div>
        </article>
      </div>
    </Layout>
  );
}
