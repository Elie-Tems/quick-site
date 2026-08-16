import StoreSectionHeading from "./StoreSectionHeading";

export type VideoStyle = "centered" | "split" | "tinted";
export type VideoPosition = "top" | "bottom";

interface StoreVideoProps {
  url: string;
  style?: VideoStyle;
  title?: string;
  accent: string;
  businessName?: string;
}

function toEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());

    // youtube.com/watch?v=ID
    if (url.hostname.includes("youtube.com") && url.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${url.searchParams.get("v")}?rel=0`;
    }
    // youtu.be/ID
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    // youtube.com/shorts/ID
    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.replace("/shorts/", "");
      return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    // vimeo.com/ID
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.replace("/", "");
      return `https://player.vimeo.com/video/${id}`;
    }
    // already an embed URL
    if (raw.includes("/embed/") || raw.includes("player.vimeo")) return raw;
  } catch {
    // ignore
  }
  return null;
}

const VideoFrame = ({ embedUrl, title }: { embedUrl: string; title?: string }) => (
  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
    <iframe
      src={embedUrl}
      title={title || "וידאו"}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="absolute inset-0 w-full h-full rounded-2xl"
      loading="lazy"
    />
  </div>
);

const StoreVideo = ({ url, style = "centered", title, accent, businessName }: StoreVideoProps) => {
  const embedUrl = toEmbedUrl(url);
  if (!embedUrl) return null;

  const heading = title || "הכירו אותנו";

  if (style === "split") {
    return (
      <section className="py-14 px-4" dir="rtl">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block h-1 w-10 rounded-full mb-4" style={{ background: accent }} />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">{heading}</h2>
            {businessName && (
              <p className="text-muted-foreground text-base leading-relaxed">
                {businessName} — לחצו לצפייה בסרטון
              </p>
            )}
          </div>
          <VideoFrame embedUrl={embedUrl} title={heading} />
        </div>
      </section>
    );
  }

  if (style === "tinted") {
    return (
      <section className="py-14 px-4" style={{ backgroundColor: `${accent}0a` }}>
        <div className="max-w-3xl mx-auto">
          <StoreSectionHeading accent={accent} title={heading} />
          <div className="shadow-lg rounded-2xl overflow-hidden">
            <VideoFrame embedUrl={embedUrl} title={heading} />
          </div>
        </div>
      </section>
    );
  }

  // centered (default)
  return (
    <section className="py-14 px-4">
      <div className="max-w-3xl mx-auto">
        <StoreSectionHeading accent={accent} title={heading} />
        <div className="rounded-2xl overflow-hidden border border-border">
          <VideoFrame embedUrl={embedUrl} title={heading} />
        </div>
      </div>
    </section>
  );
};

export default StoreVideo;
