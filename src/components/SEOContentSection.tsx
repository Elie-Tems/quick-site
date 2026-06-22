import { Zap, Globe, TrendingUp } from "lucide-react";

const seoBlocks = [
  {
    icon: Globe,
    title: "אתר מכירתי לעסקים קטנים",
    content:
      "בניית אתר מכירתי לעסקים קטנים מאפשרת לכם להגיע ללקוחות חדשים ולהגדיל את המכירות. הפלטפורמה שלנו מציעה פתרון מהיר וזול ליצירת נוכחות דיגיטלית מקצועית.",
    gradient: "from-primary to-[hsl(280_60%_50%)]",
  },
  {
    icon: Zap,
    title: "בניית אתר מכירות מהירה",
    content:
      "עם הכלים שלנו, תוכלו לבנות אתר מכירות תוך דקות ספורות. הממשק הפשוט והאינטואיטיבי מאפשר להעלות מוצרים, להגדיר מחירים ולהתחיל לקבל הזמנות מיד.",
    gradient: "from-[hsl(280_60%_50%)] to-primary",
  },
  {
    icon: TrendingUp,
    title: "מהירות טעינה גבוהה",
    content:
      "אתרים שנבנים בפלטפורמה שלנו נטענים במהירות גבוהה במיוחד, מה שמשפר את חווית המשתמש ואת הדירוג במנועי חיפוש.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const SEOContentSection = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-30" />
      
      <div className="container relative">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
            למה אנחנו
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            בנוי להצלחה שלכם
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {seoBlocks.map((block, index) => (
            <div 
              key={index} 
              className="group relative p-8 rounded-2xl bg-card border border-border shadow-subtle hover:shadow-soft transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${block.gradient} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-soft`}>
                <block.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-xl text-foreground mb-3">
                {block.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {block.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SEOContentSection;