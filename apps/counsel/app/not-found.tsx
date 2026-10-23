"use client";

import { useLocale } from "@vesper-counsel/shell";
import { appPath } from "../lib/app-path";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <main id="content">
      <h1>{t.pageNotFound}</h1>
      <p>
        <a href={appPath("/")}>{t.backToServices}</a>
      </p>
    </main>
  );
}
