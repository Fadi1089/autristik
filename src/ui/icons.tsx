import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h11M4 17h14" />
    </svg>
  )
}

export function RotateCwIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </svg>
  )
}

export function RotateCcwIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4v5h5" />
    </svg>
  )
}

/** A broom sweeping the board clean, with a little dust: clear the placed tiles. */
export function ResetGridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      {/* Handle, then the head flaring out from its binding, with two bristle lines. */}
      <path d="M21 3l-9 9" />
      <path d="M10.5 10.5 3.7 14.3l6 6 3.8-6.8z" />
      <path d="M11.5 11.5l-5.8 4.8M12.5 12.5l-4.8 5.8" />
      <path d="M2.2 18.6h.01M4.6 21.9h.01" />
    </svg>
  )
}
