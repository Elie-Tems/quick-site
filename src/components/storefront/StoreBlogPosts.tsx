import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StoreSectionHeading from "./StoreSectionHeading";
import { X } from "lucide-react";

interface BlogPost { id: string; title: string; content: string; published_at: string; image_url?: string | null; }

const StoreBlogPosts = ({ businessId, accent }: { businessId: string; accent: string }) => {
  const [open, setOpen] = useState<BlogPost | null>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["blog-posts-public", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("id, title, content, published_at, image_url")
        .eq("business_id", businessId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
  });

  if (posts.length === 0) return null;

  const preview = (content: string) =>
    content.replace(/\n/g, " ").slice(0, 120) + (content.length > 120 ? "..." : "");

  return (
    <section className="py-14 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <StoreSectionHeading accent={accent} title="מאמרים ותוכן מקצועי" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(post => (
            <button
              key={post.id}
              type="button"
              onClick={() => setOpen(post)}
              className="text-right rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-5 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(post.published_at).toLocaleDateString("he-IL")}
                </p>
                <h3 className="font-semibold text-foreground leading-snug">{post.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{preview(post.content)}</p>
                <p className="text-xs font-medium" style={{ color: accent }}>קרא עוד ←</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Article modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-start gap-3">
              <h2 className="flex-1 text-base font-bold text-foreground leading-snug">{open.title}</h2>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="p-1.5 rounded-xl hover:bg-muted transition-colors shrink-0"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-foreground leading-relaxed whitespace-pre-line">
              {open.content}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default StoreBlogPosts;
