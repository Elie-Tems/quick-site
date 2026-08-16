import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Loader2, Wand2, Check, X, ChevronDown, ChevronUp,
  Globe, EyeOff, Trash2, Plus, FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { BusinessType } from "@/lib/businessModules";

interface Topic { title: string; description: string; }
interface BlogPost { id: string; title: string; content: string; status: "draft" | "published"; created_at: string; }

interface Props {
  businessId: string;
  businessType?: BusinessType;
  businessName?: string;
  aboutText?: string;
}

async function callFn(name: string, body: object, token: string) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

const DashboardBlogPosts = ({ businessId, businessType, businessName, aboutText }: Props) => {
  const qc = useQueryClient();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isSuggestingTopics, setIsSuggestingTopics] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      const { error } = await supabase
        .from("blog_posts" as any)
        .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog-posts", businessId] }),
    onError: () => toast.error("שגיאה בעדכון סטטוס"),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts", businessId] });
      toast.success("מאמר נמחק");
    },
  });

  const saveEdit = useMutation({
    mutationFn: async (post: BlogPost) => {
      const { error } = await supabase
        .from("blog_posts" as any)
        .update({ title: post.title, content: post.content })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blog-posts", businessId] });
      setEditingPost(null);
      toast.success("נשמר");
    },
  });

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  };

  const suggestTopics = async () => {
    setIsSuggestingTopics(true);
    setTopics([]);
    setSelected(new Set());
    try {
      const token = await getToken();
      const data = await callFn("suggest-article-topics", { businessName, businessType, aboutText }, token);
      setTopics(data.topics || []);
    } catch {
      toast.error("שגיאה בהצעת נושאים");
    } finally {
      setIsSuggestingTopics(false);
    }
  };

  const writeSelected = async () => {
    if (selected.size === 0) return;
    setIsWriting(true);
    const token = await getToken();
    let written = 0;
    for (const i of selected) {
      try {
        const topic = topics[i];
        const data = await callFn("write-article", { title: topic.title, businessName, businessType, aboutText }, token);
        const { error } = await supabase.from("blog_posts" as any).insert({
          business_id: businessId,
          title: topic.title,
          content: data.content || "",
          status: "draft",
        });
        if (!error) written++;
      } catch { /* skip failed */ }
    }
    await qc.invalidateQueries({ queryKey: ["blog-posts", businessId] });
    setTopics([]);
    setSelected(new Set());
    setIsWriting(false);
    toast.success(`${written} מאמרים נכתבו ונשמרו כטיוטה`);
  };

  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Action bar */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">מאמרים</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              מאמרים מקצועיים שמחזקים אמינות ומושכים לקוחות לאתר
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={suggestTopics}
            disabled={isSuggestingTopics || isWriting}
            className="gap-1.5 shrink-0"
          >
            {isSuggestingTopics
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Wand2 className="h-3.5 w-3.5" />}
            {isSuggestingTopics ? "מחפש נושאים..." : "הצע נושאים"}
          </Button>
        </div>

        {/* Topic suggestions */}
        {topics.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-medium">בחרו נושאים לכתיבה:</p>
            {topics.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleSelect(i)}
                className={`w-full text-right rounded-xl border p-3 transition-all ${
                  selected.has(i)
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                    selected.has(i) ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}>
                    {selected.has(i) && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </div>
              </button>
            ))}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={writeSelected}
                disabled={selected.size === 0 || isWriting}
                className="flex-1 gap-2"
              >
                {isWriting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> כותב {selected.size} מאמרים...</>
                  : <><FileText className="h-4 w-4" /> כתוב {selected.size} מאמרים</>}
              </Button>
              <Button variant="outline" onClick={() => { setTopics([]); setSelected(new Set()); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 && topics.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center space-y-2">
          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-medium">אין מאמרים עדיין</p>
          <p className="text-xs text-muted-foreground">לחצו "הצע נושאים" והמערכת תכתוב עבורכם</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <div key={post.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              {editingPost?.id === post.id ? (
                /* Edit mode */
                <div className="p-4 space-y-3">
                  <Input
                    value={editingPost.title}
                    onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                    className="font-semibold"
                  />
                  <Textarea
                    value={editingPost.content}
                    onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                    rows={10}
                    className="text-sm leading-relaxed"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit.mutate(editingPost)} disabled={saveEdit.isPending} className="gap-1.5">
                      {saveEdit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      שמור
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPost(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="flex items-center gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                      className="flex-1 text-right"
                    >
                      <p className="text-sm font-semibold text-foreground">{post.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(post.created_at).toLocaleDateString("he-IL")}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        post.status === "published"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {post.status === "published" ? "פורסם" : "טיוטה"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStatus.mutate({ id: post.id, status: post.status === "published" ? "draft" : "published" })}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title={post.status === "published" ? "הסר פרסום" : "פרסם"}
                      >
                        {post.status === "published"
                          ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPost(post)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-xs text-muted-foreground"
                      >
                        ערוך
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm("למחוק את המאמר?")) deletePost.mutate(post.id); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        {expandedId === post.id
                          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  {expandedId === post.id && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3 whitespace-pre-line">
                      {post.content}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardBlogPosts;
