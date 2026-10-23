import type { ReactNode } from "react";
import Script from "next/script";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { DemoFrame, DemoProvider, preferenceBootScript } from "@vesper-counsel/shell";
import { QueryProvider } from "../components/query-provider";
import "./globals.css";

const display = IBM_Plex_Serif({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-sans" });

export const metadata = {
  title: "Commerce admin",
  description: "Demo admin for the Vesper and Counsel storefronts. Stripe is not connected.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <Script id="demo-preferences" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: preferenceBootScript }} />
        <DemoProvider>
          <QueryProvider>
            <DemoFrame brand="admin">{children}</DemoFrame>
          </QueryProvider>
        </DemoProvider>
      </body>
    </html>
  );
}
