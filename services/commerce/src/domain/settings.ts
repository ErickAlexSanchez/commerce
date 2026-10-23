export type PublicPaymentSettings = {
  connected: false;
  paymentsProcessed: false;
  publishableKey: string;
  secretHint: string | null;
};

export function maskSecret(secret: string): string | null {
  if (secret.length === 0) {
    return null;
  }
  if (secret.length <= 8) {
    return "••••";
  }
  return `••••${secret.slice(-4)}`;
}

export function toPublicPaymentSettings(record: {
  publishableKey: string;
  secretKey: string;
}): PublicPaymentSettings {
  return {
    connected: false,
    paymentsProcessed: false,
    publishableKey: record.publishableKey,
    secretHint: maskSecret(record.secretKey),
  };
}
