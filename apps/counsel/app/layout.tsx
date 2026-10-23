import type { ReactNode } from "react";
import Script from "next/script";
import { Newsreader, Public_Sans } from "next/font/google";
import { DemoFrame, DemoProvider, preferenceBootScript } from "@vesper-counsel/shell";
import { QueryProvider } from "../components/query-provider";
import "./globals.css";

const display = Newsreader({ subsets: ["latin"], variable: "--font-display" });
const sans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: { default: "Counsel", template: "%s · Counsel" },
  description:
    "Counsel is a fictional studio for reading letters and agreements. It is not a law firm and this is not legal advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <Script id="demo-preferences" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: preferenceBootScript }} />
        <DemoProvider>
          <QueryProvider>
            <DemoFrame brand="counsel">{children}</DemoFrame>
          </QueryProvider>
        </DemoProvider>
      </body>
    </html>
  );
}
