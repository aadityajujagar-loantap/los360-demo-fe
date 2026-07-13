declare module "@cashfreepayments/cashfree-js" {
  interface CashfreeLoadOptions {
    mode: "sandbox" | "production";
  }

  interface SubscriptionCheckoutOptions {
    subsSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal";
  }

  interface CheckoutResult {
    error?: { message: string };
  }

  interface CashfreeInstance {
    subscriptionsCheckout(options: SubscriptionCheckoutOptions): Promise<CheckoutResult>;
  }

  export function load(options: CashfreeLoadOptions): Promise<CashfreeInstance>;
}
