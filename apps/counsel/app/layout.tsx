import type { ReactNode } from "react";
import { Newsreader, Public_Sans } from "next/font/google";
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
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <header className="site-header">
          <a className="wordmark" href="/">
            Counsel
          </a>
          <nav aria-label="Primary">
            <a href="/">Services</a>
          </nav>
        </header>
        <QueryProvider>{children}</QueryProvider>
        <footer className="site-footer">
          <p>Counsel is a fictional studio. Nothing here is legal advice. Test payment does not charge a card.</p>
        </footer>
      </body>
    </html>
  );
}
