"use client";

/** Last-resort error boundary. Deliberately minimal and free of debug output. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ fontFamily: "sans-serif", padding: 24, textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>Please reload the page and try again.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
