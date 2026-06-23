import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send, MessageSquare, User, Building, HelpCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    business: '',
    message: '',
    subject: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const savedSubject = localStorage.getItem('contactSubject');
    if (savedSubject) {
      setFormData(prev => ({
        ...prev,
        subject: savedSubject
      }));
      // Clear the saved subject after using it
      localStorage.removeItem('contactSubject');
    }
    
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitted(true);
    setIsSubmitting(false);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        business: '',
        message: '',
        subject: 'general'
      });
    }, 3000);
  };

  const contactMethods = [
   
    {
      icon: Mail,
      title: "אימייל",
      content: "office@siango.app",
      subtitle: "תגובה תוך 24 שעות",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: MapPin,
      title: "כתובת",
      content: "רחוב דיזנגוף 123, תל אביב",
      subtitle: "ביקורים בתיאום מראש",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: Clock,
      title: "שעות פעילות",
      content: "א'-ה': 8:00-20:00",
      subtitle: "ו': 9:00-14:00",
      color: "from-orange-500 to-red-600"
    }
  ];

  const faqs = [
    {
      question: "כמה זמן לוקח להקים אתר?",
      answer: "תהליך ההקמה מלא לוקח בין 5-10 דקות, תלוי בכמות המוצרים שברצונכם להעלות."
    },
    {
      question: "האם ניתן להתאים אישית את העיצוב?",
      answer: "כן! כל תבנית ניתנת להתאמה אישית מלאה - צבעים, פונטים, סידור ועוד."
    },
    {
      question: "האם יש תמיכה טכנית?",
      answer: "בטח, יש לנו תמיכה טכנית 24/7 בטלפון, אימייל וצ'אט חי."
    },
    {
      question: "מה העלות ומה כוללות התכניות?",
      answer: "יש לנו מספר תכניות גמישות החל מ-99 ש\"ח לחודש, כולל כל התכונות הבסיסיות."
    },
    {
      question: "האם אפשר להתחבר לשירותי צד שלישי?",
      answer: "כן, יש אפשרות להתחבר למערכות תשלומים, משלוחים, ניהול מלאי ועוד."
    },
    {
      question: "האם האתר יהיה אופטימלי למנועי חיפוש?",
      answer: "כל האתרים שלנו מותאמים אוטומטית ל-SEO וכוללים כלים מתקדמים לקידום."
    }
  ];

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
                <MessageSquare className="w-4 h-4" />
                צרו קשר
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                אנחנו כאן לעזור
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">לכל שאלה ובקשה</span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                צוות המומחים שלנו מוכן לסייע לכם להצליח. צרו קשר ונחזור אליכם בהקדם.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {contactMethods.map((method, index) => (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center mx-auto mb-4`}>
                    <method.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{method.title}</h3>
                  <p className="text-gray-900 font-medium mb-1">{method.content}</p>
                  <p className="text-sm text-gray-500">{method.subtitle}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form and FAQ */}
        <section className="py-16 bg-gray-50">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">שלחו הודעה</h2>
                  
                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">ההודעה נשלחה בהצלחה!</h3>
                      <p className="text-gray-600">נחזור אליכם בהקדם האפשרי</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            שם מלא *
                          </label>
                          <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                              className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="דנה כהן"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            אימייל *
                          </label>
                          <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                              className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="dana@example.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            טלפון
                          </label>
                          <div className="relative">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="050-1234567"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            עסק
                          </label>
                          <div className="relative">
                            <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              name="business"
                              value={formData.business}
                              onChange={handleInputChange}
                              className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="בוטיק אופנה"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          נושא הפנייה *
                        </label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleInputChange}
                          required
                          className="w-full pr-4 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="general">פנייה כללית</option>
                          <option value="support">תמיכה טכנית</option>
                          <option value="sales">מכירות ומחירים</option>
                          <option value="custom">תבנית מותאמת אישית</option>
                          <option value="partnership">שיתוף פעולה</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          הודעה *
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          required
                          rows={5}
                          className="w-full pr-4 pl-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                          placeholder="ספרו לנו יותר על מה שמעניין אתכם..."
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                            שולח...
                          </>
                        ) : (
                          <>
                            שלח הודעה
                            <Send className="w-4 h-4 mr-2" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </motion.div>

              {/* FAQ Section */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <HelpCircle className="w-6 h-6 text-primary" />
                    שאלות נפוצות
                  </h2>
                  
                  <div className="space-y-4">
                    {faqs.map((faq, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="border-b border-gray-100 pb-4 last:border-0"
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-primary/5 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-2">עדיין יש לכם שאלות?</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      צוות התמיכה שלנו זמין 24/7 לעזור לכם עם כל צורך.
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/register')}>
                      התחלו עכשיו - חינם ל-14 יום
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
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
                  מוכנים להתחיל?
                </h3>
                <p className="text-xl mb-8 opacity-90">
                  הצטרפו לאלפי לקוחות מרוצים והקימו אתר מכירות מקצועי תוך 5 דקות
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-white text-primary hover:bg-gray-100 font-bold" onClick={() => navigate('/register')}>
                    התחל עכשיו
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

export default Contact;
