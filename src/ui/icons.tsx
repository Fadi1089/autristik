import type { ImgHTMLAttributes, SVGProps } from 'react'
import cameraRotateLeft from '../assets/camera-rotate-left-144.png'

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

/** Three dots in a circle (Lucide "circle-ellipsis"): open the menu. */
export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M17 12h.01" />
      <path d="M12 12h.01" />
      <path d="M7 12h.01" />
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

export function CameraLeftIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} src={cameraRotateLeft} alt="" aria-hidden draggable={false} />
}

export function CameraRightIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      className={`${props.className ?? ''} -scale-x-100`}
      src={cameraRotateLeft}
      alt=""
      aria-hidden
      draggable={false}
    />
  )
}

/** A mop with sparkles (Lucide "mop-sparkles"): clear the placed tiles. */
export function ResetGridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M10 22a3 3 0 01-3-3" />
      <path d="M10 22c2.761 0 5-1.79 5-4-4.42 0-4.08-5-8.5-5a4.501 4.501 0 000 9z" />
      <path d="M10 3H8" />
      <path d="M12.5 11.5 22 2" />
      <path d="M20 13v4" />
      <path d="M22 15h-4" />
      <path d="M4 5v4" />
      <path d="M6 7H2" />
      <path d="m6.98 13.02 2.665-2.664a1.21 1.21 0 011.71 0l2.29 2.288a1.21 1.21 0 010 1.712l-2.088 2.087" />
      <path d="M9 2v2" />
    </svg>
  )
}
