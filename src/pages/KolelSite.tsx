import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Heart, BookOpen, Image, Phone, Mail, MapPin, ScrollText, Newspaper } from "lucide-react";
import DonationWidget from "@/components/storefront/DonationWidget";

/**
 * Public site for kolel / yeshiva (כולל / ישיבה).
 * Shows: hero + story, about/rosh kolel word, gallery, Torah articles, donation CTA.
 * Route: /kolel/:slug
 */

interface KolelFeatures {
  rosh_message?: boolean;
  gallery?: boolean;
  shiurim?: boolean;
  youtube_url?: string;
  parasha?: boolean;
  newsletter?: boolean;
  newsletter_name?: string;
  events?: boolean;
  ask_rabbi?: boolean;
}

interface Biz {
  id: string;
  name: string;
  tagline: string | null;
  about_text: string | null;
  logo: string | null;
  hero_image_url: string | null;
  primary_color: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  content_sections: ContentSection[] | null;
  gallery_images: GalleryImage[] | null;
  enabled_features: KolelFeatures | null;
}

interface ContentSection {
  id: string;
  title: string;
  body: string;
  type?: string;
}

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

const KolelSite = () => {
  const { slug } = useParams();
  const [biz, setBiz] = useState<Biz | null>(null);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id, name, tagline, about_text, logo, hero_image_url, primary_color, phone, email, address, content_sections, gallery_images, enabled_features")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      setBiz(data);
      setLoading(false);
      if (data?.name) document.title = data.name;
    };
    load();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50" dir="rtl">
      <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
    </div>
  );

  if (!biz) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50" dir="rtl">
      <p className="text-stone-500">האתר לא נמצא</p>
    </div>
  );

  const primary = biz.primary_color || "#5c4a2a";
  const f = biz.enabled_features || {};
  // If enabled_features is empty (old record / no features set), show everything by default
  const noConfig = Object.keys(f).length === 0;
  const show = (key: keyof KolelFeatures) => noConfig || !!f[key];

  const articles = (biz.content_sections || []).filter(s => s.type === "article" || !s.type);
  const gallery = biz.gallery_images || [];
  const roshSection = (biz.content_sections || []).find(s => s.type === "rosh_message");

  return (
    <div className="min-h-screen bg-stone-50 font-sans" dir="rtl">

      {/* Hero */}
      <section
        className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6"
        style={{
          background: biz.hero_image_url
            ? `linear-gradient(to bottom, rgba(30,20,10,0.55) 0%, rgba(30,20,10,0.75) 100%), url(${biz.hero_image_url}) center/cover`
            : `linear-gradient(135deg, ${primary}cc, #2c1a0e)`,
        }}
      >
        {biz.logo && (
          <img src={biz.logo} alt={biz.name} className="w-20 h-20 object-contain rounded-full border-2 border-white/30 mb-5 bg-white/10" />
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-3">{biz.name}</h1>
        {biz.tagline && <p className="text-lg text-white/80 max-w-xl">{biz.tagline}</p>}
        <button
          onClick={() => setDonating(true)}
          className="mt-8 px-8 py-3.5 rounded-full text-white font-semibold text-lg shadow-lg transition-opacity hover:opacity-90"
          style={{ background: primary }}
        >
          <Heart className="inline w-5 h-5 ml-2" />
          לתרומה ותמיכה
        </button>
      </section>

      {/* About / Story — always shown */}
      {biz.about_text && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-stone-800 mb-5 flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: primary }} />
            אודות המוסד
          </h2>
          <p className="text-stone-600 text-lg leading-relaxed whitespace-pre-line">{biz.about_text}</p>
        </section>
      )}

      {/* Rosh message */}
      {show("rosh_message") && roshSection && (
        <section className="bg-stone-100 py-14 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
              <ScrollText className="w-6 h-6" style={{ color: primary }} />
              {roshSection.title || "דבר ראש הישיבה"}
            </h2>
            <blockquote className="text-stone-700 text-lg leading-relaxed whitespace-pre-line border-r-4 pr-5" style={{ borderColor: primary }}>
              {roshSection.body}
            </blockquote>
          </div>
        </section>
      )}

      {/* Gallery */}
      {show("gallery") && gallery.length > 0 && (
        <section className="bg-stone-100 py-14 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-800 mb-8 flex items-center gap-2">
              <Image className="w-6 h-6" style={{ color: primary }} />
              גלריה
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.map((img) => (
                <div key={img.id} className="rounded-xl overflow-hidden aspect-square">
                  <img src={img.url} alt={img.caption || ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Shiurim / YouTube */}
      {show("shiurim") && f.youtube_url && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: primary }} />
            שיעורי תורה
          </h2>
          <a
            href={f.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 hover:shadow-md transition-shadow text-stone-800 font-medium"
          >
            <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
            לערוץ השיעורים שלנו ביוטיוב
          </a>
        </section>
      )}

      {/* Newsletter signup */}
      {show("newsletter") && (
        <section className="py-12 px-6" style={{ background: `${primary}0d` }}>
          <div className="max-w-xl mx-auto text-center">
            <Newspaper className="w-8 h-8 mx-auto mb-3" style={{ color: primary }} />
            <h2 className="text-xl font-bold text-stone-800 mb-1">
              {f.newsletter_name || "הירשמו לניוזלטר השבועי"}
            </h2>
            <p className="text-stone-500 text-sm mb-5">קבלו פרשת שבוע ועדכונים מהמוסד ישירות למייל</p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="כתובת המייל שלך"
                dir="ltr"
                className="flex-1 h-10 px-3 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 bg-white"
                style={{ "--tw-ring-color": primary } as React.CSSProperties}
              />
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold shrink-0"
                style={{ background: primary }}
              >
                הרשמה
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Torah articles / shiurim text */}
      {show("shiurim") && articles.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-stone-800 mb-8 flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: primary }} />
            תוכן תורני
          </h2>
          <div className="space-y-8">
            {articles.map((a) => (
              <article key={a.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                <h3 className="text-xl font-bold text-stone-800 mb-3">{a.title}</h3>
                <p className="text-stone-600 leading-relaxed whitespace-pre-line">{a.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Donation CTA */}
      <section className="py-16 px-6 text-center" style={{ background: `${primary}11` }}>
        <div className="max-w-xl mx-auto">
          <Heart className="w-10 h-10 mx-auto mb-4" style={{ color: primary }} />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">תמכו במוסד</h2>
          <p className="text-stone-600 mb-6">כל תרומה מחזקת את לומדי התורה ומאפשרת המשך הפעילות</p>
          <button
            onClick={() => setDonating(true)}
            className="px-10 py-3.5 rounded-full text-white font-semibold text-lg shadow-md transition-opacity hover:opacity-90"
            style={{ background: primary }}
          >
            לתרומה עכשיו
          </button>
        </div>
      </section>

      {/* Contact */}
      {(biz.phone || biz.email || biz.address) && (
        <section className="bg-stone-800 text-white py-10 px-6">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-6 justify-center text-sm">
            {biz.phone && (
              <a href={`tel:${biz.phone}`} className="flex items-center gap-2 hover:opacity-75">
                <Phone className="w-4 h-4" /> {biz.phone}
              </a>
            )}
            {biz.email && (
              <a href={`mailto:${biz.email}`} className="flex items-center gap-2 hover:opacity-75">
                <Mail className="w-4 h-4" /> {biz.email}
              </a>
            )}
            {biz.address && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {biz.address}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Donation modal */}
      {donating && (
        <DonationWidget businessId={biz.id} businessName={biz.name} onClose={() => setDonating(false)} />
      )}
    </div>
  );
};

export default KolelSite;
