// Lightweight transient toast pinned above the bottom nav.
export default function Toast({ children }) {
  return (
    <div
      data-testid="toast"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="rounded-full bg-ig-card px-4 py-2 text-sm font-medium text-ig-text shadow-lg ring-1 ring-ig-border">
        {children}
      </div>
    </div>
  )
}
