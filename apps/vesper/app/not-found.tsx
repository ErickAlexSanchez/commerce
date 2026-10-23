"use client";

import { useLocale } from "@vesper-counsel/shell";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <main id="content">
      <h1>{t.pageNotFound}</h1>
      <p>
        <a href="/">{t.backToCatalog}</a>
      </p>
    </main>
  );
}
