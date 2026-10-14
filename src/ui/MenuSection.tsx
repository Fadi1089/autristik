import type { ReactNode } from 'react'

/** Consistent collapsible sections for instructions and settings. */
export function MenuSection({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose?: () => void
}) {
  return (
    <details
      className="group/guide rounded-xl border border-ink/10 bg-ink/3"
      onToggle={(event) => {
        if (!event.currentTarget.open) onClose?.()
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold text-ink/85 transition hover:bg-ink/5 [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-ink/55 transition-transform group-open/guide:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="space-y-5 border-t border-ink/10 px-4 py-4">{children}</div>
    </details>
  )
}
