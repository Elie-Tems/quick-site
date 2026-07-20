import { CheckCircle, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface StoreThankYouProps {
  hasPayment: boolean;
  paymentSuccess?: boolean;
  onContinueShopping: () => void;
  businessPhone?: string;
  orderId?: string;
}

const StoreThankYou = ({
  hasPayment,
  paymentSuccess = true,
  onContinueShopping,
  orderId,
}: StoreThankYouProps) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="container max-w-md text-center px-6">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        {/* Message */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          {t("store.thankyou.heading")}
        </h1>

        <p className="text-lg text-muted-foreground mb-8">
          {hasPayment && paymentSuccess
            ? t("store.thankyou.message_paid")
            : t("store.thankyou.message_unpaid")
          }
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            size="lg"
            variant="hero"
            className="w-full gap-2"
            onClick={onContinueShopping}
          >
            <ArrowRight className="h-5 w-5" />
            {t("store.thankyou.continue_shopping")}
          </Button>


        </div>

        {orderId && (
          <p className="text-sm text-muted-foreground mt-8 font-mono">
            {t("store.thankyou.order_number_label")} <span className="font-semibold text-foreground">{orderId.slice(0, 8).toUpperCase()}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default StoreThankYou;
