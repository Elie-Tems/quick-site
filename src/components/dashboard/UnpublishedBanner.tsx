import { AlertCircle, CreditCard, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface UnpublishedBannerProps {
  businessId?: string;
}

const UnpublishedBanner = ({ businessId }: UnpublishedBannerProps) => {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-2 border-orange-300 dark:border-orange-800 rounded-xl p-6 mb-6 shadow-sm">
      <div className="text-center">
        <h3 className="text-lg font-bold text-orange-950 dark:text-orange-100 mb-2 flex items-center justify-center gap-2">
          <AlertCircle className="w-6 h-6 text-orange-700 dark:text-orange-400" />
          האתר שלך טרם פורסם
        </h3>
        <p className="text-sm text-orange-900 dark:text-orange-200 mb-4">
          האתר נשמר כטיוטה. כדי לאפשר ללקוחות לגשת לאתר, יש להשלים את התשלום ולפרסם את האתר.
        </p>
        
        <div className="flex flex-wrap gap-3 justify-center">
            <Button 
              variant="default" 
              size="lg"
              className="bg-orange-700 hover:bg-orange-800 text-white gap-2 shadow-md"
              asChild
            >
              <Link to={`/publish-payment${businessId ? `?businessId=${businessId}` : ''}`}>
                <CreditCard className="w-4 h-4" />
                השלם תשלום ופרסם את האתר
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-orange-900 dark:text-orange-300">
              <span className="font-medium">₪69/חודש + מע"מ</span>
              <span className="text-orange-700 dark:text-orange-400">•</span>
              <span>ניתן לבטל בכל עת</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UnpublishedBanner;
