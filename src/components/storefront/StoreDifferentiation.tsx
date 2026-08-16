import { useLanguage } from "@/contexts/LanguageContext";

interface DifferentiationItem {
  icon?: string;
  title: string;
  body: string;
}

interface DifferentiationData {
  heading?: string;
  subheading?: string;
  items?: DifferentiationItem[];
}

const StoreDifferentiation = ({
  data,
  accent,
}: {
  data: DifferentiationData | null | undefined;
  accent: string;
}) => {
  const { t } = useLanguage();
  if (!data?.items?.length) return null;
  return (
    <section className="py-14 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block h-1 w-12 rounded-full mb-4" style={{ background: accent }} />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {data.heading || t("store.differentiation.defaultHeading")}
          </h2>
          {data.subheading && (
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">{data.subheading}</p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 items-stretch">
          {data.items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-card p-6 text-center space-y-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              style={{ borderColor: `${accent}28` }}
            >
              {item.icon && (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-2xl"
                  style={{ background: `${accent}15` }}
                >
                  {item.icon}
                </div>
              )}
              <h3 className="font-bold text-foreground text-base">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoreDifferentiation;
