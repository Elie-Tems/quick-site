// Settle a paid order EXACTLY once and send the order emails. Shared by the IPN
// callback (payments-callback) AND the on-return confirm endpoint (payments-confirm)
// so a missing/late gateway IPN never loses the sale, the paid status, or the emails.
// The flip pending->paid is atomic (compare-and-set), so two concurrent settlers
// (IPN + return) can't both mark paid or double-send emails.

import { emailItemsTable } from "../email/rtlEmail.ts";
import { sendViaResend } from "../email/resend.ts";
import { sendLifecycleEmail } from "../email/lifecycle.ts";
import { newOrderMerchant } from "../email/platformEmails.ts";

// deno-lint-ignore no-explicit-any
export async function settlePaidOrder(admin: any, orderId: string, transactionUid: string | null): Promise<{ settled: boolean; alreadyPaid?: boolean; notFound?: boolean }> {
  const nowIso = new Date().toISOString();
  const { data: order } = await admin.from("orders")
    .select("id, business_id, payment_status, customer_name, customer_email, total_price")
    .eq("id", orderId).maybeSingle();
  if (!order) return { settled: false, notFound: true };
  if (order.payment_status === "paid") return { settled: false, alreadyPaid: true };

  // Atomic claim: only the settler that flips pending->paid proceeds to send emails.
  const { data: flipped } = await admin.from("orders")
    .update({ payment_status: "paid", paid_at: nowIso, payment_transaction_uid: transactionUid, updated_at: nowIso })
    .eq("id", order.id).eq("payment_status", "pending").select("id");
  if (!flipped || !flipped.length) return { settled: false, alreadyPaid: true };

  await admin.from("payments").update({ status: "success", provider_transaction_id: transactionUid, updated_at: nowIso }).eq("order_id", order.id);

  // Count the coupon use now that the payment is confirmed.
  const { data: payRow } = await admin.from("payments").select("metadata").eq("order_id", order.id).maybeSingle();
  const couponId = (payRow?.metadata as Record<string, unknown> | null)?.coupon_id as string | undefined;
  if (couponId) {
    const { data: cpn } = await admin.from("coupons").select("id, current_uses").eq("id", couponId).maybeSingle();
    if (cpn) {
      await admin.from("coupons").update({ current_uses: Number(cpn.current_uses) + 1 })
        .eq("id", cpn.id).eq("current_uses", Number(cpn.current_uses));
    }
  }

  // Order emails (best-effort - never fail the settlement over an email).
  try {
    const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
    const { data: biz } = await admin.from("businesses").select("name, email, slug").eq("id", order.business_id).maybeSingle();
    const { data: items } = await admin.from("order_items").select("product_name, quantity, price_at_order").eq("order_id", order.id);
    const total = Number(order.total_price) || 0;
    const merchantEmail = (biz as { email?: string } | null)?.email;
    if (merchantEmail && biz) {
      const mail = newOrderMerchant({ businessName: biz.name, amountIls: total, dashboardUrl: `${siteUrl}/dashboard`, recipientEmail: merchantEmail });
      await sendViaResend({ to: merchantEmail, subject: mail.subject, html: mail.html, fromName: "Siango" })
        .catch((e) => console.warn("settle: merchant email failed:", e));
    }
    if (order.customer_email) {
      const itemsHtml = emailItemsTable((items || []).map((it: Record<string, unknown>) => ({ name: String(it.product_name), quantity: Number(it.quantity), price: Number(it.price_at_order) })), total);
      await sendLifecycleEmail(admin, {
        businessId: order.business_id, key: "order_confirm", to: order.customer_email, name: order.customer_name,
        extraHtml: itemsHtml,
        buttonUrl: (biz as { slug?: string } | null)?.slug ? `${siteUrl}/store/${(biz as { slug?: string }).slug}` : undefined,
      }).catch((e) => console.warn("settle: customer email failed:", e));
    }
  } catch (e) {
    console.warn("settle: order emails failed:", e);
  }
  return { settled: true };
}
