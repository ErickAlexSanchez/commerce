export interface SignedDownload {
  token: string;
  expiresAt: Date;
}

export interface DownloadClaims {
  orderId: string;
  fileKey: string;
}

export interface SignedUrls {
  sign(input: { orderId: string; fileKey: string }): SignedDownload;
  verify(token: string): DownloadClaims;
}
