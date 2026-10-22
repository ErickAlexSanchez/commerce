import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
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
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <header className="site-header">
          <a className="wordmark" href="/">
            Vesper
          </a>
          <nav aria-label="Primary">
            <a href="/">Catalog</a>
          </nav>
        </header>
        <QueryProvider>{children}</QueryProvider>
        <footer className="site-footer">
          <p>Vesper is a fictional studio. Checkout uses a signed test payment and does not charge a card.</p>
        </footer>
      </body>
    </html>
  );
}
