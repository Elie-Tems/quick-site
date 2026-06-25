declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function push(event: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

export const gtm = {
  signUp: (method: string = "email") =>
    push({ event: "sign_up", method }),

  onboardingComplete: () =>
    push({ event: "onboarding_complete" }),

  sitePublished: () =>
    push({ event: "site_published" }),

  connectPaymentClick: () =>
    push({ event: "connect_payment_click" }),

  purchase: (value: number, currency: string = "ILS") =>
    push({ event: "purchase", value, currency }),
};
