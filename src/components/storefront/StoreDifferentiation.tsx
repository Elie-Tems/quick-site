import { useLanguage } from "@/contexts/LanguageContext";
import StoreSectionHeading from "./StoreSectionHeading";

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
        <StoreSectionHeading
          accent={accent}
          title={data.heading || t("store.differentiation.defaultHeading")}
          subtitle={data.subheading}
        />
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
