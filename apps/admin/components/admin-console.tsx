"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { catalogImageSrc, imageAltFor, type Brand } from "@vesper-counsel/catalog";
import { fill, useLocale } from "@vesper-counsel/shell";
import { centsToDollars, dollarsToCents } from "../lib/money";
import {
  clearToken,
  CommerceError,
  fetchListings,
  fetchOrders,
  fetchSettings,
  login,
  readToken,
  saveListing,
  saveSettings,
  writeToken,
  type AdminListing,
  type PaymentSettings,
} from "../lib/api";

function money(cents: number, locale: "en" | "es"): string {
  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function when(iso: string, locale: "en" | "es"): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function AdminConsole({ apiBase }: { apiBase: string }) {
  const { locale, t } = useLocale();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setToken(readToken());
    setReady(true);
  }, []);

  const listings = useQuery({
    queryKey: ["admin-listings", token],
    enabled: token !== null,
    queryFn: () => fetchListings(apiBase, token ?? ""),
  });
  const orders = useQuery({
    queryKey: ["admin-orders", token],
    enabled: token !== null,
    queryFn: () => fetchOrders(apiBase, token ?? ""),
  });
  const settings = useQuery({
    queryKey: ["admin-settings", token],
    enabled: token !== null,
    queryFn: () => fetchSettings(apiBase, token ?? ""),
  });

  useEffect(() => {
    const errors = [listings.error, orders.error, settings.error];
    if (errors.some((error) => error instanceof CommerceError && error.code === "unauthorized")) {
      clearToken();
      setToken(null);
    }
  }, [listings.error, orders.error, settings.error]);

  const signIn = useMutation({
    mutationFn: () => login(apiBase, email, password),
    onSuccess: async (next) => {
      writeToken(next);
      setToken(next);
      setPassword("");
      await queryClient.invalidateQueries();
    },
  });

  if (!ready) {
    return <p role="status">{t.loadingAdmin}</p>;
  }

  return (
    <>
      <h1>{t.adminTitle}</h1>
      <p className="lede">{t.adminLede}</p>
      {token === null ? (
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            signIn.mutate();
          }}
        >
          <p>{t.demoLoginHint}</p>
          <label htmlFor="admin-email">{t.email}</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="admin-password">{t.password}</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {signIn.isError ? (
            <div role="alert">
              <p>{signIn.error instanceof Error ? signIn.error.message : t.signInError}</p>
            </div>
          ) : null}
          <button type="submit" disabled={signIn.isPending}>
            {t.signIn}
          </button>
        </form>
      ) : (
        <>
          <p>
            <button
              type="button"
              onClick={() => {
                clearToken();
                setToken(null);
                queryClient.clear();
              }}
            >
              {t.signOut}
            </button>
          </p>
          <section aria-labelledby="listings-title">
            <h2 id="listings-title">{t.listings}</h2>
            {listings.isPending ? <p role="status">{t.loadingCatalog}</p> : null}
            {listings.isError ? (
              <div role="alert">
                <p>{t.listingsError}</p>
              </div>
            ) : null}
            {listings.data ? (
              <>
                <ListingGroup brand="vesper" items={listings.data.vesper} apiBase={apiBase} token={token} />
                <ListingGroup brand="counsel" items={listings.data.counsel} apiBase={apiBase} token={token} />
              </>
            ) : null}
          </section>
          <section aria-labelledby="orders-title">
            <h2 id="orders-title">{t.orders}</h2>
            {orders.isPending ? <p role="status">{t.loading}</p> : null}
            {orders.isError ? (
              <div role="alert">
                <p>{t.ordersError}</p>
              </div>
            ) : null}
            {orders.data && orders.data.length === 0 ? <p>{t.noOrders}</p> : null}
            {orders.data && orders.data.length > 0 ? (
              <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t.when}</th>
                    <th scope="col">{t.brand}</th>
                    <th scope="col">{t.email}</th>
                    <th scope="col">{t.total}</th>
                    <th scope="col">{t.status}</th>
                    <th scope="col">{t.lines}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.map((order) => (
                    <tr key={order.id}>
                      <td>{when(order.createdAt, locale)}</td>
                      <td>{order.brand === "vesper" ? t.vesper : t.counsel}</td>
                      <td>{order.email}</td>
                      <td>{money(order.totalCents, locale)}</td>
                      <td>{order.status}</td>
                      <td>{order.lines.map((line) => `${line.name} × ${line.quantity}`).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : null}
          </section>
          <StripeSettings apiBase={apiBase} token={token} settings={settings.data} pending={settings.isPending} failed={settings.isError} />
        </>
      )}
    </>
  );
}

function ListingGroup({
  brand,
  items,
  apiBase,
  token,
}: {
  brand: Brand;
  items: readonly AdminListing[];
  apiBase: string;
  token: string;
}) {
  const { t } = useLocale();
  return (
    <div>
      <h3>{brand === "vesper" ? t.vesper : t.counsel}</h3>
      <ul className="admin-listings">
        {items.map((item) => (
          <li key={item.sku}>
            <ListingEditor item={item} brand={brand} apiBase={apiBase} token={token} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const maxPhotoBytes = 2_000_000;

type ListingPhoto = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
};

function photoContentType(file: File): ListingPhoto["contentType"] | null {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg") {
    return "image/jpeg";
  }
  if (type === "image/png") {
    return "image/png";
  }
  if (type === "image/webp") {
    return "image/webp";
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (name.endsWith(".png")) {
    return "image/png";
  }
  if (name.endsWith(".webp")) {
    return "image/webp";
  }
  return null;
}

function readFileBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
        return;
      }
      reject(new Error("unreadable"));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("unreadable"));
    };
    reader.readAsArrayBuffer(file);
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    const slice = bytes.subarray(index, index + chunk);
    binary += String.fromCharCode(...Array.from(slice));
  }
  return btoa(binary);
}

function ListingEditor({
  item,
  brand,
  apiBase,
  token,
}: {
  item: AdminListing;
  brand: Brand;
  apiBase: string;
  token: string;
}) {
  const { locale, t } = useLocale();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [name, setName] = useState(item.name);
  const [priceDollars, setPriceDollars] = useState(centsToDollars(item.priceCents));
  const [photo, setPhoto] = useState<ListingPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);

  function clearPreview(): void {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setName(item.name);
    setPriceDollars(centsToDollars(item.priceCents));
    setPhoto(null);
    setPhotoError(null);
    setReadingPhoto(false);
    clearPreview();
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }, [item.name, item.priceCents, item.imageUpdatedAt]);

  const cents = dollarsToCents(priceDollars);
  const priceOk = cents !== null;

  const save = useMutation({
    mutationFn: () => {
      if (cents === null) {
        throw new Error(t.listingsError);
      }
      return saveListing(apiBase, token, item.sku, name.trim(), cents, photo ?? undefined);
    },
    onSuccess: async () => {
      setPhotoError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    },
  });

  async function onPhoto(file: File | undefined): Promise<void> {
    setPhotoError(null);
    setPhoto(null);
    if (!file) {
      clearPreview();
      return;
    }
    const contentType = photoContentType(file);
    if (!contentType) {
      clearPreview();
      setPhotoError(t.photoInvalid);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      return;
    }
    if (file.size > maxPhotoBytes) {
      clearPreview();
      setPhotoError(t.photoTooLarge);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      return;
    }
    const nextPreview = URL.createObjectURL(file);
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setReadingPhoto(true);
    try {
      const bytes = await readFileBytes(file);
      setPhoto({ contentType, dataBase64: bytesToBase64(bytes) });
    } catch {
      clearPreview();
      setPhotoError(t.photoInvalid);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } finally {
      setReadingPhoto(false);
    }
  }

  const savedSrc = catalogImageSrc(apiBase, brand, item.slug, item.imageUpdatedAt);
  const priceId = `price-${item.sku}`;

  return (
    <form
      className="listing-editor"
      aria-label={item.name}
      onSubmit={(event) => {
        event.preventDefault();
        if (priceOk && name.trim().length > 0 && !readingPhoto) {
          save.mutate();
        }
      }}
    >
      <div className="listing-photo">
        <img src={previewUrl ?? savedSrc} alt={imageAltFor(item.slug, locale)} />
        <label htmlFor={`photo-${item.sku}`}>{t.photo}</label>
        <input
          ref={fileRef}
          id={`photo-${item.sku}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            void onPhoto(file);
          }}
        />
        <p className="field-hint">{t.photoFormats}</p>
        {photoError ? (
          <div role="alert">
            <p>{photoError}</p>
          </div>
        ) : null}
      </div>
      <div className="listing-fields">
        <label htmlFor={`name-${item.sku}`}>{t.name}</label>
        <input
          id={`name-${item.sku}`}
          value={name}
          required
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
        <label htmlFor={priceId}>{t.price}</label>
        <div className="money-field">
          <span aria-hidden="true">$</span>
          <input
            id={priceId}
            inputMode="decimal"
            autoComplete="off"
            value={priceDollars}
            required
            aria-describedby={`${priceId}-currency`}
            onChange={(event) => setPriceDollars(event.target.value)}
            onBlur={() => {
              if (cents !== null) {
                setPriceDollars(centsToDollars(cents));
              }
            }}
          />
          <span id={`${priceId}-currency`}>USD</span>
        </div>
        {save.isError ? (
          <div role="alert">
            <p>{save.error instanceof Error ? save.error.message : t.listingsError}</p>
          </div>
        ) : null}
        {save.isSuccess ? <p role="status">{t.saved}</p> : null}
        <button type="submit" disabled={save.isPending || readingPhoto || !priceOk || name.trim().length === 0}>
          {save.isPending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}

function StripeSettings({
  apiBase,
  token,
  settings,
  pending,
  failed,
}: {
  apiBase: string;
  token: string;
  settings: PaymentSettings | undefined;
  pending: boolean;
  failed: boolean;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  useEffect(() => {
    if (settings) {
      setPublishableKey(settings.publishableKey);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => saveSettings(apiBase, token, { publishableKey, secretKey }),
    onSuccess: async (next) => {
      setSecretKey("");
      queryClient.setQueryData(["admin-settings", token], next);
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  return (
    <section aria-labelledby="stripe-title">
      <h2 id="stripe-title">{t.stripe}</h2>
      <p className="persistent-notice" role="note">
        {t.stripeNotice}
      </p>
      {pending ? <p role="status">{t.loading}</p> : null}
      {failed ? (
        <div role="alert">
          <p>{t.settingsError}</p>
        </div>
      ) : null}
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <label htmlFor="publishable-key">{t.publishableKey}</label>
        <input
          id="publishable-key"
          name="publishableKey"
          autoComplete="off"
          value={publishableKey}
          maxLength={200}
          onChange={(event) => setPublishableKey(event.target.value)}
        />
        <label htmlFor="secret-key">{t.secretKey}</label>
        <input
          id="secret-key"
          name="secretKey"
          type="password"
          autoComplete="off"
          value={secretKey}
          maxLength={200}
          onChange={(event) => setSecretKey(event.target.value)}
        />
        <p>{t.secretKeep}</p>
        {settings?.secretHint ? <p>{fill(t.storedSecret, { hint: settings.secretHint })}</p> : null}
        {save.isError ? (
          <div role="alert">
            <p>{t.settingsError}</p>
          </div>
        ) : null}
        {save.isSuccess ? <p role="status">{t.savedInactive}</p> : null}
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? t.saving : t.save}
        </button>
      </form>
    </section>
  );
}
