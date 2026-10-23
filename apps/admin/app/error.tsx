"use client";

import { useLocale } from "@vesper-counsel/shell";

export default function RouteError({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <main id="content">
      <div role="alert">
        <h1>{t.somethingWrong}</h1>
        <p>{t.couldNotLoad}</p>
        <button type="button" onClick={() => reset()}>
          {t.tryAgain}
        </button>
      </div>
    </main>
  );
}
