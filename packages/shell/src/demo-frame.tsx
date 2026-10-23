"use client";

import { useCallback, useState, type ReactNode } from "react";
import { demoAdminUrl, demoCounselUrl, demoVesperUrl } from "@vesper-counsel/catalog";
import { AboutDialog } from "./about-dialog";
import { useLocale } from "./demo-provider";

export function DemoFrame({
  brand,
  children,
}: {
  brand: "vesper" | "counsel" | "admin";
  children: ReactNode;
}) {
  const { t, locale, setLocale, theme, toggleTheme } = useLocale();
  const [aboutOpen, setAboutOpen] = useState(false);
  const closeAbout = useCallback(() => setAboutOpen(false), []);
  const homeLabel = brand === "counsel" ? t.services : brand === "admin" ? t.listings : t.catalog;
  const footer = brand === "counsel" ? t.footerCounsel : brand === "admin" ? t.footerAdmin : t.footerVesper;
  const wordmark = brand === "counsel" ? "Counsel" : brand === "admin" ? "Admin" : "Vesper";

  return (
    <>
      <a className="skip-link" href="#content">
        {t.skip}
      </a>
      <header className="site-header">
        <a className="wordmark" href="/">
          {wordmark}
        </a>
        <nav className="header-tools" aria-label={t.primaryNav}>
          {brand === "admin" ? (
            <>
              <a href={demoVesperUrl}>{t.vesper}</a>
              <a href={demoCounselUrl}>{t.counsel}</a>
            </>
          ) : (
            <a href="/">{homeLabel}</a>
          )}
          {brand !== "admin" ? <a href={demoAdminUrl}>{t.admin}</a> : null}
          <div className="locale-switch" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
              EN
            </button>
            <button type="button" aria-pressed={locale === "es"} onClick={() => setLocale("es")}>
              ES
            </button>
          </div>
          <button
            type="button"
            className="icon-button theme-toggle"
            aria-label={theme === "dark" ? t.themeToLight : t.themeToDark}
            onClick={toggleTheme}
          >
            <span className="icon-sun" aria-hidden="true">
              ☀
            </span>
            <span className="icon-moon" aria-hidden="true">
              ☾
            </span>
          </button>
          <button type="button" className="icon-button" aria-label={t.aboutOpen} onClick={() => setAboutOpen(true)}>
            ?
          </button>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <p>{footer}</p>
      </footer>
      <AboutDialog open={aboutOpen} onClose={closeAbout} />
    </>
  );
}

export function DemoPaymentNotice() {
  const { t } = useLocale();
  return (
    <p className="demo-banner" role="note">
      {t.demoCheckout}
    </p>
  );
}
