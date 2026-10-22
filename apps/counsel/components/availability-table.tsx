"use client";

import { useQuery } from "@tanstack/react-query";
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
  const query = useQuery({
    queryKey: ["slots", serviceSlug, apiBase],
    queryFn: () => fetchSlots(apiBase, serviceSlug),
  });

  if (query.isPending) {
    return <p role="status">Loading available times</p>;
  }
  if (query.isError) {
    return (
      <div role="alert">
        <p>Available times could not be loaded.</p>
        <button type="button" onClick={() => void query.refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (query.data.length === 0) {
    return <p>No open times remain for this service.</p>;
  }

  return (
    <table>
      <caption>Open times for {serviceName}</caption>
      <thead>
        <tr>
          <th scope="col">Starts</th>
          <th scope="col">Ends</th>
          <th scope="col">Hold</th>
        </tr>
      </thead>
      <tbody>
        {query.data.map((slot) => (
          <tr key={slot.id}>
            <td>{formatSlot(slot.startsAt)}</td>
            <td>{formatSlot(slot.endsAt)}</td>
            <td>
              <a href={`/checkout?service=${serviceSlug}&slot=${slot.id}&version=${slot.version}`}>
                Hold {formatSlot(slot.startsAt)}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
