"use client";

import { useLocale } from "@vesper-counsel/shell";

export default function Loading() {
  const { t } = useLocale();
  return (
    <main id="content">
      <p role="status">{t.loading}</p>
    </main>
  );
}
