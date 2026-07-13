import { Link } from 'react-router-dom';

interface FormConsentNoticeProps {
  privacyPolicyPath?: string;
}

const FormConsentNotice = ({ privacyPolicyPath = '/privacy' }: FormConsentNoticeProps) => {
  return (
    <p className="text-xs text-muted-foreground">
      שליחת הטופס מהווה הסכמה ל
      <Link
        to={privacyPolicyPath}
        className="text-foreground font-medium underline hover:no-underline mx-1 focus:outline-none focus:ring-2 focus:ring-ring rounded"
      >
        מדיניות הפרטיות
      </Link>
      שלנו.
    </p>
  );
};

export default FormConsentNotice;
