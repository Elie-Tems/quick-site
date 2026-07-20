import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Booking module data hooks. The booking_* tables are new (migration
 * 20260708120000) and not yet in the generated Supabase types, so table access
 * is cast to `any` and rows are typed manually here. Once the migration is
 * applied and types are regenerated, these casts can be dropped.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface BookingService {
  id: string; business_id: string; name: string; description: string | null;
  duration_minutes: number; buffer_before_minutes: number; buffer_after_minutes: number;
  price: number; deposit_type: "none" | "fixed" | "percent"; deposit_value: number;
  color: string | null; active: boolean; sort_order: number;
  min_notice_minutes: number; max_advance_days: number;
}
export interface BookingStaff {
  id: string; business_id: string; name: string; email: string | null;
  timezone: string; active: boolean;
}
export interface WorkingHour {
  id: string; business_id: string; staff_id: string;
  weekday: number; start_minute: number; end_minute: number;
}
export interface Appointment {
  id: string; business_id: string; service_id: string; staff_id: string;
  starts_at: string; ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  customer_name: string; customer_phone: string; customer_email: string | null;
  notes: string | null; price_at_booking: number; deposit_amount: number;
  deposit_status: "none" | "pending" | "paid" | "refunded";
}
export interface Blackout {
  id: string; business_id: string; staff_id: string | null;
  starts_at: string; ends_at: string; reason: string | null;
}

// ---- Merchant reads ----
export const useBookingServices = (businessId?: string) =>
  useQuery({
    queryKey: ["booking-services", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<BookingService[]> => {
      const { data, error } = await sb.from("booking_services")
        .select("*").eq("business_id", businessId).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useBookingStaff = (businessId?: string) =>
  useQuery({
    queryKey: ["booking-staff", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<BookingStaff[]> => {
      const { data, error } = await sb.from("booking_staff")
        .select("*").eq("business_id", businessId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useWorkingHours = (staffId?: string) =>
  useQuery({
    queryKey: ["booking-hours", staffId],
    enabled: !!staffId,
    queryFn: async (): Promise<WorkingHour[]> => {
      const { data, error } = await sb.from("booking_working_hours")
        .select("*").eq("staff_id", staffId).order("weekday");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAppointments = (businessId?: string, opts?: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ["booking-appointments", businessId, opts?.from, opts?.to],
    enabled: !!businessId,
    queryFn: async (): Promise<Appointment[]> => {
      let q = sb.from("booking_appointments").select("*").eq("business_id", businessId);
      if (opts?.from) q = q.gte("starts_at", opts.from);
      if (opts?.to) q = q.lte("starts_at", opts.to);
      const { data, error } = await q.order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useBlackouts = (businessId?: string) =>
  useQuery({
    queryKey: ["booking-blackouts", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<Blackout[]> => {
      const { data, error } = await sb.from("booking_blackouts")
        .select("*").eq("business_id", businessId).order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

// ---- Merchant mutations ----
export const useAddBlackout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { business_id: string; starts_at: string; ends_at: string; reason?: string | null }) => {
      const { error } = await sb.from("booking_blackouts").insert({
        business_id: v.business_id, starts_at: v.starts_at, ends_at: v.ends_at, reason: v.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["booking-blackouts", v.business_id] }),
    onError: () => toast.error("שמירת החסימה נכשלה"),
  });
};

export const useDeleteBlackout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; business_id: string }) => {
      const { error } = await sb.from("booking_blackouts").delete().eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["booking-blackouts", v.business_id] }),
    onError: () => toast.error("מחיקת החסימה נכשלה"),
  });
};

/** Ensure a business has at least one bookable staff (single-operator default). */
async function ensureDefaultStaff(businessId: string): Promise<string> {
  const { data: existing } = await sb.from("booking_staff")
    .select("id").eq("business_id", businessId).eq("active", true).limit(1);
  if (existing?.[0]?.id) return existing[0].id as string;
  const { data: biz } = await sb.from("businesses").select("name").eq("id", businessId).maybeSingle();
  const { data, error } = await sb.from("booking_staff")
    .insert({ business_id: businessId, name: biz?.name || "נותן שירות", timezone: "Asia/Jerusalem" })
    .select("id").single();
  if (error) throw error;
  return data.id as string;
}

export const useUpsertService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<BookingService> & { business_id: string }) => {
      const { data, error } = await sb.from("booking_services").upsert(s).select("id").single();
      if (error) throw error;
      // A new service must be performable by someone, else availability returns
      // nothing. Ensure a default staff exists and link the service to it.
      if (!s.id) {
        const staffId = await ensureDefaultStaff(s.business_id);
        await sb.from("booking_service_staff")
          .upsert({ service_id: data.id, staff_id: staffId, business_id: s.business_id },
            { onConflict: "service_id,staff_id" });
      }
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["booking-services", v.business_id] });
      qc.invalidateQueries({ queryKey: ["booking-staff", v.business_id] });
    },
    onError: () => toast.error("שמירת השירות נכשלה"),
  });
};

export const useDeleteService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; business_id: string }) => {
      // Remove the staff links first, then the service (no FK cascade assumed).
      await sb.from("booking_service_staff").delete().eq("service_id", id);
      const { error } = await sb.from("booking_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["booking-services", v.business_id] }),
    onError: () => toast.error("מחיקת השירות נכשלה"),
  });
};

export const useSetWorkingHours = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, businessId, rows }: {
      staffId: string; businessId: string; rows: { weekday: number; start_minute: number; end_minute: number }[];
    }) => {
      // replace-all, but insert-then-delete-old (not delete-then-insert): if the
      // insert fails, the staff member's existing hours stay intact instead of
      // being wiped with no working hours at all.
      const { data: oldRows } = await sb.from("booking_working_hours").select("id").eq("staff_id", staffId);
      if (rows.length) {
        const { error } = await sb.from("booking_working_hours")
          .insert(rows.map((r) => ({ ...r, staff_id: staffId, business_id: businessId })));
        if (error) throw error;
      }
      const oldIds = (oldRows ?? []).map((r: { id: string }) => r.id);
      if (oldIds.length) await sb.from("booking_working_hours").delete().in("id", oldIds);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["booking-hours", v.staffId] }),
    onError: () => toast.error("שמירת שעות הפעילות נכשלה"),
  });
};

export const useUpdateAppointmentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Appointment["status"] }) => {
      const { error } = await sb.from("booking_appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking-appointments"] }),
    onError: () => toast.error("עדכון סטטוס התור נכשל"),
  });
};

// ---- Storefront (public, via edge functions - server-authoritative) ----
export interface AvailabilityResult {
  serviceId: string;
  slots: string[]; // ISO
  slotsByStaff: Record<string, string[]>;
}
export const useAvailability = (params?: {
  businessId: string; serviceId: string; staffId?: string; fromDate: string; toDate: string;
}) =>
  useQuery({
    queryKey: ["availability", params],
    enabled: !!params?.businessId && !!params?.serviceId,
    queryFn: async (): Promise<AvailabilityResult> => {
      const { data, error } = await supabase.functions.invoke("booking-availability", { body: params });
      if (error) throw error;
      return data as AvailabilityResult;
    },
  });

// ---- Calendar connections (Google two-way sync) ----
export interface CalendarConnection {
  id: string; business_id: string; staff_id: string; provider: "google" | "microsoft";
  provider_account_email: string | null; status: "active" | "needs_reauth" | "revoked" | "error";
  last_synced_at: string | null;
}

export const useCalendarConnections = (businessId?: string) =>
  useQuery({
    queryKey: ["calendar-connections", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<CalendarConnection[]> => {
      const { data, error } = await sb.from("calendar_connections")
        .select("id, business_id, staff_id, provider, provider_account_email, status, last_synced_at")
        .eq("business_id", businessId);
      if (error) throw error;
      return data ?? [];
    },
  });

/** Start the Google connect flow: get a consent URL and send the merchant to it. */
export const useConnectCalendar = () =>
  useMutation({
    mutationFn: async ({ staffId }: { staffId: string }) => {
      const { data, error } = await supabase.functions.invoke("calendar-oauth-start", {
        body: { staffId, provider: "google" },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { url: string };
    },
    onSuccess: (d) => { if (d?.url) window.location.href = d.url; },
  });

export const useSyncCalendar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      const { data, error } = await supabase.functions.invoke("calendar-sync", { body: { connectionId } });
      if (error) throw error;
      return data as { ok: boolean; inbound: number; outbound: number; error?: string };
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["calendar-connections"] }),
  });
};

export const useCreateAppointment = () =>
  useMutation({
    mutationFn: async (body: {
      businessId: string; serviceId: string; staffId: string; startsAt: string;
      customer: { fullName: string; phone: string; email?: string }; notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("booking-create", { body });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { appointmentId: string; status: string; needsDeposit: boolean; depositAmount: number; cancelToken: string; paymentUrl?: string; orderId?: string };
    },
  });

/** Appointments for today (Israel time). */
export function useTodayBookings(businessId?: string) {
  const todayISO = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  return useAppointments(businessId, { from: todayISO, to: todayISO });
}

/** Count of appointments with status='pending' from today onwards. */
export function usePendingBookingsCount(businessId?: string) {
  const todayISO = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const { data: appointments = [] } = useAppointments(businessId, { from: todayISO });
  return appointments.filter((a) => a.status === "pending").length;
}
