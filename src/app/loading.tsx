/**
 * Root loading state — shown while any route is loading.
 * A simple centered spinner that matches the indigo brand.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
