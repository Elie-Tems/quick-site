import { motion } from "framer-motion";
import { ShoppingBag, Gem, Laptop, Gift, Home, Eye, ArrowLeft, ArrowRight, Filter, Search, Star, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const AllTemplates = () => {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const [selectedCategory, setSelectedCategory] = useState("הכל");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelectTemplate = (templateId: number, templateTitle: string) => {
    localStorage.setItem('selectedTemplateId', templateId.toString());
    localStorage.setItem('selectedTemplateTitle', templateTitle);
    navigate('/register');
  };

  const allTemplates = [
    {
      id: 1,
      title: "אופנה וביגוד",
      subtitle: "Fashion",
      description: "תבניות מודרניות לחנויות אופנה, מותגי ביגוד ואביזרים",
      icon: ShoppingBag,
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
      category: "אופנה",
      color: "from-pink-500 to-purple-600",
      features: ["גלריית מוצרים", "סינון לפי גודל", "מבצעים מיוחדים"],
      popularity: "פופולרי ביותר",
      rating: 4.9,
      reviews: 234
    },
    {
      id: 2,
      title: "תכשיטים ואביזרים",
      subtitle: "Jewelry",
      description: "עיצובים יוקרתיים לחנויות תכשיטים ואביזרים יוקרתיים",
      icon: Gem,
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80",
      category: "יוקרה",
      color: "from-amber-500 to-yellow-600",
      features: ["תצוגת תכשיטים", "מידות וחומרים", "עיצוב אלגנטי"],
      popularity: "ביקוש גבוה",
      rating: 4.8,
      reviews: 189
    },
    {
      id: 3,
      title: "אלקטרוניקה וגאדג'טים",
      subtitle: "Electronics",
      description: "תבניות טכנולוגיות לחנויות אלקטרוניקה ומוצרים דיגיטליים",
      icon: Laptop,
      image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
      category: "טכנולוגיה",
      color: "from-cyan-500 to-blue-600",
      features: ["מפרטים טכניים", "השוואת מוצרים", "חוות דעת"],
      popularity: "חדש",
      rating: 4.7,
      reviews: 156
    },
    {
      id: 4,
      title: "מתנות וסובנירים",
      subtitle: "Gifts",
      description: "עיצובים חמים ומזמינים לחנויות מתנות ומזכרות",
      icon: Gift,
      image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80",
      category: "מתנות",
      color: "from-rose-500 to-red-600",
      features: ["אריזת מתנות", "הקדשות אישיות", "קטגוריות לפי אירוע"],
      popularity: "מומלץ",
      rating: 4.6,
      reviews: 98
    },
    {
      id: 5,
      title: "ריהוט ועיצוב הבית",
      subtitle: "Home",
      description: "תבניות אלגנטיות לחנויות ריהוט ומוצרי עיצוב לבית",
      icon: Home,
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
      category: "בית",
      color: "from-emerald-500 to-teal-600",
      features: ["תלת-ממד וירטואלי", "חדר השרדה", "קטלוג מוצרים"],
      popularity: "טרנד",
      rating: 4.8,
      reviews: 267
    },
    {
      id: 6,
      title: "מזון ומשקאות",
      subtitle: "Food & Beverage",
      description: "תבניות טעימות למסעדות, בתי קפה וחנויות מזון",
      icon: ShoppingBag,
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
      category: "מזון",
      color: "from-orange-500 to-red-600",
      features: ["תפריט דיגיטלי", "הזמנות אונליין", "משלוחים"],
      popularity: "חם",
      rating: 4.5,
      reviews: 143
    },
    // תבניות נוספות
    {
      id: 7,
      title: "בריאות וטיפוח",
      subtitle: "Health & Beauty",
      description: "תבניות מודרניות למוצרי בריאות, טיפוח וספא",
      icon: ShoppingBag,
      image: "https://images.unsplash.com/photo-1570172619644-dfd40ed54724?w=600&q=80",
      category: "בריאות",
      color: "from-green-500 to-emerald-600",
      features: ["תמונות לפני/אחרי", "המלצות לקוחות", "מבצעים עונתיים"],
      popularity: "פופולרי",
      rating: 4.7,
      reviews: 198
    },
    {
      id: 8,
      title: "ספורט וכושר",
      subtitle: "Sports & Fitness",
      description: "תבניות דינמיות לציוד ספורט, ביגוד כושר ותוספי תזונה",
      icon: ShoppingBag,
      image: "https://ytqgeoviokgxxwalieev.supabase.co/storage/v1/object/public/business-assets/e60718e9-5f21-41ce-82d9-d779b5abbb24/branding/hero-ai-1774263454095.png?t=1774263454095",
      category: "ספורט",
      color: "from-blue-500 to-indigo-600",
      features: ["מדריכי שימוש", "סרטוני תרגילים", "תוכניות אימון"],
      popularity: "עולה",
      rating: 4.6,
      reviews: 87
    },
    {
      id: 9,
      title: "צעצועים ומשחקים",
      subtitle: "Toys & Games",
      description: "תבניות צבעוניות ומהנות לחנויות צעצועים ומשחקים",
      icon: Gift,
      image: "https://images.unsplash.com/photo-1578972947858-3c9b4b2bfb3c?w=600&q=80",
      category: "ילדים",
      color: "from-purple-500 to-pink-600",
      features: ["סינון לפי גיל", "דירוג בטיחות", "המלצות הורים"],
      popularity: "מומלץ",
      rating: 4.8,
      reviews: 234
    },
    {
      id: 10,
      title: "ספרים ומדיה",
      subtitle: "Books & Media",
      description: "תבניות אינטלקטואליות לחנויות ספרים, מוזיקה וסרטים",
      icon: ShoppingBag,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
      category: "תרבות",
      color: "from-indigo-500 to-purple-600",
      features: ["תצוגה מקדימה", "ביקורות קוראים", "המלצות אישיות"],
      popularity: "ייחודי",
      rating: 4.5,
      reviews: 76
    },
    {
      id: 11,
      title: "חיות מחמד",
      subtitle: "Pet Supplies",
      description: "תבניות חמות למוצרים לחיות מחמד וציוד נלווה",
      icon: Home,
      image: "https://images.unsplash.com/photo-1601758228041-fcc9175d4083?w=600&q=80",
      category: "חיות",
      color: "from-yellow-500 to-orange-600",
      features: ["מדריכי טיפול", "גדלים ומשקל", "תזונה מומלצת"],
      popularity: "אהוב",
      rating: 4.9,
      reviews: 312
    },
    {
      id: 12,
      title: "גינון וחצר",
      subtitle: "Garden & Outdoor",
      description: "תבניות טבעיות למוצרי גינון, ריהוט חצר וציוד פנאי",
      icon: Home,
      image: "https://images.unsplash.com/photo-1585859668311-b67b9615b6be?w=600&q=80",
      category: "גינון",
      color: "from-green-500 to-lime-600",
      features: ["מדריכי גינון", "עונות זריעה", "טיפים לטיפול"],
      popularity: "עונתי",
      rating: 4.4,
      reviews: 65
    }
  ];

  const categories = ["הכל", "אופנה", "יוקרה", "טכנולוגיה", "מתנות", "בית", "מזון", "בריאות", "ספורט", "ילדים", "תרבות", "חיות", "גינון"];

  const filteredTemplates = allTemplates.filter(template => {
    const matchesCategory = selectedCategory === "הכל" || template.category === selectedCategory;
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <SEOHead />
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary/3 rounded-full blur-2xl" />
          </div>
          
          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Eye className="w-4 h-4" />
                כל התבניות שלנו
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                גלו את התבנית המושלמת
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">לעסק שלכם</span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                יותר מ-50 תבניות מעוצבות מקצועית במגוון תחומים. מותאמות למכירות מקסימליות וחוויית לקוח מעולה.
              </p>

              {/* Search and Filter */}
              <div className="max-w-2xl mx-auto mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="חיפוש תבניות..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <Button variant="outline" className="sm:hidden">
                    <Filter className="w-4 h-4" />
                    סינון
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Categories Filter */}
        <section className="py-8 border-b border-gray-100">
          <div className="container">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-primary text-white" : "border-gray-200"}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Templates Grid */}
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <p className="text-gray-600">
                נמצאו {filteredTemplates.length} תבניות
                {selectedCategory !== "הכל" && ` בקטגוריית "${selectedCategory}"`}
                {searchTerm && ` עבור "${searchTerm}"`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  className="group relative"
                >
                  <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100">
                    {/* Image container */}
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${template.color} opacity-20 mix-blend-multiply`} />
                      
                      {/* Category badge */}
                      <div className="absolute top-4 left-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${template.color}`}>
                          {template.category}
                        </div>
                      </div>
                      
                      {/* Popularity badge */}
                      <div className="absolute top-4 right-4">
                        <div className="px-3 py-1 rounded-full text-xs font-bold text-white bg-black/70 backdrop-blur-sm">
                          {template.popularity}
                        </div>
                      </div>
                      
                      {/* Rating */}
                      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs font-medium">{template.rating}</span>
                        <span className="text-xs text-gray-500">({template.reviews})</span>
                      </div>
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button 
                          className="bg-white text-gray-900 hover:bg-gray-100 font-bold"
                          onClick={() => handleSelectTemplate(template.id, template.title)}
                        >
                          צפה בתבנית
                          <Arrow className={`w-4 h-4 ${dir === 'rtl' ? 'mr-2' : 'ml-2'}`} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center`}>
                          <template.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{template.title}</h3>
                          <p className="text-sm text-gray-500">{template.subtitle}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                        {template.description}
                      </p>
                      
                      {/* Features */}
                      <div className="space-y-1 mb-4">
                        {template.features.slice(0, 2).map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      
                      {/* Action button */}
                      <Button 
                        variant="outline" 
                        className="w-full border-primary/20 hover:border-primary/40 text-sm"
                        onClick={() => handleSelectTemplate(template.id, template.title)}
                      >
                        בחר תבנית זו
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <Search className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">לא נמצאו תבניות</h3>
                <p className="text-gray-600">נסו לשנות את החיפוש או הסינון</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-center"
            >
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-white max-w-4xl mx-auto">
                <h3 className="text-3xl font-bold mb-4">
                  לא מצאתם מה שחיפשתם?
                </h3>
                <p className="text-xl mb-8 opacity-90">
                  אנחנו יכולים לבנות תבנית מותאמת אישית לעסק שלכם
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-gray-100 font-bold"
                    onClick={() => {
                      localStorage.setItem('contactSubject', 'custom');
                      navigate('/contact');
                    }}
                  >
                    דברו איתנו על תבנית מותאמת
                  </Button>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary" onClick={() => navigate('/')}>
                    חזרה לדף הבית
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AllTemplates;
