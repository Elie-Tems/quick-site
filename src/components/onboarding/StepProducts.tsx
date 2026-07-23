import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { OnboardingData, ProductCategory } from "@/pages/Onboarding";
import { BusinessCategory } from "@/lib/categoryConfig";
import {
  Plus, Trash2, Package, FileSpreadsheet, Upload, X, Download,
  AlertCircle, Loader2, LayoutGrid, List, FolderOpen,
  Mic, MicOff, Pencil, ImagePlus, Wand2, Lightbulb, ChevronDown, ChevronUp,
  Images, Video, Tag, Folder, FileText, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import ProductCategoryManager from "./ProductCategoryManager";
import { StepNavigation } from "./StepNavigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepProductsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface ExcelProduct {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  imageUrl?: string;
  categoryName?: string;
}

interface ParsedProduct {
  name: string;
  price: number;
  description?: string;
  image?: string; // absolute URL scraped from the catalog page, when available
}

type Method = "quick" | "catalog" | "voice";

type DemoProduct = { name: string; price: number; description: string; imageUrl: string };

const DEMO_PRODUCTS_BY_CATEGORY: Partial<Record<BusinessCategory, DemoProduct[]>> = {
  bakery: [
    { name: "לחם כפרי טרי", price: 28, description: "לחם על בסיס מחמצת, אפוי מדי בוקר.", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80" },
    { name: "קרואסון חמאה", price: 14, description: "קרואסון פריך עם חמאה איכותית.", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80" },
    { name: "עוגת שוקולד שלמה", price: 120, description: "עוגה ביתית עשירה בשוקולד בלגי.", imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80" },
    { name: "מאפין אוכמניות", price: 12, description: "מאפין רך עם אוכמניות טריות.", imageUrl: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&q=80" },
    { name: "בייגלה שומשום", price: 8, description: "בייגלה מסורתי עם ציפוי שומשום.", imageUrl: "https://images.unsplash.com/photo-1586444248879-bc7a8a6b9a9c?w=600&q=80" },
  ],
  restaurant: [
    { name: "מנת שקשוקה", price: 58, description: "שקשוקה ביתית בסיר ברזל עם ביצים טריות.", imageUrl: "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&q=80" },
    { name: "סלט ירקות", price: 42, description: "סלט ירקות עונתיים עם רוטב לימון.", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80" },
    { name: "פסטה ארביאטה", price: 68, description: "פסטה ברוטב עגבניות חריף.", imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80" },
    { name: "שניצל עם תוספות", price: 89, description: "שניצל עוף קריספי עם ציפס ביתי.", imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80" },
    { name: "קינוח עוגת גבינה", price: 38, description: "עוגת גבינה קרמית עם קולי פירות.", imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80" },
  ],
  cafe: [
    { name: "קפה הפוך", price: 16, description: "אספרסו עם חלב מוקצף.", imageUrl: "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=600&q=80" },
    { name: "קפה קר Cold Brew", price: 22, description: "קפה קר בחליטה ארוכה.", imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80" },
    { name: "חתיכת עוגה יומית", price: 28, description: "עוגה ביתית - משתנה מדי יום.", imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80" },
    { name: "כריך גורמה", price: 44, description: "כריך עם גבינות ועלי רוקט.", imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80" },
    { name: "לאטה חמאת בוטנים", price: 24, description: "לאטה עם חמאת בוטנים וסירופ וניל.", imageUrl: "https://images.unsplash.com/photo-1572286258217-40f935e0119d?w=600&q=80" },
  ],
  clothing: [
    { name: "חולצת כותנה בייסיק", price: 89, description: "חולצת כותנה נוחה בגזרה ישרה.", imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80" },
    { name: "ג'ינס סקיני", price: 249, description: "ג'ינס בגזרה צמודה, כחול כהה.", imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80" },
    { name: "שמלת קיץ פרחונית", price: 179, description: "שמלה קלה לקיץ עם הדפס פרחים.", imageUrl: "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=600&q=80" },
    { name: "מעיל מנדרין", price: 349, description: "מעיל קצר עם צווארון מנדרין.", imageUrl: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&q=80" },
    { name: "כובע בייסבול", price: 69, description: "כובע מצחייה עם לוגו רקום.", imageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80" },
  ],
  jewelry: [
    { name: "צמיד זהב עדין", price: 320, description: "צמיד זהב 14K בעבודת יד.", imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80" },
    { name: "עגילי חישוק כסף", price: 180, description: "עגילי חישוק בכסף 925.", imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80" },
    { name: "שרשרת עם תליון לב", price: 220, description: "שרשרת זהב עם תליון לב.", imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80" },
    { name: "טבעת נישואין קלאסית", price: 890, description: "טבעת זהב לבן בעיצוב נקי.", imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80" },
    { name: "סט תכשיטים מתנה", price: 450, description: "סט שרשרת + עגיליים בקופסת מתנה.", imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80" },
  ],
  beauty: [
    { name: "קרם לחות יומי", price: 89, description: "קרם לחות לכל סוגי העור.", imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80" },
    { name: "שמפו טבעי לשיער", price: 65, description: "שמפו מרכיבים טבעיים ללא סולפטים.", imageUrl: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=600&q=80" },
    { name: "מסכת פנים מרגיעה", price: 49, description: "מסכת לילה לעור עייף ורגיש.", imageUrl: "https://images.unsplash.com/photo-1570194065650-d99fb4abbd90?w=600&q=80" },
    { name: "שמן ארגן לשיער", price: 79, description: "שמן ארגן מרוקאי לשיער מבריק.", imageUrl: "https://images.unsplash.com/photo-1617897903246-719242758050?w=600&q=80" },
    { name: "סבון טבעי", price: 39, description: "סבון טבעי עם לבנדר ושמן קוקוס.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80" },
  ],
  fitness: [
    { name: "חבל קפיצה מקצועי", price: 79, description: "חבל קפיצה עם ידיות מסתובבות.", imageUrl: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&q=80" },
    { name: "מזרן יוגה 6mm", price: 149, description: "מזרן אנטי-החלקה לאימון יוגה.", imageUrl: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=600&q=80" },
    { name: "משקולות יד 2 ק\"ג", price: 89, description: "זוג משקולות יד מגומי.", imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80" },
    { name: "גומיית התנגדות", price: 49, description: "סט 3 גומיות בעוצמות שונות.", imageUrl: "https://images.unsplash.com/photo-1598971457999-ca4ef48a9a71?w=600&q=80" },
    { name: "בקבוק שתייה 1L", price: 59, description: "בקבוק ספורט 1 ליטר ללא BPA.", imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&q=80" },
  ],
  pets: [
    { name: "מזון כלבים פרימיום 3 ק\"ג", price: 89, description: "מזון יבש איכותי לכלבים בוגרים.", imageUrl: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&q=80" },
    { name: "מיטת חתול רכה", price: 129, description: "מיטה קטיפתית עם כרית נשלפת.", imageUrl: "https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?w=600&q=80" },
    { name: "צעצוע לכלב", price: 39, description: "צעצוע גומי עמיד לכלבים פעילים.", imageUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80" },
    { name: "קולר וכבל לכלב", price: 79, description: "קולר ניילון עם כבל 2 מטר.", imageUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80" },
    { name: "שמפו לחיות מחמד", price: 45, description: "שמפו עדין לעור רגיש של בעלי חיים.", imageUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&q=80" },
  ],
  flowers: [
    { name: "זר ורדים אדומים", price: 150, description: "זר 12 ורדים אדומים טריים.", imageUrl: "https://images.unsplash.com/photo-1455582916367-25f75bfc6710?w=600&q=80" },
    { name: "עציץ סוקולנט", price: 45, description: "עציץ סוקולנט קל לתחזוקה.", imageUrl: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&q=80" },
    { name: "זר חתונה לכלה", price: 380, description: "זר כלה בצבעים לבנים ורכים.", imageUrl: "https://images.unsplash.com/photo-1487530811015-780c82fc1534?w=600&q=80" },
    { name: "סידור פרחים מעורב", price: 95, description: "סידור צבעוני לשולחן או מתנה.", imageUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc73?w=600&q=80" },
    { name: "עציץ נחמה", price: 120, description: "עציץ גדול עם עיצוב מינימלי.", imageUrl: "https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=600&q=80" },
  ],
  home: [
    { name: "כרית נוי 50×50", price: 89, description: "כרית דקורטיבית לסלון.", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80" },
    { name: "נר ריחני בכוס", price: 65, description: "נר ריחני 40 שעות בוער.", imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80" },
    { name: "מנורת שולחן מינימלית", price: 189, description: "מנורה עם בסיס מתכת ואהיל בד.", imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80" },
    { name: "מגש עץ לשולחן", price: 79, description: "מגש עץ אקאציה לשרות ועיצוב.", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80" },
    { name: "שטיח סלון 160×230", price: 449, description: "שטיח ארוג בצמר רך.", imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&q=80" },
  ],
  handmade: [
    { name: "קופסת עץ מעוצבת", price: 149, description: "קופסת עץ בעבודת יד עם חריטה.", imageUrl: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=600&q=80" },
    { name: "תיק קרושה ביתי", price: 189, description: "תיק קרושה בצבעים טבעיים.", imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80" },
    { name: "כד חרס מצוייר", price: 95, description: "כד חרס צבוע ביד, ייחודי.", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80" },
    { name: "תמונה ממוסגרת עבודת יד", price: 220, description: "הדפס אמנות בעיצוב אישי.", imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80" },
    { name: "סל קש ארוג", price: 129, description: "סל קש בסגנון בוהו-שיק.", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
  ],
  art: [
    { name: "הדפס אמנות A3", price: 180, description: "הדפס איכות גבוהה על נייר ארכיוני.", imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80" },
    { name: "ציור שמן מקורי", price: 850, description: "ציור שמן על קנבס, חתום.", imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80" },
    { name: "סקיצת עיפרון פורטרט", price: 250, description: "פורטרט מהתמונה שלכם.", imageUrl: "https://images.unsplash.com/photo-1561839561-b13bcfe95249?w=600&q=80" },
    { name: "כרזה ממוסגרת", price: 220, description: "כרזה וינטג' בלוק ממוסגר.", imageUrl: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=600&q=80" },
    { name: "הדפס אקוורל פרחים", price: 140, description: "אקוורל פרחוני בצבעים עדינים.", imageUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc73?w=600&q=80" },
  ],
  baby: [
    { name: "שמיכת תינוק רכה", price: 89, description: "שמיכה מפלנל רכה לתינוק.", imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80" },
    { name: "צעצוע בד לתינוק", price: 59, description: "צעצוע ממולא בד עם צלצול.", imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80" },
    { name: "בגד גוף 3-6 חודשים", price: 45, description: "בגד גוף כותנה אורגנית.", imageUrl: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&q=80" },
    { name: "ספר ילדים קרטון", price: 38, description: "ספר קרטון עמיד לתינוקות.", imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80" },
    { name: "מוצץ סיליקון", price: 29, description: "מוצץ סיליקון BPA-Free.", imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80" },
  ],
  gifts: [
    { name: "קופסת מתנה ממולאת", price: 180, description: "קופסת מתנה ממולאת מוצרים נבחרים.", imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80" },
    { name: "ספל עם הקדשה", price: 75, description: "ספל קרמיקה עם הדפסת שם.", imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80" },
    { name: "לוח שנה אישי", price: 120, description: "לוח שנה עם תמונות אישיות.", imageUrl: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&q=80" },
    { name: "סט כתיבה יוקרתי", price: 95, description: "עט ופנקס בקופסת מתנה.", imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&q=80" },
    { name: "נר ריחני סט", price: 110, description: "סט 3 נרות ריח בתיבת מתנה.", imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80" },
  ],
  books: [
    { name: "ספר בישול ישראלי", price: 89, description: "מתכונים מהמטבח הישראלי המסורתי.", imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80" },
    { name: "רומן עברי עכשווי", price: 68, description: "יצירה ספרותית עברית בהוצאה חדשה.", imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80" },
    { name: "ספר ילדים מאוייר", price: 49, description: "ספר ילדים עם איורים צבעוניים.", imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80" },
    { name: "מדריך טיולים ישראל", price: 79, description: "מדריך מפורט לטיולים בארץ.", imageUrl: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=600&q=80" },
    { name: "פנקס עיצוב קרמיקה", price: 55, description: "פנקס מחברת בעיצוב אמנותי.", imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&q=80" },
  ],
  furniture: [
    { name: "כיסא עץ לפינת אוכל", price: 490, description: "כיסא עץ מלא בגימור טבעי.", imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&q=80" },
    { name: "מדף קיר מתכת", price: 189, description: "מדף מתכת בסגנון תעשייתי.", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80" },
    { name: "שולחן קפה עגול", price: 790, description: "שולחן מרכזי מעץ עם רגלי ברזל.", imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=80" },
    { name: "ספה תלת מושבית", price: 3200, description: "ספה בד אפור בסגנון סקנדינבי.", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80" },
    { name: "שידת לילה", price: 590, description: "שידת לילה עם מגירה ומדף פתוח.", imageUrl: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&q=80" },
  ],
  electronics: [
    { name: "אוזניות Bluetooth", price: 199, description: "אוזניות אלחוטיות עם ביטול רעשים.", imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" },
    { name: "כבל USB-C טעינה מהירה", price: 49, description: "כבל 1.5 מטר לטעינה מהירה.", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
    { name: "מטען אלחוטי 15W", price: 89, description: "מטען אלחוטי Qi תואם לכל האייפונים.", imageUrl: "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&q=80" },
    { name: "רמקול Bluetooth נייד", price: 149, description: "רמקול עמיד למים עם סוללה 12 שעות.", imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80" },
    { name: "מעמד לפלאפון", price: 39, description: "מעמד מתכוונן לשולחן.", imageUrl: "https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=600&q=80" },
  ],
  grocery: [
    { name: "שמן זית בכבישה קרה", price: 45, description: "שמן זית כתית מעולה 500 מ\"ל.", imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80" },
    { name: "דבש צבר טבעי", price: 38, description: "דבש מדבורים ישראליות 250 גרם.", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80" },
    { name: "ממרח טחינה גולמי", price: 22, description: "טחינה גולמית טחונה טרייה.", imageUrl: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80" },
    { name: "חבילת קפה 250 גרם", price: 35, description: "קפה ערביקה טחון טרי.", imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80" },
    { name: "תה צמחים סט", price: 28, description: "סט 6 טעמי תה צמחים ישראלי.", imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80" },
  ],
  wine_alcohol: [
    { name: "יין אדום כרמל", price: 89, description: "יין אדום יבש מיקב כרמל.", imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80" },
    { name: "יין לבן צ'ארדונה", price: 79, description: "יין לבן חצי יבש עם ניחוחות הדרים.", imageUrl: "https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&q=80" },
    { name: "בירה מקומית קרפט", price: 22, description: "בירה קרפט בקבוק 330 מ\"ל.", imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80" },
    { name: "ויסקי יחיד מאלט", price: 249, description: "ויסקי סינגל מאלט 10 שנה.", imageUrl: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=80" },
    { name: "זוג גביעי יין קריסטל", price: 120, description: "זוג גביעי יין קריסטל בקופסה.", imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80" },
  ],
  toys: [
    { name: "משחק לוח משפחתי", price: 149, description: "משחק לוח לכל המשפחה.", imageUrl: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=600&q=80" },
    { name: "ערכת LEGO בסיסית", price: 89, description: "ערכת לגו לגילאי 5+.", imageUrl: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80" },
    { name: "בובת ממולאת גדולה", price: 79, description: "בובת קטיפה ממולאת רכה.", imageUrl: "https://images.unsplash.com/photo-1602463395525-5c85b1c65bae?w=600&q=80" },
    { name: "פאזל 1000 חלקים", price: 69, description: "פאזל תמונת נוף ישראלי.", imageUrl: "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=600&q=80" },
    { name: "רכב שלט רחוק", price: 119, description: "רכב שלט רחוק מהיר לחוץ.", imageUrl: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=600&q=80" },
  ],
  pharmacy: [
    { name: "ויטמין C 1000 מ\"ג", price: 49, description: "ויטמין C ב-30 טבליות.", imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80" },
    { name: "קרם הגנה SPF 50", price: 65, description: "קרם הגנה לפנים SPF 50+.", imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80" },
    { name: "מד חום דיגיטלי", price: 79, description: "מד חום אוזן/מצח דיגיטלי.", imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80" },
    { name: "אומגה 3 פרימיום", price: 89, description: "אומגה 3 דגים 60 קפסולות.", imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80" },
    { name: "ג'ל חיטוי ידיים", price: 25, description: "ג'ל חיטוי 250 מ\"ל עם ניחוח לימון.", imageUrl: "https://images.unsplash.com/photo-1584483720412-ce931f4aefa8?w=600&q=80" },
  ],
  automotive: [
    { name: "מטהר אוויר לרכב", price: 89, description: "מטהר אוויר USB עם פחם פעיל.", imageUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80" },
    { name: "מחזיק טלפון לרכב", price: 49, description: "מחזיק מגנטי לחשת האוורור.", imageUrl: "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?w=600&q=80" },
    { name: "כיסויי מושב עור", price: 249, description: "זוג כיסויי מושב קדמיים מעור.", imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80" },
    { name: "מטען לרכב USB-C", price: 69, description: "מטען לרכב 45W עם 2 יציאות.", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
    { name: "פנס LED לרכב", price: 129, description: "פנסי LED H4 קדמיים זוג.", imageUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80" },
  ],
};

// Business-type specific demo items (for realestate / nonprofit which are not product categories)
const DEMO_BY_BUSINESS_TYPE: Record<string, DemoProduct[]> = {
  realestate: [
    { name: "דירת 3 חדרים - תל אביב", price: 2_850_000, description: "דירה מרווחת בקומה 4, מרפסת שמש, חניה.", imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80" },
    { name: "פנטהאוז - רמת גן", price: 5_200_000, description: "פנטהאוז יוקרתי עם גג פרטי ונוף עירוני.", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" },
    { name: "דירת גן - הרצליה", price: 3_400_000, description: "דירת גן 4 חדרים עם גינה פרטית 60 מ\"ר.", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80" },
    { name: "משרד להשכרה - פתח תקווה", price: 8_500, description: "משרד 80 מ\"ר, לובי מפואר, חניון.", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80" },
    { name: "קוטג' דו-משפחתי - כפר סבא", price: 4_100_000, description: "קוטג' 5 חדרים עם גינה ובריכה.", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" },
  ],
  nonprofit: [
    { name: "מיזם קהילה שכונתית", price: 0, description: "פרויקט לחיזוק הקהילה המקומית והפעלת מתנדבים.", imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80" },
    { name: "תרומה חודשית קבועה", price: 50, description: "תרומה חודשית שתאפשר לנו להמשיך את הפעילות.", imageUrl: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80" },
    { name: "מענק ציוד לבתי ספר", price: 500, description: "רכישת ציוד לימוד לתלמידים ממשפחות בצרכים.", imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80" },
    { name: "קמפיין גיוס קיץ", price: 200, description: "גיוס תרומות לפעילויות הקיץ של ילדים בסיכון.", imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80" },
    { name: "אימוץ משפחה נזקקת", price: 1_000, description: "סיוע חודשי למשפחה בקשיים — מזון, חינוך, ביגוד.", imageUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80" },
  ],
};

// Fallback demo products for categories without specific data
const FALLBACK_DEMO_PRODUCTS: DemoProduct[] = [
  { name: "מוצר לדוגמה 1", price: 99, description: "מוצר דמו להתחלה. החליפו בשם, מחיר ותמונה שלכם.", imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80" },
  { name: "מוצר לדוגמה 2", price: 45, description: "מוצר דמו להתחלה. אפשר לערוך או למחוק במוצרים.", imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80" },
  { name: "מוצר לדוגמה 3", price: 65, description: "מוצר דמו להתחלה. אפשר לערוך או למחוק במוצרים.", imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80" },
  { name: "מוצר לדוגמה 4", price: 120, description: "מוצר דמו להתחלה. אפשר לערוך או למחוק במוצרים.", imageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80" },
  { name: "מוצר לדוגמה 5", price: 39, description: "מוצר דמו להתחלה. אפשר לערוך או למחוק במוצרים.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80" },
];

function getDemoProducts(category: BusinessCategory, businessType?: string): DemoProduct[] {
  // Prefer a category-specific demo set when one exists. A car dealer (category
  // "automotive") routed to the realestate vertical must still get vehicle demos,
  // not Tel Aviv apartments - so the category wins over the business type here.
  if (DEMO_PRODUCTS_BY_CATEGORY[category]) return DEMO_PRODUCTS_BY_CATEGORY[category]!;
  // Only categories that have no product demos of their own fall back to the
  // business-type demo set (e.g. realestate/nonprofit, which are verticals, not
  // product categories).
  if (businessType && DEMO_BY_BUSINESS_TYPE[businessType]) return DEMO_BY_BUSINESS_TYPE[businessType];
  return FALLBACK_DEMO_PRODUCTS;
}

const StepProducts = ({ data, updateData, onNext, onBack }: StepProductsProps) => {
  const { t } = useLanguage();
  const [activeMethod, setActiveMethod] = useState<Method>("quick");

  // Quick add
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickDesc, setQuickDesc] = useState("");
  const [quickImageUrl, setQuickImageUrl] = useState<string | null>(null);
  const [generatingQuickImage, setGeneratingQuickImage] = useState(false);
  const quickImageRef = useRef<HTMLInputElement>(null);

  // Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ExcelProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [defaultCategoryForExcel, setDefaultCategoryForExcel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micHelp, setMicHelp] = useState<null | "blocked" | "denied" | "unsupported">(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsed, setVoiceParsed] = useState<ParsedProduct[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // AI images
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editingFieldProductId, setEditingFieldProductId] = useState<string | null>(null);

  // Manual photo upload per product
  const [uploadingForProductId, setUploadingForProductId] = useState<string | null>(null);
  const productImageUploadRef = useRef<HTMLInputElement>(null);

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Voice - "record more" nudge shown after an import
  const [voiceJustImported, setVoiceJustImported] = useState(0); // count of last import

  // Categories
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Dashboard features expand
  const [showDashboardFeatures, setShowDashboardFeatures] = useState(false);

  const productsCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    data.products.forEach(p => {
      const catId = p.categoryId || "uncategorized";
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [data.products]);

  const filteredProducts = useMemo(() => {
    if (data.productOrganization === "free" || !selectedCategoryId) return data.products;
    return data.products.filter(p => p.categoryId === selectedCategoryId);
  }, [data.products, selectedCategoryId, data.productOrganization]);

  // ── Quick add ──────────────────────────────────────────────────────────────

  const handleQuickAdd = () => {
    if (!quickName.trim()) return;
    const categoryId = data.productOrganization === "categories" ? selectedCategoryId || undefined : undefined;
    updateData({
      products: [...data.products, {
        id: Date.now().toString(),
        name: quickName.trim(),
        description: quickDesc.trim(),
        price: quickPrice.trim() ? parseFloat(quickPrice) : null,
        imageUrl: quickImageUrl || undefined,
        categoryId,
      }],
    });
    setQuickName("");
    setQuickPrice("");
    setQuickDesc("");
    setQuickImageUrl(null);
  };

  const compressImage = (file: File, maxBytes = 4 * 1024 * 1024): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = ev => {
        img.onload = () => {
          // Cap long edge at 1800px to avoid huge canvases while keeping quality
          const MAX_PX = 1800;
          let { width, height } = img;
          if (width > MAX_PX || height > MAX_PX) {
            const ratio = Math.min(MAX_PX / width, MAX_PX / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          // Try quality 0.92 first, then step down until under maxBytes
          let quality = 0.92;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length * 0.75 > maxBytes && quality > 0.5) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = ev.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleQuickImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (quickImageRef.current) quickImageRef.current.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast.info(t("ob.prod.t_compressing"));
      try {
        const compressed = await compressImage(file);
        setQuickImageUrl(compressed);
      } catch {
        toast.error(t("ob.prod.t_compress_err"));
      }
    } else {
      setQuickImageUrl(URL.createObjectURL(file));
    }
  };

  const handleGenerateQuickImage = async () => {
    if (!quickName.trim()) return;
    setGeneratingQuickImage(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
        body: { productName: quickName.trim(), productDescription: quickDesc.trim(), businessCategory: data.businessCategory },
      });
      if (!error && result?.imageUrl) setQuickImageUrl(result.imageUrl);
      else toast.error(t("ob.prod.t_gen_img_err"));
    } catch { toast.error(t("ob.prod.t_gen_img_err")); }
    finally { setGeneratingQuickImage(false); }
  };

  const handleQuickKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuickAdd();
  };

  // ── Excel ──────────────────────────────────────────────────────────────────

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setParseError(null);
    parseExcelFile(file);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", codepage: 65001 });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) { setParseError(t("ob.prod.err_file_empty")); return; }

      const headers = jsonData[0].map((h: any) => String(h || "").toLowerCase().trim());
      const idx = (terms: string[]) => headers.findIndex((h: string) => terms.some(t => h.includes(t)));

      // Meta Commerce Manager CSV uses: title, description, price, image_link, id, google_product_category
      const nameIdx = idx(["שם", "name", "מוצר", "product", "title"]);
      const priceIdx = idx(["מחיר", "price", "עלות", "cost"]);
      const descIdx = idx(["תיאור", "description", "desc"]);
      const skuIdx = idx(['מק"ט', "מקט", "sku", "קוד", "id"]);
      const imageIdx = idx(["תמונה", "image_link", "image link", "image", "url", "קישור"]);
      const catIdx = idx(["קטגוריה", "category", "google_product_category"]);

      if (nameIdx === -1) {
        setParseError(t("ob.prod.err_need_name_col"));
        return;
      }

      const products: ExcelProduct[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const name = row[nameIdx];
        if (!name) continue;
        const rawPrice = priceIdx !== -1 ? row[priceIdx] : undefined;
        const parsedPrice = rawPrice != null
          ? (typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice).replace(/[^\d.]/g, "")))
          : 0;
        products.push({
          name: String(name).trim(),
          description: descIdx !== -1 ? String(row[descIdx] || "").trim() : "",
          price: isNaN(parsedPrice) ? 0 : parsedPrice,
          sku: skuIdx !== -1 ? String(row[skuIdx] || "").trim() : undefined,
          imageUrl: imageIdx !== -1 ? String(row[imageIdx] || "").trim() : undefined,
          categoryName: catIdx !== -1 ? String(row[catIdx] || "").trim() : undefined,
        });
      }

      if (products.length === 0) { setParseError(t("ob.prod.err_no_products_file")); return; }
      setParsedProducts(products);
      toast.success(`${t("ob.prod.t_found_products_pre")} ${products.length} ${t("ob.prod.t_found_products_post")}`);
    } catch {
      setParseError(t("ob.prod.err_file_read"));
    }
  };

  const findCategoryByName = (name: string) => {
    if (!name || data.productOrganization !== "categories") return undefined;
    const n = name.toLowerCase().trim();
    return (
      data.productCategories.find(c => c.name.toLowerCase().trim() === n)?.id ||
      data.productCategories.find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))?.id
    );
  };

  const handleImportExcel = () => {
    if (!parsedProducts.length) return;
    const newProducts = parsedProducts.map((p, i) => {
      let categoryId: string | undefined;
      if (data.productOrganization === "categories") {
        categoryId = (p.categoryName ? findCategoryByName(p.categoryName) : undefined)
          || defaultCategoryForExcel || selectedCategoryId || undefined;
      }
      return { id: `${Date.now()}-${i}`, name: p.name, description: p.description || "", price: p.price, sku: p.sku, imageUrl: p.imageUrl, categoryId };
    });
    updateData({ products: [...data.products, ...newProducts] });
    toast.success(`${t("ob.prod.t_imported_excel_pre")} ${newProducts.length} ${t("ob.prod.t_imported_excel_post")}`);
    setExcelFile(null); setParsedProducts([]); setDefaultCategoryForExcel(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    // The import parser (parseExcelFile above) already recognizes header terms in
    // both Hebrew and English regardless of which language downloaded the
    // template, so translating this is safe - it won't break re-importing the
    // filled-in file back in.
    const ws = XLSX.utils.aoa_to_sheet([
      [t("ob.prod.tpl_col_name"), t("ob.prod.tpl_col_desc"), t("ob.prod.tpl_col_price")],
      [t("ob.prod.tpl_sample1_name"), t("ob.prod.tpl_sample1_desc"), '150'],
      [t("ob.prod.tpl_sample2_name"), t("ob.prod.tpl_sample2_desc"), '220'],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("ob.prod.tpl_sheet_name"));
    XLSX.writeFile(wb, `${t("ob.prod.tpl_filename")}.xlsx`);
    toast.success(t("ob.prod.t_template_downloaded"));
  };

  // ── Voice ──────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    // mediaDevices is unavailable on non-HTTPS origins (except localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicHelp("unsupported");
      return;
    }

    // Check existing permission before requesting to avoid a silent-fail loop
    try {
      const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (perm.state === "denied") { setMicHelp("denied"); return; }
    } catch { /* permissions API not supported — proceed */ }

    toast.info(t("ob.prod.t_mic_requesting"), { duration: 2000 });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicHelp(null);
      toast.dismiss();
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.dismiss();
      const name = (err as Error)?.name;
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error(t("ob.prod.err_no_mic"));
      } else if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        setMicHelp("denied");
      } else {
        // Unknown error — show it so user can report
        toast.error(`${t("ob.prod.err_mic_unknown_pre")} ${name || t("ob.prod.err_mic_unknown_fallback")}`);
        setMicHelp("blocked");
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const transcribeAudio = async (blob: Blob) => {
    try {
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = "";
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);

      const { data: result, error } = await supabase.functions.invoke("transcribe-products", {
        body: { audio: base64, mimeType: blob.type },
      });
      if (error) throw error;
      if (result?.products?.length) importParsed(result.products, true);
      else toast.error(t("ob.prod.err_no_products_voice"));
    } catch {
      toast.error(t("ob.prod.err_transcribe"));
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Import parsed (shared for pdf/url/voice) ───────────────────────────────

  const importParsed = (products: ParsedProduct[], fromVoice = false) => {
    const newProducts = products.map((p, i) => ({
      id: `${Date.now()}-${i}`,
      name: p.name,
      description: p.description || "",
      price: p.price,
      imageUrl: p.image || undefined,
      categoryId: data.productOrganization === "categories" ? selectedCategoryId || undefined : undefined,
    }));
    updateData({ products: [...data.products, ...newProducts] });
    toast.success(`${t("ob.prod.t_imported_pre")} ${newProducts.length} ${t("ob.prod.t_imported_post")}`);
    setVoiceTranscript(""); setVoiceParsed([]);
    if (fromVoice) setVoiceJustImported(newProducts.length);
  };

  // Upload a photo file to an existing product
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForProductId) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateData({ products: data.products.map(p => p.id === uploadingForProductId ? { ...p, imageUrl: dataUrl } : p) });
      toast.success(t("ob.prod.t_photo_uploaded"));
      setUploadingForProductId(null);
    };
    reader.readAsDataURL(file);
  };

  // ── AI images ──────────────────────────────────────────────────────────────

  const handleGenerateImageForProduct = async (productId: string) => {
    const product = data.products.find(p => p.id === productId);
    if (!product) return;
    setGeneratingProductId(productId);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
        body: { productName: product.name, productDescription: product.description, businessCategory: data.businessCategory },
      });
      if (error) throw error;
      if (result?.imageUrl) {
        updateData({ products: data.products.map(p => p.id === productId ? { ...p, imageUrl: result.imageUrl } : p) });
        toast.success(`${t("ob.prod.t_img_generated_for_pre")} "${product.name}"`);
      }
    } catch { toast.error(t("ob.prod.err_img_gen")); }
    finally { setGeneratingProductId(null); }
  };

  const handleGenerateAllImages = async () => {
    const withoutImages = data.products.filter(p => !p.imageUrl);
    if (!withoutImages.length) { toast.info(t("ob.prod.t_all_have_images")); return; }
    setIsGeneratingAllImages(true);
    setGeneratingProgress({ current: 0, total: withoutImages.length });
    // Track generated images as a map {id → imageUrl} so we can merge them
    // into the CURRENT state at the end — not into a stale snapshot captured
    // at start time (which would drop products added while generation runs).
    const generatedMap = new Map<string, string>();
    let done = 0, successCount = 0;
    const CONCURRENCY = 4;
    const queue = [...withoutImages];
    const businessCat = data.businessCategory;
    const worker = async () => {
      while (queue.length) {
        const product = queue.shift()!;
        try {
          const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
            body: { productName: product.name, productDescription: product.description, businessCategory: businessCat },
          });
          if (!error && result?.imageUrl) {
            generatedMap.set(product.id, result.imageUrl);
            successCount++;
          }
        } catch { /* continue */ }
        done++;
        setGeneratingProgress({ current: done, total: withoutImages.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, withoutImages.length) }, worker));
    // Merge into CURRENT products state (not the start-of-run snapshot).
    updateData({ products: data.products.map(p => generatedMap.has(p.id) ? { ...p, imageUrl: generatedMap.get(p.id) } : p) });
    setIsGeneratingAllImages(false);
    setGeneratingProductId(null);
    setGeneratingProgress({ current: 0, total: 0 });
    toast.success(`${t("ob.prod.t_images_generated_pre")} ${successCount} ${t("ob.prod.t_images_generated_post")}`);
  };

  // Edit an existing AI image in place (img2img): user describes the change.
  const handleEditImage = async (productId: string, instruction: string) => {
    const product = data.products.find(p => p.id === productId);
    if (!product?.imageUrl || !instruction.trim()) return;
    setGeneratingProductId(productId);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
        body: {
          productName: product.name, productDescription: product.description, businessCategory: data.businessCategory,
          baseImageUrl: product.imageUrl, editInstruction: instruction.trim(),
        },
      });
      if (error) throw error;
      if (result?.imageUrl) {
        updateData({ products: data.products.map(p => p.id === productId ? { ...p, imageUrl: result.imageUrl } : p) });
        toast.success(t("ob.prod.t_image_updated"));
        setEditingProductId(null);
        setEditPrompt("");
      } else {
        toast.error(t("ob.prod.err_img_edit_failed"));
      }
    } catch { toast.error(t("ob.prod.err_img_edit")); }
    finally { setGeneratingProductId(null); }
  };

  // ── Category handlers ──────────────────────────────────────────────────────

  const handleAddCategory = (cat: ProductCategory) => updateData({ productCategories: [...data.productCategories, cat] });
  const handleRemoveCategory = (id: string) => {
    updateData({
      productCategories: data.productCategories.filter(c => c.id !== id),
      products: data.products.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p),
    });
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };
  const handleUpdateCategory = (id: string, updates: Partial<ProductCategory>) =>
    updateData({ productCategories: data.productCategories.map(c => c.id === id ? { ...c, ...updates } : c) });

  const handleRemoveProduct = (id: string) => updateData({ products: data.products.filter(p => p.id !== id) });
  const handleUpdateProduct = (id: string, patch: Partial<{ name: string; price: number | null }>) =>
    updateData({ products: data.products.map(p => p.id === id ? { ...p, ...patch } : p) });

  // Continue to the next step. If the merchant is skipping with an empty store,
  // seed 5 demo products so the site isn't blank, and tell them they're editable.
  // ONLY for a pure "products" store (a bare e-commerce catalog with zero items
  // is the most jarring empty state, and this demo-seed feature is designed and
  // announced for that case). Every other business type (services/nonprofit/
  // synagogue/realestate/vacation) gets "commerce" enabled only as a secondary,
  // optional add-on module (e.g. a salon selling retail shampoo) - silently
  // injecting 5 fake-priced stock-photo products onto their live storefront is
  // real fabricated content on a real published site (violates the no-fake-data
  // rule), not a helpful placeholder. Those business types simply publish with
  // zero products; their storefront's primary content is the booking/donation/
  // listing module instead.
  const handleContinue = () => {
    if (data.products.length === 0 && data.businessType === "products") {
      const now = Date.now();
      const demo = getDemoProducts(data.businessCategory, data.businessType).map((p, i) => ({
        id: `demo-${now}-${i}`,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        categoryId: undefined,
      }));
      updateData({ products: demo });
      toast.success(t("ob.prod.t_demo_seeded"), { duration: 6000 });
    }
    onNext();
  };

  // ── Shared preview table ───────────────────────────────────────────────────

  const PreviewTable = ({ products, onImport }: { products: ParsedProduct[]; onImport: () => void }) => (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t("ob.prod.preview_table_label_pre")} {products.length} {t("ob.prod.preview_table_label_post")}</p>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {products.slice(0, 15).map((p, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-medium truncate flex-1">{p.name}</span>
            <span className="text-muted-foreground shrink-0 mr-3">{p.price != null ? `₪${p.price}` : t("ob.prod.pi_no_price")}</span>
          </div>
        ))}
        {products.length > 15 && (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center">{t("ob.prod.preview_more_pre")} {products.length - 15} {t("ob.prod.preview_more_post")}</div>
        )}
      </div>
      <button
        onClick={onImport}
        className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" /> {t("ob.prod.preview_import_pre")} {products.length} {t("ob.prod.preview_import_post")}
      </button>
    </div>
  );

  // ── Product list item ──────────────────────────────────────────────────────

  const ProductItem = ({ product }: { product: (typeof data.products)[0] }) => (
    <div className="rounded-xl bg-card border border-border">
      <div className="flex items-center gap-3 p-3">
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden relative group">
          {generatingProductId === product.id ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : product.imageUrl ? (
            <>
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightboxUrl(product.imageUrl!)}
              />
              {/* Hover overlay: upload or AI-edit */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-lg">
                <button
                  onClick={e => { e.stopPropagation(); setUploadingForProductId(product.id); productImageUploadRef.current?.click(); }}
                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-md"
                  title={t("ob.prod.pi_replace_image_title")}
                >
                  <ImagePlus className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setEditingProductId(editingProductId === product.id ? null : product.id); setEditPrompt(""); }}
                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-md"
                  title={t("ob.prod.pi_edit_ai_title")}
                >
                  <Pencil className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Package className="w-5 h-5 text-muted-foreground" />
              {/* Hover overlay: upload or AI generate */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-lg">
                <button
                  onClick={e => { e.stopPropagation(); setUploadingForProductId(product.id); productImageUploadRef.current?.click(); }}
                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-md"
                  title={t("ob.prod.pi_upload_title")}
                >
                  <ImagePlus className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleGenerateImageForProduct(product.id); }}
                  className="p-1.5 bg-primary/80 hover:bg-primary rounded-md"
                  title={t("ob.prod.pi_create_ai_title")}
                >
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {editingFieldProductId === product.id ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                defaultValue={product.name}
                onBlur={e => {
                  handleUpdateProduct(product.id, { name: e.target.value || product.name });
                  // Only close if focus didn't move to the sibling price input
                  const related = e.relatedTarget as HTMLElement | null;
                  if (!related || !e.currentTarget.parentElement?.contains(related)) {
                    setEditingFieldProductId(null);
                  }
                }}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                className="flex-1 min-w-0 h-8 rounded-lg border border-primary/50 bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                dir="rtl"
              />
              <input
                defaultValue={product.price != null ? product.price : ""}
                type="number"
                min="0"
                placeholder={t("ob.prod.pi_no_price")}
                onBlur={e => { handleUpdateProduct(product.id, { price: e.target.value.trim() ? Number(e.target.value) : null }); setEditingFieldProductId(null); }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    handleUpdateProduct(product.id, { price: e.currentTarget.value.trim() ? Number(e.currentTarget.value) : null });
                    setEditingFieldProductId(null);
                  }
                }}
                className="w-24 h-8 rounded-lg border border-primary/50 bg-background px-2 text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary/40"
                dir="ltr"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{product.name}</p>
              <span className="text-sm text-muted-foreground shrink-0">{product.price != null ? `· ₪${product.price}` : `· ${t("ob.prod.pi_no_price")}`}</span>
              <button
                onClick={e => { e.stopPropagation(); setEditingFieldProductId(product.id); }}
                className="p-0.5 opacity-40 hover:opacity-100 hover:text-primary transition-all shrink-0"
                title={t("ob.prod.pi_edit_name_price_title")}
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
        </div>
        <button onClick={() => handleRemoveProduct(product.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors shrink-0">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
      {/* Inline image-edit panel */}
      {editingProductId === product.id && product.imageUrl && (
        <div className="px-3 pb-3 flex items-center gap-2">
          <input
            value={editPrompt}
            onChange={e => setEditPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleEditImage(product.id, editPrompt); }}
            placeholder={t("ob.prod.pi_edit_change_ph")}
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs"
            dir="rtl"
          />
          <button
            onClick={() => handleEditImage(product.id, editPrompt)}
            disabled={!editPrompt.trim() || generatingProductId === product.id}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            {generatingProductId === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {t("ob.prod.pi_apply")}
          </button>
        </div>
      )}
    </div>
  );

  const displayProducts = data.productOrganization === "categories" && selectedCategoryId
    ? filteredProducts
    : data.products;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Hidden file input for manual product image upload */}
      <input
        ref={productImageUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProductImageUpload}
      />
      {/* Microphone permission window - opens whenever access is missing/blocked */}
      {micHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          dir="rtl"
          onClick={() => setMicHelp(null)}
        >
          <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold">{t("ob.prod.mic_title")}</h3>
              </div>
              <button onClick={() => setMicHelp(null)} className="p-1 hover:bg-muted rounded-lg" aria-label={t("ob.prod.mic_close_aria")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {micHelp === "unsupported" ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("ob.prod.mic_unsupported")}
              </p>
            ) : micHelp === "denied" ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("ob.prod.mic_denied_intro")}
                </p>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>1. {t("ob.prod.mic_denied_step1")}</p>
                  <p>2. {t("ob.prod.mic_denied_step2")} <span className="font-medium text-foreground">{t("ob.prod.mic_denied_mic_word")}</span> {t("ob.prod.mic_denied_step2b")}<span className="font-medium text-foreground">{t("ob.prod.mic_denied_step2c")}</span></p>
                  <p>3. {t("ob.prod.mic_denied_step3")}</p>
                </div>
                <button
                  onClick={() => setMicHelp(null)}
                  className="w-full h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  {t("ob.prod.mic_close_btn")}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("ob.prod.mic_allow_intro")}
                </p>
                <button
                  onClick={() => { setMicHelp(null); startRecording(); }}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Mic className="w-4 h-4" /> {t("ob.prod.mic_allow_btn")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            style={{ maxWidth: "90vw", maxHeight: "85vh" }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      {(() => {
        const bt = data.businessType;
        const title =
          bt === 'services'   ? t("ob.prod.h_title_services") :
          bt === 'nonprofit'  ? t("ob.prod.h_title_nonprofit") :
          bt === 'realestate' ? t("ob.prod.h_title_realestate") :
          bt === 'vacation'   ? t("ob.prod.h_title_vacation") :
                                t("ob.prod.h_title_default");
        const sub =
          bt === 'services'   ? t("ob.prod.h_sub_services") :
          bt === 'nonprofit'  ? t("ob.prod.h_sub_nonprofit") :
          bt === 'realestate' ? t("ob.prod.h_sub_realestate") :
          bt === 'vacation'   ? t("ob.prod.h_sub_vacation") :
                                t("ob.prod.h_sub_default");
        return (
          <div className="text-center">
            <h1 className="text-2xl font-medium text-foreground mb-1">{title}</h1>
            <p className="text-sm text-muted-foreground">{sub}</p>
          </div>
        );
      })()}

      {/* Recommendation card */}
      <div className="rounded-2xl text-right overflow-hidden" style={{ background: "var(--pv-surface2, var(--card))", border: "1px solid var(--pv-border, var(--border))" }}>
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug mb-1">
                {data.businessType === 'services' ? t("ob.prod.rec_title_services")
                  : data.businessType === 'nonprofit' ? t("ob.prod.rec_title_nonprofit")
                  : data.businessType === 'realestate' ? t("ob.prod.rec_title_realestate")
                  : data.businessType === 'vacation' ? t("ob.prod.rec_title_vacation")
                  : t("ob.prod.rec_title_default")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("ob.prod.rec_body")}
              </p>
              <button
                onClick={() => setShowDashboardFeatures(v => !v)}
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
              >
                {showDashboardFeatures ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {t("ob.prod.rec_why_toggle")}
              </button>
            </div>
          </div>
        </div>

        {showDashboardFeatures && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: "var(--pv-border, var(--border))" }}>
            <p className="text-xs font-medium text-muted-foreground pt-3 pb-2.5">{t("ob.prod.rec_why_intro")}</p>
            <div className="space-y-2.5">
              {[
                { Icon: Images,   key: "ob.prod.rec_feat1" },
                { Icon: Video,    key: "ob.prod.rec_feat2" },
                { Icon: Tag,      key: "ob.prod.rec_feat3" },
                { Icon: Folder,   key: "ob.prod.rec_feat4" },
                { Icon: FileText, key: "ob.prod.rec_feat5" },
                { Icon: EyeOff,   key: "ob.prod.rec_feat6" },
              ].map(({ Icon, key }) => (
                <div key={key} className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { id: "quick" as Method, icon: Plus, title: t("ob.prod.m_quick_title"), desc: data.businessType === 'nonprofit' ? t("ob.prod.m_quick_desc_nonprofit") : data.businessType === 'realestate' ? t("ob.prod.m_quick_desc_realestate") : t("ob.prod.m_quick_desc_default"), gradient: "linear-gradient(135deg, #10b981, #059669)" },
          { id: "catalog" as Method, icon: FileSpreadsheet, title: t("ob.prod.m_catalog_title"), desc: t("ob.prod.m_catalog_desc"), gradient: "linear-gradient(135deg, #0ea5e9, #2563eb)" },
          { id: "voice" as Method, icon: Mic, title: t("ob.prod.m_voice_title"), desc: t("ob.prod.m_voice_desc"), gradient: "linear-gradient(135deg, #f59e0b, #ea580c)" },
        ] as const).map(({ id, icon: Icon, title, desc, gradient }) => {
          const isActive = activeMethod === id;
          return (
            <button
              key={id}
              onClick={() => setActiveMethod(id)}
              className="relative rounded-xl border-2 text-center transition-all overflow-hidden"
              style={{
                borderColor: isActive ? "transparent" : "var(--border)",
                background: isActive ? gradient : undefined,
                boxShadow: isActive ? "0 4px 14px rgba(0,0,0,0.15)" : undefined,
                transform: isActive ? "translateY(-1px)" : undefined,
              }}
            >
              {!isActive && <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity" style={{ background: gradient, opacity: 0.06 }} />}
              <div className="px-2 py-3.5">
                <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${isActive ? "bg-white/20" : "bg-muted"}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <p className={`text-xs font-semibold leading-tight ${isActive ? "text-white" : "text-foreground"}`}>{title}</p>
                <p className={`text-[10px] mt-0.5 leading-snug ${isActive ? "text-white/75" : "text-muted-foreground"}`}>{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Quick add pane ── */}
      {activeMethod === "quick" && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex gap-3">
              {/* Image picker */}
              <div className="shrink-0">
                <input ref={quickImageRef} type="file" accept="image/*" className="hidden" onChange={handleQuickImageFile} />
                <div
                  onClick={() => !quickImageUrl && quickImageRef.current?.click()}
                  className="w-[72px] h-[72px] rounded-xl border border-dashed border-border overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
                >
                  {quickImageUrl ? (
                    <>
                      <img src={quickImageUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={e => { e.stopPropagation(); setQuickImageUrl(null); }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-[10px]">{t("ob.prod.q_image_label")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name + price + desc */}
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-[1fr_90px] gap-2">
                  <Input
                    placeholder={t(
                      data.businessType === 'services' ? "ob.prod.q_name_ph_services" :
                      data.businessType === 'nonprofit' ? "ob.prod.q_name_ph_nonprofit" :
                      data.businessType === 'realestate' ? "ob.prod.q_name_ph_realestate" :
                      "ob.prod.q_name_ph"
                    )}
                    value={quickName}
                    onChange={e => setQuickName(e.target.value)}
                    onKeyDown={handleQuickKeyDown}
                    className="h-10 rounded-xl"
                  />
                  <Input
                    placeholder={t("ob.prod.q_price_ph")}
                    type="number"
                    value={quickPrice}
                    onChange={e => setQuickPrice(e.target.value)}
                    onKeyDown={handleQuickKeyDown}
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>
                <Input
                  placeholder={t("ob.prod.q_desc_ph")}
                  value={quickDesc}
                  onChange={e => setQuickDesc(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Image actions + add button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => quickImageRef.current?.click()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {t("ob.prod.q_upload_photo")}
              </button>
              <button
                onClick={handleGenerateQuickImage}
                disabled={!quickName.trim() || generatingQuickImage}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingQuickImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {generatingQuickImage ? t("ob.prod.q_generating") : t("ob.prod.q_create_ai")}
              </button>
              <div className="flex-1" />
              <button
                onClick={handleQuickAdd}
                disabled={!quickName.trim()}
                className="flex items-center gap-1.5 px-4 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> {data.businessType === 'nonprofit' ? t("ob.prod.q_add_nonprofit") : data.businessType === 'realestate' ? t("ob.prod.q_add_realestate") : t("ob.prod.q_add_default")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Catalog pane (Excel only) ── */}
      {activeMethod === "catalog" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} className="hidden" />

          {/* Template download — always visible at top */}
          <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> {t("ob.prod.c_download_template")}
          </button>

          {!excelFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">{t("ob.prod.c_drop_title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.businessType === 'nonprofit' ? t("ob.prod.c_drop_sub_nonprofit") : data.businessType === 'realestate' ? t("ob.prod.c_drop_sub_realestate") : t("ob.prod.c_drop_sub_default")}</p>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              <FileSpreadsheet className="w-7 h-7 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{excelFile.name}</p>
                <p className="text-xs text-muted-foreground">{(excelFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => { setExcelFile(null); setParsedProducts([]); setParseError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1.5 hover:bg-muted rounded-lg">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{parseError}</p>
            </div>
          )}

          {parsedProducts.length > 0 && (
            <>
              {data.productOrganization === "categories" && data.productCategories.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{t("ob.prod.c_default_category_label")}</p>
                  <select
                    value={defaultCategoryForExcel || ""}
                    onChange={e => setDefaultCategoryForExcel(e.target.value || null)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground"
                  >
                    <option value="">{t("ob.prod.c_no_category")}</option>
                    {data.productCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <PreviewTable
                products={parsedProducts.map(p => ({ name: p.name, price: p.price, description: p.description }))}
                onImport={handleImportExcel}
              />
            </>
          )}

          <div className="text-xs text-muted-foreground">
            {t("ob.prod.c_columns_hint")}
          </div>
        </div>
      )}

      {/* ── Voice pane ── */}
      {activeMethod === "voice" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all mx-auto ${
                  isRecording ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10"
                } disabled:opacity-50`}
              >
                {isTranscribing
                  ? <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  : isRecording
                  ? <MicOff className="w-7 h-7 text-destructive" />
                  : <Mic className="w-7 h-7 text-primary" />
                }
              </button>
              {isRecording && (
                <span className="absolute -inset-2 rounded-full border-2 border-destructive/50 animate-ping pointer-events-none" />
              )}
            </div>
            <p className="text-sm font-medium">
              {isTranscribing ? t("ob.prod.v_transcribing") : isRecording ? t("ob.prod.v_recording_stop") : t("ob.prod.v_start")}
            </p>
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              {t("ob.prod.v_example")}
            </p>
          </div>

          {voiceTranscript && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border text-sm leading-relaxed">
              {voiceTranscript}
            </div>
          )}

          {voiceParsed.length > 0 && <PreviewTable products={voiceParsed} onImport={() => importParsed(voiceParsed, true)} />}

          {/* "Record more products" nudge - shown after a successful import */}
          {voiceJustImported > 0 && voiceParsed.length === 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/8 border border-primary/20">
              <span className="text-sm font-medium text-primary flex-1">
                {t("ob.prod.v_more_added_pre")} {voiceJustImported} {t("ob.prod.v_more_added_post")}
              </span>
              <button
                onClick={() => { setVoiceJustImported(0); startRecording(); }}
                disabled={isRecording || isTranscribing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
              >
                <Mic className="w-3.5 h-3.5" />
                {t("ob.prod.v_record_more")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Product list ── */}
      {displayProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {displayProducts.length}{" "}
              {(() => {
                const one = data.businessType === 'nonprofit' ? t("ob.prod.pl_one_nonprofit") : data.businessType === 'realestate' ? t("ob.prod.pl_one_realestate") : t("ob.prod.pl_one_default");
                const many = data.businessType === 'nonprofit' ? t("ob.prod.pl_many_nonprofit") : data.businessType === 'realestate' ? t("ob.prod.pl_many_realestate") : t("ob.prod.pl_many_default");
                return displayProducts.length === 1 ? one : many;
              })()}
            </p>
            {data.products.some(p => !p.imageUrl) && (
              <button
                onClick={handleGenerateAllImages}
                disabled={isGeneratingAllImages || generatingProductId !== null}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {isGeneratingAllImages
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> {generatingProgress.current}/{generatingProgress.total}</>
                  : <><Wand2 className="w-3 h-3" /> {t("ob.prod.pl_generate_all")}</>
                }
              </button>
            )}
          </div>
          <div className="space-y-2">
            {displayProducts.map(product => <ProductItem key={product.id} product={product} />)}
          </div>
        </div>
      )}

      {/* Sticky bottom navigation */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border py-3 flex items-center justify-between gap-3 -mx-4 px-4 mt-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 h-11 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          {t("ob.prod.nav_back")}
        </button>
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 px-6 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {data.products.length > 0 ? t("ob.prod.nav_continue") : t("ob.prod.nav_continue_demo")}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>
    </div>
  );
};

export default StepProducts;
