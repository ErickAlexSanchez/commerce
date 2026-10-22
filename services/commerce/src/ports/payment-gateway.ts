export interface PaymentGateway {
  verifyWebhook(input: { rawBody: string; signatureHeader: string | undefined; now: Date }): void;
}

export interface SignedWebhook {
  rawBody: string;
  signatureHeader: string;
}

export interface PaymentSimulator {
  signedWebhook(input: {
    eventId: string;
    checkoutSessionId: string;
    amountTotal: number;
    currency: "usd";
    now: Date;
  }): SignedWebhook;
}
