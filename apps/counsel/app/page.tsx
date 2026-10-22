import { counselServices } from "@vesper-counsel/catalog";
import { formatUsd } from "../lib/api";

export default function ServicesPage() {
  return (
    <main id="content">
      <h1>Counsel</h1>
      <p className="lede">Three services. Open times come from the shared commerce service. A hold becomes a booking when the signed webhook arrives.</p>
      <ol className="docket">
        {counselServices.map((service) => (
          <li key={service.sku}>
            <a href={`/services/${service.slug}`}>
              <span className="service-name">{service.name}</span>
              <span className="meta">
                {service.durationMinutes} minutes · {formatUsd(service.priceCents)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </main>
  );
}
