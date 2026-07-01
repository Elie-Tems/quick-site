import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ArrowRight, Zap, Wand2, Crown, Star, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const dir = 'rtl'; // Hebrew RTL
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const navigate = useNavigate();

  const handleStartFree = () => {
    // Navigate to register page for free trial
    navigate('/register');
  };

  const plans = [
    {
      id: 'basic',
      name: 'בסיסי',
      price: '₪99',
      description: 'מושלם לעסקים קטנים שמתחילים',
      color: 'from-gray-600 to-gray-700',
      features: [
        'עד 50 מוצרים',
        'תמיכה במייל',
        'אחסון 1GB',
        'SSL חינם',
        'עדכונים חודשיים'
      ],
      highlighted: false
    },
    {
      id: 'professional',
      name: 'מקצועי',
      price: '₪199',
      description: 'הבחירה המושלמת לעסקים גדולים',
      color: 'from-blue-600 to-cyan-600',
      features: [
        'עד 500 מוצרים',
        'תמיכה 24/7',
        'אחסון 5GB',
        'SSL חינם',
        'עדכונים שבועיים',
        'אנליטיקה מתקדמת',
        'SEO משופר'
      ],
      highlighted: true
    },
    {
      id: 'enterprise',
      name: 'עסקי',
      price: '₪399',
      description: 'לארגונים ועסקים גדולים',
      color: 'from-purple-600 to-pink-600',
      features: [
        'מוצרים ללא הגבלה',
        'תמיכה עדיפה',
        'אחסון 20GB',
        'דומיינים מרובים',
        'SSL חינם',
        'עדכונים יומיים',
        'אנליטיקה מלאה',
        'SEO מתקדם',
        'API גישה',
        'ניהול משתמשים'
      ],
      highlighted: false
    }
  ];

  const addons = [
    {
      name: 'חבילת AI',
      price: '₪49',
      description: 'תוכן AI אוטומטי',
      icon: Wand2,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      name: 'גיבוי מתקדם',
      price: '₪29',
      description: 'גיבוי יומי ושחזור',
      icon: Shield,
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: 'תמיכה עדיפה',
      price: '₪79',
      description: 'תמיכה VIP 24/7',
      icon: Star,
      color: 'from-yellow-500 to-orange-600'
    }
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-primary/3 rounded-full blur-2xl" />
      </div>
      
      <div className="container relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Crown className="w-4 h-4" />
            תכניות גמישות
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            בחרו את התכנית
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">שמתאימה לכם</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
            תכניות גמישות שמתאימות לכל גודל של עסק. התחלו קטן וגדלו יחד איתנו
          </p>
          
          <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
            <Check className="w-5 h-5" />
            <span>ביטול בכל עת • ללא התחייבות • תשלום מאובטח</span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${plan.highlighted ? 'md:scale-105' : ''}`}
            >
              {/* Popular Badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    הכי פופולרי
                  </div>
                </div>
              )}
              
              <div className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border ${
                plan.highlighted ? 'border-primary' : 'border-gray-200'
              } h-full`}>
                {/* Header */}
                <div className={`relative h-32 bg-gradient-to-br ${plan.color} p-6`}>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-white/80 text-sm">/חודש + מע"מ</span>
                    </div>
                    <p className="text-white/70 text-sm mt-2">{plan.description}</p>
                  </div>
                </div>
                
                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* CTA Button */}
                  <Button 
                    size="lg" 
                    className={`w-full rounded-xl py-6 font-bold ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                    asChild
                  >
                    <Link to="/register">
                      {plan.highlighted ? 'התחל עכשיו' : 'בחר תכנית זו'}
                      <Arrow className={`w-4 h-4 ${dir === 'rtl' ? 'mr-2' : 'ml-2'}`} />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add-ons Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">שדרוגים ותוספים</h3>
            <p className="text-gray-600">הוסיפו פונקציות מתקדמות לאתר שלכם</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {addons.map((addon, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary/30 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${addon.color} flex items-center justify-center mb-4`}>
                  <addon.icon className="w-6 h-6 text-white" />
                </div>
                
                <h4 className="text-lg font-bold text-gray-900 mb-2">{addon.name}</h4>
                <p className="text-gray-600 text-sm mb-4">{addon.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{addon.price}</span>
                  <Button variant="outline" size="sm" className="border-primary/20 hover:border-primary/40">
                    הוסף
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-white max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-8">שאלות נפוצות</h3>
            
            <div className="text-center grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-bold mb-2">האם אפשר לבטל בכל עת?</h4>
                <p className="text-white/80 text-sm">כן, תוכלו לבטל את המנוי בכל עת ללא עלות נוספת.</p>
              </div>
              
              <div>
                <h4 className="font-bold mb-2">האם יש תמיכה בעברית?</h4>
                <p className="text-white/80 text-sm">בטח, צוות התמיכה שלנו זמין בעברית 24/7.</p>
              </div>
              
              <div>
                <h4 className="font-bold mb-2">האם המחיר כולל מע"מ?</h4>
                <p className="text-white/80 text-sm">המחירים אינם כוללים מע"מ. מע"מ כחוק יתווסף בעת התשלום.</p>
              </div>
              
              <div>
                <h4 className="font-bold mb-2">האם אפשר לשנות תכנית?</h4>
                <p className="text-white/80 text-sm">כן, תוכלו לשנות תכנית או לשדרג בכל זמן.</p>
              </div>
            </div>
            
            <div className="mt-8">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 font-bold" onClick={handleStartFree}>
          התחל עכשיו       
                </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
