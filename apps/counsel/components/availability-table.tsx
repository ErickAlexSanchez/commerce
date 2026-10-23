"use client";

import { useQuery } from "@tanstack/react-query";
import { fill, useLocale } from "@vesper-counsel/shell";
import { appPath } from "../lib/app-path";
import { fetchSlots, formatSlot } from "../lib/api";

export function AvailabilityTable({
  serviceSlug,
  serviceName,
  apiBase,
}: {
  serviceSlug: string;
  serviceName: string;
  apiBase: string;
}) {
  const { locale, t } = useLocale();
  const query = useQuery({
    queryKey: ["slots", serviceSlug, apiBase],
    queryFn: () => fetchSlots(apiBase, serviceSlug),
  });

  if (query.isPending) {
    return <p role="status">{t.loadingTimes}</p>;
  }
  if (query.isError) {
    return (
      <div role="alert">
        <p>{t.timesError}</p>
        <button type="button" onClick={() => void query.refetch()}>
          {t.tryAgain}
        </button>
      </div>
    );
  }
  if (query.data.length === 0) {
    return <p>{t.noOpenTimes}</p>;
  }

  return (
    <div className="table-scroll">
    <table>
      <caption>{fill(t.openTimesFor, { name: serviceName })}</caption>
      <thead>
        <tr>
          <th scope="col">{t.starts}</th>
          <th scope="col">{t.ends}</th>
          <th scope="col">{locale === "es" ? "Apartar" : "Hold"}</th>
        </tr>
      </thead>
      <tbody>
        {query.data.map((slot) => (
          <tr key={slot.id}>
            <td>{formatSlot(slot.startsAt, locale)}</td>
            <td>{formatSlot(slot.endsAt, locale)}</td>
            <td>
              <a href={appPath(`/checkout?service=${serviceSlug}&slot=${slot.id}&version=${slot.version}`)}>
                {fill(t.hold, { time: formatSlot(slot.startsAt, locale) })}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
