import { useState } from "react";
import {
  Building2,
  Eye,
  ShoppingCart,
  Package,
  Trash2,
  ExternalLink,
  Search,
  AlertTriangle,
  PauseCircle,
  PlayCircle
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAllBusinesses, useDeleteBusiness } from "@/hooks/useAdmin";

const AdminBusinessesList = () => {
  const { data: businesses, isLoading } = useAllBusinesses();
  const deleteBusiness = useDeleteBusiness();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Soft-suspend toggle: take a site offline (data retained) or restore it.
  const toggleSuspend = async (biz: any) => {
    const next = !biz.is_suspended;
    await (supabase as any)
      .from('businesses')
      .update({
        is_suspended: next,
        suspended_at: next ? new Date().toISOString() : null,
        suspend_reason: next ? 'manual' : null,
      })
      .eq('id', biz.id);
    queryClient.invalidateQueries({ queryKey: ['admin-all-businesses'] });
  };

  const filteredBusinesses = businesses?.filter(biz => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      biz.name.toLowerCase().includes(query) ||
      (biz.slug && biz.slug.toLowerCase().includes(query)) ||
      (biz.email && biz.email.toLowerCase().includes(query))
    );
  });

  const handleDelete = (businessId: string) => {
    deleteBusiness.mutate(businessId);
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם, slug או אימייל..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Businesses count */}
      <p className="text-sm text-muted-foreground">
        {filteredBusinesses?.length || 0} עסקים
      </p>

      {/* Businesses list */}
      <div className="space-y-3">
        {filteredBusinesses?.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">לא נמצאו עסקים</p>
          </div>
        ) : (
          filteredBusinesses?.map((business) => (
            <div 
              key={business.id}
              className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Business info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{business.name}</h3>
                    {(business as any).is_suspended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium shrink-0">
                        מושהה
                      </span>
                    )}
                    {business.slug && (
                      <a 
                        href={`/store/${business.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        /{business.slug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {business.email && <span>{business.email}</span>}
                    {business.business_category && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded">{business.business_category}</span>
                    )}
                    <span className="text-xs">
                      נוצר: {new Date(business.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{business.products_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{business.orders_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{business.page_views_count}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {business.slug && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/store/${business.slug}`, '_blank')}
                      className="gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      צפה בחנות
                    </Button>
                  )}
                  {(business as any).is_suspended ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSuspend(business)}
                      className="gap-1.5 border-green-500/40 text-green-600 hover:bg-green-500/10"
                    >
                      <PlayCircle className="h-4 w-4" />
                      שחזר אתר
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSuspend(business)}
                      className="gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                    >
                      <PauseCircle className="h-4 w-4" />
                      השהה
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm(business.id)}
                    className="gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    מחק לצמיתות
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              מחיקת עסק
            </AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק עסק זה? פעולה זו תמחק גם את כל המוצרים, ההזמנות, הבאנרים והנתונים הקשורים. 
              <strong className="block mt-2 text-destructive">פעולה זו אינה ניתנת לביטול!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק לצמיתות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBusinessesList;
