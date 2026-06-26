import DashboardWhatsApp from "@/components/dashboard/DashboardWhatsApp";

/**
 * Super-admin management of Siango's OWN WhatsApp bot (the company bot merchants
 * talk to for support + managing their store). Reuses the full WhatsApp
 * workspace (chat inbox / AI bot / templates / settings) in platform mode.
 * BUILD-ONLY: WhatsApp stays unpublished until Moti approves.
 */
const AdminWhatsAppBot = () => <DashboardWhatsApp platformBot />;

export default AdminWhatsAppBot;
