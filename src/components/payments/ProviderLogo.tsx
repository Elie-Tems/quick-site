import { useState } from "react";
import { providerLogo } from "@/lib/partnerLinks";

interface Props {
  domain: string;
  name: string;
  /** Sizing classes, e.g. "h-6 w-6". Defaults to "h-6 w-6". */
  className?: string;
}

// Brand logo for a payment provider, with a graceful fallback.
//
// Logos come from a favicon service (see partnerLinks.providerLogo), which
// occasionally has no icon for a domain (e.g. hyp.co.il) - that rendered a broken
// image on the payments screen, which is exactly where the UI should look most
// trustworthy. On load error we swap to a neutral initial-letter chip instead.
export const ProviderLogo = ({ domain, name, className = "h-6 w-6" }: Props) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`${className} rounded bg-muted text-muted-foreground inline-flex items-center justify-center text-[10px] font-bold shrink-0`}
        aria-hidden="true"
      >
        {name.trim().charAt(0) || "?"}
      </span>
    );
  }

  return (
    <img
      src={providerLogo(domain)}
      alt={name}
      className={`${className} rounded shrink-0`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

export default ProviderLogo;
