import { AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface FormErrorSummaryProps {
  errors: Record<string, string | undefined>;
  title?: string;
}

const FormErrorSummary = ({ errors, title = 'יש לתקן את השגיאות הבאות:' }: FormErrorSummaryProps) => {
  const errorKeys = Object.keys(errors).filter(key => errors[key]);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorKeys.length > 0 && summaryRef.current) {
      summaryRef.current.focus();
    }
  }, [errorKeys.length]);

  if (errorKeys.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      role="alert"
      aria-live="polite"
      tabIndex={-1}
      className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-destructive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-destructive mb-2">{title}</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
            {errorKeys.map((key) => (
              <li key={key}>{errors[key]}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FormErrorSummary;
