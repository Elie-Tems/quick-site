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
    <section className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-5">
          <span className="inline-block h-1 w-12 rounded-full mb-3" style={{ background: accent }} />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {data.heading || t("store.differentiation.defaultHeading")}
          </h2>
          {data.subheading && (
            <p className="text-muted-foreground mt-1.5">{data.subheading}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {data.items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-card p-5 text-center space-y-2"
              style={{ borderColor: `${accent}33` }}
            >
              {item.icon && (
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto text-xl"
                  style={{ background: `${accent}18` }}
                >
                  {item.icon}
                </div>
              )}
              <h3 className="font-bold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoreDifferentiation;
