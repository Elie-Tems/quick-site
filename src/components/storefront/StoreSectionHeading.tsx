const StoreSectionHeading = ({
  accent,
  title,
  subtitle,
}: {
  accent: string;
  title: string;
  subtitle?: string;
}) => (
  <div className="text-center mb-10">
    <span className="inline-block h-1 w-12 rounded-full mb-4" style={{ background: accent }} />
    <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight text-balance">
      {title}
    </h2>
    {subtitle && (
      <p className="text-muted-foreground mt-2 max-w-lg mx-auto">{subtitle}</p>
    )}
  </div>
);

export default StoreSectionHeading;
