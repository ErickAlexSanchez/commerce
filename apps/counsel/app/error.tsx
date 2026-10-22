"use client";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <main id="content">
      <div role="alert">
        <h1>Something went wrong</h1>
        <p>This page could not be loaded.</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
