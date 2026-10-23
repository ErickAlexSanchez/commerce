import type { ReactNode } from "react";
import Script from "next/script";
import { Fraunces, Outfit } from "next/font/google";
import { DemoFrame, DemoProvider, preferenceBootScript } from "@vesper-counsel/shell";
import { QueryProvider } from "../components/query-provider";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: { default: "Vesper", template: "%s · Vesper" },
  description:
    "Vesper is a fictional jewelry studio. Four pieces, a checkout island, and a certificate link that expires.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <Script id="demo-preferences" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: preferenceBootScript }} />
        <DemoProvider>
          <QueryProvider>
            <DemoFrame brand="vesper">{children}</DemoFrame>
          </QueryProvider>
        </DemoProvider>
      </body>
    </html>
  );
}
